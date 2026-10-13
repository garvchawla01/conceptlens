import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, selectedOption, correctOption, conceptTag, defaultExplanation } = body;

    const prompt = `Act as an elite STEM diagnostic tutor.
A student took a diagnostic test and made an error on the following question:

Question: "${question}"
Student Chose: "${selectedOption}"
Correct Answer: "${correctOption}"
Target Concept: "${conceptTag}"

Task:
1. Identify the exact root misconception that leads a student to choose "${selectedOption}".
2. Explain in 2-3 crisp, intuitive sentences why this logic fails.
3. Give 1 key takeaway rule to remember for exams. Keep tone supportive and clear.`;

    if (!apiKey) {
      return NextResponse.json({
        success: true,
        aiDiagnosis: defaultExplanation || "Please revise the core definition of left and right hand limits.",
        isAI: false
      });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-3.8-flash" });
    const result = await model.generateContent(prompt);
    const aiText = result.response.text();

    return NextResponse.json({
      success: true,
      aiDiagnosis: aiText,
      isAI: true
    });
  } catch (error: any) {
    console.warn("AI Diagnostic Explanation fallback triggered:", error?.message);
    const body = await req.json().catch(() => ({}));
    return NextResponse.json({
      success: true,
      aiDiagnosis: body.defaultExplanation || "Continuous functions are not necessarily differentiable when sharp corner points exist.",
      isAI: false
    });
  }
}