"use client";

import React, { useState } from "react";
import MathRenderer from "@/components/MathRenderer";

interface DiagnosticQuestion {
  id: string;
  question: string;
  options: string[] | { key?: string; text?: string; label?: string }[];
  correctAnswer: string;
  explanation?: string;
  conceptTag?: string;
}

interface AssessmentResult {
  score: {
    total: number;
    obtained: number;
    percentage: number;
  };
  answers: Record<number, string>;
  details: {
    questionIndex: number;
    question: string;
    selected: string;
    correct: string;
    isCorrect: boolean;
    explanation?: string;
    conceptTag?: string;
  }[];
  weakConcepts: string[];
}

export default function ConceptLensDashboard() {
  const [standard, setStandard] = useState("Class 12");
  const [board, setBoard] = useState("CBSE (NCERT)");
  const [subject, setSubject] = useState("Mathematics");
  const [topic, setTopic] = useState("Continuity and Differentiability");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [questions, setQuestions] = useState<DiagnosticQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [result, setResult] = useState<AssessmentResult | null>(null);

  // Per-question AI diagnosis loading & results
  const [aiDiagnoses, setAiDiagnoses] = useState<Record<number, string>>({});
  const [loadingAi, setLoadingAi] = useState<Record<number, boolean>>({});

  const getOptionText = (opt: any): string => {
    if (typeof opt === "string") return opt;
    if (opt && typeof opt === "object") {
      return opt.text || opt.label || opt.key || JSON.stringify(opt);
    }
    return String(opt);
  };

  const getOptionKey = (opt: any, index: number): string => {
    const letters = ["A", "B", "C", "D", "E"];
    if (typeof opt === "string") return opt;
    if (opt && typeof opt === "object") {
      return opt.key || opt.text || letters[index] || String(index);
    }
    return letters[index] || String(index);
  };

  const handleStartAssessment = async () => {
    setLoading(true);
    setErrorMessage(null);
    setResult(null);
    setSelectedAnswers({});
    setCurrentIndex(0);
    setAiDiagnoses({});

    try {
      const res = await fetch("/api/diagnostic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grade: standard,
          board,
          subject,
          topic,
          chapter: topic,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load diagnostic assessment.");
      }

      if (!data.questions || data.questions.length === 0) {
        throw new Error("No diagnostic questions found for this topic.");
      }

      setQuestions(data.questions);
    } catch (err: any) {
      setErrorMessage(err?.message || "Something went wrong while starting the test.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (optKey: string) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentIndex]: optKey,
    }));
  };

  const handleSubmitAssessment = () => {
    try {
      let obtained = 0;
      const weakList: string[] = [];

      const details = questions.map((q, idx) => {
        const userChoice = selectedAnswers[idx] || "";
        const correct = q.correctAnswer || "";

        const isMatch =
          userChoice.trim().toLowerCase() === correct.trim().toLowerCase() ||
          userChoice.startsWith(correct) ||
          correct.startsWith(userChoice);

        if (isMatch && userChoice !== "") {
          obtained += 1;
        } else {
          if (q.conceptTag && !weakList.includes(q.conceptTag)) {
            weakList.push(q.conceptTag);
          }
        }

        return {
          questionIndex: idx,
          question: q.question,
          selected: userChoice || "Not Answered",
          correct: correct,
          isCorrect: Boolean(isMatch && userChoice !== ""),
          explanation: q.explanation,
          conceptTag: q.conceptTag,
        };
      });

      const total = questions.length;
      const percentage = Math.round((obtained / (total || 1)) * 100);

      setResult({
        score: { total, obtained, percentage },
        answers: selectedAnswers,
        details,
        weakConcepts: weakList,
      });
    } catch (err: any) {
      setErrorMessage("Error evaluating assessment score.");
    }
  };

  // Trigger Targeted AI Deep Dive for Weak Concept
  const handleFetchAiDiagnosis = async (idx: number, item: any) => {
    setLoadingAi((prev) => ({ ...prev, [idx]: true }));
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: item.question,
          selectedOption: item.selected,
          correctOption: item.correct,
          conceptTag: item.conceptTag,
          defaultExplanation: item.explanation,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAiDiagnoses((prev) => ({ ...prev, [idx]: data.aiDiagnosis }));
      }
    } catch (err) {
      setAiDiagnoses((prev) => ({
        ...prev,
        [idx]: item.explanation || "Review fundamental concepts of derivatives.",
      }));
    } finally {
      setLoadingAi((prev) => ({ ...prev, [idx]: false }));
    }
  };

  const currentQ = questions[currentIndex];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-4 sm:p-6 md:p-8">
      {/* Header */}
      <header className="w-full max-w-4xl flex items-center justify-between py-4 border-b border-slate-800 mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-cyan-500 text-slate-950 font-black px-3 py-1.5 rounded-lg text-lg tracking-wider">
            CL
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">CONCEPTLENS</h1>
            <p className="text-xs text-slate-400">LOOK CLOSER • LEARN DEEPER</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-cyan-950/80 text-cyan-400 border border-cyan-800 text-xs px-3 py-1.5 rounded-full font-semibold">
            Diagnostic
          </span>
          <span className="text-slate-400 hover:text-white text-xs px-3 py-1.5 cursor-pointer">
            Doubt Tracer
          </span>
        </div>
      </header>

      {/* Error Alert */}
      {errorMessage && (
        <div className="w-full max-w-4xl mb-6 p-4 rounded-xl bg-red-950/60 border border-red-800/80 text-red-200 text-sm flex items-center justify-between">
          <span>✕ {errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-red-400 hover:text-red-200 text-base font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Selection Control Panel */}
      <section className="w-full max-w-4xl bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl mb-6 backdrop-blur">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Standard / Grade
            </label>
            <select
              value={standard}
              onChange={(e) => setStandard(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="Class 12">Class 12</option>
              <option value="Class 11">Class 11</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Board / Syllabus
            </label>
            <select
              value={board}
              onChange={(e) => setBoard(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="CBSE (NCERT)">CBSE (NCERT)</option>
              <option value="JEE Main">JEE Main</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Subject & Stream
            </label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="Mathematics">Mathematics</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Chapter / Topic
            </label>
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="Continuity and Differentiability">Continuity and Differentiability</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleStartAssessment}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-xl transition duration-150 shadow-lg shadow-blue-600/20 text-sm flex items-center justify-center gap-2"
        >
          {loading ? "Loading Diagnostic Test..." : "Start Diagnostic Assessment →"}
        </button>
      </section>

      {/* Active Assessment Question View */}
      {questions.length > 0 && !result && currentQ && (
        <section className="w-full max-w-4xl bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl mb-6">
          <div className="flex items-center justify-between mb-4">
            <span className="bg-cyan-950 text-cyan-400 border border-cyan-800 text-xs font-semibold px-2.5 py-1 rounded-md">
              Q {currentIndex + 1}/{questions.length}
            </span>
            <div className="flex gap-1.5">
              {questions.map((_, i) => (
                <div
                  key={i}
                  className={`w-2.5 h-2.5 rounded-full ${
                    i === currentIndex
                      ? "bg-cyan-400"
                      : selectedAnswers[i]
                      ? "bg-cyan-800"
                      : "bg-slate-700"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="text-base sm:text-lg font-medium text-slate-100 mb-6 leading-relaxed">
            <MathRenderer content={currentQ.question} />
          </div>

          <div className="space-y-3 mb-6">
            {currentQ.options.map((opt, optIdx) => {
              const optText = getOptionText(opt);
              const optKey = getOptionKey(opt, optIdx);
              const isSelected = selectedAnswers[currentIndex] === optKey;
              const alphabet = ["A", "B", "C", "D", "E"][optIdx] || String(optIdx + 1);

              return (
                <button
                  key={optIdx}
                  onClick={() => handleSelectOption(optKey)}
                  className={`w-full text-left p-3.5 rounded-xl border flex items-center gap-3.5 transition ${
                    isSelected
                      ? "bg-cyan-950/40 border-cyan-400 text-cyan-100 shadow-md shadow-cyan-950/50"
                      : "bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300"
                  }`}
                >
                  <span
                    className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                      isSelected
                        ? "bg-cyan-500 text-slate-950"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {alphabet}
                  </span>
                  <div className="text-sm font-normal">
                    <MathRenderer content={optText} />
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className="text-slate-400 hover:text-slate-200 disabled:opacity-30 text-sm px-4 py-2 rounded-lg"
            >
              ← Prev
            </button>

            {currentIndex < questions.length - 1 ? (
              <button
                onClick={() => setCurrentIndex((prev) => prev + 1)}
                className="bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium px-5 py-2 rounded-lg transition"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handleSubmitAssessment}
                className="bg-green-600 hover:bg-green-500 text-white text-sm font-medium px-6 py-2 rounded-lg transition shadow-lg shadow-green-600/20"
              >
                Submit Test
              </button>
            )}
          </div>
        </section>
      )}

      {/* Comprehensive Diagnostic Report */}
      {result && (
        <section className="w-full max-w-4xl bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl mb-6">
          <div className="text-center pb-6 border-b border-slate-800">
            <span className="text-xs font-semibold text-cyan-400 uppercase tracking-widest">
              Diagnostic Report
            </span>
            <h2 className="text-2xl font-bold text-white mt-1">Assessment Complete</h2>
            <div className="mt-4 flex items-center justify-center gap-6">
              <div className="text-center">
                <p className="text-3xl font-extrabold text-cyan-400">
                  {result.score.obtained} / {result.score.total}
                </p>
                <p className="text-xs text-slate-400 uppercase mt-1">Score</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-extrabold text-blue-400">
                  {result.score.percentage}%
                </p>
                <p className="text-xs text-slate-400 uppercase mt-1">Accuracy</p>
              </div>
            </div>
          </div>

          {/* Critical Knowledge Gaps Summary */}
          {result.weakConcepts.length > 0 ? (
            <div className="mt-6 p-4 rounded-xl bg-amber-950/20 border border-amber-800/50">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-amber-400 font-bold text-sm">⚠ Identified Knowledge Gaps:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {result.weakConcepts.map((gap, i) => (
                  <span
                    key={i}
                    className="text-xs bg-amber-950/60 text-amber-300 border border-amber-700/50 px-2.5 py-1 rounded-md font-medium"
                  >
                    {gap}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-6 p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/50">
              <p className="text-emerald-400 font-semibold text-sm">
                🎉 No conceptual misconceptions detected. Strong mastery demonstrated!
              </p>
            </div>
          )}

          {/* Detailed Question Review & AI Misconception Diagnosis */}
          <div className="mt-6 space-y-4">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
              Question Breakdown & Cognitive Analysis
            </h3>
            {result.details.map((item, idx) => (
              <div
                key={idx}
                className={`p-5 rounded-xl border ${
                  item.isCorrect
                    ? "bg-slate-950/50 border-emerald-900/60"
                    : "bg-red-950/20 border-red-900/60"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    Q {idx + 1}
                  </span>
                  <span
                    className={`text-xs font-bold ${
                      item.isCorrect ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {item.isCorrect ? "✓ Mastered" : "✕ Misconception Detected"}
                  </span>
                </div>

                <div className="text-sm text-slate-200 mb-3 font-medium">
                  <MathRenderer content={item.question} />
                </div>

                {item.conceptTag && (
                  <p className="text-xs text-cyan-400 mb-3">
                    <span className="font-semibold text-slate-400">Target Concept:</span>{" "}
                    {item.conceptTag}
                  </p>
                )}

                {/* Standard Explanation */}
                {item.explanation && (
                  <div className="text-xs text-slate-300 bg-slate-900/90 p-3 rounded-lg border border-slate-800 mb-3">
                    <span className="font-bold text-cyan-400">Standard Rule:</span>{" "}
                    {item.explanation}
                  </div>
                )}

                {/* Targeted AI Misconception Diagnosis for Incorrect Answers */}
                {!item.isCorrect && (
                  <div className="pt-2 border-t border-red-950">
                    {aiDiagnoses[idx] ? (
                      <div className="mt-2 p-3.5 rounded-lg bg-cyan-950/30 border border-cyan-800/80 text-xs leading-relaxed text-cyan-200">
                        <div className="flex items-center gap-1.5 font-bold text-cyan-400 mb-1.5">
                          <span>✦ AI Cognitive Diagnostic Analysis:</span>
                        </div>
                        <p className="whitespace-pre-line">{aiDiagnoses[idx]}</p>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleFetchAiDiagnosis(idx, item)}
                        disabled={loadingAi[idx]}
                        className="mt-2 text-xs bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 font-semibold py-1.5 px-3 rounded-lg transition flex items-center gap-2"
                      >
                        {loadingAi[idx] ? "Diagnosing with AI..." : "✦ Diagnose My Misconception (AI)"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={() => {
              setResult(null);
              setQuestions([]);
              setSelectedAnswers({});
              setAiDiagnoses({});
            }}
            className="w-full mt-6 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2.5 rounded-xl text-sm transition"
          >
            Take Another Diagnostic Test
          </button>
        </section>
      )}
    </main>
  );
}