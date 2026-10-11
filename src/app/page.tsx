"use client";

import React, { useState, useEffect } from "react";
import MathRenderer from "@/components/MathRenderer";

type TabMode = "diagnostic" | "tracer" | "audit";

interface MCQQuestion {
  id: number;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctOption: "A" | "B" | "C" | "D";
  conceptualFocus: string;
}

interface RemedialAudit {
  status: string;
  score: number;
  identifiedMisconception: string;
  mentalModelShift: string;
  calibrationQuestion: string;
  calibrationExpectedProof: string;
}

interface DoubtTraceResult {
  stepOfFailure: string;
  violatedPrinciple: string;
  correctedDerivation: string;
  calibrationVerification: string;
}

const CHAPTER_PRESETS: Record<string, Record<string, string[]>> = {
  "Class 12": {
    Mathematics: [
      "Relations and Functions",
      "Inverse Trigonometric Functions",
      "Matrices",
      "Determinants",
      "Continuity and Differentiability",
      "Application of Derivatives",
      "Integrals",
      "Application of Integrals",
      "Differential Equations",
      "Vector Algebra",
      "Three Dimensional Geometry",
      "Linear Programming",
      "Probability"
    ],
    Physics: [
      "Electric Charges and Fields",
      "Electrostatic Potential and Capacitance",
      "Current Electricity",
      "Moving Charges and Magnetism",
      "Magnetism and Matter",
      "Electromagnetic Induction",
      "Alternating Current",
      "Electromagnetic Waves",
      "Ray Optics",
      "Wave Optics",
      "Dual Nature of Radiation",
      "Atoms",
      "Nuclei",
      "Semiconductor Electronics"
    ]
  },
  "Class 11": {
    Mathematics: [
      "Sets",
      "Relations and Functions",
      "Trigonometric Functions",
      "Complex Numbers",
      "Linear Inequalities",
      "Permutations and Combinations",
      "Binomial Theorem",
      "Sequences and Series",
      "Straight Lines",
      "Conic Sections",
      "Limits and Derivatives",
      "Statistics",
      "Probability"
    ],
    Physics: [
      "Units and Measurements",
      "Motion in a Straight Line",
      "Motion in a Plane",
      "Laws of Motion",
      "Work, Energy and Power",
      "System of Particles and Rotational Motion",
      "Gravitation",
      "Mechanical Properties of Solids",
      "Thermodynamics",
      "Kinetic Theory",
      "Oscillations",
      "Waves"
    ]
  }
};

