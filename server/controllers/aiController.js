import OpenAI from "openai";
import sql from "../configs/db.js";
import { clerkClient } from "@clerk/express";
import { GoogleGenAI } from "@google/genai";
import axios from "axios";
import FormData from "form-data";
import { cloudinary } from "../configs/cloudinary.js";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const DEEPSEEK_BASE_URL =
  process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";

const DEEPSEEK_MODEL =
  process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";

const DEEPSEEK_MIN_BALANCE_USD = Number(
  process.env.DEEPSEEK_MIN_BALANCE_USD || 0.1
);

const DEEPSEEK_MAX_ARTICLE_SHORT = Number(
  process.env.DEEPSEEK_MAX_ARTICLE_SHORT || 1200
);

const DEEPSEEK_MAX_ARTICLE_MEDIUM = Number(
  process.env.DEEPSEEK_MAX_ARTICLE_MEDIUM || 1800
);

const DEEPSEEK_MAX_ARTICLE_LONG = Number(
  process.env.DEEPSEEK_MAX_ARTICLE_LONG || 2400
);

const DEEPSEEK_MAX_EMAIL = Number(
  process.env.DEEPSEEK_MAX_EMAIL || 500
);

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: DEEPSEEK_BASE_URL,
});

/**
 * Check the current DeepSeek account balance before generating content.
 * This prevents the application from continuing to spend when the
 * remaining balance is too low.
 */
const checkDeepSeekBalance = async () => {
  try {
    const response = await axios.get(
      `${DEEPSEEK_BASE_URL}/user/balance`,
      {
        headers: {
          Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          Accept: "application/json",
        },
        timeout: 10000,
      }
    );

    const balanceInfo = response?.data?.balance_infos || [];

    const usdBalance = balanceInfo.find(
      (item) => item.currency === "USD"
    );

    if (!usdBalance) {
      console.warn("⚠️ DeepSeek USD balance information not found.");
      return {
        allowed: true,
        balance: null,
      };
    }

    const balance = Number(usdBalance.total_balance);

    if (!Number.isFinite(balance)) {
      console.warn("⚠️ Invalid DeepSeek balance received.");
      return {
        allowed: true,
        balance: null,
      };
    }

    if (balance <= 0) {
      return {
        allowed: false,
        balance,
        message:
          "AI generation is temporarily unavailable because the DeepSeek API balance is exhausted.",
      };
    }

    if (balance < DEEPSEEK_MIN_BALANCE_USD) {
      return {
        allowed: false,
        balance,
        message:
          "AI generation is temporarily paused because the DeepSeek API balance is too low.",
      };
    }

    return {
      allowed: true,
      balance,
    };
  } catch (error) {
    console.error(
      "🚨 DeepSeek Balance Check Error:",
      error?.response?.data || error.message
    );

    /**
     * Fail closed here.
     * If we cannot verify the balance, don't risk making another
     * paid request automatically.
     */
    return {
      allowed: false,
      balance: null,
      message:
        "Unable to verify the AI service balance. Please try again later.",
    };
  }
};

/**
 * Converts the UI article length into a strict token limit.
 */
const getArticleMaxTokens = (length) => {
  const normalizedLength = String(length || "").toLowerCase();

  if (normalizedLength.includes("short")) {
    return DEEPSEEK_MAX_ARTICLE_SHORT;
  }

  if (normalizedLength.includes("medium")) {
    return DEEPSEEK_MAX_ARTICLE_MEDIUM;
  }

  if (normalizedLength.includes("long")) {
    return DEEPSEEK_MAX_ARTICLE_LONG;
  }

  /**
   * Safe default if the frontend sends an unexpected value.
   */
  return DEEPSEEK_MAX_ARTICLE_SHORT;
};

