import React, { useState, useEffect, useRef } from "react";
import { Gamepad2, Timer, Award, Zap, RefreshCw, AlertCircle, Check, X } from "lucide-react";
import { Pregunta } from "../types";

interface ZonaJuegoViewProps {
  questions: Pregunta[];
}

export default function ZonaJuegoView({ questions }: ZonaJuegoViewProps) {
  const [gameState, setGameState] = useState<"idle" | "playing" | "finished">("idle");
  const [selectedQuestions, setSelectedQuestions] = useState<Pregunta[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [selectedAns, setSelectedAns] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [streak, setStreak] = useState(0);
  const [highScore, setHighScore] = useState(0);

  const timerRef = useRef<any>(null);

  useEffect(() => {
    const saved = localStorage.getItem("trivia_highscore");
    if (saved) {
      setHighScore(Number(saved));
    }
  }, []);

  // Beep Audio Helper
  const playBeep = (type: "correct" | "wrong" | "finish" | "tick") => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "correct") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      } else if (type === "wrong") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(250, ctx.currentTime);
        osc.frequency.setValueAtTime(150, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === "finish") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(554, ctx.currentTime + 0.1);
        osc.frequency.setValueAtTime(659, ctx.currentTime + 0.2);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else if (type === "tick") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        gain.gain.setValueAtTime(0.02, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      }
    } catch (e) {
      // Audio fallback
    }
  };

  const handleStartGame = () => {
    if (questions.length < 5) {
      alert("Necesitas al menos 5 preguntas cargadas en el sistema para jugar.");
      return;
    }
    const shuffled = [...questions].sort(() => 0.5 - Math.random());
    setSelectedQuestions(shuffled.slice(0, 5));
    setGameState("playing");
    setCurrentIdx(0);
    setScore(0);
    setStreak(0);
    setTimeLeft(15);
    setSelectedAns(null);
    setIsAnswered(false);
  };

  useEffect(() => {
    if (gameState !== "playing") return;

    if (timeLeft === 0) {
      handleTimeOut();
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 4 && prev > 1) {
          playBeep("tick");
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [gameState, currentIdx, timeLeft]);

  const handleTimeOut = () => {
    clearInterval(timerRef.current);
    setSelectedAns("");
    setIsAnswered(true);
    setStreak(0);
    playBeep("wrong");
  };

  const handleAnswerSelect = (option: string) => {
    if (isAnswered) return;
    clearInterval(timerRef.current);
    setSelectedAns(option);
    setIsAnswered(true);

    const currentQ = selectedQuestions[currentIdx];
    if (option === currentQ.respuesta_correcta) {
      const pts = timeLeft * 10 + 100; // time bonus!
      setScore((prev) => prev + pts);
      setStreak((prev) => prev + 1);
      playBeep("correct");
    } else {
      setStreak(0);
      playBeep("wrong");
    }
  };

  const handleNextQuestion = () => {
    if (currentIdx < 4) {
      setCurrentIdx((prev) => prev + 1);
      setTimeLeft(15);
      setSelectedAns(null);
      setIsAnswered(false);
    } else {
      setGameState("finished");
      playBeep("finish");
      if (score > highScore) {
        setHighScore(score);
        localStorage.setItem("trivia_highscore", String(score));
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6 animate-fade-in" id="game_container">
      <div className="pb-4 border-b border-slate-100 flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Gamepad2 className="h-5 w-5 text-emerald-800 animate-pulse" />
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Zona de Juego: Gana de la PNP</h2>
          </div>
          <p className="text-xs text-slate-500 font-semibold">
            Pon a prueba tu velocidad mental policial. Responde 5 preguntas rápidas y suma puntos extra por tiempo.
          </p>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-widest">Récord Máximo</span>
          <span className="text-sm font-black text-emerald-800">{highScore} PTS</span>
        </div>
      </div>

      {gameState === "idle" && (
        <div className="text-center py-12 max-w-md mx-auto space-y-6 flex flex-col items-center">
          <div className="w-20 h-20 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center text-emerald-800 shadow-inner">
            <Zap className="h-10 w-10 text-emerald-800 animate-bounce" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-black text-slate-800 uppercase">Speed Run: Trivia Policial</h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Tienes 15 segundos para responder cada una de las 5 preguntas. ¡Mientras más rápido respondas, mayor será tu bonus de puntaje!
            </p>
          </div>

          <button
            onClick={handleStartGame}
            className="w-full bg-[#063c25] hover:bg-[#0a5434] text-white font-black text-xs uppercase tracking-widest py-3.5 px-6 rounded-xl transition-all shadow-md focus:outline-none cursor-pointer"
            id="btn_play_game"
          >
            INICIAR JUEGO RÁPIDO
          </button>
        </div>
      )}

      {gameState === "playing" && (
        <div className="space-y-6 max-w-2xl mx-auto" id="game_active_board">
          {/* Progress Indicator */}
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase">
            <span>Pregunta {currentIdx + 1} de 5</span>
            <span className="text-emerald-800 flex items-center gap-1">
              <Zap className="h-4 w-4 text-amber-500 animate-pulse" /> Streak: {streak}
            </span>
            <span className="text-slate-800 font-black">{score} PTS</span>
          </div>

          {/* Time Bar */}
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden relative">
            <div 
              className={`h-full transition-all duration-1000 ${timeLeft <= 4 ? "bg-rose-500 animate-pulse" : "bg-emerald-700"}`}
              style={{ width: `${(timeLeft / 15) * 100}%` }}
            ></div>
          </div>

          <div className="flex items-center gap-2 justify-center text-rose-500 font-black text-sm">
            <Timer className="h-4 w-4" />
            <span>00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}</span>
          </div>

          {/* Trivia Question text */}
          <div className="bg-slate-50 border border-slate-150 p-6 rounded-2xl text-center">
            <span className="text-[10px] bg-emerald-100 text-[#063c25] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider mb-2 inline-block">
              {selectedQuestions[currentIdx]?.categoria}
            </span>
            <p className="text-sm font-extrabold text-slate-800 leading-relaxed uppercase">
              {selectedQuestions[currentIdx]?.pregunta}
            </p>
          </div>

          {/* Question Alternatives */}
          <div className="space-y-3">
            {[
              { key: "A", val: selectedQuestions[currentIdx]?.alternativa_a },
              { key: "B", val: selectedQuestions[currentIdx]?.alternativa_b },
              { key: "C", val: selectedQuestions[currentIdx]?.alternativa_c },
              { key: "D", val: selectedQuestions[currentIdx]?.alternativa_d },
              { key: "E", val: selectedQuestions[currentIdx]?.alternativa_e },
            ].filter(alt => alt.val).map((alt) => {
              const isSelected = selectedAns === alt.key;
              const isCorrect = alt.key === selectedQuestions[currentIdx]?.respuesta_correcta;
              
              let altStyle = "border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-slate-50/50";
              let badgeStyle = "border-slate-300 text-slate-500 bg-slate-50";

              if (isAnswered) {
                if (isCorrect) {
                  altStyle = "border-emerald-500 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-500";
                  badgeStyle = "border-emerald-500 text-white bg-emerald-700";
                } else if (isSelected) {
                  altStyle = "border-rose-300 bg-rose-50 text-rose-900";
                  badgeStyle = "border-rose-400 text-white bg-rose-600";
                } else {
                  altStyle = "border-slate-150 bg-slate-50/30 text-slate-400 pointer-events-none";
                }
              }

              return (
                <button
                  key={alt.key}
                  onClick={() => handleAnswerSelect(alt.key)}
                  disabled={isAnswered}
                  className={`w-full flex items-center gap-3 p-3 px-4 rounded-xl text-left transition-all border cursor-pointer font-bold text-xs sm:text-sm ${altStyle}`}
                >
                  <div className={`h-7 w-7 rounded-full border flex items-center justify-center shrink-0 font-black text-xs ${badgeStyle}`}>
                    {isAnswered && isCorrect ? <Check className="h-4 w-4" /> : isAnswered && isSelected ? <X className="h-4 w-4" /> : alt.key}
                  </div>
                  <span className="flex-1 break-words">{alt.val}</span>
                </button>
              );
            })}
          </div>

          {/* Navigation Button */}
          {isAnswered && (
            <button
              onClick={handleNextQuestion}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
              id="btn_game_next"
            >
              {currentIdx === 4 ? "Finalizar y Ver Puntaje" : "Siguiente Pregunta"}
            </button>
          )}
        </div>
      )}

      {gameState === "finished" && (
        <div className="text-center py-10 max-w-md mx-auto space-y-6 flex flex-col items-center">
          <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center border border-amber-200 text-amber-500 animate-pulse">
            <Award className="h-8 w-8 text-amber-500" />
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-black text-slate-800 uppercase">¡EXCELENTE JUEGO TERMINADO!</h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Speed Run Completado</p>
          </div>

          <div className="bg-slate-50 border border-slate-150 rounded-xl p-5 w-full grid grid-cols-2 gap-4">
            <div>
              <span className="block text-[10px] text-slate-400 font-bold uppercase">Puntaje Obtenido</span>
              <span className="text-2xl font-black text-emerald-800">{score} PTS</span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-400 font-bold uppercase">Mejor Récord</span>
              <span className="text-2xl font-black text-slate-700">{highScore} PTS</span>
            </div>
          </div>

          <div className="flex gap-4 w-full">
            <button
              onClick={handleStartGame}
              className="flex-1 bg-[#063c25] hover:bg-[#0a5434] text-white font-black text-xs uppercase tracking-widest py-3 px-4 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="h-4 w-4" />
              Jugar de Nuevo
            </button>
            <button
              onClick={() => setGameState("idle")}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-black text-xs uppercase tracking-widest py-3 px-4 rounded-lg transition-colors cursor-pointer"
            >
              Salir al Inicio
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
