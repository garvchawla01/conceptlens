
import { NextResponse } from "next/server";

const OPENROUTER_URL =
  "https://openrouter.ai/api/v1/chat/completions";

const MODEL = "openrouter/free";

type JsonObject = Record<string, any>;

class AIResponseError extends Error {}

function extractJsonObject(content: string): JsonObject {
  // Remove Markdown code fences.
  const cleaned = content
    .replace(/^\uFEFF/, "")
    .replace(/```(?:json)?/gi, "")
    .trim();

  // Find the first complete JSON object while respecting
  // quoted strings, escaped quotes, and nested objects.
  const start = cleaned.indexOf("{");

  if (start === -1) {
    throw new AIResponseError(
      "The AI did not return a JSON object."
    );
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < cleaned.length; i++) {
    const char = cleaned[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }

      continue;
    }

    if (char === '"') {
      inString = true;
    } else if (char === "{") {
      depth++;
    } else if (char === "}") {
      depth--;

      if (depth === 0) {
        const parsed = JSON.parse(
          cleaned.slice(start, i + 1)
        );

        if (
          !parsed ||
          typeof parsed !== "object" ||
          Array.isArray(parsed)
        ) {
          throw new AIResponseError(
            "The AI returned an unexpected JSON structure."
          );
        }

        return parsed as JsonObject;
      }
    }
  }

  throw new AIResponseError(
    "The AI returned incomplete JSON. Please try again."
  );
}

async function askAI(
  prompt: string,
  imageData?: string | null
): Promise<JsonObject> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY is missing from your environment variables."
    );
  }

  const userContent: any = imageData
    ? [
        { type: "text", text: prompt },
        {
          type: "image_url",
          image_url: { url: imageData },
        },
      ]
    : prompt;

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://conceptlens-gold.vercel.app",
      "X-Title": "ConceptLens",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are ConceptLens, an expert educational AI. Generate original educational content from your own knowledge. Follow the requested JSON schema exactly. Do not include Markdown, code fences, or explanations outside the JSON.",
        },
        {
          role: "user",
          content: userContent,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
      max_tokens: 5000,
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    const details = await response.text();

    console.error("OpenRouter API error:", {
      status: response.status,
      details,
    });

    throw new Error(
      `AI provider returned HTTP ${response.status}. Check your OpenRouter API key, model availability, and provider logs.`
    );
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  const content = choice?.message?.content;

  if (typeof content !== "string" || !content.trim()) {
    console.error("Empty AI response:", data);

    if (choice?.finish_reason === "length") {
      throw new AIResponseError(
        "The AI response was cut off. Please try again."
      );
    }

    throw new AIResponseError(
      "The AI returned an empty response. Please try again."
    );
  }

  if (choice?.finish_reason === "length") {
    console.error("AI output was truncated:", content);

    throw new AIResponseError(
      "The AI response was incomplete. Please try again."
    );
  }

  try {
    return extractJsonObject(content);
  } catch (error) {
    console.error("AI JSON parsing failed:", {
      error:
        error instanceof Error
          ? error.message
          : String(error),
      content,
      finishReason: choice?.finish_reason,
    });

    throw new AIResponseError(
      error instanceof Error
        ? error.message
        : "The AI returned invalid JSON. Please try again."
    );
  }
}

function requiredText(
  value: unknown,
  field: string
): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} is required.`);
  }

  return value.trim();
}

