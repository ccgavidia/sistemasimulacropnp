import React from "react";
import { Star, HelpCircle, Hourglass, Play, BarChart3, TrendingUp, Award, CheckCircle2, MessageCircle, AlertCircle, ArrowRight } from "lucide-react";
import { ExamenIntento, Usuario } from "../types";

interface InicioViewProps {
  user: Usuario;
  stats: {
    totalExams: number;
    avgScore: number;
    highestScore: number;
    totalCorrect: number;
    totalQuestions: number;
    categoryWeakness: string;
  };
  history: ExamenIntento[];
  onLaunchOfficialExam: () => void;
  setActiveTab: (tab: string) => void;
}

const getMensajeAliento = (grado?: string) => {
  const GRADOS_ORDENADOS = ["S3", "S2", "S1", "ST3", "ST2", "ST1", "SB", "SS"];
  const index = GRADOS_ORDENADOS.indexOf(grado || "");
  if (index !== -1 && index < GRADOS_ORDENADOS.length - 1) {
    const proximoGrado = GRADOS_ORDENADOS[index + 1];
    return `¡Tú puedes, futuro ${proximoGrado}! 👮‍♂️🇵🇪✨`;
  }
  return "¡Tú puedes lograr tu meta en el examen de ascenso! 👮‍♂️🇵🇪✨";
};

