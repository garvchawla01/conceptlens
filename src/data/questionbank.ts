// src/data/questionbank.ts

export interface DiagnosticQuestion {
  id: string;
  question: string;
  options: string[]; // Frontend simple array of strings expect karta hai
  correctAnswer: string;
  explanation: string;
  conceptTag: string;
}

export const QUESTION_BANK: Record<string, DiagnosticQuestion[]> = {
  "Continuity and Differentiability": [
    {
      id: "cd_01",
      question: "If a function f(x) is continuous at x = a, does it guarantee that f(x) is differentiable at x = a?",
      options: [
        "Yes, continuity always implies differentiability.",
        "No, continuity is a necessary condition but not sufficient.",
        "Only if the function is a polynomial.",
        "Only if the left-hand limit is zero."
      ],
      correctAnswer: "No, continuity is a necessary condition but not sufficient.",
      conceptTag: "Continuity vs Differentiability Misconception",
      explanation: "Continuity does not guarantee differentiability. A classic counterexample is f(x) = |x| at x = 0, which is continuous but has a sharp corner."
    },
    {
      id: "cd_02",
      question: "What is the derivative of |x| at x = 0?",
      options: [
        "0",
        "1",
        "-1",
        "Does not exist"
      ],
      correctAnswer: "Does not exist",
      conceptTag: "Left Hand vs Right Hand Derivative",
      explanation: "The Left-Hand Derivative is -1 and the Right-Hand Derivative is +1. Since LHD != RHD, the derivative does not exist at x = 0."
    }
  ]
};