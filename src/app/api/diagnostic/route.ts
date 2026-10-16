import { NextResponse } from "next/server";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "openrouter/free";

async function generateWithOpenRouter(promptText: string) {
  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://conceptlens.vercel.app",
      "X-Title": "ConceptLens",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: "You are an expert curriculum designer and AI teacher. Your task is to dynamically generate a diagnostic assessment JSON based on the requested subject, chapter, standard, and board. Never use hardcoded templates; use your own knowledge to create fresh, conceptual questions."
        },
        { role: "user", content: promptText }
      ],
      temperature: 0.4,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API failed: ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Empty response received from AI model.");
  }

  try {
    let cleaned = content.replace(/```json\n?|```/g, "").trim();
    const jsonMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }

    const parsed = JSON.parse(cleaned);

    if (Array.isArray(parsed)) {
      return { questions: parsed };
    }
    if (typeof parsed === "object" && parsed !== null) {
      if (Array.isArray(parsed.questions)) {
        return parsed;
      }
      const foundArrayKey = Object.keys(parsed).find(key => Array.isArray(parsed[key]));
      if (foundArrayKey) {
        return { questions: parsed[foundArrayKey] };
      }
      return { questions: [parsed] };
    }

    return { questions: [] };
  } catch (e) {
    console.error("Failed to parse JSON from OpenRouter:", content);
    throw new Error("AI returned invalid JSON format.");
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { answers, subject, standard, board, chapter } = body;

    const prompt = `Generate a diagnostic assessment for:
- Standard: Class ${standard}
- Board: ${board}
- Subject: ${subject}
- Chapter: ${chapter}
- Student context: ${JSON.stringify(answers)}

Return ONLY a valid JSON object containing a root key "questions" which is an array of 5 multiple-choice questions. Each question object in the array must strictly have:
1. "question": string (the question text)
2. "options": array of 4 string choices
3. "correctAnswer": string (the correct option)
4. "explanation": string (why it is correct)`;

    const result = await generateWithOpenRouter(prompt);

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("API Route Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}