export default function InicioView({
  user,
  stats,
  history,
  onLaunchOfficialExam,
  setActiveTab
}: InicioViewProps) {
  return (
    <div className="space-y-8 animate-fade-in" id="inicio_view_tab">
      {/* Welcome Banner */}
      <div className="bg-[#e7f4ee] border border-emerald-200 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left flex-1">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
            <span className="text-[10px] font-extrabold tracking-widest text-[#063c25] bg-emerald-100 px-2.5 py-1 rounded-full uppercase border border-emerald-200">
              POLICÍA NACIONAL DEL PERÚ
            </span>
            <span className="text-[10px] font-black text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded-full uppercase">
              RECOMENDADO • ASCENSO 2026
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            ¡BIENVENIDO, {user.grado ? `${user.grado} PNP ${user.nombre.toUpperCase()} ${user.apellidos?.toUpperCase()}` : user.nombre.toUpperCase()}!
          </h2>
          <p className="text-sm font-black text-emerald-800 tracking-tight flex items-center justify-center md:justify-start gap-1.5 animate-pulse">
            <span>{getMensajeAliento(user.grado)}</span>
          </p>
          <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
            Plataforma oficial de entrenamiento y simulacros SIEXPOL. Prepárate con el temario legal y de conocimientos vigentes actualizados al concurso de ascenso 2026.
          </p>
        </div>
        <div className="h-14 w-14 rounded-full bg-emerald-800 text-white flex items-center justify-center font-extrabold text-xl shadow-md border-2 border-white">
          {user.nombre.charAt(0).toUpperCase()}
        </div>
      </div>

      {!user.accesoCompleto && user.uid !== "demo_admin_uid" && (
        <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-in" id="inicio_demo_banner">
          <div className="space-y-1 text-center md:text-left">
            <h3 className="font-bold text-slate-800 text-sm flex items-center justify-center md:justify-start gap-1.5">
              <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
              Acceso de Demostración Limitado
            </h3>
            <p className="text-[11px] text-slate-500 leading-normal max-w-2xl">
              Estás en modo de prueba. Para desbloquear todos los simulacros oficiales, plan de estudio completo, audios y registrar tus calificaciones de forma permanente, solicita tu <strong>Acceso Completo</strong> comunicándote al <strong>931 238 088</strong> o tocando el botón de WhatsApp.
            </p>
          </div>
          <a
            href="https://wa.me/51931238088?text=quiero%20acceso%20completo%20al%20SIEXPOL"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 px-5 rounded-xl text-xs flex items-center justify-center gap-2 shrink-0 transition-all shadow-md hover:scale-[1.01] cursor-pointer animate-pulse"
          >
            <MessageCircle className="h-4 w-4 fill-current text-white shrink-0" />
            <span>QUIERO ACCESO COMPLETO</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>
      )}

      {/* Recommended Exam Box */}
      <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-950 border border-emerald-800 rounded-2xl p-6 sm:p-8 shadow-xl flex flex-col lg:flex-row items-center justify-between gap-6" id="inicio_exam_launcher">
        <div className="space-y-3 text-center lg:text-left flex-1">
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2">
            <span className="text-[9px] font-black tracking-widest text-amber-300 bg-amber-400/10 border border-amber-400/30 px-2.5 py-0.5 rounded uppercase">
              EXAMEN DE CONCURSO
            </span>
            <span className="text-[9px] font-black tracking-widest text-white bg-emerald-800 px-2.5 py-0.5 rounded uppercase">
              100 PREGUNTAS • 120 MINUTOS
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
            Simulador de Examen Oficial Completo - SIEXPOL
          </h2>
          <p className="text-xs text-emerald-100/80 font-medium max-w-3xl leading-relaxed">
            Rinde la simulación completa reglamentaria para calibrar tu nivel. Incluye temporizador real de 120 minutos, guardado inmediato de actas oficiales con firmas y control estricto de respuestas.
          </p>
        </div>
        <div className="shrink-0 w-full lg:w-auto">
          <button
            onClick={onLaunchOfficialExam}
            className="w-full lg:w-auto bg-amber-400 hover:bg-amber-500 text-[#063c25] font-black px-8 py-4 rounded-xl text-xs uppercase tracking-widest transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-95 focus:outline-none"
            id="btn_launch_exam_inicio"
          >
            <Star className="h-4 w-4 fill-current text-[#063c25] shrink-0" />
            RENDIR EXAMEN OFICIAL (100 Q)
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" id="inicio_stats">
        {/* Stat 1 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Simulacros Hechos</p>
            <p className="text-3xl font-black text-slate-800">{stats.totalExams}</p>
          </div>
          <div className="mt-3 text-[10px] text-emerald-600 font-bold uppercase tracking-tight flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            <span>Registro Sincronizado</span>
          </div>
        </div>

        {/* Stat 2 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nota Promedio</p>
            <p className="text-3xl font-black text-slate-800">{stats.avgScore}%</p>
          </div>
          <div className="mt-3 text-[10px] text-emerald-700 font-bold uppercase tracking-tight flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            <span>Mínimo aprobatorio: 70%</span>
          </div>
        </div>

        {/* Stat 3 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Puntaje Máximo</p>
            <p className="text-3xl font-black text-slate-800">{stats.highestScore}%</p>
          </div>
          <div className="mt-3 text-[10px] text-amber-600 font-bold uppercase tracking-tight flex items-center gap-1">
            <Award className="h-3 w-3" />
            <span>Récord personal actual</span>
          </div>
        </div>

        {/* Stat 4 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Punto Más Débil</p>
            <p className="text-sm font-black text-slate-800 mt-1 truncate max-w-[200px]" title={stats.categoryWeakness}>
              {stats.categoryWeakness.split(" (")[0]}
            </p>
          </div>
          <div className="mt-3 text-[10px] text-amber-700 font-bold uppercase tracking-tight">
            <span>Se sugiere repasar materia</span>
          </div>
        </div>
      </div>

      {/* Recent Results Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6" id="inicio_history_table">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-emerald-800 shrink-0" />
            <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Últimos Resultados Obtenidos</h2>
          </div>
          <button 
            onClick={() => setActiveTab("historial")} 
            className="text-xs font-bold text-[#063c25] hover:text-[#0a5434] hover:underline transition-colors"
          >
            Ver Historial Completo
          </button>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 rounded-xl text-slate-500 text-sm font-medium">
            Aún no has tomado ningún simulacro. Tus calificaciones e historial se mostrarán aquí.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-150 text-sm text-left">
              <thead>
                <tr className="text-xs text-slate-400 font-bold uppercase bg-slate-50">
                  <th className="px-6 py-3 rounded-l-lg">Fecha</th>
                  <th className="px-6 py-3">Simulacro</th>
                  <th className="px-6 py-3 text-center">Correctas</th>
                  <th className="px-6 py-3 text-center">Incorrectas</th>
                  <th className="px-6 py-3 text-center">Sin Responder</th>
                  <th className="px-6 py-3 text-center">Tiempo</th>
                  <th className="px-6 py-3 text-right rounded-r-lg">Calificación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {history.slice(0, 5).map((attempt) => {
                  const minutes = Math.floor(attempt.tiempo_utilizado / 60);
                  const seconds = attempt.tiempo_utilizado % 60;
                  return (
                    <tr key={attempt.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 font-semibold">
                        {new Date(attempt.fecha).toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900">
                        {attempt.titulo_simulacro || `Práctica Rápida (${attempt.cantidad_preguntas} pregs)`}
                      </td>
                      <td className="px-6 py-4 text-center text-emerald-600 font-bold">{attempt.respuestas_correctas}</td>
                      <td className="px-6 py-4 text-center text-rose-600 font-bold">{attempt.respuestas_incorrectas}</td>
                      <td className="px-6 py-4 text-center text-slate-400 font-semibold">{attempt.sin_responder}</td>
                      <td className="px-6 py-4 text-center text-xs text-slate-500 font-semibold">
                        {minutes}m {seconds}s
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`inline-block font-black text-xs px-2.5 py-1 rounded-lg ${
                          attempt.puntaje >= 70 ? "bg-emerald-100 text-[#063c25]" : attempt.puntaje >= 55 ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"
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
  );
}
