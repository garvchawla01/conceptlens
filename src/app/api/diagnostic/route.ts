
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const OPENROUTER_URL =
  "https://openrouter.ai/api/v1/chat/completions";

const MODEL = "openrouter/free";

type Action =
  | "generate_battery"
  | "audit_battery"
  | "trace_derivation";

type Question = {
  id: number;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctOption: string;
  conceptualFocus: string;
};

type ChatMessage = {
  role: "user" | "system";
  content:
    | string
    | Array<
        | { type: "text"; text: string }
        | {
            type: "image_url";
            image_url: { url: string };
          }
      >;
};

function parseJson(content: string): any {
  // Remove optional Markdown fences if a model adds them.
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // Recover a JSON object if the response contains surrounding text.
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start !== -1 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }

    throw new Error("The AI returned invalid JSON. Please try again.");
  }
}

async function generateWithOpenRouter(
  messages: ChatMessage[],
  maxTokens = 1800
): Promise<any> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY is missing from your environment variables."
    );
  }

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://conceptlens.vercel.app",
      "X-OpenRouter-Title": "ConceptLens",
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.3,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();

    console.error("OpenRouter error:", response.status, errorText);

    if (response.status === 429) {
      throw new Error(
        "The AI service is rate-limited right now. Please wait a little and try again."
      );
    }

    throw new Error(
      `OpenRouter request failed (${response.status}). Please try again later.`
    );
  }

  const result = await response.json();
  const content = result?.choices?.[0]?.message?.content;

  if (typeof content !== "string" || !content.trim()) {
    throw new Error("The AI returned an empty response. Please try again.");
  }

  return parseJson(content);
}

function systemMessage(): ChatMessage {
  return {
    role: "system",
    content:
      "You are ConceptLens, a careful educational assessment assistant. " +
      "Return only a valid JSON object matching the requested structure. " +
      "Do not invent facts, do not include Markdown, and explain concepts " +
      "at the student's grade level.",
  };
}

