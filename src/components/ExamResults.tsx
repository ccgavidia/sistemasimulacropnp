import React, { useState } from "react";
import { Award, CheckCircle2, XCircle, AlertCircle, Clock, BookOpen, Brain, ArrowLeft, Printer, FileCheck, ShieldAlert, FileText, QrCode } from "lucide-react";
import { Pregunta, ExamenIntento } from "../types";

interface ExamResultsProps {
  attempt: ExamenIntento;
  questions: Pregunta[];
  onBackToDashboard: () => void;
}

export default function ExamResults({ attempt, questions, onBackToDashboard }: ExamResultsProps) {
  const [loadingAi, setLoadingAi] = useState<{ [key: string]: boolean }>({});
  const [aiExplanations, setAiExplanations] = useState<{ [key: string]: string }>({});
  const [errorAi, setErrorAi] = useState<{ [key: string]: string }>({});
  
  // Interactive "Acta de Finalización" state
  const [showActa, setShowActa] = useState(false);

  const handleConsultAi = async (qId: string, question: Pregunta, userAns: string) => {
    setLoadingAi((prev) => ({ ...prev, [qId]: true }));
    setErrorAi((prev) => ({ ...prev, [qId]: "" }));

    try {
      const response = await fetch("/api/gemini/explain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          pregunta: question.pregunta,
          alternativa_a: question.alternativa_a,
          alternativa_b: question.alternativa_b,
          alternativa_c: question.alternativa_c,
          alternativa_d: question.alternativa_d,
          alternativa_e: question.alternativa_e,
          respuesta_correcta: question.respuesta_correcta,
          respuesta_usuario: userAns,
          categoria: question.categoria,
          tema: question.tema
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Error al conectar con la IA.");
      }

      setAiExplanations((prev) => ({
        ...prev,
        [qId]: data.explanation
      }));
    } catch (err: any) {
      console.error(err);
      setErrorAi((prev) => ({
        ...prev,
        [qId]: err.message || "Error al generar la explicación con IA."
      }));
    } finally {
      setLoadingAi((prev) => ({ ...prev, [qId]: false }));
    }
  };

  const formatTime = (secs: number) => {
    const minutes = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${minutes}m ${seconds}s`;
  };

  const handlePrintActa = () => {
    window.print();
  };

  const isPassed = attempt.puntaje >= 70; // 70%+ is standard pass
  const isBorderline = attempt.puntaje >= 55 && attempt.puntaje < 70;

  // Generate unique validation hash code for military certificate
  const validationCode = `SE-2026-${attempt.id.slice(0, 5).toUpperCase()}-${attempt.puntaje}`;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in font-sans" id="results_page">
      
      {/* Print-Only stylesheet injection to hide main dashboard content when printing the certificate */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print_certificate_area, #print_certificate_area * {
            visibility: visible;
          }
          #print_certificate_area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: none !important;
          }
          #results_page_actions, #results_score_banner, #results_metrics_grid, #review_section, #layout_wrapper, header, nav, footer {
            display: none !important;
          }
        }
      `}</style>

      {/* Screen view vs Certificate view toggles */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200" id="results_page_actions">
        <div className="flex gap-2">
          <button
            onClick={() => setShowActa(false)}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
              !showActa 
                ? "bg-slate-900 text-white shadow-md" 
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Revisar Preguntas
          </button>
          
          <button
            onClick={() => setShowActa(true)}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 ${
              showActa 
                ? "bg-blue-600 text-white shadow-md" 
                : "bg-blue-50 text-blue-700 hover:bg-blue-100"
            }`}
            id="btn_view_acta"
          >
            <FileText className="h-4 w-4" />
            Ver Acta Oficial de Finalización
          </button>
        </div>

        <button
          onClick={onBackToDashboard}
          className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-4 py-2 rounded-lg text-xs transition-all flex items-center gap-1.5 focus:outline-none"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al Dashboard
        </button>
      </div>

      {!showActa ? (
        <>
          {/* A. Standard Results View: Score Summary Banner */}
          <div className={`rounded-2xl p-8 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 ${
            isPassed 
              ? "bg-gradient-to-r from-emerald-700 to-teal-800" 
              : isBorderline 
                ? "bg-gradient-to-r from-amber-600 to-yellow-700" 
                : "bg-gradient-to-r from-red-600 to-pink-700"
          }`} id="results_score_banner">
            <div className="space-y-3 text-center md:text-left relative z-10">
              <span className="text-xs uppercase font-extrabold tracking-widest bg-white/20 px-3 py-1 rounded-full">
                Simulacro Finalizado
              </span>
              <h1 className="text-3xl font-black tracking-tight uppercase">
                {isPassed 
                  ? "¡Excelente Calificación!" 
                  : isBorderline 
                    ? "¡Sigue Esforzándote!" 
                    : "Se Requiere Mayor Estudio"}
              </h1>
              <p className="text-blue-50 text-xs sm:text-sm max-w-md leading-relaxed">
                {isPassed 
                  ? "Has superado con éxito el puntaje de aprobación. Tu constancia legal y preparación garantizan el éxito en el ascenso real." 
                  : isBorderline 
                    ? "Estás muy cerca de la nota ideal. Revisa tus respuestas legales erróneas y vuelve a simular para afianzar tu base de conocimientos." 
                    : "No has alcanzado el puntaje aprobatorio básico de 70%. Te sugerimos usar nuestro tutor inteligente de IA para estudiar cada base de derecho."}
              </p>
              <div className="pt-2 flex flex-wrap gap-2 justify-center md:justify-start">
                <button
                  onClick={() => setShowActa(true)}
                  className="bg-white text-slate-900 hover:bg-slate-100 font-extrabold px-4.5 py-2 rounded-lg text-xs shadow transition-all flex items-center gap-1.5 focus:outline-none cursor-pointer"
                >
                  <FileCheck className="h-4 w-4 text-blue-600" />
                  Visualizar Acta Legal
                </button>
              </div>
            </div>

            {/* Big Circle Score Display */}
            <div className="relative shrink-0 flex flex-col items-center justify-center h-40 w-40 rounded-full border-4 border-white/30 bg-white/10 shadow-inner z-10 animate-scale-up" id="circle_score">
              <span className="text-[10px] text-blue-100 font-black uppercase tracking-widest block">Puntaje</span>
              <span className="text-5xl font-black block mt-1 tracking-tight">{attempt.puntaje}</span>
              <span className="text-[10px] text-blue-50 font-bold block mt-1 uppercase tracking-wide">
                Puntos Obtenidos
              </span>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4" id="results_metrics_grid">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Correctas</span>
                <span className="text-base font-black text-slate-800 block">{attempt.respuestas_correctas}</span>
              </div>
            </div>
            
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
              <XCircle className="h-5 w-5 text-red-600 shrink-0" />
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Incorrectas</span>
                <span className="text-base font-black text-slate-800 block">{attempt.respuestas_incorrectas}</span>
              </div>
            </div>
            
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-slate-400 shrink-0" />
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Sin responder</span>
                <span className="text-base font-black text-slate-800 block">{attempt.sin_responder}</span>
              </div>
            </div>
            
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
              <Clock className="h-5 w-5 text-blue-600 shrink-0" />
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Tiempo usado</span>
                <span className="text-xs font-black text-slate-800 block truncate" title={formatTime(attempt.tiempo_utilizado)}>
                  {formatTime(attempt.tiempo_utilizado)}
                </span>
              </div>
            </div>
          </div>

          {/* Detailed Question Review List */}
          <div className="space-y-6" id="review_section">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
              <BookOpen className="h-4 w-4 text-blue-600 shrink-0" />
              <h2 className="text-base font-black uppercase text-slate-800 tracking-wider">
                Revisión Detallada del Examen
              </h2>
            </div>

            <div className="space-y-6" id="questions_review_list">
              {questions.map((question, idx) => {
                const userResp = attempt.respuestas.find((r) => r.pregunta_id === question.id);
                const userAns = userResp?.respuesta_usuario || "";
                const outcome = userResp?.resultado || "Sin Responder";

                const options = [
                  { key: "A", value: question.alternativa_a },
                  { key: "B", value: question.alternativa_b },
                  { key: "C", value: question.alternativa_c },
                  { key: "D", value: question.alternativa_d },
                  { key: "E", value: question.alternativa_e },
                ];

                return (
                  <div 
                    key={question.id} 
                    className={`bg-white rounded-xl border p-5 sm:p-6 shadow-sm space-y-4 relative transition-all ${
                      outcome === "Correcto" 
                        ? "border-green-200 bg-green-50/5" 
                        : outcome === "Incorrecto" 
                          ? "border-red-200 bg-red-50/5" 
                          : "border-slate-200"
                    }`}
                  >
                    {/* Outcome Badge */}
                    <div className="absolute top-4 right-5 sm:top-6 sm:right-6">
                      <span className={`inline-block text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                        outcome === "Correcto" 
                          ? "bg-green-100 text-green-800" 
                          : outcome === "Incorrecto" 
                            ? "bg-red-100 text-red-800" 
                            : "bg-slate-100 text-slate-800"
                      }`}>
                        {outcome === "Sin Responder" ? "Sin Responder (*)" : outcome}
                      </span>
                    </div>

                    {/* Meta & Title */}
                    <div className="space-y-2 pr-28">
                      <div className="flex gap-2 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                        <span>{question.categoria}</span>
                        <span>•</span>
                        <span>{question.tema}</span>
                      </div>
                      <h3 className="font-extrabold text-sm sm:text-base text-slate-800 leading-relaxed">
                        {idx + 1}. {question.pregunta}
                      </h3>
                    </div>

                    {/* Alternatives Grid */}
                    <div className="grid grid-cols-1 gap-2.5 pt-2">
                      {options.map((opt) => {
                        const correctLetter = (question.respuesta_correcta || "").trim().toUpperCase();
                        const isCorrect = opt.key === correctLetter;
                        const isUserSelected = opt.key === userAns;

                        return (
                          <div 
                            key={opt.key}
                            className={`p-3.5 rounded-lg border text-xs sm:text-sm leading-relaxed flex items-start gap-3 ${
                              isCorrect 
                                ? "bg-green-50 border-green-300 text-green-950 font-semibold shadow-sm" 
                                : isUserSelected 
                                  ? "bg-red-50 border-red-300 text-red-950" 
                                  : "bg-white border-slate-200 text-slate-700"
                            }`}
                          >
                            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-black uppercase ${
                              isCorrect 
                                ? "bg-green-600 text-white" 
                                : isUserSelected 
                                  ? "bg-red-600 text-white" 
                                  : "bg-slate-100 text-slate-600"
                            }`}>
                              {opt.key}
                            </span>
                            <span className="font-medium">{opt.value}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Base legal description */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-150 text-xs text-slate-600 leading-relaxed space-y-1">
                      <span className="font-black text-slate-700 uppercase tracking-widest text-[9px] block">Base Legal Oficial del Temario:</span>
                      <p className="font-bold">{question.explicacion}</p>
                      {(question.ubicacion || question.codigo) && (
                        <div className="flex flex-wrap gap-4 mt-2 pt-2 border-t border-slate-150 text-[10px] font-bold text-slate-500 uppercase">
                          {question.codigo && (
                            <span>Código: <span className="text-slate-800 font-mono">{question.codigo}</span></span>
                          )}
                          {question.ubicacion && (
                            <span>Ubicación: <span className="text-slate-800 font-semibold">{question.ubicacion}</span></span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Gemini AI explanation interface */}
                    <div className="pt-2">
                      {aiExplanations[question.id] ? (
                        <div className="bg-blue-50/50 border border-blue-200 rounded-lg p-5 space-y-3 animate-fade-in text-xs sm:text-sm text-slate-800 leading-relaxed">
                          <div className="flex items-center gap-2 text-blue-900 font-extrabold uppercase text-[10px] pb-2 border-b border-blue-200">
                            <Brain className="h-4 w-4 shrink-0 text-blue-600" />
                            <span>Tutor Legal Virtual (Gemini AI feedback)</span>
                          </div>
                          <div className="whitespace-pre-wrap font-medium space-y-2">
                            {aiExplanations[question.id]}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => handleConsultAi(question.id, question, userAns)}
                            disabled={loadingAi[question.id]}
                            className="self-start flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-black px-4 py-2 rounded-lg text-xs transition-colors focus:outline-none disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed cursor-pointer"
                            id={`btn_explain_ai_${question.id}`}
                          >
                            <Brain className={`h-4 w-4 shrink-0 text-blue-600 ${loadingAi[question.id] ? "animate-bounce" : ""}`} />
                            {loadingAi[question.id] ? "Sincronizando con la Inteligencia Artificial..." : "Analizar con Tutor Inteligente IA"}
                          </button>
                          
                          {errorAi[question.id] && (
                            <p className="text-xs font-semibold text-red-600 mt-1">{errorAi[question.id]}</p>
                          )}
                        </div>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        /* B. ACTA DE CONFORMIDAD Y FINALIZACIÓN (High Fidelity Print Certificate View) */
        <div className="bg-white rounded-xl border border-slate-300 shadow-xl p-8 max-w-3xl mx-auto space-y-8" id="print_certificate_area">
          
          {/* Watermark Logo & Military Border styling */}
          <div className="border-4 border-double border-slate-800 p-6 sm:p-10 space-y-8 relative overflow-hidden bg-white">
            
            {/* Stamp Logo decoration background */}
            <div className="absolute inset-0 flex items-center justify-center opacity-3 pointer-events-none select-none">
              <FileCheck className="h-96 w-96 text-slate-900" />
            </div>

            {/* Certificate Header block */}
            <div className="text-center space-y-2 pb-6 border-b-2 border-slate-800 relative z-10">
              <h2 className="text-lg font-black tracking-widest text-slate-900 uppercase">
                POLICÍA NACIONAL DEL PERÚ
              </h2>
              <p className="text-[10px] font-black tracking-widest text-slate-500 uppercase">
                DIRECCIÓN DE RECURSOS HUMANOS • COMISIÓN CENTRAL DE ASCENSO 2026
              </p>
              <div className="h-1 w-24 bg-slate-800 mx-auto mt-2"></div>
              <h3 className="text-base font-black tracking-wider text-slate-800 uppercase pt-4 leading-tight">
                ACTA DE CONFORMIDAD Y FINALIZACIÓN DEL EXAMEN VIRTUAL
              </h3>
              <p className="text-[10px] font-bold text-slate-500">
                CÓDIGO DE VALIDACIÓN: <span className="font-mono text-slate-800 font-bold">{validationCode}</span>
              </p>
            </div>

            {/* Certificate Body text */}
            <div className="space-y-6 text-xs sm:text-sm text-slate-800 leading-relaxed relative z-10">
              
              <p className="indent-8 font-medium">
                Por medio del presente documento, se deja constancia oficial que el postulante que se detalla a continuación ha concluido de forma satisfactoria el proceso de rendición del <span className="font-extrabold">Examen Virtual de Conocimientos Policiales y Legales</span>, bajo el marco legal y normas vigentes del concurso de ascenso PNP del año 2026 (Promoción 2027).
              </p>

              {/* Postulante Data Grid */}
              <div className="bg-slate-50 p-4 rounded border border-slate-300 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 font-semibold text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Nombre del Postulante:</span>
                  <span className="text-slate-900 uppercase font-black block">{attempt.usuario_nombre.toUpperCase()}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">ID de Simulación / UID:</span>
                  <span className="text-slate-800 font-mono block">{attempt.usuario_id.toUpperCase()}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Fecha y Hora de Rendición:</span>
                  <span className="text-slate-900 block">{new Date(attempt.fecha).toLocaleString("es-PE")}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Tiempo Total Transcurrido:</span>
                  <span className="text-slate-900 block">{formatTime(attempt.tiempo_utilizado)} de {Math.floor(attempt.tiempo_total / 60)} minutos</span>
                </div>
              </div>

              {/* Points Results Grid */}
              <div className="space-y-3">
                <h4 className="font-black text-xs uppercase tracking-wider text-slate-800 pb-1 border-b border-slate-200">
                  DETALLE DEL PUNTAJE Y RENDIMIENTO LEGAL
                </h4>
                
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-slate-50 p-3 rounded border border-slate-200">
                    <span className="text-[9px] text-slate-400 font-black uppercase block">Correctas</span>
                    <span className="text-xl font-black text-green-700 block mt-1">{attempt.respuestas_correctas}</span>
                    <span className="text-[9px] text-slate-400 font-bold block">Preguntas</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded border border-slate-200">
                    <span className="text-[9px] text-slate-400 font-black uppercase block">Incorrectas</span>
                    <span className="text-xl font-black text-red-700 block mt-1">{attempt.respuestas_incorrectas}</span>
                    <span className="text-[9px] text-slate-400 font-bold block">Preguntas</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded border border-slate-200">
                    <span className="text-[9px] text-slate-400 font-black uppercase block">Sin Contestar (*)</span>
                    <span className="text-xl font-black text-slate-600 block mt-1">{attempt.sin_responder}</span>
                    <span className="text-[9px] text-slate-400 font-bold block">Preguntas</span>
                  </div>
                </div>

                <div className="bg-slate-900 text-white p-4 rounded border border-slate-950 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Calificación Final Obtenida</span>
                    <span className="text-xs text-blue-200 font-bold block">Meta de Aprobación Mínima: 70 Puntos</span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-white tracking-tight">{attempt.puntaje} PUNTOS</span>
                    <span className="block text-[10px] font-black uppercase tracking-widest text-green-400 mt-0.5">
                      {isPassed ? "SITUACIÓN: APTO / APROBADO" : "SITUACIÓN: NO APTO / DESAPROBADO"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Validation Footnotes */}
              <p className="text-[10px] text-slate-500 font-semibold leading-relaxed text-justify">
                (*) De acuerdo al manual de SIEXPOL, las respuestas no contestadas quedan registradas con la marca de un asterisco (*) en señal de omisión voluntaria por parte del postulante, no computando puntos para la calificación final del examen de conocimientos. El presente documento virtual tiene validez legal de preparación y es emitido en la plataforma de simulación.
              </p>

              {/* QR and Auth Barcode Row */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-6 border-t border-slate-200">
                <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded border border-slate-200">
                  <QrCode className="h-12 w-12 text-slate-800" />
                  <div className="text-[9px] text-slate-500 font-bold">
                    <p className="uppercase text-slate-700">SIEXPOL QR VALIDATION</p>
                    <p className="font-mono mt-0.5">HASH: {validationCode}</p>
                    <p className="mt-0.5">Sincronizado vía Nube / Demo Local</p>
                  </div>
                </div>

                {/* Simulated Stamp signature placeholders */}
                <div className="grid grid-cols-2 gap-8 text-center text-[10px] font-black uppercase text-slate-600 w-full sm:w-auto">
                  <div className="border-t border-slate-400 pt-2 px-4">
                    <p className="text-slate-800">FIRMA DEL POSTULANTE</p>
                    <p className="text-[8px] text-slate-400 font-bold mt-1">DNI / CIP: MANUAL REGISTRO</p>
                  </div>
                  <div className="border-t border-slate-400 pt-2 px-4">
                    <p className="text-slate-800">COMISIÓN EVALUADORA</p>
                    <p className="text-[8px] text-slate-400 font-bold mt-1">SIEXPOL DIRREHUM PNP</p>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Certificate Actions row (Print & Toggle review) */}
          <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-200">
            <button
              onClick={() => setShowActa(false)}
              className="text-xs text-slate-600 hover:text-slate-800 font-bold transition-all flex items-center gap-1.5 focus:outline-none cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              Regresar a la Revisión de Respuestas
            </button>

            <button
              onClick={handlePrintActa}
              className="bg-blue-600 hover:bg-blue-700 text-white font-black px-6 py-3 rounded-lg text-xs tracking-widest uppercase transition-all flex items-center gap-2 shadow-md cursor-pointer focus:outline-none"
              id="btn_print_acta"
            >
              <Printer className="h-4 w-4" />
              Imprimir Acta Oficial
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