export const generateArticle = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { prompt, length } = req.body;

    const plan = req.plan;
    const free_usage = Number(req.free_usage || 0);

    if (!prompt || !String(prompt).trim()) {
      return res.json({
        success: false,
        message: "Please enter an article topic.",
      });
    }

    if (plan !== "premium" && free_usage >= 10) {
      return res.json({
        success: false,
        message: "Limit reached, upgrade to continue.",
      });
    }

    /**
     * Check DeepSeek balance before spending money.
     */
    const balanceCheck = await checkDeepSeekBalance();

    if (!balanceCheck.allowed) {
      return res.json({
        success: false,
        message:
          balanceCheck.message ||
          "AI generation is temporarily unavailable.",
      });
    }

    const maxTokens = getArticleMaxTokens(length);

    const completion = await client.chat.completions.create({
      model: DEEPSEEK_MODEL,

      messages: [
        {
          role: "system",
          content:
            "You are a professional article writer. Generate clear, useful, well-structured articles. Do not include unnecessary reasoning, analysis, or meta-commentary. Output only the final article.",
        },
        {
          role: "user",
          content: `Write an article of approximately ${length} words on the following topic:

${String(prompt).trim()}

Use a clear title and well-organized paragraphs or headings where appropriate. Stay close to the requested length and avoid unnecessary repetition.`,
        },
      ],

      /**
       * IMPORTANT:
       * Disable reasoning for normal text generation.
       * This saves output tokens and is unnecessary for this task.
       */
      thinking: {
        type: "disabled",
      },

      temperature: 0.7,

      /**
       * Hard upper limit so an unexpected prompt cannot generate
       * an unnecessarily huge response.
       */
      max_tokens: maxTokens,
    });

    const content =
      completion?.choices?.[0]?.message?.content?.trim() ||
      "No content generated.";

    await sql`
      INSERT INTO creations (user_id, prompt, content, type)
      VALUES (${userId}, ${prompt}, ${content}, 'article')
    `;

    if (plan !== "premium") {
      await clerkClient.users.updateUserMetadata(userId, {
        privateMetadata: {
          free_usage: free_usage + 1,
        },
      });
    }

    /**
     * Log actual token usage so you can see what each request costs.
     */
    console.log("✅ DeepSeek Article Usage:", {
      model: completion?.model,
      prompt_tokens: completion?.usage?.prompt_tokens,
      completion_tokens: completion?.usage?.completion_tokens,
      total_tokens: completion?.usage?.total_tokens,
      balance_before_request: balanceCheck.balance,
    });

    return res.json({
      success: true,
      content,
    });
  } catch (error) {
    console.error(
      "🚨 DeepSeek Article Error:",
      error?.response?.data || error.message
    );

    return res.json({
      success: false,
      message:
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error.message ||
        "Failed to generate article.",
    });
  }
};

export const generateEmail = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { prompt, tone } = req.body;

    const plan = req.plan;
    const free_usage = Number(req.free_usage || 0);

    if (!prompt || !String(prompt).trim()) {
      return res.json({
        success: false,
        message: "Please provide the email details.",
      });
    }

    if (plan !== "premium" && free_usage >= 10) {
      return res.json({
        success: false,
        message: "Limit reached, upgrade to continue.",
      });
    }

    /**
     * Check DeepSeek balance before spending money.
     */
    const balanceCheck = await checkDeepSeekBalance();

    if (!balanceCheck.allowed) {
      return res.json({
        success: false,
        message:
          balanceCheck.message ||
          "AI generation is temporarily unavailable.",
      });
    }

    const completion = await client.chat.completions.create({
      model: DEEPSEEK_MODEL,

      messages: [
        {
          role: "system",
          content:
            "You are a professional email writer. Write concise, natural, polished emails. Do not include reasoning, explanations, or meta-commentary. Output only the final email.",
        },
        {
          role: "user",
          content: `Write a professional email in a ${tone || "professional"} tone based on the following details:

${String(prompt).trim()}

Keep the email concise and appropriate for professional communication.`,
        },
      ],

      /**
       * Emails do not need reasoning.
       */
      thinking: {
        type: "disabled",
      },

      temperature: 0.7,

      /**
       * Prevent unnecessarily long emails.
       */
      max_tokens: DEEPSEEK_MAX_EMAIL,
    });

    const content =
      completion?.choices?.[0]?.message?.content?.trim() ||
      "No content generated.";

    await sql`
      INSERT INTO creations (user_id, prompt, content, type)
      VALUES (${userId}, ${prompt}, ${content}, 'email')
    `;

    if (plan !== "premium") {
      await clerkClient.users.updateUserMetadata(userId, {
        privateMetadata: {
          free_usage: free_usage + 1,
        },
      });
    }

    /**
     * Log actual token usage.
     */
    console.log("✅ DeepSeek Email Usage:", {
      model: completion?.model,
      prompt_tokens: completion?.usage?.prompt_tokens,
      completion_tokens: completion?.usage?.completion_tokens,
      total_tokens: completion?.usage?.total_tokens,
      balance_before_request: balanceCheck.balance,
    });

    return res.json({
      success: true,
      content,
    });
  } catch (error) {
    console.error(
      "🚨 DeepSeek Email Error:",
      error?.response?.data || error.message
    );

    return res.json({
      success: false,
      message:
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error.message ||
        "Failed to generate email.",
    });
  }
};