export default function ConceptLensApp() {
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<TabMode>("diagnostic");

  // Curriculum State
  const [standard, setStandard] = useState("Class 12");
  const [board, setBoard] = useState("CBSE (NCERT)");
  const [subject, setSubject] = useState("Mathematics");
  const [chapter, setChapter] = useState("Integrals");
  const [isCustomTopic, setIsCustomTopic] = useState(false);
  const [customTopicName, setCustomTopicName] = useState("");

  // Diagnostic Stepper State
  const [isLoadingDiagnostic, setIsLoadingDiagnostic] = useState(false);
  const [diagnosticQuestions, setDiagnosticQuestions] = useState<MCQQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, "A" | "B" | "C" | "D">>({});
  const [diagnosticAudit, setDiagnosticAudit] = useState<RemedialAudit | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Doubt Tracer State
  const [tracerInput, setTracerInput] = useState("");
  const [tracerImage, setTracerImage] = useState<string | null>(null);
  const [isTracing, setIsTracing] = useState(false);
  const [tracerResult, setTracerResult] = useState<DoubtTraceResult | null>(null);

  // Audit Logs (LocalStorage)
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  useEffect(() => {
    setIsMounted(true);
    try {
      const stored = localStorage.getItem("conceptlens_audit_logs");
      if (stored) setAuditLogs(JSON.parse(stored));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const saveAuditLog = (entry: any) => {
    const updated = [entry, ...auditLogs];
    setAuditLogs(updated);
    try {
      localStorage.setItem("conceptlens_audit_logs", JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  // Keyboard navigation for MCQ
  useEffect(() => {
    if (!isMounted || activeTab !== "diagnostic" || diagnosticQuestions.length === 0 || diagnosticAudit) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      if (["1", "A"].includes(key)) handleSelectOption("A");
      else if (["2", "B"].includes(key)) handleSelectOption("B");
      else if (["3", "C"].includes(key)) handleSelectOption("C");
      else if (["4", "D"].includes(key)) handleSelectOption("D");
      else if (e.key === "Enter" || e.key === "ArrowRight") {
        if (currentQuestionIndex < diagnosticQuestions.length - 1) {
          setCurrentQuestionIndex((prev) => prev + 1);
        }
      } else if (e.key === "ArrowLeft") {
        if (currentQuestionIndex > 0) {
          setCurrentQuestionIndex((prev) => prev - 1);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMounted, activeTab, diagnosticQuestions, currentQuestionIndex, diagnosticAudit]);

  const handleSelectOption = (option: "A" | "B" | "C" | "D") => {
    setUserAnswers((prev) => ({ ...prev, [currentQuestionIndex]: option }));
  };

  const handleStartDiagnostic = async () => {
    setIsLoadingDiagnostic(true);
    setErrorMessage(null);
    setDiagnosticAudit(null);
    setUserAnswers({});
    setCurrentQuestionIndex(0);

    const activeTopic = isCustomTopic ? customTopicName : chapter;

    try {
      const res = await fetch("/api/diagnostic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_battery",
          standard,
          board,
          subject,
          topic: activeTopic || "General Fundamentals"
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to initialize diagnostic battery.");

      setDiagnosticQuestions(data.questions || []);
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoadingDiagnostic(false);
    }
  };

  const handleSubmitDiagnostic = async () => {
    setIsLoadingDiagnostic(true);
    setErrorMessage(null);

    const activeTopic = isCustomTopic ? customTopicName : chapter;

    try {
      const res = await fetch("/api/diagnostic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "audit_battery",
          standard,
          board,
          subject,
          topic: activeTopic,
          questions: diagnosticQuestions,
          userAnswers
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to audit assessment.");

      setDiagnosticAudit(data.audit);
      saveAuditLog({
        date: new Date().toISOString(),
        topic: activeTopic,
        subject,
        score: data.audit?.score ?? 0,
        misconception: data.audit?.identifiedMisconception || "N/A"
      });
    } catch (err: any) {
      setErrorMessage(err.message || "Diagnostic analysis failed.");
    } finally {
      setIsLoadingDiagnostic(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setTracerImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleRunTracer = async () => {
    if (!tracerInput.trim() && !tracerImage) return;
    setIsTracing(true);
    setErrorMessage(null);
    setTracerResult(null);

    try {
      const res = await fetch("/api/diagnostic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "trace_derivation",
          subject,
          topic: isCustomTopic ? customTopicName : chapter,
          derivationText: tracerInput,
          imageData: tracerImage
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Doubt tracing failed.");

      setTracerResult(data.trace);
      saveAuditLog({
        date: new Date().toISOString(),
        topic: isCustomTopic ? customTopicName : chapter,
        subject,
        type: "Derivation Trace",
        stepFailed: data.trace?.stepOfFailure
      });
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to trace derivation breakdown.");
    } finally {
      setIsTracing(false);
    }
  };

  const renderMathSafe = (content: string) => {
    if (!content) return null;
    return <MathRenderer content={content} />;
  };

  return (
    <main className="min-h-screen w-full bg-zinc-950 text-zinc-100 flex flex-col items-center overflow-x-hidden selection:bg-cyan-500/20">
      
      {/* 1. RESPONSIVE HEADER */}
      <header className="w-full border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md sticky top-0 z-50 px-4 py-3 md:px-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3.5">
          
          <div className="flex items-center justify-between w-full md:w-auto">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-xs tracking-wider">
                CL
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold tracking-wider text-base text-zinc-100 leading-tight">
                  CONCEPT<span className="text-cyan-400">LENS</span>
                </span>
                <span className="text-[10px] tracking-widest text-zinc-500 font-mono uppercase">
                  Look Closer • Learn Deeper
                </span>
              </div>
            </div>

            {/* Mobile Audit Log Button */}
            <button
              type="button"
              onClick={() => setActiveTab("audit")}
              className={`md:hidden px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-colors relative z-20 pointer-events-auto touch-manipulation cursor-pointer ${
                activeTab === "audit"
                  ? "bg-zinc-800 border-cyan-500/50 text-cyan-300 shadow-sm"
                  : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white"
              }`}
            >
              Audit Log
            </button>
          </div>

          {/* Mode Switcher Buttons */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-center md:justify-end">
            <div className="inline-flex p-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs w-full sm:w-auto justify-center relative z-20">
              <button
                type="button"
                onClick={() => setActiveTab("diagnostic")}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg font-medium transition-all select-none touch-manipulation cursor-pointer ${
                  activeTab === "diagnostic"
                    ? "bg-zinc-800 text-cyan-300 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Diagnostic Assessment
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("tracer")}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg font-medium transition-all select-none touch-manipulation cursor-pointer ${
                  activeTab === "tracer"
                    ? "bg-zinc-800 text-cyan-300 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Doubt Tracer
              </button>
            </div>

            {/* Desktop Audit Log Button */}
            <button
              type="button"
              onClick={() => setActiveTab("audit")}
              className={`hidden md:inline-flex px-3.5 py-2 rounded-xl text-xs font-medium border transition-all relative z-20 pointer-events-auto touch-manipulation cursor-pointer ${
                activeTab === "audit"
                  ? "bg-zinc-800 border-cyan-500/50 text-cyan-300 shadow-sm"
                  : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Audit Log
            </button>
          </div>

        </div>
      </header>

      {/* 2. BODY CONTENT */}
      <div className="w-full max-w-4xl px-4 py-6 flex flex-col gap-6 relative z-10">

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800/80 text-red-300 text-xs flex justify-between items-start gap-2">
            <span className="font-mono break-all">{errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-red-400 hover:text-red-200 font-bold px-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* TAB 1: DIAGNOSTIC ASSESSMENT */}
        {activeTab === "diagnostic" && (
          <div className="flex flex-col gap-6">
            
            {/* Curriculum Configuration Matrix */}
            <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800 flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                
                {/* Standard */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-400">Standard</label>
                  <select
                    value={standard}
                    onChange={(e) => setStandard(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Class 12">Class 12</option>
                    <option value="Class 11">Class 11</option>
                    <option value="Class 10">Class 10</option>
                    <option value="Class 9">Class 9</option>
                  </select>
                </div>

                {/* Board */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-400">Board</label>
                  <select
                    value={board}
                    onChange={(e) => setBoard(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="CBSE (NCERT)">CBSE (NCERT)</option>
                    <option value="ICSE / ISC">ICSE / ISC</option>
                    <option value="State Board">State Board</option>
                  </select>
                </div>

                {/* Subject */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-400">Subject</label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Mathematics">Mathematics</option>
                    <option value="Physics">Physics</option>
                    <option value="Chemistry">Chemistry</option>
                  </select>
                </div>

                {/* Chapter or Custom Topic */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-400">Chapter / Topic</label>
                    <button
                      type="button"
                      onClick={() => setIsCustomTopic(!isCustomTopic)}
                      className="text-[10px] text-cyan-400 underline font-mono cursor-pointer"
                    >
                      {isCustomTopic ? "Presets" : "Custom"}
                    </button>
                  </div>
                  {isCustomTopic ? (
                    <input
                      type="text"
                      placeholder="e.g. Integration by Parts"
                      value={customTopicName}
                      onChange={(e) => setCustomTopicName(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500"
                    />
                  ) : (
                    <select
                      value={chapter}
                      onChange={(e) => setChapter(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500"
                    >
                      {(CHAPTER_PRESETS[standard]?.[subject] || [chapter]).map((ch) => (
                        <option key={ch} value={ch}>{ch}</option>
                      ))}
                    </select>
                  )}
                </div>

              </div>
            </div>

            {/* Stepper View / Pre-Launch Card */}
            {diagnosticQuestions.length === 0 ? (
              <div className="p-8 sm:p-12 rounded-2xl bg-zinc-900/30 border border-zinc-800 flex flex-col items-center justify-center text-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 text-lg">
                  Δ
                </div>
                <div className="flex flex-col gap-1 max-w-sm">
                  <h3 className="font-semibold text-base text-zinc-100">Ready to Diagnose Conceptual Reasoning</h3>
                  <p className="text-xs text-zinc-400">
                    Generates 4 targeted MCQs focusing on common traps and logic gaps in{" "}
                    <span className="text-zinc-200 font-medium">{isCustomTopic ? customTopicName || "Custom Topic" : chapter}</span>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleStartDiagnostic}
                  disabled={isLoadingDiagnostic}
                  className="mt-2 px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs transition-all shadow-lg shadow-cyan-500/10 cursor-pointer disabled:opacity-50 touch-manipulation"
                >
                  {isLoadingDiagnostic ? "Synthesizing Diagnostic..." : "Start Diagnostic Assessment"}
                </button>
              </div>
            ) : !diagnosticAudit ? (
              
              /* 1-by-1 Interactive Question Stepper */
              <div className="p-5 sm:p-8 rounded-2xl bg-zinc-900/40 border border-zinc-800 flex flex-col gap-6">
                
                {/* Stepper Progress Bar */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center text-xs font-mono text-zinc-400">
                    <span>Question {currentQuestionIndex + 1} of {diagnosticQuestions.length}</span>
                    <span className="text-cyan-400">{isCustomTopic ? customTopicName : chapter}</span>
                  </div>
                  <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-400 transition-all duration-300"
                      style={{ width: `${((currentQuestionIndex + 1) / diagnosticQuestions.length) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Math Question Text */}
                <div className="text-sm sm:text-base text-zinc-100 font-medium leading-relaxed">
                  {renderMathSafe(diagnosticQuestions[currentQuestionIndex].question)}
                </div>

                {/* Options Grid */}
                <div className="grid grid-cols-1 gap-3">
                  {(["A", "B", "C", "D"] as const).map((optKey) => {
                    const isSelected = userAnswers[currentQuestionIndex] === optKey;
                    return (
                      <button
                        type="button"
                        key={optKey}
                        onClick={() => handleSelectOption(optKey)}
                        className={`w-full p-3.5 rounded-xl text-left border text-xs sm:text-sm transition-all flex items-start gap-3 cursor-pointer touch-manipulation ${
                          isSelected
                            ? "bg-cyan-950/20 border-cyan-500/80 text-cyan-200 shadow-sm"
                            : "bg-zinc-900/60 border-zinc-800/80 text-zinc-300 hover:border-zinc-700"
                        }`}
                      >
                        <span className={`w-5 h-5 rounded flex items-center justify-center font-mono text-xs font-bold shrink-0 ${
                          isSelected ? "bg-cyan-500 text-black" : "bg-zinc-800 text-zinc-400"
                        }`}>
                          {optKey}
                        </span>
                        <div className="flex-1 overflow-x-auto">
                          {renderMathSafe(diagnosticQuestions[currentQuestionIndex].options[optKey])}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Stepper Controls */}
                <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60">
                  <button
                    type="button"
                    disabled={currentQuestionIndex === 0}
                    onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
                    className="px-4 py-2 rounded-lg border border-zinc-800 text-xs font-medium text-zinc-400 hover:text-zinc-200 disabled:opacity-30 cursor-pointer touch-manipulation"
                  >
                    ← Previous
                  </button>

                  {currentQuestionIndex < diagnosticQuestions.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                      className="px-5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium cursor-pointer touch-manipulation"
                    >
                      Next Question →
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSubmitDiagnostic}
                      disabled={isLoadingDiagnostic || Object.keys(userAnswers).length < diagnosticQuestions.length}
                      className="px-6 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-semibold cursor-pointer disabled:opacity-40 touch-manipulation"
                    >
                      {isLoadingDiagnostic ? "Analyzing..." : "Complete & Audit Logic"}
                    </button>
                  )}
                </div>

              </div>
            ) : (
              
              /* Diagnostic Audit Remediation */
              <div className="p-6 sm:p-8 rounded-2xl bg-zinc-900/40 border border-zinc-800 flex flex-col gap-6">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-mono uppercase tracking-wider text-cyan-400">Cognitive Remediation</span>
                    <h3 className="text-lg font-bold text-zinc-100">Diagnostic Score: {diagnosticAudit.score} / 4</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDiagnosticQuestions([]);
                      setDiagnosticAudit(null);
                    }}
                    className="text-xs font-mono text-zinc-400 hover:text-zinc-200 underline cursor-pointer"
                  >
                    New Assessment
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 flex flex-col gap-2">
                  <span className="text-[11px] font-mono uppercase text-red-400">Identified Cognitive Fault Line</span>
                  <div className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                    {renderMathSafe(diagnosticAudit.identifiedMisconception)}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 flex flex-col gap-2">
                  <span className="text-[11px] font-mono uppercase text-cyan-400">Conceptual Recalibration</span>
                  <div className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                    {renderMathSafe(diagnosticAudit.mentalModelShift)}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-800/40 flex flex-col gap-2">
                  <span className="text-[11px] font-mono uppercase text-cyan-300">Calibration Verification Task</span>
                  <div className="text-xs sm:text-sm text-zinc-200">
                    {renderMathSafe(diagnosticAudit.calibrationQuestion)}
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* TAB 2: MULTIMODAL DOUBT TRACER */}
        {activeTab === "tracer" && (
          <div className="p-5 sm:p-8 rounded-2xl bg-zinc-900/40 border border-zinc-800 flex flex-col gap-6">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-cyan-400">Derivation Fault Tracer</span>
              <h2 className="text-base sm:text-lg font-semibold text-zinc-100">Upload or Type Your Handwritten Rough Steps</h2>
              <p className="text-xs text-zinc-400 mt-1">Locate the exact step where calculation or reasoning broke down.</p>
            </div>

            <textarea
              rows={4}
              placeholder="Type your mathematical steps or derivation here..."
              value={tracerInput}
              onChange={(e) => setTracerInput(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 text-xs sm:text-sm text-zinc-200 focus:outline-none focus:border-cyan-500 font-mono"
            />

            {/* Notebook Photo Upload */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-mono uppercase text-zinc-400">Attach Rough Notebook Photo</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="text-xs text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-cyan-400 hover:file:bg-zinc-700 cursor-pointer"
              />
              {tracerImage && (
                <div className="mt-2 w-36 h-36 rounded-xl overflow-hidden border border-zinc-700 relative">
                  <img src={tracerImage} alt="Notebook Capture" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setTracerImage(null)}
                    className="absolute top-1 right-1 bg-black/80 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px]"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleRunTracer}
              disabled={isTracing || (!tracerInput.trim() && !tracerImage)}
              className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-semibold cursor-pointer disabled:opacity-40 transition-all shadow-md shadow-cyan-500/10 touch-manipulation"
            >
              {isTracing ? "Auditing Derivation Steps..." : "Trace Mathematical Breakpoint"}
            </button>

            {tracerResult && (
              <div className="mt-4 p-5 rounded-xl bg-zinc-900/90 border border-zinc-800 flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-mono uppercase text-red-400">Step of Failure</span>
                  <div className="text-xs sm:text-sm text-zinc-200">{renderMathSafe(tracerResult.stepOfFailure)}</div>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-mono uppercase text-amber-400">Violated Axiom / Principle</span>
                  <div className="text-xs sm:text-sm text-zinc-300">{renderMathSafe(tracerResult.violatedPrinciple)}</div>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-mono uppercase text-cyan-400">Corrected Derivation Proof</span>
                  <div className="text-xs sm:text-sm text-zinc-200">{renderMathSafe(tracerResult.correctedDerivation)}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: AUDIT LOG FOOTPRINT */}
        {activeTab === "audit" && (
          <div className="p-5 sm:p-8 rounded-2xl bg-zinc-900/40 border border-zinc-800 flex flex-col gap-5">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-cyan-400">Audit Footprint</span>
                <h2 className="text-base sm:text-lg font-semibold text-zinc-100">Historical Diagnostic Runs</h2>
              </div>
              {auditLogs.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem("conceptlens_audit_logs");
                    setAuditLogs([]);
                  }}
                  className="text-xs text-red-400 hover:text-red-300 font-mono underline cursor-pointer"
                >
                  Clear Logs
                </button>
              )}
            </div>

            {auditLogs.length === 0 ? (
              <p className="text-xs text-zinc-500 font-mono py-8 text-center">No diagnostic runs saved locally yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {auditLogs.map((log, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800/80 flex flex-col gap-1 text-xs">
                    <div className="flex justify-between font-mono text-[11px] text-zinc-400">
                      <span>{log.subject} • {log.topic}</span>
                      <span>{new Date(log.date).toLocaleDateString()}</span>
                    </div>
                    {log.score !== undefined && (
                      <div className="text-zinc-200">
                        Score: <span className="font-semibold text-cyan-400">{log.score}/4</span>
                      </div>
                    )}
                    {log.misconception && (
                      <div className="text-zinc-400 line-clamp-1">Gap: {log.misconception}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </main>
  );
}