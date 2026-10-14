"import client";

import React, { useState, useEffect } from "react";
import { CURRICULA_DATABASE, SubjectCurriculum, MCQQuestion } from "@/data/curricula";
import { loadSubjectQuestions } from "@/data/questionbank";

export default function ConceptLensDashboard() {
  // Navigation & Selection States
  const [selectedClass, setSelectedClass] = useState<number>(11);
  const [selectedSubject, setSelectedSubject] = useState<string>("Physics");
  
  // Available subjects for the chosen class
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  
  // Question & Interaction States
  const [questions, setQuestions] = useState<MCQQuestion[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: number]: string }>({});
  const [result, setResult] = useState<any>(null);
  
  // AI Diagnostics States
  const [loadingAi, setLoadingAi] = useState<{ [key: number]: boolean }>({});
  const [aiDiagnoses, setAiDiagnoses] = useState<{ [key: number]: string }>({});
  const [loadingTest, setLoadingTest] = useState<boolean>(false);

  // Update available subjects whenever class changes
  useEffect(() => {
    const subjects = CURRICULA_DATABASE
      .filter((c) => c.class === selectedClass)
      .map((c) => c.subject);
    setAvailableSubjects(subjects);
    if (subjects.length > 0 && !subjects.includes(selectedSubject)) {
      setSelectedSubject(subjects[0]);
    }
  }, [selectedClass]);

  // Load questions when class or subject changes
  useEffect(() => {
    async function fetchQuestions() {
      setLoadingTest(true);
      const loaded = await loadSubjectQuestions(selectedClass, selectedSubject);
      setQuestions(loaded);
      setSelectedAnswers({});
      setResult(null);
      setAiDiagnoses({});
      setLoadingTest(false);
    }
    fetchQuestions();
  }, [selectedClass, selectedSubject]);

  // Handle option selection
  const handleOptionSelect = (questionIndex: number, option: string) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionIndex]: option,
    }));
  };

  // Submit Test & Evaluate Score
  const handleSubmitTest = () => {
    let score = 0;
    const details = questions.map((q, idx) => {
      const userAns = selectedAnswers[idx];
      const isCorrect = userAns === q.correctAnswer;
      if (isCorrect) score++;
      return {
        question: q.question,
        userAnswer: userAns || "Not Answered",
        correctAnswer: q.correctAnswer,
        isCorrect,
        conceptTag: q.conceptTag,
        explanation: q.explanation,
      };
    });

    setResult({
      score,
      total: questions.length,
      details,
    });
  };

  // Fetch AI Diagnosis for a specific misconception
  const handleFetchAiDiagnosis = async (idx: number, item: any) => {
    setLoadingAi((prev) => ({ ...prev, [idx]: true }));
    try {
      const res = await fetch("/api/diagnostic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentAnswer: item.userAnswer,
          correctAnswer: item.correctAnswer,
          prompt: `Diagnose why a student answered "${item.userAnswer}" when the correct answer was "${item.correctAnswer}" for the concept tag "${item.conceptTag}". Explain the misconception clearly.`,
        }),
      });
      const data = await res.json();
      setAiDiagnoses((prev) => ({ ...prev, [idx]: data.diagnosis || data.error }));
    } catch (err) {
      setAiDiagnoses((prev) => ({ ...prev, [idx]: "Failed to generate AI diagnosis. Please try again." }));
    } finally {
      setLoadingAi((prev) => ({ ...prev, [idx]: false }));
    }
  };

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      {/* Hero Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          ConceptLens Diagnostic Engine
        </h1>
        <p className="mt-2 text-slate-400 text-sm sm:text-base">
          Select your class and subject to diagnose conceptual gaps with AI-powered feedback.
        </p>
      </div>

      {/* Control Panel: Class & Subject Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-sm">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Select Class
          </label>
          <div className="flex gap-2">
            {[9, 10, 11, 12].map((cls) => (
              <button
                key={cls}
                onClick={() => setSelectedClass(cls)}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
                  selectedClass === cls
                    ? "bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                Class {cls}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Select Subject
          </label>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            {availableSubjects.map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading State */}
      {loadingTest && (
        <div className="text-center py-20">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-cyan-500 border-t-transparent"></div>
          <p className="mt-3 text-slate-400 text-sm">Loading curriculum question bank...</p>
        </div>
      )}

      {/* Assessment Section */}
      {!loadingTest && !result && questions.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <h2 className="text-xl font-bold text-slate-200">
              Class {selectedClass} — {selectedSubject} Assessment
            </h2>
            <span className="text-xs px-3 py-1 bg-cyan-950 text-cyan-400 border border-cyan-800/50 rounded-full font-medium">
              {questions.length} Questions Available
            </span>
          </div>

          {questions.map((q, idx) => (
            <div key={q.id || idx} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 transition-all hover:border-slate-700">
              <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wide">
                Question {idx + 1} • {q.conceptTag}
              </span>
              <p className="mt-2 text-slate-100 font-medium text-base">{q.question}</p>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {q.options.map((opt, optIdx) => {
                  const isSelected = selectedAnswers[idx] === opt;
                  return (
                    <button
                      key={optIdx}
                      onClick={() => handleOptionSelect(idx, opt)}
                      className={`text-left px-4 py-3 rounded-xl text-sm font-medium transition-all border ${
                        isSelected
                          ? "bg-cyan-500/10 border-cyan-500 text-cyan-300"
                          : "bg-slate-800/50 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:border-slate-600"
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <button
            onClick={handleSubmitTest}
            className="w-full mt-6 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold py-3.5 px-6 rounded-2xl shadow-lg shadow-cyan-500/10 transition-all"
          >
            Submit & Diagnose Performance
          </button>
        </section>
      )}

      {/* Empty State */}
      {!loadingTest && !result && questions.length === 0 && (
        <div className="text-center py-20 bg-slate-900/30 border border-slate-800 rounded-2xl">
          <p className="text-slate-400">No questions currently available for Class {selectedClass} {selectedSubject}.</p>
        </div>
      )}

      {/* Results & AI Diagnosis Section */}
      {result && (
        <section className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center">
            <h3 className="text-2xl font-black text-slate-100">Assessment Complete</h3>
            <p className="mt-1 text-slate-400 text-sm">
              Your Score: <span className="text-cyan-400 font-bold">{result.score}</span> / {result.total}
            </p>
          </div>

          {result.details.map((item: any, idx: number) => (
            <div
              key={idx}
              className={`border rounded-2xl p-6 ${
                item.isCorrect ? "bg-emerald-950/20 border-emerald-900/40" : "bg-rose-950/20 border-rose-900/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold uppercase tracking-wider ${item.isCorrect ? "text-emerald-400" : "text-rose-400"}`}>
                  {item.isCorrect ? "Correct" : "Incorrect"} • {item.conceptTag}
                </span>
              </div>
              <p className="mt-2 text-slate-100 font-medium">{item.question}</p>

              <div className="mt-3 text-sm space-y-1">
                <p className="text-slate-400">
                  Your Answer: <span className={item.isCorrect ? "text-emerald-300 font-semibold" : "text-rose-300 font-semibold"}>{item.userAnswer}</span>
                </p>
                {!item.isCorrect && (
                  <p className="text-slate-400">
                    Correct Answer: <span className="text-emerald-300 font-semibold">{item.correctAnswer}</span>
                  </p>
                )}
              </div>

              <div className="mt-4 p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 text-xs text-slate-300 leading-relaxed">
                <span className="font-semibold text-cyan-400">Explanation: </span>
                {item.explanation}
              </div>

              {!item.isCorrect && (
                <div className="mt-4">
                  <button
                    onClick={() => handleFetchAiDiagnosis(idx, item)}
                    disabled={loadingAi[idx]}
                    className="text-xs bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 font-semibold py-2 px-4 rounded-xl transition-all"
                  >
                    {loadingAi[idx] ? "Diagnosing with AI..." : "✨ Diagnose My Misconception (AI)"}
                  </button>

                  {aiDiagnoses[idx] && (
                    <div className="mt-3 p-4 rounded-xl bg-blue-950/30 border border-blue-900/40 text-xs text-blue-200 leading-relaxed">
                      <span className="font-semibold text-blue-400">AI Misconception Analysis: </span>
                      {aiDiagnoses[idx]}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          <button
            onClick={() => {
              setResult(null);
              setSelectedAnswers({});
              setAiDiagnoses({});
            }}
            className="w-full mt-6 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-3 px-6 rounded-2xl transition-all text-sm"
          >
            Take Another Diagnostic Test
          </button>
        </section>
      )}
    </main>
  );
}