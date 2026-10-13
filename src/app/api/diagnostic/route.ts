import { NextRequest, NextResponse } from "next/server";
import { QUESTION_BANK } from "@/data/questionbank";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const topic =
      body.topic ||
      body.chapter ||
      body.customTopic ||
      "Continuity and Differentiability";

    // Question bank se questions load karein
    const questions =
      QUESTION_BANK[topic] ||
      QUESTION_BANK["Continuity and Differentiability"];

    return NextResponse.json({
      success: true,
      questions: questions,
      source: "verified_question_bank",
    });
  } catch (error: any) {
    console.error("Diagnostic Route Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load diagnostic assessment." },
      { status: 500 }
    );
  }
}