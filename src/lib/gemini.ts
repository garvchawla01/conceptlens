import { GoogleGenAI } from '@google/genai';

// Initialize the Google Gen AI client with your API key
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Models list: Primary model followed by fallback models
const MODELS = ['gemini-3.8-flash', 'gemini-2.5-flash'];

// Helper function to handle delays (exponential backoff)
async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generates content using Gemini with built-in retry logic and model fallback for 503 errors.
 * @param prompt The text prompt to send to the model
 * @param modelIndex Current index in the MODELS array (internal use for recursion)
 */
export async function generateWithRetry(prompt: string, modelIndex = 0): Promise<string> {
  const currentModel = MODELS[modelIndex];

  try {
    const response = await ai.models.generateContent({
      model: currentModel,
      contents: prompt,
    });

    if (!response.text) {
      throw new Error("Received empty response from Gemini API.");
    }

    return response.text;
  } catch (error: any) {
    // Check if the error is a 503 Service Unavailable / Overloaded error
    const isOverloaded = 
      error?.status === 503 || 
      error?.message?.includes('503') || 
      error?.message?.includes('high demand') ||
      error?.message?.includes('overloaded');

    if (isOverloaded) {
      console.warn(`[Gemini] Model ${currentModel} is busy (503). Attempting retry or fallback...`);

      // If there's another backup model in the list, try it after a short delay
      if (modelIndex < MODELS.length - 1) {
        await wait(2000); // Wait 2 seconds before switching model
        return generateWithRetry(prompt, modelIndex + 1);
      } else {
        // If all models failed, wait 3 seconds and give the primary model one last try
        await wait(3000);
        try {
          const finalAttempt = await ai.models.generateContent({
            model: MODELS[0],
            contents: prompt,
          });
          
          if (finalAttempt.text) return finalAttempt.text;
        } catch (finalError) {
          // Fallthrough to final error throw below
        }

        throw new Error("Server is heavily overloaded right now (503). Please try again in a moment.");
      }
    }

    // If it's any other error (like invalid API key or bad request), throw it immediately
    throw error;
  }
}