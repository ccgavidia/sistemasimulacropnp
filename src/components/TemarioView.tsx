import React, { useState } from "react";
import { BookOpen, Search, Lock, ArrowLeft, AlertCircle, Sparkles, HelpCircle, CheckCircle2, FileText } from "lucide-react";
import { Pregunta } from "../types";
import { isQuestionInTopic } from "../utils";

interface TemarioViewProps {
  temas: any[];
  questions: Pregunta[];
  onStartExamFlow: (cantidad: number, categoria: string, dificultad: string) => void;
  user: any;
}

export default function TemarioView({ temas, questions, onStartExamFlow, user }: TemarioViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTopicToStudy, setSelectedTopicToStudy] = useState<any | null>(null);
  const [studySearch, setStudySearch] = useState("");
  const [studyDiff, setStudyDiff] = useState("Todas");

  const hasFullAccess = user?.rol === "Administrador" || user?.accesoCompleto === true;





  if (selectedTopicToStudy) {
    // Get questions belonging to selected topic
    let topicQuestions = questions.filter(q => isQuestionInTopic(q, selectedTopicToStudy));
    const totalQuestionsInTopic = topicQuestions.length;

    // Apply demo limit of 10 if no full access
    if (!hasFullAccess) {
      topicQuestions = topicQuestions.slice(0, 10);
    }

    // Apply search and difficulty filters inside the study view
    const filteredStudyQs = topicQuestions.filter(q => {
      const matchesSearch = q.pregunta.toLowerCase().includes(studySearch.toLowerCase()) ||
        [q.alternativa_a, q.alternativa_b, q.alternativa_c, q.alternativa_d, q.alternativa_e]
          .some(alt => alt && alt.toLowerCase().includes(studySearch.toLowerCase()));
      const matchesDiff = studyDiff === "Todas" || q.dificultad === studyDiff;
      return matchesSearch && matchesDiff;
    });

    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6 animate-fade-in" id="temario_study_mode">
        {/* Back and Title Header */}
        <div className="flex flex-col gap-4 pb-5 border-b border-slate-100">
          <div>
            <button
              onClick={() => {
                setSelectedTopicToStudy(null);
                setStudySearch("");
                setStudyDiff("Todas");
              }}
              className="flex items-center gap-2 text-slate-600 hover:text-emerald-800 font-extrabold text-xs uppercase tracking-wider transition-colors cursor-pointer bg-slate-50 border border-slate-200 hover:border-emerald-200 px-4 py-2 rounded-xl focus:outline-none"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al Temario
            </button>
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-800 bg-emerald-50 border border-emerald-200/50 px-2.5 py-1 rounded-md">
              TEMA {selectedTopicToStudy.id} • Balotario Desarrollado
            </span>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight mt-1">
              {selectedTopicToStudy.nombre}
            </h2>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-tight">
              Preguntas oficiales con alternativas resueltas y explicación pedagógica.
            </p>
          </div>
        </div>

        {/* Access Warning banner */}
        {!hasFullAccess && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-black text-amber-900 uppercase">Modo de Demostración Activo</h4>
              <p className="text-[11px] text-amber-800 font-bold leading-normal">
                Estás visualizando un límite de 10 preguntas desarrolladas para este tema. Para acceder al balotario completo con las {totalQuestionsInTopic} preguntas desarrolladas y fundamentadas, solicita tu acceso completo al administrador.
              </p>
            </div>
          </div>
        )}

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-50 border border-slate-150 rounded-2xl p-4">
          <div className="relative w-full sm:flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar palabra clave en las preguntas..."
              value={studySearch}
              onChange={(e) => setStudySearch(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div className="w-full sm:w-48">
            <select
              value={studyDiff}
              onChange={(e) => setStudyDiff(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="Todas">Todas las dificultades</option>
              <option value="Fácil">Fácil</option>
              <option value="Medio">Medio</option>
              <option value="Difícil">Difícil</option>
            </select>
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
          {filteredStudyQs.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl space-y-2">
              <HelpCircle className="h-8 w-8 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500 font-bold uppercase tracking-tight">No se encontraron preguntas desarrolladas</p>
              <p className="text-[11px] text-slate-400 font-semibold">Prueba modificando los filtros de búsqueda o dificultad.</p>
            </div>
          ) : (
            filteredStudyQs.map((q, idx) => {
              const correctLetter = q.respuesta_correcta || "A";
              const correctText = (
                correctLetter === "A" ? q.alternativa_a :
                correctLetter === "B" ? q.alternativa_b :
                correctLetter === "C" ? q.alternativa_c :
                correctLetter === "D" ? q.alternativa_d :
                correctLetter === "E" ? q.alternativa_e || "" : ""
              ) || "";

              return (
                <div 
                  key={q.id} 
                  className="border border-slate-200 bg-white rounded-2xl p-5 shadow-3xs space-y-4 hover:border-slate-300 transition-all"
                  id={`study_q_${q.id}`}
                >
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <span className="text-[10px] font-black text-emerald-800 font-mono bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg">
                      Pregunta #{idx + 1}
                    </span>
                    <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg uppercase tracking-wider border ${
                      q.dificultad === "Fácil" 
                        ? "bg-emerald-50 border-emerald-100 text-emerald-800" 
                        : q.dificultad === "Medio"
                        ? "bg-blue-50 border-blue-100 text-blue-800"
                        : "bg-red-50 border-red-100 text-red-800"
                    }`}>
                      Dificultad: {q.dificultad}
                    </span>
                  </div>

                  <h4 className="text-xs sm:text-sm font-extrabold text-slate-800 leading-relaxed uppercase">
                    {q.pregunta}
                  </h4>

                  {/* Respuesta Correcta */}
                  <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-3.5 flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-black uppercase tracking-wider text-emerald-800 block">Respuesta Correcta:</span>
                      <span className="text-xs sm:text-sm font-extrabold text-slate-800 uppercase">{correctLetter}) {correctText}</span>
                    </div>
                  </div>

                  {/* Fundamento Desarrollado / Base Legal */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-700 uppercase tracking-wider">
                      <FileText className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                      Fundamento Desarrollado (Base Legal):
                    </div>
                    <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 text-xs sm:text-sm font-bold text-slate-700 leading-relaxed whitespace-pre-line uppercase">
                      {q.explicacion || "Disposición oficial establecida en el temario de ascenso PNP."}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Warning banner */}
        {!hasFullAccess && totalQuestionsInTopic > 10 && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-center space-y-3">
            <Lock className="h-5 w-5 text-amber-600 mx-auto" />
            <div className="space-y-1 max-w-md mx-auto">
              <h4 className="text-xs font-black text-slate-800 uppercase">¿Quieres ver más preguntas desarrolladas?</h4>
              <p className="text-[11px] text-slate-500 font-semibold leading-normal">
                Hay {totalQuestionsInTopic - 10} preguntas desarrolladas adicionales para este tema que se encuentran bloqueadas. Comunícate con el administrador para solicitar acceso completo.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6 animate-fade-in" id="temario_view_tab">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-emerald-800" />
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Temario Oficial de Evaluación 2026</h2>
          </div>
          <p className="text-xs text-slate-500 font-semibold">
            Estructura oficial reglamentaria con marcas de numeración para el ascenso de Suboficiales de la PNP.
          </p>
        </div>
        
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar ley, decreto o tema..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Grid of Topics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-2" id="temario_grid_view">
        {temas
          .filter(t => 
            t.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
            t.abreviatura.toLowerCase().includes(searchTerm.toLowerCase())
          )
          .map((topic) => {
            const topicIndex = temas.findIndex(t => t.id === topic.id);
            const isTopicLocked = !hasFullAccess && topicIndex >= 3;
            const fullCount = questions.filter(q => isQuestionInTopic(q, topic)).length;
            const countLoaded = hasFullAccess ? fullCount : Math.min(fullCount, 10);
            
            return (
              <div 
                key={topic.id}
                className={`p-4 rounded-xl border border-slate-200 transition-all flex flex-col justify-between gap-3 bg-white ${
                  isTopicLocked 
                    ? "opacity-60 bg-slate-50/40 border-slate-200 select-none" 
                    : "hover:border-emerald-300 hover:bg-emerald-50/20 hover:shadow-sm"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] font-black tracking-widest text-[#063c25] bg-emerald-100 border border-emerald-200/50 px-2 py-0.5 rounded uppercase">
                      PREGUNTAS {topic.rango}
                    </span>
                    <span className="text-[10px] font-extrabold text-slate-400">
                      {isTopicLocked ? "Bloqueado" : `${topic.cantidadPreguntas} Q Oficiales`}
                    </span>
                  </div>
                  
                  <h3 className="text-xs sm:text-sm font-extrabold text-slate-800 leading-snug flex items-center gap-1.5 uppercase">
                    {topic.id}. {topic.nombre}
                    {isTopicLocked && (
                      <span className="text-[9px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-black uppercase tracking-wider shrink-0">
                        Bloqueado
                      </span>
                    )}
                  </h3>
                </div>

                <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-100 mt-auto">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold">
                    <span className="text-slate-400">Banco:</span>
                    {isTopicLocked ? (
                      <span className="text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 font-semibold">
                        Bloqueado
                      </span>
                    ) : countLoaded > 0 ? (
                      <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-black">
                        {countLoaded} Preguntas {!hasFullAccess && "(Prueba)"}
                      </span>
                    ) : (
                      <span className="text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 font-semibold">
                        0 Preguntas
                      </span>
                    )}
                  </div>

                  <div>
                    {isTopicLocked ? (
                      <button
                        onClick={() => alert("Esta materia está bloqueada en la versión de prueba. Solicita acceso completo al administrador para desbloquear todo el temario.")}
                        className="px-3 py-1.5 bg-amber-50 border border-amber-150 text-amber-800 rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer inline-flex items-center gap-1 shadow-3xs"
                      >
                        <Lock className="h-3 w-3" />
                        Bloqueado
                      </button>
                    ) : countLoaded > 0 ? (
                      <button
                        onClick={() => {
                          setSelectedTopicToStudy(topic);
                        }}
                        className="px-3.5 py-1.5 bg-[#063c25] hover:bg-[#0a5434] text-white rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer transition-colors shadow-3xs"
                      >
                        Ver Desarrollado
                      </button>
                    ) : (
                      <button
                        disabled
                        className="px-3 py-1.5 bg-slate-100 text-slate-400 border border-slate-200 rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-not-allowed"
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
