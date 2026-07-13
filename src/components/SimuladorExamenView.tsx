import React, { useState, useEffect } from "react";
import { 
  Play, 
  BookOpen, 
  Clock, 
  HelpCircle, 
  Hourglass, 
  RefreshCw, 
  Search, 
  Check, 
  Sliders, 
  Sparkles, 
  Lock, 
  ShieldCheck, 
  FileText,
  AlertCircle,
  XCircle,
  CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Pregunta, SimulacroPersonalizado, ExamenIntento } from "../types";
import { temarioOficial } from "../data/temarioOficial";
import { isQuestionInTopic } from "../utils";

interface SimuladorExamenViewProps {
  questions: Pregunta[];
  categories: string[];
  customMocks: SimulacroPersonalizado[];
  loadingMocks: boolean;
  onRefreshMocks: () => void;
  onStartExamFlow: (cantOrCfg: any, cat?: string, diff?: string) => void;
  onLaunchCustomMock: (mock: SimulacroPersonalizado) => void;
  history?: ExamenIntento[];
  user: any;
}

export default function SimuladorExamenView({
  questions,
  categories,
  customMocks,
  loadingMocks,
  onRefreshMocks,
  onStartExamFlow,
  onLaunchCustomMock,
  history = [],
  user
}: SimuladorExamenViewProps) {
  const hasFullAccess = user?.rol === "Administrador" || user?.accesoCompleto === true;

  // Helper to get limited questions list
  const getAvailableQuestions = () => {
    if (hasFullAccess) return questions;
    // For non-full-access users, slice questions per topic to max 10
    const limited: Pregunta[] = [];
    temarioOficial.forEach(topic => {
      const topicQs = questions.filter(q => isQuestionInTopic(q, topic));
      limited.push(...topicQs.slice(0, 10));
    });
    // Add any non-official topic questions up to 10
    const nonTopicQs = questions.filter(q => !temarioOficial.some(t => isQuestionInTopic(q, t)));
    const groupedByCategory: { [cat: string]: number } = {};
    nonTopicQs.forEach(q => {
      const cat = q.categoria || "Todas";
      const count = groupedByCategory[cat] || 0;
      if (count < 10) {
        limited.push(q);
        groupedByCategory[cat] = count + 1;
      }
    });
    return limited;
  };

  const availableQuestions = getAvailableQuestions();

  const [activeSubTab, setActiveSubTab] = useState<"POR MATERIA" | "MIS ERRORES" | "PERSONALIZADO" | "SIEXPOL">("POR MATERIA");
  const [errorSearchQuery, setErrorSearchQuery] = useState("");
  const [errorDifficultyFilter, setErrorDifficultyFilter] = useState("Todas");
  const [errorTabMode, setErrorTabMode] = useState<"activos" | "resueltos">("activos");

  // Compute incorrect questions from the attempts history
  const getIncorrectQuestions = () => {
    if (!history || history.length === 0) {
      return { activeErrors: [], correctedErrors: [], errorCounts: {} };
    }

    // Track most recent outcome for each question ID
    const questionStates: { [qId: string]: "Correcto" | "Incorrecto" | "Sin Responder" } = {};
    const errorCounts: { [qId: string]: number } = {};

    // Sort history from oldest to newest to let the newest outcome override previous ones
    const sortedAttempts = [...history].sort(
      (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
    );

    sortedAttempts.forEach((attempt) => {
      if (Array.isArray(attempt.respuestas)) {
        attempt.respuestas.forEach((resp) => {
          questionStates[resp.pregunta_id] = resp.resultado;
          if (resp.resultado === "Incorrecto") {
            errorCounts[resp.pregunta_id] = (errorCounts[resp.pregunta_id] || 0) + 1;
          }
        });
      }
    });

    // Map question IDs to actual Pregunta objects
    const failedQuestions = questions.filter(
      (q) => questionStates[q.id] === "Incorrecto" || errorCounts[q.id] > 0
    );

    const activeErrors = failedQuestions.filter((q) => questionStates[q.id] === "Incorrecto");
    const correctedErrors = failedQuestions.filter((q) => questionStates[q.id] === "Correcto");

    return {
      activeErrors,
      correctedErrors,
      errorCounts
    };
  };

  const { activeErrors, correctedErrors, errorCounts } = getIncorrectQuestions();

  // Filter temarioOficial to only keep topics that have questions loaded
  const activeTemario = temarioOficial.filter(t => questions.some(q => isQuestionInTopic(q, t)));

  // --- TAB 1: POR MATERIA STATE ---
  const [selectedMateriaIds, setSelectedMateriaIds] = useState<number[]>([]);
  const [qtyMateria, setQtyMateria] = useState<number | "Todos">(100);
  const [aleatorio, setAleatorio] = useState(true);
  const [searchTermMateria, setSearchTermMateria] = useState("");

  // --- TAB 3: PERSONALIZADO STATE ---
  const [customCounts, setCustomCounts] = useState<{ [key: number]: number }>({});
  const [searchTermPers, setSearchTermPers] = useState("");

  useEffect(() => {
    if (!hasFullAccess && (qtyMateria === "Todos" || (typeof qtyMateria === "number" && qtyMateria > 20))) {
      setQtyMateria(10);
    }
  }, [hasFullAccess, qtyMateria]);

  useEffect(() => {
    if (questions.length > 0) {
      const active = temarioOficial.filter(t => questions.some(q => isQuestionInTopic(q, t)));
      
      setSelectedMateriaIds(prev => {
        if (prev.length === 0 || prev.every(id => !active.some(a => a.id === id))) {
          return active.slice(0, 3).map(t => t.id);
        }
        return prev;
      });

      setCustomCounts(prev => {
        const next = { ...prev };
        active.forEach(t => {
          const count = questions.filter(q => isQuestionInTopic(q, t)).length;
          if (next[t.id] === undefined || next[t.id] === 0) {
            next[t.id] = 0;
          } else if (next[t.id] > count) {
            next[t.id] = count;
          }
        });
        const total = (Object.values(next) as number[]).reduce((sum, v) => sum + v, 0);
        if (total === 0 && active.length > 0) {
          if (active[0]) next[active[0].id] = Math.min(8, questions.filter(q => isQuestionInTopic(q, active[0])).length);
          if (active[1]) next[active[1].id] = Math.min(2, questions.filter(q => isQuestionInTopic(q, active[1])).length);
          if (active[2]) next[active[2].id] = Math.min(6, questions.filter(q => isQuestionInTopic(q, active[2])).length);
        }
        return next;
      });
    }
  }, [questions]);

  // Helper to count questions loaded for each topic
  const getTopicCount = (topic: any) => {
    const fullCount = questions.filter(q => isQuestionInTopic(q, topic)).length;
    return hasFullAccess ? fullCount : Math.min(fullCount, 10);
  };

  // Toggle selection for "POR MATERIA"
  const toggleMateriaSelection = (id: number) => {
    const topicIndex = activeTemario.findIndex(t => t.id === id);
    const isLocked = !hasFullAccess && topicIndex >= 3;
    if (isLocked) {
      alert("Esta materia está bloqueada en la versión de prueba. Solicita acceso completo al administrador para desbloquear todo el temario.");
      return;
    }
    setSelectedMateriaIds(prev => 
      prev.includes(id) ? prev.filter(mid => mid !== id) : [...prev, id]
    );
  };

  // Select all or Deselect all
  const selectAllMaterias = () => {
    if (!hasFullAccess) {
      // Select only the first 3 unlocked active topics
      setSelectedMateriaIds(activeTemario.slice(0, 3).map(t => t.id));
    } else {
      setSelectedMateriaIds(activeTemario.map(t => t.id));
    }
  };

  const deselectAllMaterias = () => {
    setSelectedMateriaIds([]);
  };

  // Filter topics based on search term
  const filteredMaterias = activeTemario.filter(m => 
    m.nombre.toLowerCase().includes(searchTermMateria.toLowerCase()) ||
    m.id.toString() === searchTermMateria
  );

  const filteredMateriasPers = activeTemario.filter(m => 
    m.nombre.toLowerCase().includes(searchTermPers.toLowerCase()) ||
    m.id.toString() === searchTermPers
  );

  // Calculate cumulative questions in TAB 3
  const totalPersonalizadoQuestions = (Object.values(customCounts) as number[]).reduce((sum, val) => sum + val, 0);

  // --- GENERATION HANDLERS ---

  // Generate Exam: POR MATERIA
  const handleGeneratePorMateria = () => {
    if (selectedMateriaIds.length === 0) {
      alert("Por favor, selecciona al menos una materia para el examen.");
      return;
    }

    const selectedTopics = activeTemario.filter(t => selectedMateriaIds.includes(t.id));
    let pool = availableQuestions.filter(q => 
      selectedTopics.some(topic => isQuestionInTopic(q, topic))
    );

    if (pool.length === 0) {
      alert("No se encontraron preguntas en las materias seleccionadas en la base de datos.");
      return;
    }

    if (aleatorio) {
      pool = [...pool].sort(() => 0.5 - Math.random());
    } else {
      pool = [...pool].sort((a, b) => {
        const topicA = temarioOficial.find(t => isQuestionInTopic(a, t))?.id || 999;
        const topicB = temarioOficial.find(t => isQuestionInTopic(b, t))?.id || 999;
        if (topicA !== topicB) return topicA - topicB;
        return a.id.localeCompare(b.id);
      });
    }

    const targetQty = qtyMateria === "Todos" ? pool.length : Number(qtyMateria);
    const selectedQuestions = pool.slice(0, targetQty);

    onStartExamFlow({
      canvasMode: false,
      cantidad: selectedQuestions.length,
      categoria: "Por Materias",
      dificultad: "Todas",
      customQuestions: selectedQuestions,
      realExamMode: false
    });
  };

  // Generate Exam: PERSONALIZADO
  const handleGeneratePersonalizado = () => {
    const selectedTopicsWithCounts = activeTemario.filter(t => (customCounts[t.id] || 0) > 0);
    
    if (selectedTopicsWithCounts.length === 0) {
      alert("Por favor, asigna al menos una pregunta a alguna materia.");
      return;
    }

    let assembledQuestions: Pregunta[] = [];

    selectedTopicsWithCounts.forEach(topic => {
      const topicCount = customCounts[topic.id] || 0;
      const topicQuestions = availableQuestions.filter(q => isQuestionInTopic(q, topic));
      const shuffledTopicQs = [...topicQuestions].sort(() => 0.5 - Math.random());
      assembledQuestions.push(...shuffledTopicQs.slice(0, topicCount));
    });

    if (assembledQuestions.length === 0) {
      alert("No se encontraron preguntas para las materias con cantidades asignadas.");
      return;
    }

    // Shuffle final exam questions so topics are mixed
    assembledQuestions = assembledQuestions.sort(() => 0.5 - Math.random());

    onStartExamFlow({
      cantidad: assembledQuestions.length,
      categoria: "Personalizado",
      dificultad: "Todas",
      customQuestions: assembledQuestions,
      realExamMode: false
    });
  };

  // Generate Exam: SIEXPOL (Simulacro General de Admisión - Real Exam)
  const handleGenerateSiexpol = () => {
    let pool = [...availableQuestions];
    if (pool.length === 0) {
      alert("No hay preguntas en el banco de preguntas.");
      return;
    }

    const shuffled = pool.sort(() => 0.5 - Math.random());
    const assembled: Pregunta[] = [];
    let i = 0;
    while (assembled.length < 100) {
      const originalQ = shuffled[i % shuffled.length];
      assembled.push({
        ...originalQ,
        id: `${originalQ.id}_siexpol_${assembled.length}`
      });
      i++;
    }

    onStartExamFlow({
      cantidad: 100,
      categoria: "Simulacro General PNP",
      dificultad: "Todas",
      customQuestions: assembled,
      realExamMode: true, // No feedback, answers or reference during exam!
      timeLimit: 120 * 60 // 2 Hours = 120 Minutes
    });
  };

  return (
    <div className="space-y-6 animate-fade-in" id="nuevo_examen_view">
      
      {/* 1. Header Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xs">
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black bg-emerald-100 text-[#063c25] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Simulador Académico 2.0
            </span>
            <span className="text-[10px] font-black bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Ascenso PNP 2026
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
            Configuración de Nuevo Examen
          </h2>
          <p className="text-xs text-slate-500 font-semibold leading-relaxed">
            Personaliza tu simulacro por materias oficiales, simulacros preestablecidos, o toma el riguroso examen general con control de tiempo real imitando la evaluación oficial.
          </p>
        </div>

        {/* Top Right Badges */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl flex flex-col items-center min-w-[100px] shadow-3xs">
            <span className="text-slate-400 text-[9px] font-bold uppercase tracking-wider">Temas PNP</span>
            <span className="text-[#063c25] text-lg font-black font-mono">{activeTemario.length}</span>
          </div>
          <div className="bg-emerald-50 border border-emerald-150 px-4 py-2.5 rounded-2xl flex flex-col items-center min-w-[110px] shadow-3xs">
            <span className="text-emerald-700 text-[9px] font-bold uppercase tracking-wider">Banco Total</span>
            <span className="text-[#063c25] text-lg font-black font-mono">{questions.length}</span>
          </div>
        </div>
      </div>

      {/* 2. Custom Tabs */}
      <div className="bg-slate-100/80 border border-slate-200/60 p-1.5 rounded-2xl flex flex-wrap gap-1" id="exam_sub_tabs">
        {(["POR MATERIA", "MIS ERRORES", "PERSONALIZADO", "SIEXPOL"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveSubTab(tab)}
            className={`flex-1 min-w-[120px] py-3 text-xs font-black uppercase rounded-xl tracking-wider transition-all cursor-pointer ${
              activeSubTab === tab
                ? "bg-[#063c25] text-white shadow-sm scale-[1.01]"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
            }`}
            id={`subtab_${tab.replace(" ", "_").toLowerCase()}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* 3. Tab Contents with AnimatePresence */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSubTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.15 }}
          className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm"
        >
          {/* TAB 1: POR MATERIA */}
          {activeSubTab === "POR MATERIA" && (
            <div className="space-y-6" id="materia_panel">
              {/* Toolbar */}
              <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl flex flex-col xl:flex-row xl:items-center justify-between gap-6 shadow-3xs">
                
                {/* Select size */}
                <div className="space-y-2">
                  <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    Cantidad de Preguntas
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(hasFullAccess ? [10, 20, 50, 100, "Todos"] : [10, 20]).map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setQtyMateria(num as any)}
                        className={`px-3.5 py-1.5 text-xs font-black rounded-lg border transition-all cursor-pointer ${
                          qtyMateria === num
                            ? "bg-emerald-50 border-emerald-500 text-[#063c25]"
                            : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        {num === "Todos" ? "Todas" : `${num} Pregs`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Switchers & Search */}
                <div className="flex flex-wrap items-center gap-4">
                  {/* Aleatorio Checkbox */}
                  <label className="flex items-center gap-2.5 bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-3xs cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={aleatorio}
                      onChange={(e) => setAleatorio(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-500 shrink-0"
                    />
                    <span className="text-xs font-black text-slate-700 uppercase tracking-wide">Orden Aleatorio</span>
                  </label>

                  {/* Search Input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar materia..."
                      value={searchTermMateria}
                      onChange={(e) => setSearchTermMateria(e.target.value)}
                      className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full sm:w-[220px]"
                    />
                  </div>

                  {/* Generate Button */}
                  <button
                    onClick={handleGeneratePorMateria}
                    className="px-6 py-2 bg-[#063c25] hover:bg-[#095233] text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all cursor-pointer shadow-md hover:shadow-lg hover:scale-[1.01]"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    GENERAR EXAMEN ({selectedMateriaIds.length} mat)
                  </button>
                </div>
              </div>

              {/* Selection actions & counter */}
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={selectAllMaterias}
                    className="text-emerald-700 hover:underline cursor-pointer"
                  >
                    Seleccionar Todas
                  </button>
                  <span className="text-slate-300">|</span>
                  <button 
                    onClick={deselectAllMaterias}
                    className="text-slate-500 hover:underline cursor-pointer"
                  >
                    Limpiar selección
                  </button>
                </div>
                <div>
                  <span className="text-slate-400">Materias seleccionadas:</span> <span className="font-extrabold text-slate-800">{selectedMateriaIds.length} de {activeTemario.length}</span>
                </div>
              </div>

              {/* Materias Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-extrabold uppercase tracking-wider">
                      <th className="py-3 px-4 w-12 text-center">Sel</th>
                      <th className="py-3 px-4">Materia / Ley Temario Oficial</th>
                      <th className="py-3 px-4 text-right w-36">Total Preguntas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMaterias.map((topic) => {
                      const countLoaded = getTopicCount(topic);
                      const isSelected = selectedMateriaIds.includes(topic.id);
                      const topicIndex = activeTemario.findIndex(t => t.id === topic.id);
                      const isTopicLocked = !hasFullAccess && topicIndex >= 3;

                      return (
                        <tr 
                          key={topic.id}
                          onClick={() => toggleMateriaSelection(topic.id)}
                          className={`border-b border-slate-100 hover:bg-slate-50/50 transition-colors cursor-pointer select-none ${
                            isSelected ? "bg-emerald-50/20" : ""
                          } ${isTopicLocked ? "opacity-60 bg-slate-50/40" : ""}`}
                        >
                          <td className="py-3.5 px-4 text-center">
                            {isTopicLocked ? (
                              <Lock className="mx-auto h-4 w-4 text-slate-400" />
                            ) : (
                              <div className={`mx-auto h-5 w-5 rounded border flex items-center justify-center transition-all ${
                                isSelected 
                                  ? "bg-emerald-600 border-emerald-600 text-white" 
                                  : "border-slate-300 bg-white"
                              }`}>
                                {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded shrink-0">
                                TEMA {topic.id}
                              </span>
                              <span className="font-extrabold text-slate-700 uppercase leading-snug break-words pr-2 flex items-center gap-1.5">
                                {topic.nombre}
                                {isTopicLocked && (
                                  <span className="text-[9px] bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded font-black uppercase tracking-wider">
                                    Bloqueado
                                  </span>
                                )}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-500">
                            {isTopicLocked ? "Bloqueado" : `${countLoaded} preguntas`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: MIS ERRORES */}
          {activeSubTab === "MIS ERRORES" && (
            <div className="space-y-6" id="mis_errores_panel">
              <div className="flex flex-col md:flex-row md:items-center justify-between pb-2 gap-4">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Historial de Mis Errores Académicos</h3>
                  <p className="text-[11px] text-slate-400 font-bold uppercase mt-0.5">Analiza tus fallas en tiempo real y vuelve a rendir pruebas para corregirlas</p>
                </div>
                
                {activeErrors.length > 0 && (
                  <button 
                    onClick={() => {
                      onStartExamFlow({
                        cantidad: activeErrors.length,
                        categoria: "Práctica de Errores",
                        dificultad: "Todas",
                        customQuestions: activeErrors
                      });
                    }}
                    className="flex items-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer shadow-md shadow-red-100"
                  >
                    <Play className="h-4 w-4 fill-current animate-pulse shrink-0" />
                    Practicar {activeErrors.length} Errores Activos
                  </button>
                )}
              </div>

              {/* Status KPI Boxes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-red-50/50 border border-red-100 p-4 rounded-2xl flex items-center gap-4">
                  <div className="p-3 bg-red-100 rounded-xl text-red-600 shrink-0">
                    <XCircle className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-black uppercase block tracking-wider font-sans">Errores Activos</span>
                    <span className="text-red-750 text-xl font-black font-mono">{activeErrors.length}</span>
                    <span className="text-[9px] text-slate-500 font-bold uppercase block mt-0.5">Requieren repaso</span>
                  </div>
                </div>

                <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-2xl flex items-center gap-4">
                  <div className="p-3 bg-emerald-100 rounded-xl text-emerald-600 shrink-0">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-black uppercase block tracking-wider font-sans">Errores Corregidos</span>
                    <span className="text-emerald-705 text-xl font-black font-mono">{correctedErrors.length}</span>
                    <span className="text-[9px] text-slate-500 font-bold uppercase block mt-0.5">¡Superados con éxito!</span>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl flex items-center gap-4 sm:col-span-2 lg:col-span-1">
                  <div className="p-3 bg-slate-200 rounded-xl text-slate-500 shrink-0">
                    <HelpCircle className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-black uppercase block tracking-wider font-sans">Tasa de Recuperación</span>
                    <span className="text-slate-700 text-xl font-black font-mono">
                      {activeErrors.length + correctedErrors.length > 0 
                        ? `${Math.round((correctedErrors.length / (activeErrors.length + correctedErrors.length)) * 100)}%`
                        : "0%"
                      }
                    </span>
                    <span className="text-[9px] text-slate-500 font-bold uppercase block mt-0.5">Avance académico</span>
                  </div>
                </div>
              </div>

              {/* Toggle filters & searches */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 flex flex-col sm:flex-row items-center gap-3">
                <div className="flex bg-slate-200 p-1 rounded-xl shrink-0 w-full sm:w-auto">
                  <button
                    onClick={() => setErrorTabMode("activos")}
                    className={`flex-1 sm:flex-none px-4 py-2 text-[10px] font-black uppercase rounded-lg tracking-wider transition-all cursor-pointer ${
                      errorTabMode === "activos"
                        ? "bg-white text-red-700 shadow-3xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Pendientes ({activeErrors.length})
                  </button>
                  <button
                    onClick={() => setErrorTabMode("resueltos")}
                    className={`flex-1 sm:flex-none px-4 py-2 text-[10px] font-black uppercase rounded-lg tracking-wider transition-all cursor-pointer ${
                      errorTabMode === "resueltos"
                        ? "bg-white text-emerald-800 shadow-3xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Superados ({correctedErrors.length})
                  </button>
                </div>

                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar en preguntas con error..."
                    value={errorSearchQuery}
                    onChange={(e) => setErrorSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 w-full bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <select
                  value={errorDifficultyFilter}
                  onChange={(e) => setErrorDifficultyFilter(e.target.value)}
                  className="w-full sm:w-[150px] bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-550"
                >
                  <option value="Todas">Dificultad: Todas</option>
                  <option value="Fácil">Fácil</option>
                  <option value="Medio">Medio</option>
                  <option value="Difícil">Difícil</option>
                </select>
              </div>

              {/* List of erroneous questions */}
              {(() => {
                const baseList = errorTabMode === "activos" ? activeErrors : correctedErrors;
                const filtered = baseList.filter((q) => {
                  const matchQuery = 
                    q.pregunta.toLowerCase().includes(errorSearchQuery.toLowerCase()) ||
                    (q.tema && q.tema.toLowerCase().includes(errorSearchQuery.toLowerCase())) ||
                    (q.explicacion && q.explicacion.toLowerCase().includes(errorSearchQuery.toLowerCase()));
                  const matchDiff = errorDifficultyFilter === "Todas" || q.dificultad === errorDifficultyFilter;
                  return matchQuery && matchDiff;
                });

                if (history.length === 0) {
                  return (
                    <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-3">
                      <Clock className="h-8 w-8 text-slate-300 mx-auto" />
                      <p className="text-xs text-slate-500 font-semibold max-w-sm mx-auto uppercase tracking-wide">
                        No registras ningún examen o simulacro completado todavía.
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        Tus preguntas erradas se registrarán aquí automáticamente para tu reforzamiento académico.
                      </p>
                    </div>
                  );
                }

                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-2">
                      <CheckCircle2 className="h-8 w-8 text-slate-300 mx-auto" />
                      <p className="text-xs text-slate-500 font-bold uppercase">
                        {errorTabMode === "activos" 
                          ? "¡Felicidades! No tienes errores pendientes con estos filtros." 
                          : "No tienes errores superados con estos filtros."
                        }
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        Prueba ajustando los filtros de búsqueda o dificultad.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    {filtered.map((q, idx) => {
                      const correctLetter = (q.respuesta_correcta || "").trim().toUpperCase();
                      const timesFailed = errorCounts[q.id] || 1;

                      return (
                        <div 
                          key={q.id || idx}
                          className="bg-white rounded-2xl border border-slate-250 p-5 space-y-4 shadow-3xs hover:border-slate-350 transition-colors"
                        >
                          {/* Question header */}
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[10px] font-black uppercase text-slate-400">
                                Pregunta {idx + 1}
                              </span>
                              {q.tema && (
                                <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-md uppercase">
                                  {q.tema}
                                </span>
                              )}
                              <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-100 font-bold px-2 py-0.5 rounded-md uppercase">
                                Fallada {timesFailed} {timesFailed === 1 ? "vez" : "veces"}
                              </span>
                            </div>

                            <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                              q.dificultad === "Fácil" 
                                ? "bg-green-50 border-green-200 text-green-700"
                                : q.dificultad === "Difícil"
                                ? "bg-rose-50 border-rose-200 text-rose-700"
                                : "bg-amber-50 border-amber-200 text-amber-700"
                            }`}>
                              {q.dificultad || "Medio"}
                            </span>
                          </div>

                          {/* Enunciado */}
                          <p className="text-xs sm:text-sm font-black text-slate-800 leading-relaxed uppercase">
                            {q.pregunta}
                          </p>

                          {/* Options list */}
                          <div className="grid grid-cols-1 gap-2">
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
                                  className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-start gap-3 ${
                                    isCorrect
                                      ? "bg-emerald-50 border-emerald-350 text-emerald-950 shadow-3xs"
                                      : "bg-slate-50/40 border-slate-200 text-slate-600"
                                  }`}
                                >
                                  <span className={`h-5 w-5 rounded-md shrink-0 flex items-center justify-center text-[10px] font-black ${
                                    isCorrect ? "bg-emerald-800 text-white" : "bg-slate-200 text-slate-500"
                                  }`}>
                                    {opt.key}
                                  </span>
                                  <span className="leading-tight uppercase">{opt.text}</span>
                                </div>
                              );
                            })}
                          </div>

                          {/* Explanation */}
                          {q.explicacion && (
                            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 space-y-1">
                              <span className="text-[10px] font-black text-amber-800 uppercase block tracking-wider">Fundamento Técnico & Sustento Jurídico</span>
                              <p className="text-xs text-amber-900 font-semibold leading-relaxed uppercase">
                                {q.explicacion}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB 3: PERSONALIZADO */}
          {activeSubTab === "PERSONALIZADO" && (
            <div className="space-y-6" id="personalizado_panel">
              {/* Table header control bar */}
              <div className="bg-[#f0f9f4] border border-emerald-100 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-3xs">
                <div className="flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-emerald-800 shrink-0" />
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-xs sm:text-sm uppercase tracking-tight">Personaliza la cantidad de preguntas</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">Define de forma quirúrgica cuántos reactivos tomar de cada ley o código</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Filtrar materias..."
                      value={searchTermPers}
                      onChange={(e) => setSearchTermPers(e.target.value)}
                      className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full sm:w-[180px]"
                    />
                  </div>

                  <div className="bg-white border border-emerald-150 px-4 py-2 rounded-xl text-center shadow-3xs min-w-[120px]">
                    <span className="text-slate-400 text-[9px] font-bold uppercase block tracking-wider">Total Acumulado</span>
                    <span className="text-[#063c25] text-sm font-black font-mono">{totalPersonalizadoQuestions} preguntas</span>
                  </div>

                  <button
                    onClick={handleGeneratePersonalizado}
                    className="px-5 py-2.5 bg-[#063c25] hover:bg-[#0a5434] text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                  >
                    <Play className="h-3 w-3 fill-current" />
                    GENERAR
                  </button>
                </div>
              </div>

              {/* Topics Input Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-extrabold uppercase tracking-wider">
                      <th className="py-3 px-4">Materia / Ley Oficial</th>
                      <th className="py-3 px-4 text-center w-28">Máximo Banco</th>
                      <th className="py-3 px-4 text-right w-44">Preguntas a Evaluar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMateriasPers.map((topic) => {
                      const countLoaded = getTopicCount(topic);
                      const currentVal = customCounts[topic.id] || 0;
                      const topicIndex = activeTemario.findIndex(t => t.id === topic.id);
                      const isTopicLocked = !hasFullAccess && topicIndex >= 3;

                      return (
                        <tr 
                          key={topic.id}
                          className={`border-b border-slate-100 hover:bg-slate-50/40 transition-colors ${
                            isTopicLocked ? "opacity-60 bg-slate-50/40" : ""
                          }`}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded shrink-0">
                                TEMA {topic.id}
                              </span>
                              <span className="font-extrabold text-slate-700 uppercase leading-snug break-words pr-2 flex items-center gap-1.5">
                                {topic.nombre}
                                {isTopicLocked && (
                                  <span className="text-[9px] bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded font-black uppercase tracking-wider">
                                    Bloqueado
                                  </span>
                                )}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-slate-400">
                            {isTopicLocked ? "-" : countLoaded}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {isTopicLocked ? (
                              <div className="inline-flex items-center gap-1 text-[10px] font-black text-amber-800 uppercase bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-xl">
                                <Lock className="h-3 w-3" />
                                Bloqueado
                              </div>
                            ) : (
                              <div className="inline-flex items-center border border-slate-200 rounded-xl overflow-hidden bg-white shadow-3xs">
                                {/* Decrement */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCustomCounts(prev => ({
                                      ...prev,
                                      [topic.id]: Math.max(0, (prev[topic.id] || 0) - 1)
                                    }));
                                  }}
                                  className="px-3 py-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors font-extrabold text-base focus:outline-none"
                                >
                                  -
                                </button>

                                {/* Direct Value Input */}
                                <input
                                  type="number"
                                  min="0"
                                  max={countLoaded}
                                  value={currentVal}
                                  onChange={(e) => {
                                    const parsedVal = Math.min(countLoaded, Math.max(0, parseInt(e.target.value) || 0));
                                    setCustomCounts(prev => ({
                                      ...prev,
                                      [topic.id]: parsedVal
                                    }));
                                  }}
                                  className="w-12 text-center text-xs font-black font-mono text-slate-800 bg-transparent border-0 focus:outline-none focus:ring-0"
                                />

                                {/* Increment */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCustomCounts(prev => ({
                                      ...prev,
                                      [topic.id]: Math.min(countLoaded, (prev[topic.id] || 0) + 1)
                                    }));
                                  }}
                                  className="px-3 py-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors font-extrabold text-base focus:outline-none"
                                >
                                  +
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: SIEXPOL */}
          {activeSubTab === "SIEXPOL" && (
            <div className="space-y-6 max-w-3xl mx-auto py-4" id="siecopol_panel">
              <div className="text-center space-y-4">
                <div className="mx-auto h-16 w-16 rounded-full bg-[#063c25]/10 border border-[#063c25]/20 flex items-center justify-center text-[#063c25] shadow-xs animate-pulse">
                  <ShieldCheck className="h-8 w-8 stroke-[1.5]" />
                </div>
                
                <div className="space-y-1">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight">Simulacro General PNP - SIEXPOL</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase">Formato de Evaluación Oficial Rigurosa</p>
                </div>

                <div className="max-w-md mx-auto text-xs text-slate-500 leading-relaxed font-semibold">
                  Esta evaluación imita al 100% las condiciones de tu examen presencial de ascenso. Está diseñada para calibrar tu rendimiento real con alta presión de tiempo.
                </div>
              </div>

              {/* Specs Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="bg-slate-50 p-4 border border-slate-150 rounded-2xl text-center space-y-1 shadow-3xs">
                  <FileText className="h-5 w-5 text-emerald-800 mx-auto" />
                  <span className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider">PREGUNTAS</span>
                  <span className="block text-base font-black text-slate-800 font-mono">100 Reactivos</span>
                </div>

                <div className="bg-slate-50 p-4 border border-slate-150 rounded-2xl text-center space-y-1 shadow-3xs">
                  <Clock className="h-5 w-5 text-emerald-800 mx-auto" />
                  <span className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider">TIEMPO LÍMITE</span>
                  <span className="block text-base font-black text-slate-800 font-mono">120 Minutos</span>
                </div>

                <div className="bg-slate-50 p-4 border border-slate-150 rounded-2xl text-center space-y-1 shadow-3xs">
                  <Sliders className="h-5 w-5 text-[#063c25] mx-auto" />
                  <span className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider">MODO EVALUACIÓN</span>
                  <span className="block text-xs font-extrabold text-[#063c25] uppercase pt-0.5">Examen Real</span>
                </div>
              </div>

              {/* Notice Box */}
              <div className="bg-rose-50 border border-rose-150 rounded-2xl p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-[11px] text-rose-800 font-bold leading-relaxed space-y-1">
                  <p className="uppercase tracking-wide">Condición Especial Examen Real:</p>
                  <p className="font-semibold text-rose-700/90 leading-normal">
                    La retroalimentación en pantalla estará <span className="underline font-black">completamente desactivada</span>. No verás respuestas correctas ni justificaciones de ubicación de artículos al responder. El puntaje y los resultados con justificaciones solo se liberarán al presionar el botón "Finalizar".
                  </p>
                </div>
              </div>

              {/* Start CTA */}
              <button
                onClick={handleGenerateSiexpol}
                className="w-full py-4 bg-[#063c25] hover:bg-[#0a5434] text-white rounded-2xl font-black text-xs sm:text-sm uppercase tracking-widest transition-all shadow-md hover:shadow-lg hover:scale-[1.01] flex items-center justify-center gap-2 cursor-pointer focus:outline-none"
              >
                <Play className="h-4 w-4 fill-current text-white shrink-0" />
                COMENZAR SIMULACRO GENERAL SIEXPOL
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

    </div>
  );
}
