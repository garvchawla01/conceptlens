import { NextResponse } from "next/server";

async function generateWithGroq(promptText: string) {
  const finalPrompt = `${promptText}\n\nIMPORTANT: You must return ONLY a valid JSON object. No extra text, no markdown code blocks like \`\`\`json, just the raw JSON.`;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant", // Yahan updated active model daal diya hai
      messages: [{ role: "user", content: finalPrompt }],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API failed: ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  try {
    const cleaned = content.replace(/```json\n?|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("Failed to parse JSON from Groq:", content);
    throw new Error("AI returned invalid JSON format.");
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { answers, subject, standard, board, chapter } = body;

    const prompt = `Generate a diagnostic assessment in JSON format with questions, weak concept summaries, and recommendations for Class ${standard}, Board ${board}, Subject ${subject}, Chapter ${chapter}. Student context: ${JSON.stringify(answers)}`;

    const result = await generateWithGroq(prompt);

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("API Route Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}