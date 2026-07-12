import React, { useState } from "react";
import { 
  BookOpen, 
  HelpCircle, 
  Shield, 
  Scale, 
  Lock, 
  ChevronRight, 
  GraduationCap, 
  ArrowLeft, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  FileText 
} from "lucide-react";
import { Pregunta } from "../types";
import { isQuestionInTopic } from "../utils";

interface BancoPreguntasViewProps {
  temas: any[];
  questions: Pregunta[];
  onStartExamFlow: (cantidad: number, categoria: string, dificultad: string) => void;
  user: any;
}

export default function BancoPreguntasView({ temas, questions, onStartExamFlow, user }: BancoPreguntasViewProps) {
  const [selectedTopic, setSelectedTopic] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("Todas");

  const hasFullAccess = user?.rol === "Administrador" || user?.accesoCompleto === true;

  // Helper to determine icon based on theme
  const getTopicIcon = (topicId: number) => {
    switch (topicId) {
      case 1:
        return <Scale className="h-6 w-6 text-emerald-800" />;
      case 2:
        return <GraduationCap className="h-6 w-6 text-emerald-800" />;
      case 3:
      case 4:
        return <Shield className="h-6 w-6 text-emerald-800" />;
      default:
        return <Lock className="h-6 w-6 text-emerald-800" />;
    }
  };

  // If a topic is selected, render the list of questions
  if (selectedTopic) {
    let topicQuestions = questions.filter(q => isQuestionInTopic(q, selectedTopic));
    if (!hasFullAccess) {
      topicQuestions = topicQuestions.slice(0, 10);
    }
    
    // Apply filters
    const filteredQuestions = topicQuestions.filter(q => {
      // Filter by difficulty
      if (difficultyFilter !== "Todas" && q.dificultad !== difficultyFilter) {
        return false;
      }
      
      // Filter by search query
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase().trim();
        const inPregunta = q.pregunta?.toLowerCase().includes(query);
        const inExplicacion = q.explicacion?.toLowerCase().includes(query);
        const inA = q.alternativa_a?.toLowerCase().includes(query);
        const inB = q.alternativa_b?.toLowerCase().includes(query);
        const inC = q.alternativa_c?.toLowerCase().includes(query);
        const inD = q.alternativa_d?.toLowerCase().includes(query);
        const inE = q.alternativa_e?.toLowerCase().includes(query);
        
        return inPregunta || inExplicacion || inA || inB || inC || inD || inE;
      }
      
      return true;
    });

    return (
      <div className="space-y-6 animate-fade-in" id="banco_preguntas_detalle">
        {/* Detail Header Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <button
            onClick={() => {
              setSelectedTopic(null);
              setSearchQuery("");
              setDifficultyFilter("Todas");
            }}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-emerald-800 transition-colors uppercase cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a materias
          </button>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-100">
                Banco de Preguntas
              </span>
              <h2 className="text-lg sm:text-xl font-black text-slate-800 uppercase tracking-tight">
                {selectedTopic.nombre}
              </h2>
              <p className="text-xs text-slate-500 font-semibold">
                Mostrando {filteredQuestions.length} de {topicQuestions.length} preguntas disponibles. {!hasFullAccess && "(Limitado a 10 en versión de prueba)"}
              </p>
            </div>

            {/* Start Practice Option for this topic */}
            <button
              onClick={() => {
                const qCount = !hasFullAccess ? 10 : 20;
                onStartExamFlow(qCount, selectedTopic.abreviatura, "Todas");
              }}
              className="bg-emerald-800 hover:bg-emerald-900 text-white font-black text-xs py-3 px-5 rounded-xl uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-700"
            >
              <HelpCircle className="h-4 w-4" />
              Simular examen de este tema {!hasFullAccess && "(Prueba)"}
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search Input */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar en preguntas, alternativas o justificaciones..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-transparent transition-all"
            />
          </div>

          {/* Difficulty Dropdown */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-tight whitespace-nowrap">
              Dificultad:
            </label>
            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-transparent transition-all"
            >
              <option value="Todas">Todas las dificultades</option>
              <option value="Fácil">Fácil</option>
              <option value="Medio">Medio</option>
              <option value="Difícil">Difícil</option>
            </select>
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-4">
          {filteredQuestions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-150 p-12 text-center space-y-3">
              <AlertCircle className="h-10 w-10 text-slate-400 mx-auto" />
              <h3 className="text-sm font-black text-slate-700 uppercase">Sin resultados</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto font-medium">
                No encontramos preguntas que coincidan con la búsqueda o el filtro seleccionado en esta materia.
              </p>
            </div>
          ) : (
            filteredQuestions.map((q, index) => {
              const correctLetter = (q.respuesta_correcta || "").trim().toUpperCase();

              return (
                <div 
                  key={q.id || index} 
                  className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4 transition-all hover:border-slate-300"
                >
                  {/* Question Card Meta */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-black text-emerald-800 uppercase tracking-wider">
                        Pregunta {index + 1}
                      </span>
                      {q.tema && (
                        <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-md uppercase max-w-[200px] sm:max-w-xs truncate">
                          {q.tema}
                        </span>
                      )}
                      {(q.ubicacion || q.codigo) && (
                        <span className="text-[10px] bg-teal-50 text-teal-800 border border-teal-200 font-black px-2.5 py-0.5 rounded-md uppercase font-mono">
                          {q.ubicacion || q.codigo}
                        </span>
                      )}
                    </div>
                    
                    <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                      q.dificultad === "Fácil" 
                        ? "bg-green-50 border-green-200 text-green-700"
                        : q.dificultad === "Difícil"
                        ? "bg-rose-50 border-rose-200 text-rose-700"
                        : "bg-amber-50 border-amber-200 text-amber-700"
                    }`}>
                      {q.dificultad || "Medio"}
                    </span>
                  </div>

                  {/* Question Enunciado */}
                  <p className="text-xs sm:text-sm font-extrabold text-slate-800 leading-relaxed uppercase">
                    {q.pregunta}
                  </p>

                  {/* Alternatives List */}
                  <div className="grid grid-cols-1 gap-2.5">
                    {[
                      { key: "A", text: q.alternativa_a },
                      { key: "B", text: q.alternativa_b },
                      { key: "C", text: q.alternativa_c },
                      { key: "D", text: q.alternativa_d },
                      { key: "E", text: q.alternativa_e },
                    ].map((opt) => {
                      if (!opt.text) return null;
                      const isCorrect = correctLetter === opt.key;

                      return (
                        <div
                          key={opt.key}
                          className={`p-3.5 rounded-xl border text-xs font-bold transition-all flex items-start gap-3 ${
                            isCorrect
                              ? "bg-emerald-50/80 border-emerald-400 text-emerald-950 shadow-xs"
                              : "bg-slate-50/40 border-slate-200 text-slate-600"
                          }`}
                        >
                          <span className={`h-5 w-5 rounded-md shrink-0 flex items-center justify-center text-[10px] font-black ${
                            isCorrect ? "bg-emerald-800 text-white" : "bg-slate-200 text-slate-500"
                          }`}>
                            {opt.key}
                          </span>
                          <span className="leading-tight uppercase">{opt.text}</span>
                          {isCorrect && (
                            <CheckCircle2 className="h-4.5 w-4.5 text-emerald-800 shrink-0 ml-auto self-center" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Reference / Explanation Card Detail */}
                  {(q.explicacion || q.ubicacion || q.codigo) && (
                    <div className="bg-amber-50/40 border border-amber-200/60 rounded-2xl p-4 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/30 pb-1.5">
                        <div className="flex items-center gap-2 text-amber-800">
                          <FileText className="h-4 w-4 shrink-0" />
                          <span className="text-[10px] font-black uppercase tracking-wider">
                            Referencia y Sustento Legal:
                          </span>
                        </div>
                        {(q.ubicacion || q.codigo) && (
                          <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-200 font-black px-2.5 py-0.5 rounded-md uppercase font-mono">
                            {q.ubicacion || q.codigo}
                          </span>
                        )}
                      </div>
                      {q.explicacion ? (
                        <p className="text-xs font-bold text-slate-700 uppercase leading-relaxed">
                          {q.explicacion}
                        </p>
                      ) : (
                        <p className="text-xs font-bold text-slate-500 uppercase italic">
                          Ubicación constitucional/legal: {q.ubicacion || q.codigo}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // Otherwise, render the default selection grid
  return (
    <div className="space-y-6 animate-fade-in" id="banco_preguntas_tab">
      
      {/* Header Panel with Floating Stats */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-xl font-black text-emerald-950 uppercase tracking-tight">
            Banco de preguntas por materia
          </h2>
          <p className="text-xs text-slate-500 font-semibold">
            Selecciona una materia para ver las preguntas disponibles con sus respuestas y referencias de inmediato.
          </p>
        </div>

        {/* Floating Info Stats Row */}
        <div className="flex items-center gap-4 w-full md:w-auto">
          {/* Materias */}
          <div className="bg-slate-50 border border-slate-150 rounded-xl p-4 flex items-center gap-3 flex-1 md:flex-initial md:w-44">
            <div className="h-10 w-10 rounded-full bg-emerald-800 text-white flex items-center justify-center shrink-0">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Materias</p>
              <p className="text-lg font-black text-slate-800">{temas.length}</p>
            </div>
          </div>

          {/* Preguntas */}
          <div className="bg-slate-50 border border-slate-150 rounded-xl p-4 flex items-center gap-3 flex-1 md:flex-initial md:w-44">
            <div className="h-10 w-10 rounded-full bg-emerald-800 text-white flex items-center justify-center shrink-0">
              <HelpCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Preguntas</p>
              <p className="text-lg font-black text-slate-800">{questions.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Materials (Custom cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="banco_preguntas_grid">
        {temas.map((topic, index) => {
          const isTopicLocked = !hasFullAccess && index >= 3;
          const fullCount = questions.filter(q => isQuestionInTopic(q, topic)).length;
          const countLoaded = hasFullAccess ? fullCount : Math.min(fullCount, 10);
          
          return (
            <button
              key={topic.id}
              onClick={() => {
                if (isTopicLocked) {
                  alert("Esta materia está bloqueada en la versión de prueba. Solicita acceso completo al administrador para desbloquear todo el temario.");
                  return;
                }
                if (countLoaded > 0) {
                  setSelectedTopic(topic);
                } else {
                  alert("No hay preguntas cargadas en el simulador para esta materia todavía.");
                }
              }}
              className={`w-full text-left bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/15 p-5 rounded-2xl transition-all flex items-center justify-between gap-4 group cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-700 ${
                isTopicLocked ? "opacity-60 bg-slate-50/40 border-slate-200 hover:border-slate-200 hover:bg-slate-50/40" : ""
              }`}
              id={`banco_materia_${topic.id}`}
            >
              <div className="flex items-center gap-4 min-w-0 flex-1">
                {/* Custom Icon Box */}
                <div className="h-12 w-12 rounded-xl bg-slate-50 border border-slate-150 flex items-center justify-center shrink-0 group-hover:bg-emerald-50 transition-colors">
                  {isTopicLocked ? <Lock className="h-6 w-6 text-slate-400" /> : getTopicIcon(topic.id)}
                </div>

                <div className="min-w-0 space-y-1">
                  <h3 className="font-extrabold text-xs sm:text-sm text-slate-800 leading-snug group-hover:text-emerald-900 transition-colors uppercase break-words flex items-center gap-1.5">
                    {topic.nombre}
                    {isTopicLocked && (
                      <span className="text-[9px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-black uppercase tracking-wider shrink-0">
                        Bloqueado
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-tight">
                    {isTopicLocked 
                      ? "Bloqueado en versión de prueba" 
                      : (countLoaded > 0 ? `${countLoaded} preguntas disponibles` : "Sin preguntas cargadas")
                    }
                  </p>
                </div>
              </div>

              {/* Action Chevron */}
              <div className="shrink-0 text-slate-400 group-hover:text-emerald-800 group-hover:translate-x-1 transition-all">
                {isTopicLocked ? <Lock className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-5 w-5" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
