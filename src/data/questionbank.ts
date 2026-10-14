import { MCQQuestion, Chapter } from "./curricula";

// Static imports for Class 9 datasets
import c9Maths from "@/data/questions/class9/mathematics.json";
import c9Science from "@/data/questions/class9/science.json";
import c9Sst from "@/data/questions/class9/sst.json";
import c9English from "@/data/questions/class9/english.json";
import c9Hindi from "@/data/questions/class9/hindi.json";

// Static imports for Class 10 datasets
import c10Maths from "@/data/questions/class10/mathematics.json";
import c10Science from "@/data/questions/class10/science.json";
import c10Sst from "@/data/questions/class10/sst.json";
import c10English from "@/data/questions/class10/english.json";
import c10Hindi from "@/data/questions/class10/hindi.json";

/**
 * Loads and flattens MCQ questions for any supported class and subject.
 */
export async function loadSubjectQuestions(classNum: number, subject: string): Promise<MCQQuestion[]> {
  try {
    const sub = subject.toLowerCase().trim();
    let rawData: any = null;

    if (classNum === 9) {
      if (sub === "mathematics" || sub === "maths") rawData = c9Maths;
      else if (sub === "science") rawData = c9Science;
      else if (sub === "sst" || sub === "social science") rawData = c9Sst;
      else if (sub === "english") rawData = c9English;
      else if (sub === "hindi") rawData = c9Hindi;
    } else if (classNum === 10) {
      if (sub === "mathematics" || sub === "maths") rawData = c10Maths;
      else if (sub === "science") rawData = c10Science;
      else if (sub === "sst" || sub === "social science") rawData = c10Sst;
      else if (sub === "english") rawData = c10English;
      else if (sub === "hindi") rawData = c10Hindi;
    }

    if (!rawData) {
      console.warn(`No question bank registered for Class ${classNum} - ${subject}`);
      return [];
    }

    // 1. Handle standard chapter-based schema (e.g., Class 9/10 Maths, Science, SST)
    if (rawData.chapters && Array.isArray(rawData.chapters)) {
      return rawData.chapters.flatMap((ch: Chapter) => ch.questions || []);
    }

    // 2. Handle topic-dictionary schema (e.g., Class 9/10 English and Hindi grammar/topics)
    if (typeof rawData === "object" && !Array.isArray(rawData)) {
      const allQuestions: MCQQuestion[] = [];
      for (const topicKey of Object.keys(rawData)) {
        if (Array.isArray(rawData[topicKey])) {
          allQuestions.push(...rawData[topicKey]);
        }
      }
      if (allQuestions.length > 0) return allQuestions;
    }

    // 3. Fallback for direct array exports
    if (Array.isArray(rawData)) {
      return rawData;
    }

    return [];
  } catch (error) {
    console.error(`Failed to load question bank for Class ${classNum} ${subject}:`, error);
    return [];
  }
}