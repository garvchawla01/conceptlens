import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";

const engine = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
});

const ACTIVE_MODEL = "gemini-3.8-flash";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      action,
      studentClass,
      board,
      subject,
      rawTopic,
      quizData,
      studentAnswers,
      problemStatement,
      studentSteps,
      imageBase64,
      imageMimeType,
      questionText,
      hint,
      studentAnswer,
    } = body;

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "API Key missing in environment." },
        { status: 500 }
      );
    }

    // 1. FAST MCQ GENERATION
    if (action === "generate_quiz") {
      const response = await engine.models.generateContent({
        model: ACTIVE_MODEL,
        contents: `Create exactly 4 short conceptual MCQ questions for ${board} ${studentClass} ${subject} on topic "${rawTopic}".
Target 4 distinct classic traps/misconceptions.
MANDATORY RULE: If the subject is Hindi, generate questions and options in grammatically correct Hindi (Devanagari script).
MANDATORY LATEX RULE: Wrap ALL mathematical formulas, fractions, limits, powers, variables, and physics expressions strictly in dollar signs like $...$ (e.g. $\\lim_{x \\to 0} \\frac{|x|}{x}$, $F = \\mu N$, $x^2$). Keep question statements concise and conceptual.`,
        config: {
          thinkingConfig: { thinkingBudget: 0 },
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              normalizedTopic: { type: Type.STRING },
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.INTEGER },
                    question: { type: Type.STRING },
                    options: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          id: { type: Type.STRING },
                          text: { type: Type.STRING },
                        },
                        required: ["id", "text"],
                      },
                    },
                    correctOption: { type: Type.STRING },
                    conceptTested: { type: Type.STRING },
                  },
                  required: ["id", "question", "options", "correctOption", "conceptTested"],
                },
              },
            },
            required: ["normalizedTopic", "questions"],
          },
        },
      });

      const raw = response.text?.trim();
      if (!raw) throw new Error("Empty diagnostic question payload received.");
      return NextResponse.json({ success: true, data: JSON.parse(raw) });
    }

    // 2. FAST MCQ PATTERN AUDIT
    if (action === "analyze_quiz") {
      const response = await engine.models.generateContent({
        model: ACTIVE_MODEL,
        contents: `Standard: ${board} ${studentClass} ${subject}. Topic: "${rawTopic}".
Questions: ${JSON.stringify(quizData)}
Student Choices: ${JSON.stringify(studentAnswers)}

Diagnose succinctly: score, vulnerable sub-topics, why wrong options were selected, remedial framework, and 2 quick follow-up calibration checks.
If Hindi subject, provide the feedback and diagnosis in Hindi.
Wrap any mathematical formulas inside single dollar signs $...$.`,
        config: {
          thinkingConfig: { thinkingBudget: 0 },
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.INTEGER },
              total: { type: Type.INTEGER },
              weakSubTopics: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              misconceptionsIdentified: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    questionNumber: { type: Type.INTEGER },
                    wrongChoice: { type: Type.STRING },
                    misconception: { type: Type.STRING },
                  },
                  required: ["questionNumber", "wrongChoice", "misconception"],
                },
              },
              conceptualRemediation: { type: Type.STRING },
              remedialPracticeQuestions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING },
                    hint: { type: Type.STRING },
                  },
                  required: ["question", "hint"],
                },
              },
            },
            required: [
              "score",
              "total",
              "weakSubTopics",
              "misconceptionsIdentified",
              "conceptualRemediation",
              "remedialPracticeQuestions",
            ],
          },
        },
      });

      const raw = response.text?.trim();
      if (!raw) throw new Error("Empty analysis payload received.");
      return NextResponse.json({ success: true, data: JSON.parse(raw) });
    }

    // 3. DEEP TRACE & REASONING
    if (action === "trace_doubt") {
      const promptText = `Academic Context: ${board} ${studentClass} ${subject} - Topic: "${rawTopic}".
Problem Statement / Question context:
"${problemStatement || "Inspect the problem statement inside the attached image directly."}"

Student's Attempted Derivation / Steps:
"${studentSteps || "Examine the handwritten steps and drawings visible in the attached image."}"

Carefully evaluate the math, logic, grammar, or conceptual reasoning step-by-step.
Pinpoint the exact step or line where the reasoning broke, explain the root violated concept, provide the correct derivation/solution, and offer 1 validation test question.
Wrap every formula or equation in dollar signs $...$.`;

      const contentsPayload: any[] = [];

      if (imageBase64 && imageMimeType) {
        contentsPayload.push({
          inlineData: {
            mimeType: imageMimeType,
            data: imageBase64,
          },
        });
      }

      contentsPayload.push(promptText);

      const response = await engine.models.generateContent({
        model: ACTIVE_MODEL,
        contents: contentsPayload,
        config: {
          thinkingConfig: { thinkingBudget: 1024 },
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              exactBreakPoint: { type: Type.STRING },
              rootDeficiency: { type: Type.STRING },
              stepByStepCorrection: { type: Type.STRING },
              verificationCheck: { type: Type.STRING },
            },
            required: ["exactBreakPoint", "rootDeficiency", "stepByStepCorrection", "verificationCheck"],
          },
        },
      });

      const raw = response.text?.trim();
      if (!raw) throw new Error("Empty tracer report received.");
      return NextResponse.json({ success: true, data: JSON.parse(raw) });
    }

    // 4. FAST REMEDIAL EXERCISE VERIFICATION
    if (action === "verify_remediation") {
      const response = await engine.models.generateContent({
        model: ACTIVE_MODEL,
        contents: `Academic Context: ${board} ${studentClass} ${subject} - Topic: "${rawTopic}".
Question: "${questionText}"
Reference Hint/Anchor: "${hint}"
Student's Submitted Answer: "${studentAnswer}"

Evaluate strictly whether the student's answer or approach is conceptually correct.
Wrap any mathematical formulas or variables in dollar signs $...$.`,
        config: {
          thinkingConfig: { thinkingBudget: 0 },
          maxOutputTokens: 1000,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isCorrect: { type: Type.BOOLEAN },
              verdictTitle: { type: Type.STRING },
              conciseFeedback: { type: Type.STRING },
            },
            required: ["isCorrect", "verdictTitle", "conciseFeedback"],
          },
        },
      });

      const raw = response.text?.trim();
      if (!raw) throw new Error("Empty verification payload.");
      return NextResponse.json({ success: true, data: JSON.parse(raw) });
    }

    return NextResponse.json({ error: "Invalid action routine." }, { status: 400 });
  } catch (error: any) {
    console.error("Diagnostic execution error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process diagnostic operation." },
      { status: 500 }
    );
  }
}