import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("CRITICAL: GEMINI_API_KEY environment variable is not defined.");
}

const genAI = new GoogleGenerativeAI(apiKey || "");

// Exponential Backoff Retry Function
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
        delay *= 2; // Agla wait time double hoga (2s -> 4s -> 8s)
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
    const { prompt } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required in request body." },
        { status: 400 }
      );
    }

    // Call model with retry logic
    const textOutput = await callGeminiWithRetry(prompt);

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
          ? "Google Gemini servers are facing extreme traffic spikes. Please retry in a few seconds."
          : (error?.message || "Internal Server Error"),
      },
      { status: isDemandError ? 503 : 500 }
    );
  }
}