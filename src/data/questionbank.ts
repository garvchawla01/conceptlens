// src/data/questionBank.ts

export interface DiagnosticQuestion {
  id: string;
  topic: string;
  question: string;
  options: { key: string; text: string }[];
  correctAnswer: string;
  conceptTag: string;
  defaultExplanation: string;
}

export const QUESTION_BANK: Record<string, DiagnosticQuestion[]> = {
  "Continuity and Differentiability": [
    {
      id: "cd_01",
      topic: "Continuity and Differentiability",
      question: "If a function f(x) is continuous at x = a, does it guarantee that f(x) is differentiable at x = a?",
      options: [
        { key: "A", text: "Yes, continuity always implies differentiability." },
        { key: "B", text: "No, continuity is a necessary condition but not sufficient." },
        { key: "C", text: "Only if the function is a polynomial." },
        { key: "D", text: "Only if the left-hand limit is zero." }
      ],
      correctAnswer: "B",
      conceptTag: "Continuity vs Differentiability Misconception",
      defaultExplanation: "Continuity does not guarantee differentiability. A classic counterexample is f(x) = |x| at x = 0, which is continuous but has a sharp corner, making it non-differentiable."
    },
    {
      id: "cd_02",
      topic: "Continuity and Differentiability",
      question: "What is the derivative of |x| at x = 0?",
      options: [
        { key: "A", text: "0" },
        { key: "B", text: "1" },
        { key: "C", text: "-1" },
        { key: "D", text: "Does not exist" }
      ],
      correctAnswer: "D",
      conceptTag: "Left Hand vs Right Hand Derivative",
      defaultExplanation: "The Left-Hand Derivative is -1 and the Right-Hand Derivative is +1. Since LHD != RHD, the derivative does not exist at x = 0."
    }
  ]
};