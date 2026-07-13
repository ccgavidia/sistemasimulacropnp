import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { BarChart3, Brain, ClipboardCheck, Sparkles, AlertCircle, Hourglass, HelpCircle, Check, ArrowRight } from "lucide-react";
import { ExamenIntento, Usuario, Pregunta } from "../types";

interface MiHistorialProps {
  user: Usuario;
  questions: Pregunta[];
}

export default function MiHistorial({ user, questions }: MiHistorialProps) {
  const [history, setHistorial] = useState<ExamenIntento[]>([]);
  const [loading, setLoading] = useState(true);
  const [studyPlan, setStudyPlan] = useState("");
  const [generating, setGenerating] = useState(false);
  const [errorAi, setErrorAi] = useState("");

  // States for incorrect questions (banco de errores)
  const [searchErrorQuery, setSearchErrorQuery] = useState("");
  const [selectedErrorCategory, setSelectedErrorCategory] = useState("TODOS");
  const [expandedQuestions, setExpandedQuestions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchHistory();
  }, []);

  const toggleQuestionExpanded = (id: string) => {
    setExpandedQuestions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Extract unique incorrect question IDs across all past attempts
  const incorrectQuestionIds = Array.from(
    new Set(
      history.flatMap((attempt) =>
        (attempt.respuestas || [])
          .filter((resp) => resp.resultado === "Incorrecto")
          .map((resp) => resp.pregunta_id)
      )
    )
  );

  // Map to actual Pregunta objects
  const incorrectQuestions = (questions || []).filter((q) =>
    incorrectQuestionIds.includes(q.id)
  );

  // Filter wrong questions based on search query and category
  const filteredErrors = incorrectQuestions.filter((q) => {
    const matchesSearch =
      q.pregunta.toLowerCase().includes(searchErrorQuery.toLowerCase()) ||
      (q.explicacion && q.explicacion.toLowerCase().includes(searchErrorQuery.toLowerCase())) ||
      (q.tema && q.tema.toLowerCase().includes(searchErrorQuery.toLowerCase()));
    const matchesCategory =
      selectedErrorCategory === "TODOS" || q.categoria === selectedErrorCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ["TODOS", ...Array.from(new Set(incorrectQuestions.map((q) => q.categoria)))];

  const fetchHistory = async () => {
    setLoading(true);
    let attempts: ExamenIntento[] = [];
    
    // Check if we can load from local storage
    const loadLocalAttempts = () => {
      try {
        const stored = localStorage.getItem("offline_intentos");
        if (stored) {
          const all = JSON.parse(stored) as ExamenIntento[];
          return all
            .filter((item) => item.usuario_id === user.uid)
            .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
        }
      } catch (localErr) {
        console.warn("Could not load history from localStorage:", localErr);
      }
      return [];
    };

    if (user.uid.startsWith("demo_")) {
      attempts = loadLocalAttempts();
      setHistorial(attempts);
      setLoading(false);
      return;
    }

    try {
      const q = query(
        collection(db, "intentos"),
        where("usuario_id", "==", user.uid)
      );
      const snapshot = await getDocs(q);
      attempts = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as ExamenIntento[];
      // Sort in memory to avoid Firestore composite index requirement
      attempts.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      setHistorial(attempts);
    } catch (err) {
      console.warn("Error loading history list from Firestore. Falling back to local storage:", err);
      attempts = loadLocalAttempts();
      setHistorial(attempts);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateStudyPlan = async () => {
    if (history.length === 0) return;
    setGenerating(true);
    setErrorAi("");
    setStudyPlan("");

    // Package historical points for Gemini analysis
    const simplifiedHistory = history.map((attempt) => ({
      fecha: attempt.fecha.split("T")[0],
      simulacro_titulo: attempt.titulo_simulacro || "Práctica Rápida",
      preguntas_totales: attempt.cantidad_preguntas,
      puntaje: attempt.puntaje,
      respuestas_correctas: attempt.respuestas_correctas,
      respuestas_incorrectas: attempt.respuestas_incorrectas,
      sin_responder: attempt.sin_responder,
      tiempo_utilizado_segundos: attempt.tiempo_utilizado
    }));

    try {
      const response = await fetch("/api/gemini/study-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          historial_intentos: simplifiedHistory,
          usuario_nombre: user.nombre
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Error al conectar con la IA.");
      }

      setStudyPlan(data.studyPlan);
    } catch (err: any) {
      console.error(evt => err);
      setErrorAi(err.message || "Error al generar el plan de estudio con IA.");
    } finally {
      setGenerating(false);
    }
  };

  const formatTime = (secs: number) => {
    const minutes = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${minutes}m ${seconds}s`;
  };

  // Derive simple aggregations
  const totalExams = history.length;
  const avgScore = history.length > 0 
    ? Math.round(history.reduce((acc, curr) => acc + curr.puntaje, 0) / history.length) 
    : 0;

  return (
    <div className="space-y-8 animate-fade-in font-sans" id="history_page">

      {!user.accesoCompleto && user.uid !== "demo_admin_uid" && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in">
          <div className="space-y-1">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
              Modo de Demostración Activo
            </h3>
            <p className="text-[11px] text-slate-500 leading-normal max-w-2xl">
              Tus estadísticas, intentos de exámenes y banco de errores se almacenan localmente en este navegador. Para sincronizarlos permanentemente en la nube y desbloquear simulaciones oficiales completas con firmas, solicita el <strong>Acceso Completo</strong> al administrador.
            </p>
          </div>
          <a
            href="https://wa.me/51956784321?text=Hola%20Coronel%20PNP%20CCGAVIDIA,%20solicito%20el%20Acceso%20Completo%20para%20el%20sistema%20de%20simulacros%20SIEXPOL."
            target="_blank"
            rel="noopener noreferrer"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 px-4 rounded-xl text-xs flex items-center gap-1.5 shrink-0 transition-all shadow-md hover:scale-[1.01] cursor-pointer"
          >
            <span>SOLICITAR ACCESO COMPLETO</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>
      )}
      
      {/* Title Header Block */}
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
          <HistoryIcon className="h-5 w-5 text-blue-600" />
          Mi Historial y Plan de Estudio
        </h1>
        <p className="text-xs text-slate-500 mt-1">Revisa tus calificaciones pasadas, analiza tu progreso y obtén recomendaciones de estudio con Inteligencia Artificial.</p>
      </div>

      {/* AI STUDY RECOMMENDATIONS BANNER BLOCK */}
      {totalExams > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col" id="ai_recs_block">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-50 border border-blue-100 text-blue-600 p-2.5 rounded-xl">
                <Brain className="h-5 w-5 shrink-0" />
              </div>
              <div>
                <h2 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  Asesor de Estudio de Inteligencia Artificial (Gemini AI)
                  <Sparkles className="h-3.5 w-3.5 text-amber-500 fill-current" />
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">Analiza tus {totalExams} simulacros anteriores para generar un plan de estudio y de repaso legal especializado.</p>
              </div>
            </div>

            <button
              onClick={handleGenerateStudyPlan}
              disabled={generating}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-4 rounded-lg text-xs shadow transition-all flex items-center gap-2 shrink-0 cursor-pointer disabled:bg-slate-400 disabled:cursor-not-allowed focus:outline-none"
              id="btn_study_plan_ai"
            >
              <Brain className={`h-3.5 w-3.5 ${generating ? "animate-pulse" : ""}`} />
              {generating ? "Generando plan..." : "OBTENER PLAN DE ESTUDIO IA"}
            </button>
          </div>

          <div className="p-6 sm:p-8 space-y-4">
            {errorAi && (
              <div className="p-3 bg-red-50 text-red-700 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4" />
                <span>{errorAi}</span>
              </div>
            )}

            {studyPlan ? (
              <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-6 sm:p-8 space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed animate-fade-in relative">
                <div className="flex items-center gap-2 text-blue-950 font-black uppercase text-[10px] tracking-wider pb-3 border-b border-blue-100">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500 fill-current" />
                  <span>Plan de Estudio Oficial Altamente Personalizado</span>
                </div>
                <div className="whitespace-pre-wrap font-medium space-y-3">
                  {studyPlan}
                </div>
              </div>
            ) : !generating ? (
              <p className="text-xs text-slate-400 italic">
                * Haz clic en el botón de arriba para que Gemini analice tus aciertos y errores, priorice tus temas débiles y te estructure un cronograma semanal verídico.
              </p>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-3">
                <div className="h-8 w-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-xs font-bold">Analizando tus respuestas en Firestore y estructurando recomendaciones...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* HISTORIAL LIST TABLE BLOCK */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" id="history_list_block">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-600 shrink-0" />
            <h2 className="font-bold text-slate-800 text-sm">Historial de Calificaciones ({totalExams})</h2>
          </div>
          {totalExams > 0 && (
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
              Rendimiento Promedio: <span className="font-extrabold text-blue-600">{avgScore}%</span>
            </span>
          )}
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-8 text-xs text-slate-400 font-bold uppercase tracking-wider">Cargando tu historial completo...</div>
          ) : history.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-xs font-bold uppercase tracking-wider">
              <ClipboardCheck className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <span>Aún no registras intentos de examen. ¡Ve al Dashboard e inicia tu práctica!</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-xs text-left">
                <thead>
                  <tr className="text-[10px] text-slate-400 font-black uppercase tracking-wider border-b border-slate-200 bg-slate-50/50">
                    <th className="px-6 py-3 rounded-l-lg">Fecha de Envío</th>
                    <th className="px-6 py-3">Simulacro / Práctica</th>
                    <th className="px-6 py-3 text-center">Correctas</th>
                    <th className="px-6 py-3 text-center">Incorrectas</th>
                    <th className="px-6 py-3 text-center">Sin Responder</th>
                    <th className="px-6 py-3 text-center">Tiempo Invertido</th>
                    <th className="px-6 py-3 text-right rounded-r-lg">Calificación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700 bg-white">
                  {history.map((attempt) => {
                    const minutes = Math.floor(attempt.tiempo_utilizado / 60);
                    const seconds = attempt.tiempo_utilizado % 60;
                    return (
                      <tr key={attempt.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-[10px] text-slate-500 font-bold">
                          {new Date(attempt.fecha).toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-800">
                          {attempt.titulo_simulacro || `Práctica Rápida (${attempt.cantidad_preguntas} pregs)`}
                        </td>
                        <td className="px-6 py-4 text-center text-green-600 font-bold">{attempt.respuestas_correctas}</td>
                        <td className="px-6 py-4 text-center text-red-600 font-bold">{attempt.respuestas_incorrectas}</td>
                        <td className="px-6 py-4 text-center text-slate-400 font-semibold">{attempt.sin_responder}</td>
                        <td className="px-6 py-4 text-center text-[10px] text-slate-500 font-semibold">
                          {minutes}m {seconds}s
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`inline-block font-extrabold text-[11px] px-2.5 py-1 rounded-lg ${
                            attempt.puntaje >= 70 ? "bg-green-50 text-green-700 border border-green-200" : attempt.puntaje >= 55 ? "bg-yellow-50 text-yellow-700 border border-yellow-200" : "bg-red-50 text-red-700 border border-red-200"
                          }`}>
                            {attempt.puntaje}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* BANCO DE ERRORES / PREGUNTAS CON ERRORES BLOCK */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in" id="error_bank_block">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <div>
              <h2 className="font-bold text-slate-800 text-sm">Mis Preguntas con Errores ({incorrectQuestions.length})</h2>
              <p className="text-[10px] text-slate-500 mt-0.5">Analiza y repasa las preguntas oficiales donde has marcado alternativas incorrectas en simulacros.</p>
            </div>
          </div>

          {incorrectQuestions.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
              {/* Category Filter */}
              <select
                value={selectedErrorCategory}
                onChange={(e) => setSelectedErrorCategory(e.target.value)}
                className="bg-white border border-slate-200 text-xs text-slate-700 rounded-lg px-2.5 py-1.5 font-bold focus:outline-none cursor-pointer"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === "TODOS" ? "TODAS LAS MATERIAS" : cat.toUpperCase()}
                  </option>
                ))}
              </select>

              {/* Text Search */}
              <input
                type="text"
                placeholder="Buscar por pregunta..."
                value={searchErrorQuery}
                onChange={(e) => setSearchErrorQuery(e.target.value)}
                className="bg-white border border-slate-200 text-xs text-slate-700 rounded-lg px-2.5 py-1.5 font-medium focus:outline-none w-full sm:w-44"
              />
            </div>
          )}
        </div>

        <div className="p-6">
          {incorrectQuestions.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs font-bold uppercase tracking-wider">
              <Check className="h-10 w-10 text-emerald-500 bg-emerald-50 p-2 rounded-full mx-auto mb-3 border border-emerald-100" />
              <span>¡Excelente! No tienes preguntas con errores registradas.</span>
            </div>
          ) : filteredErrors.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs italic">
              Ninguna pregunta coincide con los criterios de búsqueda actuales.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredErrors.map((q, idx) => {
                const isExpanded = !!expandedQuestions[q.id];
                return (
                  <div key={q.id} className="border border-slate-150 rounded-xl overflow-hidden transition-all bg-white hover:border-slate-300">
                    <div 
                      onClick={() => toggleQuestionExpanded(q.id)}
                      className="px-5 py-4 bg-slate-50/50 hover:bg-slate-50 transition-colors flex items-start justify-between gap-4 cursor-pointer"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[9px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-100 px-2 py-0.5 rounded">
                            Pregunta con Error #{idx + 1}
                          </span>
                          <span className="text-[9px] font-bold uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                            {q.categoria}
                          </span>
                          {q.tema && (
                            <span className="text-[9px] font-medium text-slate-500 italic max-w-xs truncate">
                              {q.tema}
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-bold text-slate-800 leading-relaxed mt-1">
                          {q.pregunta}
                        </p>
                      </div>
                      <span className="text-blue-600 hover:text-blue-800 text-xs font-black shrink-0 uppercase select-none mt-1">
                        {isExpanded ? "Ocultar" : "Ver Detalle"}
                      </span>
                    </div>

                    {isExpanded && (
                      <div className="px-5 pb-5 pt-3 border-t border-slate-100 bg-white space-y-4 text-xs">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-medium">
                          <div className={`p-3 rounded-lg border ${q.respuesta_correcta === "A" ? "bg-emerald-50/50 border-emerald-200 text-emerald-950 font-bold" : "bg-slate-50 border-slate-100 text-slate-500"}`}>
                            <span className="font-extrabold mr-1.5">A)</span> {q.alternativa_a}
                          </div>
                          <div className={`p-3 rounded-lg border ${q.respuesta_correcta === "B" ? "bg-emerald-50/50 border-emerald-200 text-emerald-950 font-bold" : "bg-slate-50 border-slate-100 text-slate-500"}`}>
                            <span className="font-extrabold mr-1.5">B)</span> {q.alternativa_b}
                          </div>
                          <div className={`p-3 rounded-lg border ${q.respuesta_correcta === "C" ? "bg-emerald-50/50 border-emerald-200 text-emerald-950 font-bold" : "bg-slate-50 border-slate-100 text-slate-500"}`}>
                            <span className="font-extrabold mr-1.5">C)</span> {q.alternativa_c}
                          </div>
                          <div className={`p-3 rounded-lg border ${q.respuesta_correcta === "D" ? "bg-emerald-50/50 border-emerald-200 text-emerald-950 font-bold" : "bg-slate-50 border-slate-100 text-slate-500"}`}>
                            <span className="font-extrabold mr-1.5">D)</span> {q.alternativa_d}
                          </div>
                          {q.alternativa_e && (
                            <div className={`p-3 rounded-lg border md:col-span-2 ${q.respuesta_correcta === "E" ? "bg-emerald-50/50 border-emerald-200 text-emerald-950 font-bold" : "bg-slate-50 border-slate-100 text-slate-500"}`}>
                              <span className="font-extrabold mr-1.5">E)</span> {q.alternativa_e}
                            </div>
                          )}
                        </div>

                        {q.explicacion && (
                          <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-4 space-y-1.5">
                            <span className="text-[10px] font-black text-blue-900 uppercase tracking-wide flex items-center gap-1">
                              <Brain className="h-3.5 w-3.5 text-blue-600" />
                              Explicación y Base Legal
                            </span>
                            <p className="text-slate-700 font-medium leading-relaxed text-[11px]">
                              {q.explicacion}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

// Simple internal icon definition to avoid naming conflicts with Lucide React
function HistoryIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  );
}
