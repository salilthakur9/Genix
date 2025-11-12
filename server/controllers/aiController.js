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

export const generateArticle = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { prompt, length } = req.body;
    const plan = req.plan;
    const free_usage = req.free_usage;

    if (plan !== "premium" && free_usage >= 10) {
      return res.json({
        success: false,
        message: "Limit reached, upgrade to continue.",
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: `Write a detailed ${length}-word article on ${prompt}` },
          ],
        },
      ],
      generationConfig: { temperature: 0.7 },
    });

    console.log("🔍 Gemini Raw Response:", JSON.stringify(response, null, 2));

    // ✅ Extract text safely
    const content =
      response?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No content generated.";

    // Store result
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
    console.error("🚨 Gemini Error:", error);
    res.json({ success: false, message: error.message });
  }
};

export const generateEmail = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { prompt, tone } = req.body;
    const plan = req.plan;
    const free_usage = req.free_usage;

    // ✅ Limit check
    if (plan !== "premium" && free_usage >= 10) {
      return res.json({
        success: false,
        message: "Limit reached, upgrade to continue.",
      });
    }

    // ✅ Gemini content generation
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Write a professional email in a ${tone} tone based on the following prompt:\n\n${prompt}`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 500,
      },
    });

    // ✅ Extract text correctly for this SDK version
    const content =
      response?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No content generated.";

    // ✅ Save to DB
    await sql`
      INSERT INTO creations (user_id, prompt, content, type)
      VALUES (${userId}, ${prompt}, ${content}, 'email')
    `;

    // ✅ Update free usage count if not premium
    if (plan !== "premium") {
      await clerkClient.users.updateUserMetadata(userId, {
        privateMetadata: { free_usage: free_usage + 1 },
      });
    }

    // ✅ Send response
    res.json({ success: true, content });
  } catch (error) {
    console.error("🚨 Gemini Email Error:", error);
    res.json({ success: false, message: error.message });
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