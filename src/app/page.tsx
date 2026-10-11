"use client";

import React, { useState, useEffect, useRef } from "react";
import MathRenderer from "@/components/MathRenderer";
import {
  SUPPORTED_BOARDS,
  SUPPORTED_STANDARDS,
  COMPREHENSIVE_CURRICULUM,
  SubjectData,
} from "@/data/curricula";

interface Question {
  id: number;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctOption: string;
  conceptualFocus: string;
}

interface AuditReport {
  status: string;
  score: number;
  identifiedMisconception: string;
  mentalModelShift: string;
  calibrationQuestion: string;
  calibrationExpectedProof: string;
}

interface DerivationTrace {
  stepOfFailure: string;
  violatedPrinciple: string;
  correctedDerivation: string;
  calibrationVerification: string;
}

interface PastAuditItem {
  timestamp: string;
  topic: string;
  subject: string;
  score: number;
  total: number;
  misconception: string;
}

export default function Home() {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<"diagnostic" | "tracer" | "history">("diagnostic");

  // Curriculum State
  const [selectedStandard, setSelectedStandard] = useState("class_12");
  const [selectedBoard, setSelectedBoard] = useState("cbse");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedChapter, setSelectedChapter] = useState("");
  const [customTopic, setCustomTopic] = useState("");
  const [isCustomTopicMode, setIsCustomTopicMode] = useState(false);

  // Diagnostic State
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [isGeneratingBattery, setIsGeneratingBattery] = useState(false);
  const [isAuditingBattery, setIsAuditingBattery] = useState(false);
  const [auditResult, setAuditResult] = useState<AuditReport | null>(null);

  // Derivation Tracer State
  const [derivationText, setDerivationText] = useState("");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isTracingDerivation, setIsTracingDerivation] = useState(false);
  const [traceResult, setTraceResult] = useState<DerivationTrace | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Audit Log State
  const [auditLogHistory, setAuditLogHistory] = useState<PastAuditItem[]>([]);

  // Global Error state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Get current subjects based on chosen standard
  const currentSubjects: SubjectData[] = COMPREHENSIVE_CURRICULUM[selectedStandard] || [];
  const activeSubject = currentSubjects.find((s) => s.id === selectedSubjectId) || currentSubjects[0];

  // Initialize or reset subject & chapter on standard change
  useEffect(() => {
    if (currentSubjects.length > 0) {
      setSelectedSubjectId(currentSubjects[0].id);
      if (currentSubjects[0].chapters.length > 0) {
        setSelectedChapter(currentSubjects[0].chapters[0]);
      }
    }
  }, [selectedStandard]);

  // Load audit history from local storage
  useEffect(() => {
    const saved = localStorage.getItem("conceptlens_audit_history");
    if (saved) {
      try {
        setAuditLogHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Save audit history helper
  const saveAuditToHistory = (audit: AuditReport) => {
    const newItem: PastAuditItem = {
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" }),
      topic: isCustomTopicMode ? customTopic : selectedChapter,
      subject: activeSubject ? activeSubject.name : "STEM",
      score: audit.score,
      total: questions.length,
      misconception: audit.identifiedMisconception,
    };
    const updated = [newItem, ...auditLogHistory].slice(0, 20);
    setAuditLogHistory(updated);
    localStorage.setItem("conceptlens_audit_history", JSON.stringify(updated));
  };

  // 1. Generate Diagnostic Battery
  const handleStartDiagnostic = async () => {
    setErrorMessage(null);
    setQuestions([]);
    setUserAnswers({});
    setAuditResult(null);
    setCurrentQuestionIndex(0);
    setIsGeneratingBattery(true);

    const activeTopicName = isCustomTopicMode ? customTopic.trim() : selectedChapter;
    if (!activeTopicName) {
      setErrorMessage("Please enter or select a topic to assess.");
      setIsGeneratingBattery(false);
      return;
    }

    try {
      const selectedBoardObj = SUPPORTED_BOARDS.find((b) => b.id === selectedBoard);
      const selectedStdObj = SUPPORTED_STANDARDS.find((s) => s.id === selectedStandard);

      const res = await fetch("/api/diagnostic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_battery",
          standard: selectedStdObj ? selectedStdObj.name : "Class 12",
          board: selectedBoardObj ? selectedBoardObj.name : "CBSE (NCERT)",
          subject: activeSubject ? activeSubject.name : "Mathematics",
          topic: activeTopicName,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate diagnostic battery.");
      }

      if (Array.isArray(data.questions) && data.questions.length > 0) {
        setQuestions(data.questions);
      } else {
        throw new Error("No questions were returned. Please try again.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred.");
    } finally {
      setIsGeneratingBattery(false);
    }
  };

  // 2. Submit Question Answer
  const handleSelectOption = (questionId: number, optionKey: string) => {
    setUserAnswers((prev) => ({ ...prev, [questionId]: optionKey }));
  };

  // 3. Finalize Assessment & Trigger Audit
  const handleCompleteAssessment = async () => {
    setErrorMessage(null);
    setIsAuditingBattery(true);

    const activeTopicName = isCustomTopicMode ? customTopic.trim() : selectedChapter;
    const selectedBoardObj = SUPPORTED_BOARDS.find((b) => b.id === selectedBoard);
    const selectedStdObj = SUPPORTED_STANDARDS.find((s) => s.id === selectedStandard);

    try {
      const res = await fetch("/api/diagnostic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "audit_battery",
          standard: selectedStdObj ? selectedStdObj.name : "Class 12",
          board: selectedBoardObj ? selectedBoardObj.name : "CBSE (NCERT)",
          subject: activeSubject ? activeSubject.name : "Mathematics",
          topic: activeTopicName,
          questions,
          userAnswers,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to audit reasoning battery.");
      }

      setAuditResult(data.audit);
      saveAuditToHistory(data.audit);
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred during cognitive audit.");
    } finally {
      setIsAuditingBattery(false);
    }
  };

  // 4. Trace Rough Derivation Steps
  const handleRunDerivationTrace = async () => {
    if (!derivationText.trim() && !capturedImage) {
      setErrorMessage("Please input handwritten rough steps or capture a notebook photo.");
      return;
    }

    setErrorMessage(null);
    setIsTracingDerivation(true);
    setTraceResult(null);

    const activeTopicName = isCustomTopicMode ? customTopic.trim() : selectedChapter;

    try {
      const res = await fetch("/api/diagnostic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "trace_derivation",
          topic: activeTopicName || "STEM Derivation",
          subject: activeSubject ? activeSubject.name : "General Science",
          derivationText: derivationText.trim(),
          imageData: capturedImage,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to analyze derivation steps.");
      }

      setTraceResult(data.trace);
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred during derivation trace.");
    } finally {
      setIsTracingDerivation(false);
    }
  };

  // Image Upload handler for Doubt Tracer
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-gray-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Header */}
      <header className="border-b border-gray-800 bg-[#161b22]/80 backdrop-blur sticky top-0 z-50 px-4 py-3 sm:px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold text-sm tracking-tighter">
              CL
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold tracking-wider text-base sm:text-lg text-white">
                  CONCEPT<span className="text-cyan-400">LENS</span>
                </span>
              </div>
              <p className="text-[10px] text-gray-400 tracking-widest uppercase">
                Look Closer • Learn Deeper
              </p>
            </div>
          </div>

          {/* Navigation Tab Pills */}
          <div className="flex items-center space-x-1 sm:space-x-2 bg-[#090d13] p-1 rounded-xl border border-gray-800">
            <button
              type="button"
              onClick={() => setActiveTab("diagnostic")}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition cursor-pointer ${
                activeTab === "diagnostic"
                  ? "bg-cyan-600/20 text-cyan-300 border border-cyan-500/30 shadow-sm"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              Diagnostic Assessment
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("tracer")}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition cursor-pointer ${
                activeTab === "tracer"
                  ? "bg-cyan-600/20 text-cyan-300 border border-cyan-500/30 shadow-sm"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              Doubt Tracer
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition cursor-pointer ${
                activeTab === "history"
                  ? "bg-cyan-600/20 text-cyan-300 border border-cyan-500/30 shadow-sm"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              Audit Log
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Error Notification Banner */}
        {errorMessage && (
          <div className="p-3.5 bg-red-950/40 border border-red-500/50 rounded-xl text-red-200 text-xs sm:text-sm flex items-start justify-between shadow-lg">
            <div className="flex space-x-2">
              <span className="text-red-400 font-bold font-mono">✕</span>
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-red-400 hover:text-red-200 font-bold ml-4"
            >
              ✕
            </button>
          </div>
        )}

        {/* 1. DIAGNOSTIC ASSESSMENT TAB */}
        {activeTab === "diagnostic" && (
          <div className="space-y-6">
            {/* Curriculum Configuration Panel */}
            <div className="bg-[#161b22] border border-gray-800 rounded-2xl p-4 sm:p-6 shadow-md space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Standard Dropdown */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Standard / Grade
                  </label>
                  <select
                    value={selectedStandard}
                    onChange={(e) => setSelectedStandard(e.target.value)}
                    className="w-full bg-[#0d1117] border border-gray-700 rounded-xl p-2.5 text-sm text-gray-200 focus:outline-none focus:border-cyan-500 transition"
                  >
                    {SUPPORTED_STANDARDS.map((std) => (
                      <option key={std.id} value={std.id}>
                        {std.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Board Dropdown */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Board / Syllabus
                  </label>
                  <select
                    value={selectedBoard}
                    onChange={(e) => setSelectedBoard(e.target.value)}
                    className="w-full bg-[#0d1117] border border-gray-700 rounded-xl p-2.5 text-sm text-gray-200 focus:outline-none focus:border-cyan-500 transition"
                  >
                    {SUPPORTED_BOARDS.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Subject Dropdown grouped by Stream */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Subject & Stream
                  </label>
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => {
                      setSelectedSubjectId(e.target.value);
                      const subj = currentSubjects.find((s) => s.id === e.target.value);
                      if (subj && subj.chapters.length > 0) {
                        setSelectedChapter(subj.chapters[0]);
                      }
                    }}
                    className="w-full bg-[#0d1117] border border-gray-700 rounded-xl p-2.5 text-sm text-gray-200 focus:outline-none focus:border-cyan-500 transition"
                  >
                    {["Core", "Science", "Commerce", "Humanities/Arts"].map((streamGroup) => {
                      const groupSubs = currentSubjects.filter((s) => (s.stream || "Core") === streamGroup);
                      if (groupSubs.length === 0) return null;
                      return (
                        <optgroup key={streamGroup} label={`— ${streamGroup} —`}>
                          {groupSubs.map((sub) => (
                            <option key={sub.id} value={sub.id}>
                              {sub.name}
                            </option>
                          ))}
                        </optgroup>
                      );
                    })}
                  </select>
                </div>

                {/* Topic / Chapter Selection */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                      Chapter / Topic
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCustomTopicMode(!isCustomTopicMode)}
                      className="text-xs text-cyan-400 hover:underline"
                    >
                      {isCustomTopicMode ? "Choose from Syllabus" : "Custom Topic"}
                    </button>
                  </div>

                  {isCustomTopicMode ? (
                    <input
                      type="text"
                      placeholder="e.g. Total Internal Reflection, Snell's Law"
                      value={customTopic}
                      onChange={(e) => setCustomTopic(e.target.value)}
                      className="w-full bg-[#0d1117] border border-gray-700 rounded-xl p-2.5 text-sm text-gray-200 focus:outline-none focus:border-cyan-500 transition"
                    />
                  ) : (
                    <select
                      value={selectedChapter}
                      onChange={(e) => setSelectedChapter(e.target.value)}
                      className="w-full bg-[#0d1117] border border-gray-700 rounded-xl p-2.5 text-sm text-gray-200 focus:outline-none focus:border-cyan-500 transition"
                    >
                      {activeSubject?.chapters.map((ch) => (
                        <option key={ch} value={ch}>
                          {ch}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Start Assessment CTA */}
              {questions.length === 0 && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleStartDiagnostic}
                    disabled={isGeneratingBattery}
                    className="w-full py-3.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-xl text-sm transition shadow-lg shadow-cyan-900/30 flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                  >
                    {isGeneratingBattery ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Calibrating Conceptual Traps...</span>
                      </>
                    ) : (
                      <>
                        <span>Start Diagnostic Assessment</span>
                        <span>→</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Questions Stepper */}
            {questions.length > 0 && !auditResult && (
              <div className="bg-[#161b22] border border-gray-800 rounded-2xl p-5 sm:p-7 shadow-lg space-y-6">
                {/* Stepper Header */}
                <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold px-2.5 py-1 bg-cyan-950 text-cyan-300 border border-cyan-800/60 rounded-md">
                      Question {currentQuestionIndex + 1} of {questions.length}
                    </span>
                    <span className="text-xs text-gray-400">
                      {questions[currentQuestionIndex].conceptualFocus}
                    </span>
                  </div>
                  <div className="flex space-x-1">
                    {questions.map((q, idx) => (
                      <div
                        key={q.id}
                        className={`w-2.5 h-2.5 rounded-full ${
                          userAnswers[q.id]
                            ? "bg-cyan-400"
                            : idx === currentQuestionIndex
                            ? "bg-cyan-700 animate-pulse"
                            : "bg-gray-700"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Question Stem with KaTeX */}
                <div className="text-base sm:text-lg font-medium text-gray-100 leading-relaxed">
                  <MathRenderer content={questions[currentQuestionIndex].question} />
                </div>

                {/* Multiple Choice Options */}
                <div className="space-y-3">
                  {(["A", "B", "C", "D"] as const).map((optKey) => {
                    const optText = questions[currentQuestionIndex].options[optKey];
                    const isSelected = userAnswers[questions[currentQuestionIndex].id] === optKey;

                    return (
                      <button
                        key={optKey}
                        type="button"
                        onClick={() => handleSelectOption(questions[currentQuestionIndex].id, optKey)}
                        className={`w-full text-left p-3.5 sm:p-4 rounded-xl border transition flex items-start space-x-3 cursor-pointer ${
                          isSelected
                            ? "bg-cyan-950/40 border-cyan-400 text-white shadow-md shadow-cyan-950"
                            : "bg-[#0d1117] border-gray-800 hover:border-gray-700 text-gray-300"
                        }`}
                      >
                        <span
                          className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                            isSelected
                              ? "bg-cyan-400 text-black"
                              : "bg-gray-800 text-gray-400"
                          }`}
                        >
                          {optKey}
                        </span>
                        <div className="text-sm sm:text-base leading-relaxed flex-1">
                          <MathRenderer content={optText} />
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Stepper Navigation Buttons */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-800">
                  <button
                    type="button"
                    onClick={() => setCurrentQuestionIndex((prev) => Math.max(prev - 1, 0))}
                    disabled={currentQuestionIndex === 0}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer"
                  >
                    ← Previous
                  </button>

                  {currentQuestionIndex < questions.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => setCurrentQuestionIndex((prev) => Math.min(prev + 1, questions.length - 1))}
                      className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer"
                    >
                      Next Question →
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleCompleteAssessment}
                      disabled={isAuditingBattery || Object.keys(userAnswers).length < questions.length}
                      className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs sm:text-sm font-semibold transition disabled:opacity-40 shadow-md shadow-emerald-950 cursor-pointer flex items-center space-x-2"
                    >
                      {isAuditingBattery ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Generating Cognitive Audit...</span>
                        </>
                      ) : (
                        <span>Complete & Run Audit</span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Cognitive Audit Report Screen */}
            {auditResult && (
              <div className="bg-[#161b22] border border-cyan-500/40 rounded-2xl p-5 sm:p-7 shadow-xl space-y-6">
                <div className="flex items-center justify-between border-b border-gray-800 pb-4">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-white flex items-center space-x-2">
                      <span className="text-cyan-400">⚡</span>
                      <span>Cognitive Diagnostic Audit</span>
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Targeted Misconception Remediation Analysis
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-cyan-400">
                      {auditResult.score}/{questions.length}
                    </span>
                    <span className="block text-[10px] text-gray-400 uppercase tracking-wider">Score</span>
                  </div>
                </div>

                {/* Identified Misconception */}
                <div className="p-4 bg-red-950/20 border border-red-900/50 rounded-xl space-y-1.5">
                  <div className="text-xs font-semibold text-red-400 uppercase tracking-wider flex items-center space-x-1.5">
                    <span>⚠️</span>
                    <span>Identified Reasoning Fallacy</span>
                  </div>
                  <div className="text-sm text-gray-200 leading-relaxed">
                    <MathRenderer content={auditResult.identifiedMisconception} />
                  </div>
                </div>

                {/* Mental Model Shift */}
                <div className="p-4 bg-cyan-950/20 border border-cyan-800/40 rounded-xl space-y-1.5">
                  <div className="text-xs font-semibold text-cyan-400 uppercase tracking-wider flex items-center space-x-1.5">
                    <span>💡</span>
                    <span>Conceptual Recalibration</span>
                  </div>
                  <div className="text-sm text-gray-200 leading-relaxed">
                    <MathRenderer content={auditResult.mentalModelShift} />
                  </div>
                </div>

                {/* Calibration Question */}
                <div className="p-4 bg-gray-900/60 border border-gray-800 rounded-xl space-y-2">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Instant Sanity Check: Verification Task
                  </div>
                  <div className="text-sm text-gray-200 font-medium">
                    <MathRenderer content={auditResult.calibrationQuestion} />
                  </div>
                  <div className="text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-900/40 p-2.5 rounded-lg mt-2">
                    <span className="font-semibold">Expected Resolution: </span>
                    <MathRenderer content={auditResult.calibrationExpectedProof} />
                  </div>
                </div>

                {/* Retake Battery CTA */}
                <button
                  type="button"
                  onClick={() => {
                    setAuditResult(null);
                    setQuestions([]);
                    setUserAnswers({});
                  }}
                  className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-gray-200 font-medium rounded-xl text-xs sm:text-sm transition cursor-pointer"
                >
                  Start Another Diagnostic Assessment
                </button>
              </div>
            )}
          </div>
        )}

        {/* 2. DOUBT TRACER TAB */}
        {activeTab === "tracer" && (
          <div className="bg-[#161b22] border border-gray-800 rounded-2xl p-5 sm:p-7 shadow-lg space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <span className="text-cyan-400">🔍</span>
                <span>Multimodal Derivation Tracer</span>
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Upload a notebook rough photo or enter calculation steps to pinpoint where reasoning broke down.
              </p>
            </div>

            {/* Derivation Text Input */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Type Rough Derivation Steps
              </label>
              <textarea
                rows={4}
                value={derivationText}
                onChange={(e) => setDerivationText(e.target.value)}
                placeholder="e.g. Step 1: int(tan(x)sec^2(x)dx)&#10;Step 2: Let u = sec(x), du = sec(x)tan(x)dx&#10;Step 3: ... where did my constant differ?"
                className="w-full bg-[#0d1117] border border-gray-700 rounded-xl p-3 text-sm text-gray-200 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            {/* Camera / Photo Capture Option */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Attach Notebook Image / Rough Steps
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 rounded-xl text-xs sm:text-sm font-medium transition flex items-center space-x-2 cursor-pointer"
                >
                  <span>📷</span>
                  <span>{capturedImage ? "Replace Photo" : "Upload Notebook Photo"}</span>
                </button>
                {capturedImage && (
                  <button
                    type="button"
                    onClick={() => setCapturedImage(null)}
                    className="text-xs text-red-400 hover:underline cursor-pointer"
                  >
                    Remove Photo
                  </button>
                )}
              </div>

              {capturedImage && (
                <div className="mt-3 relative w-32 h-32 rounded-xl overflow-hidden border border-gray-700">
                  <img src={capturedImage} alt="Captured Derivation" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            {/* Trace Derivation CTA */}
            <button
              type="button"
              onClick={handleRunDerivationTrace}
              disabled={isTracingDerivation}
              className="w-full py-3.5 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-xl text-xs sm:text-sm transition shadow-lg shadow-cyan-950 flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              {isTracingDerivation ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Pinpointing Derivation Breakdown...</span>
                </>
              ) : (
                <span>Trace Derivation Breakdown</span>
              )}
            </button>

            {/* Trace Analysis Result */}
            {traceResult && (
              <div className="p-5 bg-[#0d1117] border border-cyan-500/40 rounded-xl space-y-4 mt-6">
                <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  Derivation Trace Breakdown
                </div>

                <div className="p-3.5 bg-red-950/20 border border-red-900/40 rounded-lg space-y-1">
                  <span className="text-[11px] font-semibold text-red-400 uppercase tracking-wider">
                    Line / Step of Breakdown:
                  </span>
                  <div className="text-sm text-gray-200">
                    <MathRenderer content={traceResult.stepOfFailure} />
                  </div>
                </div>

                <div className="p-3.5 bg-yellow-950/20 border border-yellow-900/40 rounded-lg space-y-1">
                  <span className="text-[11px] font-semibold text-yellow-400 uppercase tracking-wider">
                    Violated Axiom / Principle:
                  </span>
                  <div className="text-sm text-gray-200">
                    <MathRenderer content={traceResult.violatedPrinciple} />
                  </div>
                </div>

                <div className="p-3.5 bg-emerald-950/20 border border-emerald-900/40 rounded-lg space-y-1">
                  <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                    Corrected Resolution:
                  </span>
                  <div className="text-sm text-gray-200">
                    <MathRenderer content={traceResult.correctedDerivation} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. AUDIT LOG / REASONING FOOTPRINT TAB */}
        {activeTab === "history" && (
          <div className="bg-[#161b22] border border-gray-800 rounded-2xl p-5 sm:p-7 shadow-lg space-y-5">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div>
                <h2 className="text-lg font-bold text-white">Cognitive Audit Footprint</h2>
                <p className="text-xs text-gray-400">Past diagnostic sessions and conceptual gap records.</p>
              </div>
              {auditLogHistory.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem("conceptlens_audit_history");
                    setAuditLogHistory([]);
                  }}
                  className="text-xs text-red-400 hover:underline cursor-pointer"
                >
                  Clear History
                </button>
              )}
            </div>

            {auditLogHistory.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm">
                No diagnostic footprints logged yet. Run an assessment to generate audits!
              </div>
            ) : (
              <div className="space-y-3">
                {auditLogHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-[#0d1117] border border-gray-800 rounded-xl space-y-2 hover:border-gray-700 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-semibold text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded">
                          {item.subject}
                        </span>
                        <span className="text-sm font-medium text-white">{item.topic}</span>
                      </div>
                      <span className="text-xs text-gray-400">{item.timestamp}</span>
                    </div>

                    <div className="flex items-center justify-between pt-1 text-xs">
                      <div className="text-gray-300 flex-1 pr-4 line-clamp-1">
                        <span className="text-gray-400">Remediated Gap: </span>
                        <MathRenderer content={item.misconception} />
                      </div>
                      <span className="font-bold text-cyan-300 shrink-0">
                        {item.score}/{item.total}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}