function normalizeQuestions(input: unknown[]): JsonObject[] {
  const letters = ["A", "B", "C", "D"];

  return input.map((item: any, index: number) => {
    if (!item || typeof item !== "object") {
      throw new AIResponseError(
        `Question ${index + 1} has an invalid structure.`
      );
    }

    const rawOptions = item.options;

    const options: Record<string, string> =
      Array.isArray(rawOptions)
        ? {
            A: rawOptions[0],
            B: rawOptions[1],
            C: rawOptions[2],
            D: rawOptions[3],
          }
        : {
            A: rawOptions?.A,
            B: rawOptions?.B,
            C: rawOptions?.C,
            D: rawOptions?.D,
          };

    if (
      typeof item.question !== "string" ||
      !item.question.trim() ||
      letters.some(
        (letter) =>
          typeof options[letter] !== "string" ||
          !options[letter].trim()
      )
    ) {
      throw new AIResponseError(
        `Question ${index + 1} has invalid text or options.`
      );
    }

    const optionValues = letters.map((letter) =>
      options[letter].trim()
    );

    if (
      new Set(
        optionValues.map((value) => value.toLowerCase())
      ).size !== 4
    ) {
      throw new AIResponseError(
        `Question ${index + 1} must have four distinct options.`
      );
    }

    const answer =
      item.correctOption ?? item.correctAnswer;

    let correctOption = "";

    if (typeof answer === "string") {
      const normalizedAnswer = answer.trim();

      if (letters.includes(normalizedAnswer.toUpperCase())) {
        correctOption = normalizedAnswer.toUpperCase();
      } else {
        correctOption =
          letters.find(
            (letter) =>
              options[letter].trim() === normalizedAnswer
          ) ?? "";
      }
    }

    if (!correctOption) {
      throw new AIResponseError(
        `Question ${index + 1} has an invalid correct answer.`
      );
    }

    return {
  id: index + 1,
  question: item.question.trim(),
  options,
  correctOption,
  conceptualFocus:
    typeof item.conceptualFocus === "string"
      ? item.conceptualFocus
      : "Conceptual understanding",
  explanation:
    typeof item.explanation === "string"
      ? item.explanation.trim()
           : "Review the correct answer to reinforce your conceptual understanding.",
    };
  });
}


