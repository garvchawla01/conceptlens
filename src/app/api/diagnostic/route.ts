import { NextResponse } from "next/server";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "openrouter/free";

async function generateWithOpenRouter(promptText: string) {
  const finalPrompt = `${promptText}\n\nStrictly reply with ONLY a raw JSON object containing a 'questions' array. Do not wrap it in markdown or any other conversational text.`;

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
      messages: [{ role: "user", content: finalPrompt }],
      temperature: 0.2,
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
    // Sabse pehle standard markdown clean karein
    let cleaned = content.replace(/```json\n?|```/g, "").trim();
    
    // Agar phir bhi extra text ho, toh regex se sirf JSON object ({ ... }) ya array ([ ... ]) extract karein
    const jsonMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }

    const parsed = JSON.parse(cleaned);
    
    // Ensure format is always { questions: [...] }
    if (Array.isArray(parsed)) {
      return { questions: parsed };
    }
    if (!parsed.questions && typeof parsed === "object") {
      // Agar AI ne koi aur key di ho, toh pehli array wali key ko questions maan lo
      const possibleArray = Object.values(parsed.questions || parsed).find(val => Array.isArray(val));
      if (possibleArray) {
        return { questions: possibleArray };
      }
    }

    return parsed;
  } catch (e) {
    console.error("Failed to parse JSON from OpenRouter:", content);
    throw new Error("AI returned invalid JSON format.");
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { answers, subject, standard, board, chapter } = body;

    const prompt = `Generate a diagnostic assessment JSON for Class ${standard}, Board ${board}, Subject ${subject}, Chapter ${chapter}. Provide multiple-choice questions with options, correct answer, and explanation. Student context: ${JSON.stringify(answers)}`;

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