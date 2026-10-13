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

    const questions =
      QUESTION_BANK[topic] ||
      QUESTION_BANK["Continuity and Differentiability"];

    // Frontend ko exact format bhejo jisme score/eval data pehle se configured ho
    return NextResponse.json({
      success: true,
      questions: questions,
      score: {
        total: questions.length,
        obtained: 0
      },
      evaluation: {
        totalQuestions: questions.length,
        diagnosticSummary: "Diagnostic assessment loaded successfully."
      }
    });
  } catch (error: any) {
    console.error("Diagnostic Route Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load diagnostic assessment." },
      { status: 500 }
    );
  }
}