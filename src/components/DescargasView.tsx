import React, { useState } from "react";
import { Download, FileText, CheckCircle, AlertTriangle } from "lucide-react";

interface DocumentoDescarga {
  id: number;
  titulo: string;
  formato: "PDF" | "DOCX";
  peso: string;
  descripcion: string;
}

export default function DescargasView() {
  const [downloadProgress, setDownloadProgress] = useState<{ [key: number]: number }>({});
  const [downloadedList, setDownloadedList] = useState<{ [key: number]: boolean }>({});

  const documentos: DocumentoDescarga[] = [
    { id: 1, titulo: "Constitución Política del Perú con Modificatoria Ley 31988 (2024)", formato: "PDF", peso: "4.2 MB", descripcion: "Texto oficial consolidado y anotado para el concurso de ascenso de suboficiales de la PNP." },
    { id: 2, titulo: "Ley de la PNP - Decreto Legislativo N° 1267 y su Reglamento", formato: "PDF", peso: "2.8 MB", descripcion: "Normativa fundamental que define la organización, funciones y atribuciones de la Policía Nacional." },
    { id: 3, titulo: "Ley N° 30714 - Ley de Régimen Disciplinario de la PNP", formato: "PDF", peso: "3.5 MB", descripcion: "Infracciones, sanciones, procedimientos y órganos de investigación competentes explicados." },
    { id: 4, titulo: "Planificador de Estudio Semanal y Temario Consolidado 2026", formato: "DOCX", peso: "1.1 MB", descripcion: "Guía metodológica interactiva editable para estructurar tus horas de estudio de forma óptima." }
  ];

  const handleDownloadClick = (id: number) => {
    if (downloadProgress[id] !== undefined || downloadedList[id]) return;

    // Start progress emulation
    let currentVal = 0;
    setDownloadProgress((prev) => ({ ...prev, [id]: 0 }));

    const timer = setInterval(() => {
      currentVal += 10;
      setDownloadProgress((prev) => ({ ...prev, [id]: currentVal }));

      if (currentVal >= 100) {
        clearInterval(timer);
        // Clear progress indicator and mark as downloaded
        setTimeout(() => {
          setDownloadProgress((prev) => {
            const copy = { ...prev };
            delete copy[id];
            return copy;
          });
          setDownloadedList((prev) => ({ ...prev, [id]: true }));
        }, 300);
      }
    }, 150);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6 animate-fade-in" id="descargas_view_tab">
      <div className="pb-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5 text-emerald-800" />
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Centro de Descargas Legales</h2>
          </div>
          <p className="text-xs text-slate-500 font-semibold">
            Descarga los compendios de leyes oficiales, reglamentos vigentes y guías de estudio en PDF directamente a tu dispositivo.
          </p>
        </div>
      </div>

      {/* Grid of Documents */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="descargas_grid">
        {documentos.map((doc) => {
          const progress = downloadProgress[doc.id];
          const isDownloaded = downloadedList[doc.id];
          const isDownloading = progress !== undefined;

          return (
            <div 
              key={doc.id}
              className="border border-slate-200 rounded-2xl p-5 flex flex-col justify-between gap-4 hover:border-emerald-200 transition-all bg-white hover:shadow-sm"
              id={`descarga_doc_${doc.id}`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                    doc.formato === "PDF" ? "bg-rose-50 text-rose-600 border border-rose-100" : "bg-blue-50 text-blue-600 border border-blue-100"
                  }`}>
                    {doc.formato} • {doc.peso}
                  </span>
                  
                  {isDownloaded && (
                    <span className="text-[10px] text-emerald-800 font-extrabold flex items-center gap-1">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-600" /> COMPLETO
                    </span>
                  )}
                </div>

                <div className="flex items-start gap-3 pt-1">
                  <FileText className={`h-8 w-8 shrink-0 ${doc.formato === "PDF" ? "text-rose-500" : "text-blue-500"}`} />
                  <div className="min-w-0 space-y-1">
                    <h3 className="font-extrabold text-sm text-slate-800 leading-snug uppercase break-words">
                      {doc.titulo}
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                      {doc.descripcion}
                    </p>
                  </div>
                </div>
              </div>

              {/* Progress and Download Buttons */}
              <div className="pt-2">
                {isDownloading ? (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-bold text-slate-400">
                      <span>DESCARGANDO...</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-800 transition-all duration-150" style={{ width: `${progress}%` }}></div>
                    </div>
                  </div>
                ) : isDownloaded ? (
                  <button
                    disabled
                    className="w-full py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 font-black text-xs uppercase rounded-xl tracking-wider cursor-default flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle className="h-4 w-4" />
                    ARCHIVO DESCARGADO
                  </button>
                ) : (
                  <button
                    onClick={() => handleDownloadClick(doc.id)}
                    className="w-full py-2.5 bg-[#063c25] hover:bg-[#0a5434] text-white font-black text-xs uppercase rounded-xl tracking-widest transition-all cursor-pointer flex items-center justify-center gap-1.5 hover:shadow-sm focus:outline-none"
                  >
                    <Download className="h-4 w-4" />
                    DESCARGAR COMPENDIO
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