function userMessage(prompt: string): ChatMessage {
  return { role: "user", content: prompt };
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Missing or invalid field: ${field}`);
  }

  return value.trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      action,
      standard,
      board,
      subject,
      topic,
      questions,
      userAnswers,
      derivationText,
      imageData,
    } = body;

    if (!action) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing action.",
        },
        { status: 400 }
      );
    }

    const subjectName = requireString(subject, "subject");
    const topicName = requireString(topic, "topic");

    // ---------------------------------------------------------
    // 1. Generate a diagnostic question battery
    // ---------------------------------------------------------
    if (action === "generate_battery" as Action) {
      const prompt = `
Create a diagnostic assessment for:
- Grade/Class: ${standard ?? "Not specified"}
- Board: ${board ?? "Not specified"}
- Subject: ${subjectName}
- Topic: ${topicName}

Generate 5 multiple-choice questions that test conceptual understanding,
not just memorization. Use clear, grade-appropriate language and avoid
ambiguous questions.

Return this exact JSON structure:
{
  "questions": [
    {
      "id": 1,
      "question": "Question text",
      "options": {
        "A": "Option A",
        "B": "Option B",
        "C": "Option C",
        "D": "Option D"
      },
      "correctOption": "A",
      "conceptualFocus": "Concept being tested"
    }
  ]
}

Requirements:
- Include exactly 5 questions.
- Each id must be a unique number.
- correctOption must be one of A, B, C, or D.
- All four options must be non-empty strings.
- There must be exactly one best answer per question.
- Questions must be relevant to the specified subject and topic.
`;

      const result = await generateWithOpenRouter([
        systemMessage(),
        userMessage(prompt),
      ]);

      if (!Array.isArray(result.questions) || result.questions.length === 0) {
        throw new Error("The AI did not return any diagnostic questions.");
      }

      const validQuestions: Question[] = result.questions.map(
        (q: any, index: number) => {
          if (
            !q ||
            typeof q.question !== "string" ||
            !q.options ||
            !["A", "B", "C", "D"].every(
              (key) =>
                typeof q.options[key] === "string" &&
                q.options[key].trim().length > 0
            ) ||
            !["A", "B", "C", "D"].includes(q.correctOption)
          ) {
            throw new Error(
              `The AI returned an invalid question at position ${index + 1}. Please try again.`
            );
          }

          return {
            id: Number.isFinite(Number(q.id))
              ? Number(q.id)
              : index + 1,
            question: q.question,
            options: {
              A: q.options.A,
              B: q.options.B,
              C: q.options.C,
              D: q.options.D,
            },
            correctOption: q.correctOption,
            conceptualFocus:
              typeof q.conceptualFocus === "string"
                ? q.conceptualFocus
                : topicName,
          };
        }
      );

      return NextResponse.json({
        success: true,
        questions: validQuestions,
      });
    }

    // ---------------------------------------------------------
    // 2. Audit the student's answers
    // ---------------------------------------------------------
    if (action === "audit_battery" as Action) {
      if (!Array.isArray(questions) || questions.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "No diagnostic questions were supplied for the audit.",
          },
          { status: 400 }
        );
      }

      if (
        !userAnswers ||
        typeof userAnswers !== "object" ||
        Array.isArray(userAnswers)
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Student answers are missing or invalid.",
          },
          { status: 400 }
        );
      }

      // Calculate the score from the original question keys.
      const total = questions.length;
      let correct = 0;

      const answerReview = questions.map((q: any, index: number) => {
        const answer =
          userAnswers[q.id] ??
          userAnswers[String(q.id)] ??
          userAnswers[index];

        const selectedOption =
          typeof answer === "string" ? answer.trim().toUpperCase() : "";

        const isCorrect =
          selectedOption ===
          String(q.correctOption ?? "").trim().toUpperCase();

        if (isCorrect) correct++;

        return {
          id: q.id ?? index + 1,
          question: q.question,
          options: q.options,
          conceptualFocus: q.conceptualFocus,
          correctOption: q.correctOption,
          studentAnswer: selectedOption || "Unanswered",
          isCorrect,
        };
      });

      const score = Math.round((correct / total) * 100);

      const prompt = `
Audit this student's diagnostic assessment.

Class: ${standard ?? "Not specified"}
Board: ${board ?? "Not specified"}
Subject: ${subjectName}
Topic: ${topicName}

Question-by-question review:
${JSON.stringify(answerReview, null, 2)}

Verified score: ${score}% (${correct} correct out of ${total}).

Return this JSON structure:
{
  "audit": {
    "status": "A concise performance label",
    "score": ${score},
    "identifiedMisconception": "Specific misconception supported by the answers",
    "mentalModelShift": "A useful explanation or learning strategy to help correct the misconception",
    "calibrationQuestion": "One short follow-up question to test understanding",
    "calibrationExpectedProof": "What a correct explanation should demonstrate"
  }
}

Requirements:
- Use the verified score exactly as supplied.
- Base the misconception on the actual incorrect or unanswered items.
- If the answers do not establish a clear misconception, say so rather than guessing.
- Give supportive, actionable feedback.
- Do not claim to know the student's reasoning unless the answers support it.
- Return valid JSON only.
`;

      const result = await generateWithOpenRouter([
        systemMessage(),
        userMessage(prompt),
      ]);

      if (!result.audit || typeof result.audit !== "object") {
        throw new Error("The AI returned an invalid audit report.");
      }

      // The model cannot override the score calculated above.
      const audit = {
        status:
          typeof result.audit.status === "string"
            ? result.audit.status
            : "Assessment complete",
        score,
        identifiedMisconception:
          typeof result.audit.identifiedMisconception === "string"
            ? result.audit.identifiedMisconception
            : "There is not enough evidence to identify a specific misconception.",
        mentalModelShift:
          typeof result.audit.mentalModelShift === "string"
            ? result.audit.mentalModelShift
            : "Review the concepts behind the questions you missed.",
        calibrationQuestion:
          typeof result.audit.calibrationQuestion === "string"
            ? result.audit.calibrationQuestion
            : "Can you explain the main idea in your own words?",
        calibrationExpectedProof:
          typeof result.audit.calibrationExpectedProof === "string"
            ? result.audit.calibrationExpectedProof
            : "A clear explanation that demonstrates conceptual understanding.",
      };

      return NextResponse.json({
        success: true,
        audit,
      });
    }

    // ---------------------------------------------------------
    // 3. Trace a derivation or explanation
    // ---------------------------------------------------------
    if (action === "trace_derivation" as Action) {
      const derivation =
        typeof derivationText === "string" ? derivationText.trim() : "";

      const hasImage =
        typeof imageData === "string" && imageData.trim().length > 0;

      if (!derivation && !hasImage) {
        return NextResponse.json(
          {
            success: false,
            error: "Provide a derivation as text or upload an image.",
          },
          { status: 400 }
        );
      }

      const prompt = `
Analyze this student's derivation or worked solution.

Subject: ${subjectName}
Topic: ${topicName}

Student's written derivation:
${derivation || "The student supplied an image. Read the work shown in it."}

Return this JSON structure:
{
  "trace": {
    "stepOfFailure": "The first incorrect step, or state that no error is identifiable",
    "violatedPrinciple": "The mathematical or subject principle involved",
    "correctedDerivation": "A corrected derivation with clear steps",
    "calibrationVerification": "A short question or check to verify understanding"
  }
}

Requirements:
- Find the earliest identifiable error, not merely a later consequence.
- If the work is correct or the image/text is unclear, say so.
- Never invent a step that is not visible or provided.
- Explain corrections at the student's level.
- Return valid JSON only.
`;

      let message: ChatMessage;

      if (hasImage) {
        // imageData may be a data URL or raw base64.
        const imageUrl = imageData.startsWith("data:")
          ? imageData
          : `data:image/jpeg;base64,${imageData}`;

        message = {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: { url: imageUrl },
            },
          ],
        };
      } else {
        message = userMessage(prompt);
      }

      const result = await generateWithOpenRouter(
        [systemMessage(), message],
        2200
      );

      if (!result.trace || typeof result.trace !== "object") {
        throw new Error("The AI returned an invalid derivation trace.");
      }

      const trace = {
        stepOfFailure:
          typeof result.trace.stepOfFailure === "string"
            ? result.trace.stepOfFailure
            : "The first incorrect step could not be identified.",
        violatedPrinciple:
          typeof result.trace.violatedPrinciple === "string"
            ? result.trace.violatedPrinciple
            : "The relevant principle could not be identified.",
        correctedDerivation:
          typeof result.trace.correctedDerivation === "string"
            ? result.trace.correctedDerivation
            : "Please review the supplied derivation and try again.",
        calibrationVerification:
          typeof result.trace.calibrationVerification === "string"
            ? result.trace.calibrationVerification
            : "Can you explain why each step follows from the previous one?",
      };

      return NextResponse.json({
        success: true,
        trace,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: `Unsupported action: ${String(action)}`,
      },
      { status: 400 }
    );
  } catch (error: unknown) {
    console.error("ConceptLens diagnostic API error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "An unexpected server error occurred.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
