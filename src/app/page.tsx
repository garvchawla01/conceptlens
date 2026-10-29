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
  explanation: string;
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const currentSubjects: SubjectData[] = COMPREHENSIVE_CURRICULUM[selectedStandard] || [];
  const activeSubject = currentSubjects.find((s) => s.id === selectedSubjectId) || currentSubjects[0];

  useEffect(() => {
    if (currentSubjects.length > 0) {
      setSelectedSubjectId(currentSubjects[0].id);
      if (currentSubjects[0].chapters.length > 0) {
        setSelectedChapter(currentSubjects[0].chapters[0]);
      }
    }
  }, [selectedStandard]);

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

  const handleSelectOption = (questionId: number, optionKey: string) => {
    setUserAnswers((prev) => ({ ...prev, [questionId]: optionKey }));
  };

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
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#0d1117] text-gray-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Header: Fully responsive flex wrap */}
      <header className="border-b border-gray-800 bg-[#161b22]/95 backdrop-blur sticky top-0 z-50 px-3 py-2.5 sm:px-8">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Logo & Title */}
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold text-xs sm:text-sm shrink-0">
              CL
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold tracking-wider text-sm sm:text-lg text-white">
                  CONCEPT<span className="text-cyan-400">LENS</span>
                </span>
              </div>
              <p className="text-[9px] sm:text-[10px] text-gray-400 tracking-widest uppercase">
                Look Closer • Learn Deeper
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="grid grid-cols-3 gap-1 bg-[#090d13] p-1 rounded-xl border border-gray-800 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab("diagnostic")}
              className={`py-2 px-1 text-center rounded-lg text-[11px] sm:text-sm font-medium transition cursor-pointer truncate ${
                activeTab === "diagnostic"
                  ? "bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 shadow-sm"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              Diagnostic
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("tracer")}
              className={`py-2 px-1 text-center rounded-lg text-[11px] sm:text-sm font-medium transition cursor-pointer truncate ${
                activeTab === "tracer"
                  ? "bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 shadow-sm"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              Doubt Tracer
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`py-2 px-1 text-center rounded-lg text-[11px] sm:text-sm font-medium transition cursor-pointer truncate ${
                activeTab === "history"
                  ? "bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 shadow-sm"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              Audit Log
            </button>
          </div>
        </div>
      </header>

      {/* Main Page Body */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
        {/* Error Notification */}
        {errorMessage && (
          <div className="p-3 bg-red-950/50 border border-red-500/60 rounded-xl text-red-200 text-xs sm:text-sm flex items-start justify-between shadow-lg">
            <div className="flex space-x-2">
              <span className="text-red-400 font-bold font-mono">✕</span>
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-red-400 hover:text-red-200 font-bold ml-3"
            >
              ✕
            </button>
          </div>
        )}

        {/* 1. DIAGNOSTIC TAB */}
        {activeTab === "diagnostic" && (
          <div className="space-y-4 sm:space-y-6">
            {/* Configuration Panel */}
            <div className="bg-[#161b22] border border-gray-800 rounded-2xl p-4 sm:p-6 shadow-md space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* Standard */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                    Standard / Grade
                  </label>
                  <select
                    value={selectedStandard}
                    onChange={(e) => setSelectedStandard(e.target.value)}
                    className="w-full bg-[#0d1117] border border-gray-700 rounded-xl p-2.5 text-gray-200 focus:outline-none focus:border-cyan-500"
                  >
                    {SUPPORTED_STANDARDS.map((std) => (
                      <option key={std.id} value={std.id}>
                        {std.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Board */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                    Board / Syllabus
                  </label>
                  <select
                    value={selectedBoard}
                    onChange={(e) => setSelectedBoard(e.target.value)}
                    className="w-full bg-[#0d1117] border border-gray-700 rounded-xl p-2.5 text-gray-200 focus:outline-none focus:border-cyan-500"
                  >
                    {SUPPORTED_BOARDS.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Subject & Stream */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
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
                    className="w-full bg-[#0d1117] border border-gray-700 rounded-xl p-2.5 text-gray-200 focus:outline-none focus:border-cyan-500"
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

                {/* Chapter / Topic */}
                <div>
                  <div className="flex items-center justify-between mb-1">
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
                      placeholder="e.g. Total Internal Reflection, Integration"
                      value={customTopic}
                      onChange={(e) => setCustomTopic(e.target.value)}
                      className="w-full bg-[#0d1117] border border-gray-700 rounded-xl p-2.5 text-gray-200 focus:outline-none focus:border-cyan-500"
                    />
                  ) : (
                    <select
                      value={selectedChapter}
                      onChange={(e) => setSelectedChapter(e.target.value)}
                      className="w-full bg-[#0d1117] border border-gray-700 rounded-xl p-2.5 text-gray-200 focus:outline-none focus:border-cyan-500"
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

            {/* Questions Stepper Container */}
            {questions.length > 0 && !auditResult && (
              <div className="bg-[#161b22] border border-gray-800 rounded-2xl p-4 sm:p-7 shadow-lg space-y-5">
                {/* Stepper Status Header */}
                <div className="flex items-center justify-between border-b border-gray-800 pb-3 gap-2">
                  <div className="flex items-center space-x-2 truncate">
                    <span className="text-[11px] sm:text-xs font-semibold px-2 py-0.5 bg-cyan-950 text-cyan-300 border border-cyan-800/60 rounded shrink-0">
                      Q {currentQuestionIndex + 1}/{questions.length}
                    </span>
                    <span className="text-xs text-gray-400 truncate">
                      {questions[currentQuestionIndex].conceptualFocus}
                    </span>
                  </div>
                  <div className="flex space-x-1 shrink-0">
                    {questions.map((q, idx) => (
                      <div
                        key={q.id}
                        className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${
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

                {/* Question Formula / Prompt */}
                <div className="text-sm sm:text-lg font-medium text-gray-100 leading-relaxed overflow-x-auto pb-1">
                  <MathRenderer content={questions[currentQuestionIndex].question} />
                </div>

                {/* Multiple Choice Options */}
                <div className="space-y-2.5 sm:space-y-3">
                  {(["A", "B", "C", "D"] as const).map((optKey) => {
                    const optText = questions[currentQuestionIndex].options[optKey];
                    const isSelected = userAnswers[questions[currentQuestionIndex].id] === optKey;

                    return (
                      <button
                        key={optKey}
                        type="button"
                        onClick={() => handleSelectOption(questions[currentQuestionIndex].id, optKey)}
                        className={`w-full text-left p-3 sm:p-4 rounded-xl border transition flex items-start space-x-3 cursor-pointer ${
                          isSelected
                            ? "bg-cyan-950/50 border-cyan-400 text-white shadow-md shadow-cyan-950"
                            : "bg-[#0d1117] border-gray-800 hover:border-gray-700 text-gray-300"
                        }`}
                      >
                        <span
                          className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                            isSelected ? "bg-cyan-400 text-black" : "bg-gray-800 text-gray-400"
                          }`}
                        >
                          {optKey}
                        </span>
                        <div className="text-xs sm:text-base leading-relaxed flex-1 overflow-x-auto">
                          <MathRenderer content={optText} />
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Stepper Action Buttons */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-800">
                  <button
                    type="button"
                    onClick={() => setCurrentQuestionIndex((prev) => Math.max(prev - 1, 0))}
                    disabled={currentQuestionIndex === 0}
                    className="px-3.5 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer"
                  >
                    ← Prev
                  </button>

                  {currentQuestionIndex < questions.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => setCurrentQuestionIndex((prev) => Math.min(prev + 1, questions.length - 1))}
                      className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer"
                    >
                      Next →
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleCompleteAssessment}
                      disabled={isAuditingBattery || Object.keys(userAnswers).length < questions.length}
                      className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white rounded-xl text-xs sm:text-sm font-semibold transition disabled:opacity-40 shadow-md cursor-pointer flex items-center space-x-2"
                    >
                      {isAuditingBattery ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Auditing...</span>
                        </>
                      ) : (
                        <span>Complete & Run Audit</span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Cognitive Audit Report */}
            {auditResult && (
              <div className="bg-[#161b22] border border-cyan-500/40 rounded-2xl p-4 sm:p-7 shadow-xl space-y-5">
                <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                  <div>
                    <h2 className="text-base sm:text-xl font-bold text-white flex items-center space-x-2">
                      <span className="text-cyan-400">⚡</span>
                      <span>Cognitive Diagnostic Audit</span>
                    </h2>
                    <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5">
                      Targeted Misconception Remediation Analysis
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xl sm:text-2xl font-black text-cyan-400">
                      {auditResult.score}/{questions.length}
                    </span>
                    <span className="block text-[9px] sm:text-[10px] text-gray-400 uppercase tracking-wider">Score</span>
                  </div>
                </div>

                {/* Identified Misconception */}
                <div className="p-3.5 sm:p-4 bg-red-950/20 border border-red-900/50 rounded-xl space-y-1">
                  <div className="text-[11px] sm:text-xs font-semibold text-red-400 uppercase tracking-wider flex items-center space-x-1.5">
                    <span>⚠️</span>
                    <span>Identified Reasoning Fallacy</span>
                  </div>
                  <div className="text-xs sm:text-sm text-gray-200 leading-relaxed overflow-x-auto">
                    <MathRenderer content={auditResult.identifiedMisconception} />
                  </div>
                </div>

                {/* Mental Model Shift */}
                <div className="p-3.5 sm:p-4 bg-cyan-950/20 border border-cyan-800/40 rounded-xl space-y-1">
                  <div className="text-[11px] sm:text-xs font-semibold text-cyan-400 uppercase tracking-wider flex items-center space-x-1.5">
                    <span>💡</span>
                    <span>Conceptual Recalibration</span>
                  </div>
                  <div className="text-xs sm:text-sm text-gray-200 leading-relaxed overflow-x-auto">
                    <MathRenderer content={auditResult.mentalModelShift} />
                  </div>
                </div>

                {/* Calibration Verification */}
                <div className="p-3.5 sm:p-4 bg-gray-900/60 border border-gray-800 rounded-xl space-y-2">
                  <div className="text-[11px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Instant Sanity Check: Verification Task
                  </div>
                  <div className="text-xs sm:text-sm text-gray-200 font-medium overflow-x-auto">
                    <MathRenderer content={auditResult.calibrationQuestion} />
                  </div>
                  <div className="text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-900/40 p-2.5 rounded-lg mt-2 overflow-x-auto">
                    <span className="font-semibold">Expected Resolution: </span>
                    <MathRenderer content={auditResult.calibrationExpectedProof} />
                  </div>
                </div>

                {/* Answer Review */}
                <div className="p-4 sm:p-5 bg-[#0d1117] border border-gray-800 rounded-xl space-y-4">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white">
                      Answer Review
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                      Review your answers and understand the correct reasoning.
                    </p>
                  </div>

                  {questions.map((question, index) => {
                    const selectedAnswer = userAnswers[question.id];
                    const isCorrect =
                      selectedAnswer === question.correctOption;

                    return (
                      <div
                        key={question.id}
                        className="p-3.5 sm:p-4 bg-gray-900/60 border border-gray-800 rounded-xl space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <h4 className="text-sm font-semibold text-white">
                            Question {index + 1}
                          </h4>

                          <span
                            className={`text-[10px] sm:text-xs font-semibold px-2 py-1 rounded-full shrink-0 ${
                              isCorrect
                                ? "text-emerald-400 bg-emerald-950/60"
                                : "text-red-400 bg-red-950/60"
                            }`}
                          >
                            {isCorrect ? "Correct" : "Incorrect"}
                          </span>
                        </div>

                        <div className="text-xs sm:text-sm text-gray-200 leading-relaxed">
                          <MathRenderer content={question.question} />
                        </div>

                        <div className="p-2.5 rounded-lg bg-gray-800/60 text-xs sm:text-sm">
                          <div className="text-gray-400">Your answer:</div>
                          <div className={isCorrect ? "text-emerald-400" : "text-red-400"}>
                            {selectedAnswer
                              ? `${selectedAnswer}. `
                              : "No answer selected. "}
                            <MathRenderer
                              content={
                                selectedAnswer
                                  ? question.options[
                                      selectedAnswer as keyof typeof question.options
                                    ] ?? "Answer unavailable"
                                  : "No answer selected"
                              }
                            />
                          </div>
                        </div>

                        <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-900/40 text-xs sm:text-sm">
                          <div className="text-emerald-400 font-semibold">
                            Correct answer: {question.correctOption}
                          </div>
                          <div className="text-gray-200">
                            <MathRenderer
                              content={
                                question.options[
                                  question.correctOption as keyof typeof question.options
                                ] ?? "Answer unavailable"
                              }
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">
                            Explanation
                          </div>
                          <div className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                            <MathRenderer
                              content={
                                question.explanation ||
                                "An explanation is not available for this question."
                              }
                            />
                          </div>
                        </div>

                        <div className="text-[11px] text-gray-500">
                          Concept: {question.conceptualFocus}
                        </div>
                      </div>
                    );
                  })}
                </div>

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
  <div className="space-y-6">
    {/* Hero */}
    <div className="relative overflow-hidden rounded-2xl border border-cyan-900/60 bg-gradient-to-br from-[#142431] via-[#111923] to-[#0d1117] p-5 sm:p-7">
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl" />

      <div className="relative">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-800/60 bg-cyan-950/50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-cyan-300">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
          AI reasoning workspace
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Find where your <span className="text-cyan-400">logic breaks.</span>
        </h2>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
          Enter your calculations or upload your notebook. ConceptLens will
          identify the breakdown, explain the underlying principle, and help
          you correct your reasoning.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { number: "01", title: "Submit your work", subtitle: "Type steps or upload a photo" },
            { number: "02", title: "Trace the error", subtitle: "Locate the reasoning breakdown" },
            { number: "03", title: "Learn the fix", subtitle: "Understand the correct method" },
          ].map((item) => (
            <div
              key={item.number}
              className="flex items-start gap-3 rounded-xl border border-white/5 bg-black/20 p-3"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-950 text-xs font-bold text-cyan-300">
                {item.number}
              </span>
              <div>
                <p className="text-xs font-semibold text-gray-100">{item.title}</p>
                <p className="mt-1 text-[11px] leading-4 text-gray-500">{item.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Input workspace */}
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
      <div className="space-y-5 rounded-2xl border border-gray-800 bg-[#161b22] p-4 shadow-lg sm:p-6 lg:col-span-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-950 text-cyan-300">
              <span className="text-lg">✎</span>
            </span>
            <div>
              <h3 className="text-sm font-bold text-white">Your derivation</h3>
              <p className="text-[11px] text-gray-500">Show your working, one step at a time.</p>
            </div>
          </div>

          <label className="mb-2 mt-5 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Calculation steps
          </label>
          <textarea
            rows={7}
            value={derivationText}
            onChange={(e) => setDerivationText(e.target.value)}
            placeholder={"Step 1: Write your original equation\nStep 2: Apply a formula or identity\nStep 3: Simplify your expression\n\nExplain your reasoning wherever possible..."}
            className="w-full resize-y rounded-xl border border-gray-700 bg-[#0d1117] p-4 font-mono text-xs leading-6 text-gray-200 placeholder:text-gray-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 sm:text-sm"
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-[10px] text-gray-500">Include intermediate calculations for better feedback.</p>
            <button
              type="button"
              onClick={() => setDerivationText("")}
              className="shrink-0 text-[11px] text-gray-400 transition hover:text-cyan-300"
            >
              Clear text
            </button>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Notebook image <span className="font-normal normal-case text-gray-600">(optional)</span>
          </label>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="group flex w-full items-center gap-4 rounded-xl border border-dashed border-gray-700 bg-[#0d1117] p-4 text-left transition hover:border-cyan-600 hover:bg-cyan-950/10"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-700 bg-gray-800 text-xl transition group-hover:border-cyan-800">
              📷
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold text-gray-200">
                {capturedImage ? "Replace notebook image" : "Upload a photo of your work"}
              </span>
              <span className="mt-1 block text-[11px] text-gray-500">
                {capturedImage ? "Choose another image if needed" : "Select an image from your device"}
              </span>
            </span>
            <span className="text-xs font-medium text-cyan-400">Browse</span>
          </button>

          {capturedImage && (
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-gray-800 bg-[#0d1117] p-3">
              <img
                src={capturedImage}
                alt="Notebook derivation preview"
                className="h-16 w-16 rounded-lg border border-gray-700 object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-gray-200">Image attached</p>
                <p className="mt-1 text-[11px] text-gray-500">Ready to include in your trace.</p>
              </div>
              <button
                type="button"
                onClick={() => setCapturedImage(null)}
                className="rounded-lg px-2 py-1.5 text-xs text-red-400 transition hover:bg-red-950/30"
              >
                Remove
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleRunDerivationTrace}
          disabled={isTracingDerivation}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-cyan-950/30 transition hover:from-cyan-500 hover:to-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isTracingDerivation ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              <span>Analyzing your reasoning...</span>
            </>
          ) : (
            <>
              <span>⌕</span>
              <span>Trace derivation breakdown</span>
              <span>→</span>
            </>
          )}
        </button>

        <p className="text-center text-[10px] text-gray-600">
          Review the AI analysis to understand and correct your reasoning.
        </p>
      </div>

      {/* Guidance panel */}
      <aside className="space-y-4 lg:col-span-2">
        <div className="rounded-2xl border border-gray-800 bg-[#161b22] p-5">
          <div className="flex items-center gap-2">
            <span className="text-lg">💡</span>
            <h3 className="text-sm font-bold text-white">Get better feedback</h3>
          </div>
          <div className="mt-4 space-y-4">
            {[
              { title: "Show every step", text: "Include intermediate calculations instead of only the final answer." },
              { title: "Keep your original work", text: "Don't correct mistakes before submitting. They help locate the breakdown." },
              { title: "Include your reasoning", text: "Mention which formula, identity, or rule you applied." },
            ].map((item, index) => (
              <div key={item.title} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gray-700 text-[10px] font-semibold text-cyan-300">
                  {index + 1}
                </span>
                <div>
                  <p className="text-xs font-semibold text-gray-200">{item.title}</p>
                  <p className="mt-1 text-[11px] leading-5 text-gray-500">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-cyan-900/50 bg-gradient-to-br from-cyan-950/30 to-[#111923] p-5">
          <span className="text-xl">🎯</span>
          <h3 className="mt-2 text-sm font-bold text-white">The goal isn't just the answer.</h3>
          <p className="mt-2 text-xs leading-5 text-gray-400">
            Understand where your reasoning changed course, why it was incorrect,
            and how to approach the problem correctly next time.
          </p>
        </div>
      </aside>
    </div>

    {/* Analysis results */}
    {traceResult && (
      <div className="space-y-4 rounded-2xl border border-cyan-900/60 bg-[#111923] p-4 shadow-lg sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">
              Analysis complete
            </div>
            <h3 className="mt-1 text-lg font-bold text-white">Your derivation breakdown</h3>
          </div>
          <span className="rounded-full border border-cyan-800 bg-cyan-950/50 px-3 py-1 text-[10px] font-semibold text-cyan-300">
            AI analysis
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <div className="min-w-0 space-y-2 rounded-xl border border-red-900/50 bg-red-950/15 p-4">
            <div className="flex items-center gap-2">
              <span>⚠️</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">Line of failure</span>
            </div>
            <div className="min-w-0 overflow-x-auto break-words text-sm leading-7 text-gray-200 [&_.katex-display]:my-3 [&_.katex]:text-inherit">
              <MathRenderer content={traceResult.stepOfFailure} />
            </div>
          </div>

          <div className="min-w-0 space-y-2 rounded-xl border border-amber-900/50 bg-amber-950/15 p-4">
            <div className="flex items-center gap-2">
              <span>🧠</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Violated principle</span>
            </div>
            <div className="overflow-x-auto text-sm leading-6 text-gray-200">
              <MathRenderer content={traceResult.violatedPrinciple} />
            </div>
          </div>

          <div className="min-w-0 space-y-2 rounded-xl border border-emerald-900/50 bg-emerald-950/15 p-4">
            <div className="flex items-center gap-2">
              <span>✓</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Corrected resolution</span>
            </div>
            <div className="overflow-x-auto text-sm leading-6 text-gray-200">
              <MathRenderer content={traceResult.correctedDerivation} />
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
)}

        {/* 3. AUDIT LOG TAB */}
        {activeTab === "history" && (
          <div className="bg-[#161b22] border border-gray-800 rounded-2xl p-4 sm:p-6 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white">Cognitive Audit Footprint</h2>
                <p className="text-xs text-gray-400">Past diagnostic sessions & gap logs.</p>
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
              <div className="text-center py-10 text-gray-500 text-xs sm:text-sm">
                No diagnostic footprints logged yet.
              </div>
            ) : (
              <div className="space-y-2.5">
                {auditLogHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-[#0d1117] border border-gray-800 rounded-xl space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 truncate">
                        <span className="text-[10px] font-semibold text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded shrink-0">
                          {item.subject}
                        </span>
                        <span className="text-xs sm:text-sm font-medium text-white truncate">{item.topic}</span>
                      </div>
                      <span className="text-[10px] text-gray-400 shrink-0">{item.timestamp}</span>
                    </div>

                    <div className="flex items-center justify-between pt-1 text-xs">
                      <div className="text-gray-300 flex-1 pr-3 line-clamp-1">
                        <span className="text-gray-400">Gap: </span>
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