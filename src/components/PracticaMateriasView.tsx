import React, { useState } from "react";
import { BookOpen, Play, Shield, Award, Lock } from "lucide-react";
import { Pregunta } from "../types";
import { isQuestionInTopic } from "../utils";

interface PracticaMateriasViewProps {
  temas: any[];
  questions: Pregunta[];
  onStartExamFlow: (cantidad: number, categoria: string, difficulty: string) => void;
  user: any;
}

export default function PracticaMateriasView({ temas, questions, onStartExamFlow, user }: PracticaMateriasViewProps) {
  const [topicDifficulties, setTopicDifficulties] = useState<{ [key: number]: string }>({});
  const hasFullAccess = user?.rol === "Administrador" || user?.accesoCompleto === true;

  const handleDifficultyChange = (topicId: number, diff: string) => {
    setTopicDifficulties((prev) => ({ ...prev, [topicId]: diff }));
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6 animate-fade-in" id="practica_materias_tab">
      <div className="pb-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-800" />
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Práctica Dirigida por Materia</h2>
          </div>
          <p className="text-xs text-slate-500 font-semibold">
            Configura y toma simulacros enfocados en materias particulares del temario reglamentario de ascenso 2026.
          </p>
        </div>
      </div>

      {/* Topics Practice Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="practica_materias_grid">
        {temas.map((topic, index) => {
          const isTopicLocked = !hasFullAccess && index >= 3;
          const fullCount = questions.filter(q => isQuestionInTopic(q, topic)).length;
          const countLoaded = hasFullAccess ? fullCount : Math.min(fullCount, 10);
          const selectedDiff = topicDifficulties[topic.id] || "Todas";

          return (
            <div 
              key={topic.id}
              className={`border border-slate-200 rounded-2xl p-5 transition-all bg-white flex flex-col justify-between gap-4 ${
                isTopicLocked 
                  ? "opacity-60 bg-slate-50/40 border-slate-200 select-none" 
                  : "hover:border-emerald-200 hover:shadow-sm"
              }`}
              id={`practica_directa_${topic.id}`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black bg-emerald-100 text-[#063c25] px-2.5 py-0.5 rounded-full uppercase">
                    TEMA {topic.id}
                  </span>
                  <span className="text-xs font-bold text-slate-400">
                    {isTopicLocked ? "Bloqueado" : `${countLoaded} Preguntas disponibles`}
                  </span>
                </div>

                <h3 className="font-extrabold text-xs sm:text-sm text-slate-800 leading-snug uppercase break-words flex items-center gap-1.5">
                  {topic.nombre}
                  {isTopicLocked && (
                    <span className="text-[9px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-black uppercase tracking-wider shrink-0">
                      Bloqueado
                    </span>
                  )}
                </h3>
              </div>

              {/* Training config row */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-4">
                <div className="flex-1">
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Dificultad</label>
                  <select
                    value={selectedDiff}
                    disabled={isTopicLocked}
                    onChange={(e) => handleDifficultyChange(topic.id, e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-[11px] font-bold text-slate-600 disabled:opacity-50"
                  >
                    <option value="Todas">Todas</option>
                    <option value="Fácil">Fácil</option>
                    <option value="Medio">Medio</option>
                    <option value="Difícil">Difícil</option>
                  </select>
                </div>

                <div className="shrink-0 pt-4">
                  {isTopicLocked ? (
                    <button
                      onClick={() => alert("Esta materia está bloqueada en la versión de prueba. Solicita acceso completo al administrador para desbloquear todo el temario.")}
                      className="px-4 py-2 bg-amber-50 border border-amber-150 text-amber-800 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer shadow-3xs"
                    >
                      <Lock className="h-3 w-3" />
                      BLOQUEADO
                    </button>
                  ) : countLoaded > 0 ? (
                    <button
                      onClick={() => {
                        onStartExamFlow(countLoaded, topic.abreviatura, selectedDiff);
                      }}
                      className="px-4 py-2 bg-[#063c25] hover:bg-[#0a5434] text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Play className="h-3.5 w-3.5 fill-current text-white shrink-0" />
                      COMENZAR
                    </button>
                  ) : (
                    <button
                      disabled
                      className="px-3 py-2 bg-slate-100 text-slate-400 border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider cursor-not-allowed"
                    >
                      Sin Preguntas
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
