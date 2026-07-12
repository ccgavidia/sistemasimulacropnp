import React, { useState, useEffect } from "react";
import { CheckSquare, Calendar, Award, BookOpen, ShieldCheck } from "lucide-react";

interface PlanEstudioViewProps {
  temas: any[];
}

export default function PlanEstudioView({ temas }: PlanEstudioViewProps) {
  // Store studies checklist state: { [topicId]: { leido: boolean, resumido: boolean, practicado: boolean } }
  const [checklist, setChecklist] = useState<{ [key: number]: { leido: boolean; resumido: boolean; practicado: boolean } }>({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem("siecopol_study_checklist");
      if (saved) {
        setChecklist(JSON.parse(saved));
      } else {
        // Build empty initial checklist
        const init: any = {};
        temas.forEach(t => {
          init[t.id] = { leido: false, resumido: false, practicado: false };
        });
        setChecklist(init);
      }
    } catch (e) {
      console.warn("Could not load study checklist:", e);
    }
  }, [temas]);

  const toggleCheck = (topicId: number, field: "leido" | "resumido" | "practicado") => {
    const updated = {
      ...checklist,
      [topicId]: {
        ...(checklist[topicId] || { leido: false, resumido: false, practicado: false }),
        [field]: !((checklist[topicId] && checklist[topicId][field]) || false)
      }
    };
    setChecklist(updated);
    try {
      localStorage.setItem("siecopol_study_checklist", JSON.stringify(updated));
    } catch (e) {
      console.warn("Could not save study checklist:", e);
    }
  };

  // Calculate overall progress stats
  const totalTasks = temas.length * 3;
  let completedTasks = 0;
  temas.forEach(t => {
    const state = checklist[t.id] || { leido: false, resumido: false, practicado: false };
    if (state.leido) completedTasks++;
    if (state.resumido) completedTasks++;
    if (state.practicado) completedTasks++;
  });

  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="space-y-6 animate-fade-in" id="plan_estudio_tab">
      
      {/* Stats Summary Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-emerald-800" />
            <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Plan Personalizado de Estudio 2026</h2>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Controla y monitorea tu avance legal diario. Completa las tres tareas primordiales por cada materia oficial del temario para consolidar tus conocimientos policiales.
          </p>
          
          {/* Progress Bar */}
          <div className="space-y-1 pt-2">
            <div className="flex justify-between text-xs font-bold text-slate-400">
              <span>PROGRESO DE PREPARACIÓN</span>
              <span className="text-emerald-800 font-black">{progressPercent}% COMPLETADO</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-800 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Status block */}
        <div className="bg-[#e7f4ee] border border-emerald-100 p-4 rounded-xl flex items-center gap-3 shrink-0">
          <ShieldCheck className="h-10 w-10 text-emerald-800 shrink-0" />
          <div>
            <span className="block text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Tareas Listas</span>
            <span className="text-xl font-black text-[#063c25]">{completedTasks} de {totalTasks}</span>
          </div>
        </div>
      </div>

      {/* Table grid checklist */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm" id="study_table_wrapper">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-150 text-sm text-left">
            <thead>
              <tr className="bg-slate-50 text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
                <th className="px-6 py-4">Materia / Tema de Ascenso</th>
                <th className="px-4 py-4 text-center w-28">1. Leído</th>
                <th className="px-4 py-4 text-center w-28">2. Resumido</th>
                <th className="px-4 py-4 text-center w-28">3. Evaluado</th>
                <th className="px-6 py-4 text-right w-24">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
              {temas.map((topic) => {
                const state = checklist[topic.id] || { leido: false, resumido: false, practicado: false };
                const isFullyDone = state.leido && state.resumido && state.practicado;
                
                return (
                  <tr key={topic.id} className={`hover:bg-slate-50/50 transition-colors ${isFullyDone ? "bg-emerald-50/10" : ""}`}>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <span className="text-[9px] font-black tracking-widest text-[#063c25] bg-emerald-100 px-2 py-0.5 rounded uppercase">
                          TEMA {topic.id}
                        </span>
                        <p className="text-xs sm:text-sm font-black text-slate-800 leading-snug break-words uppercase">
                          {topic.nombre}
                        </p>
                      </div>
                    </td>

                    {/* Checkbox Leido */}
                    <td className="px-4 py-4 text-center">
                      <button
                        onClick={() => toggleCheck(topic.id, "leido")}
                        className={`mx-auto h-6 w-6 rounded-md border flex items-center justify-center transition-colors cursor-pointer ${
                          state.leido 
                            ? "bg-emerald-800 border-emerald-800 text-white" 
                            : "border-slate-300 hover:border-emerald-500 bg-white"
                        }`}
                      >
                        {state.leido && <span className="text-xs font-black">✓</span>}
                      </button>
                    </td>

                    {/* Checkbox Resumido */}
                    <td className="px-4 py-4 text-center">
                      <button
                        onClick={() => toggleCheck(topic.id, "resumido")}
                        className={`mx-auto h-6 w-6 rounded-md border flex items-center justify-center transition-colors cursor-pointer ${
                          state.resumido 
                            ? "bg-emerald-800 border-emerald-800 text-white" 
                            : "border-slate-300 hover:border-emerald-500 bg-white"
                        }`}
                      >
                        {state.resumido && <span className="text-xs font-black">✓</span>}
                      </button>
                    </td>

                    {/* Checkbox Practicado */}
                    <td className="px-4 py-4 text-center">
                      <button
                        onClick={() => toggleCheck(topic.id, "practicado")}
                        className={`mx-auto h-6 w-6 rounded-md border flex items-center justify-center transition-colors cursor-pointer ${
                          state.practicado 
                            ? "bg-emerald-800 border-emerald-800 text-white" 
                            : "border-slate-300 hover:border-emerald-500 bg-white"
                        }`}
                      >
                        {state.practicado && <span className="text-xs font-black">✓</span>}
                      </button>
                    </td>

                    {/* Status badge */}
                    <td className="px-6 py-4 text-right">
                      {isFullyDone ? (
                        <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          LISTO
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          PENDIENTE
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
