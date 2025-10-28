import OpenAI from "openai";
import sql from "../configs/db.js";
import { clerkClient } from "@clerk/express";
import { GoogleGenAI } from "@google/genai";
import axios from "axios";

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