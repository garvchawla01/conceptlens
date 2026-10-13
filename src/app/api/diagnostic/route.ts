import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("CRITICAL: GEMINI_API_KEY environment variable is not defined.");
}

const genAI = new GoogleGenerativeAI(apiKey || "");

// Exponential Backoff Retry Function to handle 503 Service Unavailable / Rate Limits
async function callGeminiWithRetry(prompt: string, maxRetries = 4, initialDelayMs = 2000) {
  let delay = initialDelayMs;
  const model = genAI.getGenerativeModel({ model: "gemini-3.8-flash" });

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error: any) {
      const errorMessage = error?.message || "";
      const status = error?.status || error?.statusCode;

      const is503OrRateLimit =
        status === 503 ||
        status === 429 ||
        errorMessage.includes("503") ||
        errorMessage.includes("high demand") ||
        errorMessage.includes("Service Unavailable");

      if (is503OrRateLimit && attempt < maxRetries) {
        console.warn(
          `[Attempt ${attempt}/${maxRetries}] gemini-3.8-flash busy (503/429). Retrying in ${delay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // Wait time doubles each round (2s -> 4s -> 8s)
      } else {
        console.error(`Final failure on attempt ${attempt}:`, error);
        throw error;
      }
    }
  }
  throw new Error("Maximum retry attempts reached for gemini-3.8-flash.");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // UI form fields & direct prompt support
    const {
      prompt,
      grade,
      standard,
      board,
      syllabus,
      subject,
      stream,
      topic,
      chapter,
      customTopic,
    } = body;

    const selectedGrade = grade || standard || "Class 12";
    const selectedBoard = board || syllabus || "CBSE (NCERT)";
    const selectedSubject = subject || stream || "Mathematics";
    const selectedTopic = customTopic || topic || chapter || "Continuity and Differentiability";

    // Agar direct prompt nahi aaya, toh UI inputs se prompt construct karo
    const finalPrompt =
      prompt ||
      `Act as an expert STEM educational diagnostic assessment engine.
Create a structured diagnostic test for a student with the following specifications:
- Standard / Grade: ${selectedGrade}
- Board / Syllabus: ${selectedBoard}
- Subject / Stream: ${selectedSubject}
- Chapter / Topic: ${selectedTopic}

Requirements:
1. Provide diagnostic multiple-choice questions focusing on core conceptual understanding, common misconceptions, and logical reasoning.
2. For each question, provide 4 options (A, B, C, D) along with the correct answer and a brief conceptual explanation.
3. Keep the output strictly formatted, clean, and unambiguous.`;

    // Execute call with exponential backoff retry
    const textOutput = await callGeminiWithRetry(finalPrompt);

    return NextResponse.json({
      success: true,
      data: textOutput,
    });
  } catch (error: any) {
    console.error("Diagnostic Route Error:", error);

    const isDemandError =
      error?.message?.includes("503") || error?.message?.includes("high demand");

    return NextResponse.json(
      {
        success: false,
        error: isDemandError
          ? "Google Gemini servers are facing temporary high demand. Please try again in a few seconds."
          : (error?.message || "Internal Server Error"),
      },
      { status: isDemandError ? 503 : 500 }
    );
  }
}