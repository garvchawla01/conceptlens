import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

// Automatically initializes using process.env.GEMINI_API_KEY
const ai = new GoogleGenAI();

export async function POST(request: Request) {
  try {
    const { prompt, studentAnswer, correctAnswer } = await request.json();

    const fullPrompt =
      prompt ||
      `Analyze this student misconception. Student answered: "${studentAnswer}", but the correct answer is "${correctAnswer}". Explain the conceptual gap clearly and concisely.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: fullPrompt,
    });

    return NextResponse.json({ diagnosis: response.text });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}