export const generateImage = async (req, res) => {
  const { prompt, publish } = req.body;
  const { userId } = req.auth();
  const plan = req.plan;
  const free_usage = req.free_usage;

  if (!prompt) {
    return res.status(400).json({ success: false, message: 'Prompt is required' });
  }

  if (plan !== 'premium') {
    return res.json({
      success: false,
      message: "Upgrade to premium for this feature.",
    });
  }

  try {
    const formData = new FormData();
    formData.append('prompt', prompt);

    const clipResponse = await axios.post(
      'https://clipdrop-api.co/text-to-image/v1',
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'x-api-key': process.env.CLIPDROP_API_KEY,
        },
        responseType: 'arraybuffer',
      }
    );

    const imageBuffer = clipResponse.data;

    const uploadResponse = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder: 'clipdrop' },
        (err, result) => {
          if (err) return reject(err);
          resolve(result);
        }
      ).end(imageBuffer);
    });

    const imageUrl = uploadResponse.secure_url;

    await sql`
      INSERT INTO creations (user_id, prompt, content, type, publish)
      VALUES (${userId}, ${prompt}, ${imageUrl}, 'image', ${publish ?? false})
    `;

    return res.status(200).json({
      success: true,
      imageUrl,
    });

  } catch (error) {
    console.error('ClipDrop error:', error?.response?.data || error.message);
    return res.status(error?.response?.status || 500).json({
      success: false,
      message: 'ClipDrop request failed',
      error: error?.response?.data || error.message,
    });
  }
};


export const removeImageBackground = async (req, res) => {

  try{
  const { userId } = req.auth();
  const image = req.file;
  const plan = req.plan;

  if (plan !== 'premium') {
    return res.json({
      success: false,
      message: "upgrade to premium for this feature.",
    });
  }

    const {secure_url} = await cloudinary.uploader.upload(image.path, {
        transformation: [
            {
                effect: 'background_removal',
                background_removal: 'remove_the_background'
            }
        ]
    })

    await sql`
      INSERT INTO creations (user_id, prompt, content, type)
      VALUES (${userId}, 'Remove background from image', ${secure_url}, 'image')
    `;

    return res.status(200).json({
      success: true,
      secure_url,
    });

  } catch (error) {
    console.error('ClipDrop error:', error?.response?.data || error.message);
    return res.status(error?.response?.status || 500).json({
      success: false,
      message: 'ClipDrop request failed',
      error: error?.response?.data || error.message,
    });
  }
}


export const removeImageObject = async (req, res) => {

  try{
  const { userId } = req.auth();
  const { object } = req.body;
  const image= req.file;
  const plan = req.plan;

  if (plan !== 'premium') {
    return res.json({
      success: false,
      message: "upgrade to premium for this feature.",
    });
  }

    const {public_id} = await cloudinary.uploader.upload(image.path)

    const imageUrl= cloudinary.url(public_id,{
        transformation: [{
            effect: `gen_remove:${object}`
        }],
        resource_type: 'image',
    })

    await sql`
      INSERT INTO creations (user_id, prompt, content, type)
      VALUES (${userId}, ${`Removed ${object} from image`}, ${imageUrl}, 'image')
    `;

    return res.status(200).json({
      success: true,
      imageUrl,
    });

  } catch (error) {
    console.error('ClipDrop error:', error?.response?.data || error.message);
    return res.status(error?.response?.status || 500).json({
      success: false,
      message: 'ClipDrop request failed',
      error: error?.response?.data || error.message,
    });
  }
}