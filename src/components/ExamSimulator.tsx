import React, { useState, useEffect, useRef } from "react";
import { 
  ArrowLeft, 
  ArrowRight, 
  Trash2, 
  VolumeX, 
  Volume2,
  Clock,
  Eye,
  EyeOff,
  Settings,
  HelpCircle
} from "lucide-react";
import { Pregunta, SimulacroPersonalizado, Usuario } from "../types";

interface ExamSimulatorProps {
  user: Usuario;
  questions: Pregunta[];
  customMock?: SimulacroPersonalizado;
  realExamMode?: boolean;
  timeLimit?: number;
  onFinishExam: (answers: { [key: string]: string }, totalTime: number, timeSpent: number) => void;
  onCancel: () => void;
}

export default function ExamSimulator({ 
  user, 
  questions, 
  customMock, 
  realExamMode = false,
  timeLimit,
  onFinishExam, 
  onCancel 
}: ExamSimulatorProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [isMuted, setIsMuted] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [useUppercase, setUseUppercase] = useState(true);
  const [fontSize, setFontSize] = useState<"sm" | "base" | "lg" | "xl">("base");

  // Custom simulator configurations to match PNP layout and feature requests
  const [immediateFeedback, setImmediateFeedback] = useState(!realExamMode);
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [showOnlyCorrect, setShowOnlyCorrect] = useState(false);
  const [showReference, setShowReference] = useState(!realExamMode);
  const [bookmarked, setBookmarked] = useState<{ [key: string]: boolean }>({});
  const advanceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up auto advance timeout on component unmount
  useEffect(() => {
    return () => {
      if (advanceTimeoutRef.current) {
        clearTimeout(advanceTimeoutRef.current);
      }
    };
  }, []);

  // Double-confirmation popup states
  const [showFirstConfirm, setShowFirstConfirm] = useState(false);
  const [showSecondConfirm, setShowSecondConfirm] = useState(false);

  // Set up initial time based on customMock, custom time limit, or 1.5 minutes per question
  const initialTimeLimit = timeLimit ? timeLimit : (customMock ? customMock.tiempo_limite * 60 : questions.length * 90); 
  const [secondsLeft, setSecondsLeft] = useState(initialTimeLimit);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Warn user before leaving active exam page
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "Si sales perderás tu progreso actual en este simulacro de examen.";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  // Timer loop
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleFinalSubmit(true); // Auto submit on expiration
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [questions]);

  // Support keyboard shortcuts (A, B, C, D, E and arrows)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
        return;
      }
      
      const key = e.key.toUpperCase();
      const currentQuestion = questions[currentIdx];
      
      if (["A", "B", "C", "D", "E"].includes(key)) {
        handleSelectOption(currentQuestion.id, key);
        playBeep();
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentIdx, questions]);

  // Play a very subtle tactile audio feedback click if not muted
  const playBeep = () => {
    if (isMuted) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = "sine";
      oscillator.frequency.value = 600;
      gainNode.gain.setValueAtTime(0.02, audioCtx.currentTime);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.05);
    } catch (err) {
      // Ignored gracefully if audio context blocked
    }
  };

  const handleSelectOption = (preguntaId: string, option: string) => {
    // If an answer is already selected, ignore any further clicks (only normal hover shading is allowed)
    if (answers[preguntaId]) {
      return;
    }

    setAnswers((prev) => ({
      ...prev,
      [preguntaId]: option
    }));
    playBeep();

    // Smooth automatic question advance if configured
    if (autoAdvance) {
      if (advanceTimeoutRef.current) {
        clearTimeout(advanceTimeoutRef.current);
      }
      
      // If immediate feedback is enabled, wait slightly so they see the red/green feedback, otherwise advance quickly
      const delay = immediateFeedback ? 1100 : 300;

      advanceTimeoutRef.current = setTimeout(() => {
        if (currentIdx < questions.length - 1) {
          setCurrentIdx((prev) => prev + 1);
        }
      }, delay);
    }
  };

  const toggleBookmark = (preguntaId: string) => {
    setBookmarked((prev) => ({
      ...prev,
      [preguntaId]: !prev[preguntaId]
    }));
    playBeep();
  };

  const handleClearAnswer = (preguntaId: string) => {
    setAnswers((prev) => {
      const updated = { ...prev };
      delete updated[preguntaId];
      return updated;
    });
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx(currentIdx - 1);
    }
  };

  const handleInitiateSubmit = () => {
    setShowFirstConfirm(true);
  };

  const handleProceedToSecondConfirm = () => {
    setShowFirstConfirm(false);
    setShowSecondConfirm(true);
  };

  const handleFinalSubmit = (forceAutoSubmit = false) => {
    setShowFirstConfirm(false);
    setShowSecondConfirm(false);
    const timeSpent = initialTimeLimit - secondsLeft;
    onFinishExam(answers, initialTimeLimit, timeSpent);
  };

  const handleExitPractice = () => {
    const confirmResult = window.confirm("¿Deseas salir de este simulacro? Tu progreso no se guardará en tu historial.");
    if (confirmResult) {
      onCancel();
    }
  };

  const formatTime = (secs: number) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const seconds = secs % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const currentQuestion = questions[currentIdx];
  const isAnswered = (id: string) => !!answers[id];

  // Render a vertical-first grid that mimics the 20-row, multi-column layout of the original PNP SIECOPOL sheet (Fondo Blanco Theme)
  const renderNavGrid = () => {
    const total = questions.length;
    const colCount = 5;
    const rowCount = Math.ceil(total / colCount); // Typically 20 for 100 questions

    return (
      <div 
        className="grid grid-flow-col gap-y-1.5 gap-x-3.5 overflow-x-auto select-none py-1 scrollbar-none"
        style={{ 
          gridTemplateRows: `repeat(${rowCount}, minmax(0, 1fr))`,
          maxHeight: "560px" 
        }}
        id="siecopol_vertical_nav_grid"
      >
        {questions.map((q, idx) => {
          const active = idx === currentIdx;
          const answered = isAnswered(q.id);
          const valueSelected = answers[q.id];
          const correctLetter = (q.respuesta_correcta || "").trim().toUpperCase();
          const isCorrect = answered && valueSelected === correctLetter;
          const isBookmarked = !!bookmarked[q.id];

          // Determine coloring based on answer status and immediate feedback configuration
          let badgeClass = "text-slate-600 font-bold font-mono text-xs";
          if (answered) {
            if (immediateFeedback) {
              if (isCorrect) {
                badgeClass = "bg-emerald-500 text-white font-black px-1.5 py-0.5 rounded-full text-[11px] shrink-0 font-mono text-center min-w-[24px]";
              } else {
                badgeClass = "bg-rose-500 text-white font-black px-1.5 py-0.5 rounded-full text-[11px] shrink-0 font-mono text-center min-w-[24px]";
              }
            } else {
              // Standard normal answered highlight (no correct/incorrect paint)
              badgeClass = "bg-slate-700 text-white font-black px-1.5 py-0.5 rounded-full text-[11px] shrink-0 font-mono text-center min-w-[24px]";
            }
          } else {
            if (active) {
              badgeClass = "text-slate-900 font-black font-mono text-xs";
            }
          }

          return (
            <button
              key={q.id}
              onClick={() => {
                setCurrentIdx(idx);
                playBeep();
              }}
              className="flex items-center gap-1.5 transition-all text-left focus:outline-none cursor-pointer group"
              id={`jump_btn_${idx}`}
            >
              {/* Radio Circle style - empty except concentric when active */}
              <div className={`h-3.5 w-3.5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                active 
                  ? "border-slate-800 bg-white" 
                  : "border-slate-300 bg-transparent"
              }`}>
                {active && (
                  <div className="h-1.5 w-1.5 rounded-full bg-slate-800" />
                )}
              </div>

              {/* Number and bookmarked star indicator */}
              <span className={`flex items-center justify-center relative ${badgeClass}`}>
                {(idx + 1).toString().padStart(2, "0")}
                {isBookmarked && (
                  <span className="absolute -top-1 -right-1 text-[8px] text-amber-500" title="Bookmark">
                    ★
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  const fontClass = {
    sm: "text-sm",
    base: "text-base sm:text-lg",
    lg: "text-lg sm:text-xl",
    xl: "text-xl sm:text-2xl"
  }[fontSize];

  // Calculate stats in real-time
  const stats = (() => {
    let correct = 0;
    let incorrect = 0;
    Object.entries(answers).forEach(([preguntaId, userAns]) => {
      const q = questions.find(x => x.id === preguntaId);
      if (q) {
        const correctLetter = (q.respuesta_correcta || "").trim().toUpperCase();
        if (userAns === correctLetter) {
          correct++;
        } else {
          incorrect++;
        }
      }
    });
    return { correct, incorrect };
  })();

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-fade-in font-sans text-slate-800 bg-white p-4 sm:p-6 rounded-3xl border border-slate-200" id="exam_simulator_page">
      
      {/* 1. Official Header (Fondo Blanco High-Contrast Theme) */}
      <div className="bg-white border border-slate-200 rounded-2xl px-6 py-4 flex flex-col md:flex-row items-center justify-between shadow-xs gap-4" id="siecopol_header">
        
        {/* Left: Title */}
        <div className="flex items-center gap-3">
          <span className="text-emerald-600 text-2xl font-black tracking-widest uppercase">
            Examen
          </span>
          <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-200 font-black px-2 py-0.5 rounded-sm tracking-wider">
            SIEXPOL 2.0
          </span>
        </div>
        
        {/* Middle Status Controllers */}
        <div className="flex flex-wrap items-center justify-center gap-6">
          {/* Mute Controller */}
          <button 
            onClick={() => setIsMuted(!isMuted)} 
            className={`p-1.5 rounded-lg transition-all border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer ${
              isMuted ? 'text-rose-500 hover:text-rose-600' : 'text-slate-500 hover:text-slate-700'
            }`}
            title={isMuted ? "Activar sonido de clic" : "Silenciar sonido de clic"}
          >
            {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>
          
          {/* Answered Progress pills */}
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 px-3.5 py-1 rounded-full text-xs font-black" title="Respuestas Correctas">
              ✔ {stats.correct}
            </span>
            <span className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-1 rounded-full text-xs font-black" title="Respuestas Incorrectas">
              ✖ {stats.incorrect}
            </span>
          </div>

          {/* Configuration Switch */}
          <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={showConfig} 
                onChange={() => {
                  setShowConfig(!showConfig);
                  playBeep();
                }} 
                className="sr-only peer" 
              />
              <div className="w-8 h-4.5 bg-slate-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
            <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Configuración</span>
          </div>

          {/* Countdown timer ticker */}
          <div className="flex items-center gap-2 text-slate-700 bg-white px-3.5 py-1.5 rounded-xl border border-slate-200">
            <Clock className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="font-mono text-sm font-bold tracking-widest text-emerald-600">
              {formatTime(secondsLeft)}
            </span>
          </div>
        </div>

        {/* Right Finalize button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleExitPractice}
            className="text-[10px] text-slate-600 hover:text-slate-800 uppercase font-bold bg-white border border-slate-200 px-3.5 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer focus:outline-none transition-all"
          >
            Salir
          </button>
          <button
            onClick={handleInitiateSubmit}
            className="border-2 border-emerald-500 hover:bg-emerald-50 text-emerald-600 px-5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer focus:outline-none shadow-xs"
            id="siecopol_finalizar_button"
          >
            Finalizar
          </button>
        </div>
      </div>

      {/* 2. Main Double-Panel Grid Layout (Fondo Blanco Theme) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left column: Swappable Side Panel */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4" id="siecopol_left_panel">
          {!showConfig ? (
            /* TABLERO DE CONTROL */
            <>
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                  Tablero de Control
                </span>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                  SIEXPOL CERTIFIED
                </span>
              </div>

              {/* Vertical layout box with light background */}
              <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-4">
                {renderNavGrid()}
              </div>

              <div className="pt-2 text-[10px] text-slate-500 font-semibold leading-relaxed">
                Haga clic en un número para visualizar o cambiar la respuesta. Las preguntas respondidas se colorean según corresponda.
              </div>
            </>
          ) : (
            /* CONFIGURACIÓN SIDE PANEL (Matches user's exact feature instructions) */
            <div className="space-y-6" id="siecopol_config_sidebar">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                  Configuración del Simulador
                </h3>
              </div>

              <div className="space-y-3.5 flex flex-col">
                {/* 2. Respuesta inmediata */}
                <label className={`flex items-center gap-3 py-2.5 px-3 rounded-xl transition-colors border border-slate-100 shadow-3xs ${
                  realExamMode ? 'opacity-60 cursor-not-allowed bg-slate-50' : 'hover:bg-slate-50 cursor-pointer'
                }`}>
                  <input
                    type="checkbox"
                    disabled={realExamMode}
                    checked={immediateFeedback}
                    onChange={(e) => {
                      setImmediateFeedback(e.target.checked);
                      playBeep();
                    }}
                    className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-500"
                  />
                  <span className="text-xs font-bold text-slate-700">
                    Respuesta inmediata {realExamMode && <span className="text-[9px] text-rose-500 block">(Bloqueado en Examen Real)</span>}
                  </span>
                </label>

                {/* 3. Pasar pregunta al marcar */}
                <label className="flex items-center gap-3 py-2.5 px-3 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors border border-slate-100 shadow-3xs">
                  <input
                    type="checkbox"
                    checked={autoAdvance}
                    onChange={(e) => {
                      setAutoAdvance(e.target.checked);
                      playBeep();
                    }}
                    className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-500"
                  />
                  <span className="text-xs font-bold text-slate-700">Pasar pregunta al marcar</span>
                </label>

                {/* 4. Mostrar solo correcta */}
                <label className="flex items-center gap-3 py-2.5 px-3 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors border border-slate-100 shadow-3xs">
                  <input
                    type="checkbox"
                    checked={showOnlyCorrect}
                    onChange={(e) => {
                      setShowOnlyCorrect(e.target.checked);
                      playBeep();
                    }}
                    className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-500"
                  />
                  <span className="text-xs font-bold text-slate-700">Mostrar solo correcta</span>
                </label>

                {/* 5. Ver referencia */}
                <label className={`flex items-center gap-3 py-2.5 px-3 rounded-xl transition-colors border border-slate-100 shadow-3xs ${
                  realExamMode ? 'opacity-60 cursor-not-allowed bg-slate-50' : 'hover:bg-slate-50 cursor-pointer'
                }`}>
                  <input
                    type="checkbox"
                    disabled={realExamMode}
                    checked={showReference}
                    onChange={(e) => {
                      setShowReference(e.target.checked);
                      playBeep();
                    }}
                    className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-500"
                  />
                  <span className="text-xs font-bold text-slate-700">
                    Ver referencia {realExamMode && <span className="text-[9px] text-rose-500 block">(Bloqueado en Examen Real)</span>}
                  </span>
                </label>
              </div>

              {/* Format Controls */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                <span className="font-bold text-[10px] text-slate-400 uppercase tracking-wider block">Formato de Preguntas</span>
                <div className="space-y-2.5 text-xs">
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setUseUppercase(true); playBeep(); }}
                      className={`flex-1 py-1.5 rounded-lg font-bold border transition-all ${
                        useUppercase ? "bg-emerald-50 border-emerald-400 text-emerald-700" : "bg-white border-slate-200 text-slate-500"
                      }`}
                    >
                      MAYÚS
                    </button>
                    <button
                      onClick={() => { setUseUppercase(false); playBeep(); }}
                      className={`flex-1 py-1.5 rounded-lg font-bold border transition-all ${
                        !useUppercase ? "bg-emerald-50 border-emerald-400 text-emerald-700" : "bg-white border-slate-200 text-slate-500"
                      }`}
                    >
                      Original
                    </button>
                  </div>

                  <div className="flex gap-1 bg-white p-1 rounded-lg border border-slate-200">
                    {(["sm", "base", "lg", "xl"] as const).map((sz) => (
                      <button
                        key={sz}
                        onClick={() => { setFontSize(sz); playBeep(); }}
                        className={`flex-1 py-1 rounded font-bold uppercase text-[9px] transition-all ${
                          fontSize === sz ? "bg-emerald-500 text-white shadow-3xs" : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Show Board Button */}
              <button
                onClick={() => {
                  setShowConfig(false);
                  playBeep();
                }}
                className="w-full py-3 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl font-bold uppercase tracking-wider text-[11px] transition-colors cursor-pointer text-center"
              >
                MOSTRAR TABLERO
              </button>
            </div>
          )}
        </div>

        {/* Right Active Question panel: Elegant light background display with white circular options */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col justify-between min-h-[500px]" id="siecopol_right_question_panel">
          
          <div className="space-y-6">
            {/* Subject Matter Title Header */}
            <div className="pb-4 border-b border-slate-100">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                Proceso Ascenso PNP • Simulador Oficial
              </span>
              <h3 className="text-emerald-600 text-xs sm:text-sm font-black uppercase tracking-wide leading-relaxed" id="siecopol_subject_matter">
                TEMA: ---{useUppercase ? currentQuestion.categoria.toUpperCase() : currentQuestion.categoria} 
                {currentQuestion.tema && ` (${useUppercase ? currentQuestion.tema.toUpperCase() : currentQuestion.tema})`}
              </h3>
            </div>

            {/* Question Text */}
            <div className="space-y-4">
              <h2 className={`${fontClass} font-black text-slate-850 leading-relaxed ${useUppercase ? "uppercase" : ""}`} id="siecopol_question_text">
                {(currentIdx + 1)}. {useUppercase ? currentQuestion.pregunta.toUpperCase() : currentQuestion.pregunta}
              </h2>
            </div>

            {/* Alternatives Layout with High-Contrast Coloration Feedback */}
            <div className="space-y-1.5 pt-3" id="siecopol_alternatives_block">
              {[
                { key: "A", value: currentQuestion.alternativa_a },
                { key: "B", value: currentQuestion.alternativa_b },
                { key: "C", value: currentQuestion.alternativa_c },
                { key: "D", value: currentQuestion.alternativa_d },
                { key: "E", value: currentQuestion.alternativa_e },
              ].filter(alt => {
                if (!alt.value) return false;
                if (showOnlyCorrect) {
                  return alt.key === currentQuestion.respuesta_correcta;
                }
                return true;
              }).map((alt) => {
                const isSelected = answers[currentQuestion.id] === alt.key;
                const formattedVal = useUppercase ? alt.value.toUpperCase() : alt.value;
                const hasAnswer = isAnswered(currentQuestion.id);

                // Default state classes
                let containerStyle = "bg-transparent border-transparent hover:bg-slate-50 text-slate-700 hover:text-slate-950";
                let circleStyle = "border-slate-300 text-slate-500 bg-white group-hover:border-slate-400 group-hover:text-slate-700";

                if (immediateFeedback) {
                  if (hasAnswer) {
                    const correctLetter = (currentQuestion.respuesta_correcta || "").trim().toUpperCase();
                    const isCorrect = correctLetter === alt.key;
                    if (isCorrect) {
                      // Correct option is colored vibrant solid green as per screenshots
                      containerStyle = "bg-[#00e676] text-slate-950 border-[#00c853] font-black shadow-xs";
                      circleStyle = "border-emerald-800 bg-transparent text-emerald-950 font-black";
                    } else if (isSelected && !showOnlyCorrect) {
                      // Selected incorrect option is colored vibrant solid red as per screenshots
                      containerStyle = "bg-[#ff5252] text-slate-950 border-[#d50000] font-black shadow-xs";
                      circleStyle = "border-rose-800 bg-transparent text-rose-950 font-black";
                    }
                  }
                } else {
                  // Standard mode highlight (No immediate paint)
                  if (isSelected) {
                    containerStyle = "bg-emerald-50 border-emerald-500 text-emerald-800 ring-1 ring-emerald-500/10";
                    circleStyle = "border-emerald-600 bg-emerald-600 text-white font-black";
                  }
                }

                return (
                  <button
                    key={alt.key}
                    onClick={() => handleSelectOption(currentQuestion.id, alt.key)}
                    className={`w-full flex items-start gap-3 py-2 px-3.5 rounded-xl text-left transition-all border cursor-pointer focus:outline-none group ${containerStyle}`}
                    id={`option_${alt.key}`}
                  >
                    {/* High contrast circular letter badge */}
                    <div className={`h-7 w-7 rounded-full border-2 flex items-center justify-center shrink-0 text-xs font-black uppercase transition-all ${circleStyle}`}>
                      {alt.key}
                    </div>

                    {/* Option Value */}
                    <span className="text-sm font-bold tracking-wide leading-relaxed self-center">
                      {formattedVal}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reference tag */}
          {showReference && (currentQuestion.ubicacion || currentQuestion.codigo) && (
            <div className="flex justify-end pt-4 border-t border-slate-50 mt-6" id="siecopol_reference_wrapper">
              <span className="text-xs font-black text-teal-600 tracking-wider uppercase font-mono">
                {currentQuestion.ubicacion || currentQuestion.codigo}
              </span>
            </div>
          )}

        </div>

      </div>

      {/* Centered Bottom Action Controller Bar (Flipped perfectly to match screenshots) */}
      <div className="flex flex-wrap items-center justify-center gap-3.5 mt-8 pb-6" id="siecopol_bottom_control_bar">
        {/* Anterior Button */}
        <button
          onClick={handlePrev}
          disabled={currentIdx === 0}
          className="flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider text-white bg-teal-700 hover:bg-teal-800 border border-teal-800 px-6 py-3.5 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer focus:outline-none"
          id="btn_prev_question"
        >
          &lt; Anterior
        </button>

        {/* Siguiente Button */}
        <button
          onClick={handleNext}
          disabled={currentIdx === questions.length - 1}
          className="flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider text-white bg-teal-700 hover:bg-teal-800 border border-teal-800 px-6 py-3.5 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer focus:outline-none"
          id="btn_next_question"
        >
          Siguiente &gt;
        </button>

        {/* Bookmark/Save Flag Button */}
        <button
          onClick={() => toggleBookmark(currentQuestion.id)}
          className={`flex items-center justify-center p-3 rounded-xl border transition-all cursor-pointer focus:outline-none ${
            bookmarked[currentQuestion.id]
              ? "bg-amber-500 text-white border-amber-600 hover:bg-amber-600 shadow-sm"
              : "bg-slate-700 text-white border-slate-800 hover:bg-slate-800"
          }`}
          id="btn_bookmark_question"
          title="Guardar o marcar pregunta"
        >
          <span className="text-base">🔖</span>
        </button>

        {/* Borrar respuesta Button */}
        <button
          onClick={() => handleClearAnswer(currentQuestion.id)}
          disabled={!isAnswered(currentQuestion.id)}
          className="flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-wider text-white bg-rose-500 hover:bg-rose-600 border border-rose-600 px-6 py-3.5 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer focus:outline-none"
          id="btn_clear_answer"
        >
          Borrar respuesta
        </button>
      </div>

      {/* Confirmation Modals with Professional Theme compatibility */}
      
      {/* FIRST CONFIRMATION CAUTION */}
      {showFirstConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in" id="first_confirm_modal">
          <div className="relative w-full max-w-lg bg-yellow-400 text-slate-950 rounded-3xl border-4 border-yellow-500 shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-4 text-slate-950 pb-4 border-b border-yellow-500/40">
              <span className="text-3xl">⚠️</span>
              <div>
                <h3 className="text-base font-black uppercase tracking-wider leading-tight">
                  Advertencia de Finalización
                </h3>
                <p className="text-[10px] font-black uppercase tracking-wider opacity-80">
                  SIEXPOL • Dirección de Recursos Humanos PNP
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-sm font-black uppercase tracking-tight text-center text-slate-900 bg-slate-950/5 py-3.5 rounded-xl border border-black/5">
                ¿DESEA FINALIZAR SU EXAMEN VIRTUAL?
              </p>
              
              <div className="bg-slate-950/10 p-4 rounded-xl space-y-2.5 text-xs font-black leading-relaxed">
                <div className="flex justify-between border-b border-black/5 pb-1.5">
                  <span className="opacity-80">PREGUNTAS TOTALES:</span>
                  <span>{questions.length}</span>
                </div>
                <div className="flex justify-between border-b border-black/5 pb-1.5 text-emerald-900">
                  <span>CONTESTADAS:</span>
                  <span>{Object.keys(answers).length}</span>
                </div>
                <div className="flex justify-between text-rose-900">
                  <span>SIN RESPONDER:</span>
                  <span>{questions.length - Object.keys(answers).length}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 pt-4 border-t border-yellow-500/40">
              <button
                onClick={handleProceedToSecondConfirm}
                className="flex-1 py-3.5 bg-slate-950 text-white font-black rounded-xl text-xs uppercase tracking-widest hover:bg-slate-900 transition-all cursor-pointer focus:outline-none"
              >
                Sí, Proceder
              </button>
              <button
                onClick={() => setShowFirstConfirm(false)}
                className="flex-1 py-3.5 bg-white text-slate-950 font-black rounded-xl text-xs uppercase tracking-widest hover:bg-slate-100 border border-slate-300 transition-all cursor-pointer focus:outline-none"
              >
                No, Seguir editando
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECOND CONFIRMATION LOCK-IN */}
      {showSecondConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in" id="second_confirm_modal">
          <div className="relative w-full max-w-xl bg-amber-500 text-white rounded-3xl border-4 border-amber-600 shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-4 pb-4 border-b border-amber-600/40">
              <span className="text-3xl">🛡️</span>
              <div>
                <h3 className="text-base font-black uppercase tracking-wider leading-tight">
                  CONFIRMACIÓN REFORZADA OBLIGATORIA
                </h3>
                <p className="text-[9px] font-bold uppercase tracking-wider opacity-80">
                  SIEXPOL • Dirección de Recursos Humanos PNP
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-xs font-black uppercase tracking-wide text-center bg-amber-950/20 p-4 rounded-xl leading-relaxed border border-amber-600/30">
                VERIFIQUE QUE HA CONTESTADO EL TOTAL DE PREGUNTAS. EL PRESENTE PROCEDIMIENTO DARÁ POR CONCLUIDO SU EXAMEN VIRTUAL Y SE GUARDARÁ EN EL HISTORIAL.
              </p>
              
              <p className="text-xs sm:text-sm font-black text-slate-950 text-center uppercase tracking-tight">
                ¿CONFIRMA SU DECISIÓN DE FINALIZAR SU EXAMEN VIRTUAL?
              </p>
            </div>

            <div className="flex items-center gap-4 pt-4 border-t border-amber-600/40">
              <button
                onClick={() => handleFinalSubmit(false)}
                className="flex-1 py-3.5 bg-slate-950 text-white font-black rounded-xl text-xs uppercase tracking-widest hover:bg-slate-900 transition-all cursor-pointer focus:outline-none shadow-md"
                id="btn_confirm_final_yes"
              >
                Sí, Finalizar
              </button>
              <button
                onClick={() => setShowSecondConfirm(false)}
                className="flex-1 py-3.5 bg-white text-slate-950 font-black rounded-xl text-xs uppercase tracking-widest hover:bg-slate-100 transition-all cursor-pointer focus:outline-none"
                id="btn_confirm_final_no"
              >
                No, Regresar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