export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = body.action;

    // ACTION 1: Generate original diagnostic questions.
    if (action === "generate_battery") {
      const standard = requiredText(
        body.standard,
        "Standard"
      );
      const board = requiredText(body.board, "Board");
      const subject = requiredText(
        body.subject,
        "Subject"
      );
      const topic = requiredText(
        body.topic ?? body.chapter,
        "Topic"
      );

      const prompt = `
Generate exactly 5 original diagnostic multiple-choice questions.

Use your own subject knowledge. No predefined question bank
is available or required.

STUDENT DETAILS
Class: ${standard}
Board: ${board}
Subject: ${subject}
Topic: ${topic}

REQUIREMENTS
1. Match the requested class level and curriculum.
2. Test conceptual understanding, reasoning, and application.
3. Create five distinct questions relevant to the topic.
4. Give exactly four distinct options per question.
5. Ensure exactly one correct answer per question.
6. Verify every answer before returning it.
7. Do not include answer explanations in the student-facing questions.
8. Return JSON only, with no Markdown or additional text.
9. Include a concise explanation for each question explaining why the correctOption is correct, using clear conceptual reasoning rather than simply repeating the answer.
10. The explanation must be suitable for showing to the student after the assessment is completed; do not reveal it in the question or answer choices before submission.

REQUIRED JSON SCHEMA
{
  "questions": [
    {
      "question": "Question text",
      "options": {
        "A": "First option",
        "B": "Second option",
        "C": "Third option",
        "D": "Fourth option"
      },
      "correctOption": "A",
      "conceptualFocus": "Concept being tested",
      "explanation": "Why the correct answer is correct"
    }
  ]
}

Return exactly five question objects.
`;

      const result = await askAI(prompt);

      if (!Array.isArray(result.questions)) {
        console.error(
          "Missing questions array in AI response:",
          result
        );

        throw new AIResponseError(
          "The AI response did not contain a questions array. Please try again."
        );
      }

      if (result.questions.length < 5) {
        throw new AIResponseError(
          `The AI generated only ${result.questions.length} questions. Please try again.`
        );
      }

      const questions = normalizeQuestions(
        result.questions.slice(0, 5)
      );

      return NextResponse.json({
        success: true,
        questions,
      });
    }

    // ACTION 2: Audit the student's answers.
    if (action === "audit_battery") {
      const standard = requiredText(
        body.standard,
        "Standard"
      );
      const board = requiredText(body.board, "Board");
      const subject = requiredText(
        body.subject,
        "Subject"
      );
      const topic = requiredText(body.topic, "Topic");
      const questions = body.questions;
      const userAnswers = body.userAnswers;

      if (
        !Array.isArray(questions) ||
        questions.length === 0 ||
        !userAnswers ||
        typeof userAnswers !== "object" ||
        Array.isArray(userAnswers)
      ) {
        throw new Error(
          "Questions and student answers are required for the audit."
        );
      }

      const score = questions.filter(
        (question: any) =>
          userAnswers[question.id] ===
          question.correctOption
      ).length;

      const prompt = `
Analyze this student's diagnostic assessment.

Class: ${standard}
Board: ${board}
Subject: ${subject}
Topic: ${topic}

Assessment data:
${JSON.stringify(
  questions.map((question: any) => ({
    question: question.question,
    options: question.options,
    correctOption: question.correctOption,
    conceptualFocus: question.conceptualFocus,
    studentAnswer:
      userAnswers[question.id] ?? null,
  }))
)}

Verified score: ${score} out of ${questions.length}.

Identify misconception patterns using the student's actual
answers. Do not invent evidence or claim certainty when the
answers do not provide enough evidence.

Return ONLY this JSON:
{
  "status": "Short assessment summary",
  "identifiedMisconception": "Evidence-based analysis",
  "mentalModelShift": "How the student should rethink the concept",
  "calibrationQuestion": "A short follow-up question",
  "calibrationExpectedProof": "Expected reasoning"
}
`;

      const audit = await askAI(prompt);

      const requiredFields = [
        "status",
        "identifiedMisconception",
        "mentalModelShift",
        "calibrationQuestion",
        "calibrationExpectedProof",
      ];

      for (const field of requiredFields) {
        if (typeof audit[field] !== "string") {
          throw new AIResponseError(
            `The audit response is missing "${field}". Please try again.`
          );
        }
      }

      return NextResponse.json({
        success: true,
        audit: {
          ...audit,
          score,
        },
      });
    }

    // ACTION 3: Trace a written or photographed derivation.
    if (action === "trace_derivation") {
      const topic =
        typeof body.topic === "string" &&
        body.topic.trim()
          ? body.topic.trim()
          : "General STEM";

      const subject =
        typeof body.subject === "string" &&
        body.subject.trim()
          ? body.subject.trim()
          : "General Science";

      const derivationText =
        typeof body.derivationText === "string"
          ? body.derivationText.trim()
          : "";

      const imageData =
        typeof body.imageData === "string"
          ? body.imageData
          : null;

      if (!derivationText && !imageData) {
        throw new Error(
          "Provide derivation steps or a notebook image."
        );
      }

      const prompt = `
You are a careful mathematics and science tutor.

Subject: ${subject}
Topic: ${topic}

Student's written work:
${derivationText || "Analyze the attached notebook image."}

Find the earliest demonstrable error, if one exists.
Explain the relevant principle and correct the reasoning.
If the work is correct or the image is unreadable, state that
honestly. Never invent steps that are not visible or provided.

Return ONLY this JSON:
{
  "stepOfFailure": "First incorrect step, or state that no error is evident",
  "violatedPrinciple": "Relevant rule and explanation",
  "correctedDerivation": "Correct reasoning",
  "calibrationVerification": "A short understanding check"
}
`;

      let trace: Record<string, any>;

try {
  trace = await askAI(prompt, imageData);
} catch (error) {
  console.error("Doubt Tracer AI failure:", error);
  throw error;
}
      

      const requiredFields = [
        "stepOfFailure",
        "violatedPrinciple",
        "correctedDerivation",
        "calibrationVerification",
      ];

      for (const field of requiredFields) {
        if (typeof trace[field] !== "string") {
          throw new AIResponseError(
            `The derivation response is missing "${field}". Please try again.`
          );
        }
      }

      return NextResponse.json({
        success: true,
        trace,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error:
          "Unknown action. Check the action sent by the frontend.",
      },
      { status: 400 }
    );
  } catch (error: unknown) {
    console.error("Diagnostic API error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "An unexpected server error occurred.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      {
        status:
          error instanceof AIResponseError
            ? 502
            : 500,
      }
    );
  }
}
