import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

export async function POST(req: Request) {
  try {
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured on the server." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { action, standard, board, subject, topic, questions, userAnswers, derivationText, imageData } = body;

    const model = genAI.getGenerativeModel({ model: "gemini-3.8-flash" });

    // 1. GENERATE BATTERY
    if (action === "generate_battery" || action === "generate") {
      const prompt = `You are a strict, world-class diagnostic assessment engine for STEM education (${board}, ${standard}).
Topic: ${topic} (${subject}).
Generate exactly 4 conceptual multiple-choice questions (MCQs) designed to uncover subtle misconceptions, traps, or intuitive pitfalls.
Do NOT test mere rote formula recall; test genuine reasoning.

Return ONLY a valid JSON array of 4 objects with this exact schema:
[
  {
    "id": 1,
    "question": "Question text with LaTeX math wrapped in $...$ or $$...$$",
    "options": {
      "A": "Option A with LaTeX if needed",
      "B": "Option B with LaTeX if needed",
      "C": "Option C with LaTeX if needed",
      "D": "Option D with LaTeX if needed"
    },
    "correctOption": "A",
    "conceptualFocus": "Core concept being tested"
  }
]`;

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      });

      const responseText = result.response.text();
      const parsedQuestions = JSON.parse(responseText);

      return NextResponse.json({ questions: parsedQuestions });
    }

    // 2. AUDIT BATTERY
    if (action === "audit_battery" || action === "audit") {
      const prompt = `You are a cognitive auditor for STEM reasoning.
Student was tested on: ${topic} (${subject}, ${standard}).
Questions and student responses:
${JSON.stringify({ questions, userAnswers }, null, 2)}

Analyze their selections, pinpoint their exact mental breakdown/misconception, and provide a single calibration verification task.
Return ONLY valid JSON matching this schema:
{
  "status": "completed",
  "score": <number of correctly answered questions>,
  "identifiedMisconception": "Clear explanation of where their mental logic failed, using LaTeX $...$ where relevant",
  "mentalModelShift": "Precise conceptual correction needed to fix this fallacy",
  "calibrationQuestion": "One short single-step question to verify fix",
  "calibrationExpectedProof": "Brief expected resolution"
}`;

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      });

      const parsedAudit = JSON.parse(result.response.text());
      return NextResponse.json({ audit: parsedAudit });
    }

    // 3. TRACE DERIVATION
    if (action === "trace_derivation" || action === "trace") {
      const parts: any[] = [];

      if (imageData) {
        const base64Data = imageData.split(",")[1] || imageData;
        parts.push({
          inlineData: {
            data: base64Data,
            mimeType: "image/jpeg"
          }
        });
      }

      parts.push({
        text: `Analyze this student rough work / derivation on ${topic} (${subject}).
Student text input: ${derivationText || "See attached image."}
Find the exact line/step where mathematical reasoning or calculation broke down.

Return ONLY valid JSON with this exact schema:
{
  "stepOfFailure": "Line or step where the error occurred (use LaTeX $...$)",
  "violatedPrinciple": "The mathematical axiom or law that was incorrectly applied",
  "correctedDerivation": "The accurate step-by-step resolution from that point onwards",
  "calibrationVerification": "A quick sanity check check question"
}`
      });

      const result = await model.generateContent({
        contents: [{ role: "user", parts }],
        generationConfig: { responseMimeType: "application/json" }
      });

      const parsedTrace = JSON.parse(result.response.text());
      return NextResponse.json({ trace: parsedTrace });
    }

    return NextResponse.json({ error: "Invalid action routine." }, { status: 400 });
  } catch (error: any) {
    console.error("API Route Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to execute diagnostic cognitive routine." },
      { status: 500 }
    );
  }
}