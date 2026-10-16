import { NextResponse } from "next/server";

// Helper function to call Groq API with automatic retry logic
async function generateWithRetry(promptOrParts: any, isJson: boolean = true) {
  const promptText = Array.isArray(promptOrParts)
    ? promptOrParts.map(p => p.text || JSON.stringify(p)).join("\n")
    : promptOrParts;

  const finalPrompt = isJson 
    ? `${promptText}\n\nProvide the output strictly in valid JSON format without any extra markdown or text.`
    : promptText;

  let lastError: any = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama3-8b-8192", // Groq ka fast aur free model
          messages: [{ role: "user", content: finalPrompt }],
          response_format: isJson ? { type: "json_object" } : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.statusText}`);
      }

      const data = await response.json();
      const text = data.choices[0].message.content;

      if (isJson) {
        const cleanedText = text.replace(/```json\n?|```/g, "").trim();
        return JSON.parse(cleanedText);
      }
      return text;
    } catch (err: any) {
      lastError = err;
      console.warn(`[Groq Retry] Attempt ${attempt + 1} failed:`, err?.message || err);
      await new Promise((res) => setTimeout(res, 2000));
    }
  }

  throw lastError;
}

// Main API Route Handler for ConceptLens
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { answers, subject } = body;

    // Build your prompt based on the user's answers and subject
    const prompt = `Analyze the student's answers for ${subject || "General"} and generate weak concept summaries and diagnostic recommendations based on these answers: ${JSON.stringify(answers)}`;

    const result = await generateWithRetry(prompt, true);

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("API Route Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}