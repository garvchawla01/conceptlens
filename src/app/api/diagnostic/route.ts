import { NextResponse } from "next/server";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "openrouter/free";

async function generateWithOpenRouter(promptText: string) {
  const finalPrompt = `${promptText}\n\nIMPORTANT: You must return ONLY a valid JSON object. No extra text, no markdown code blocks like \`\`\`json, just the raw JSON.`;

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
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API failed: ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  try {
    const cleaned = content.replace(/```json\n?|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("Failed to parse JSON from OpenRouter:", content);
    throw new Error("AI returned invalid JSON format.");
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { answers, subject, standard, board, chapter } = body;

    const prompt = `Generate a diagnostic assessment in JSON format with questions, weak concept summaries, and recommendations for Class ${standard}, Board ${board}, Subject ${subject}, Chapter ${chapter}. Student context: ${JSON.stringify(answers)}`;

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