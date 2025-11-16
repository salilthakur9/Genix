import OpenAI from "openai";
import sql from "../configs/db.js";
import { clerkClient } from "@clerk/express";
import { GoogleGenAI } from "@google/genai";
import axios from "axios";
import FormData from 'form-data';
import { cloudinary } from '../configs/cloudinary.js';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com/v1",
});

export const generateArticle = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { prompt, length } = req.body;
    const plan = req.plan;
    const free_usage = req.free_usage;

    // Free limit
    if (plan !== "premium" && free_usage >= 10) {
      return res.json({
        success: false,
        message: "Limit reached, upgrade to continue.",
      });
    }

    // ⚡ Using DeepSeek V3.2 Exp (Non-thinking mode)
    const completion = await client.chat.completions.create({
      model: "deepseek-chat",   // <<< UPDATED MODEL
      messages: [
        {
          role: "user",
          content: `Write a detailed ${length}-word article on: ${prompt}`,
        },
      ],
      temperature: 0.7,
    });

    const content =
      completion?.choices?.[0]?.message?.content ||
      "No content generated.";

    // DB save
    await sql`
      INSERT INTO creations (user_id, prompt, content, type)
      VALUES (${userId}, ${prompt}, ${content}, 'article')
    `;

    if (plan !== "premium") {
      await clerkClient.users.updateUserMetadata(userId, {
        privateMetadata: { free_usage: free_usage + 1 },
      });
    }

    res.json({ success: true, content });
  } catch (error) {
    console.error("🚨 DeepSeek Error:", error);
    res.json({
      success: false,
      message: error?.response?.data || error.message,
    });
  }
};

export const generateEmail = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { prompt, tone } = req.body;
    const plan = req.plan;
    const free_usage = req.free_usage;

    // Free limit
    if (plan !== "premium" && free_usage >= 10) {
      return res.json({
        success: false,
        message: "Limit reached, upgrade to continue.",
      });
    }

    // ⚡ DeepSeek Email Generation (Fast Model)
    const completion = await client.chat.completions.create({
      model: "deepseek-chat", // FAST model
      messages: [
        {
          role: "user",
          content: `Write a professional email in a ${tone} tone based on the following prompt:\n\n${prompt}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const content =
      completion?.choices?.[0]?.message?.content ||
      "No content generated.";

    // Save to DB
    await sql`
      INSERT INTO creations (user_id, prompt, content, type)
      VALUES (${userId}, ${prompt}, ${content}, 'email')
    `;

    // Increase count for free users
    if (plan !== "premium") {
      await clerkClient.users.updateUserMetadata(userId, {
        privateMetadata: { free_usage: free_usage + 1 },
      });
    }

    res.json({ success: true, content });
  } catch (error) {
    console.error("🚨 DeepSeek Email Error:", error);
    res.json({
      success: false,
      message: error?.response?.data || error.message,
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