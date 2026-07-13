import React, { useState, useEffect, useRef } from "react";
import { 
  Headphones, Play, Pause, Square, Volume2, SkipForward, SkipBack, 
  AlertCircle, BookOpen, HelpCircle, CheckCircle2, ChevronRight, Sparkles 
} from "lucide-react";
import { Pregunta } from "../types";
import { TemaOficial } from "../data/temarioOficial";
import { isQuestionInTopic } from "../utils";

interface ArticuloAudio {
  id: number;
  titulo: string;
  texto: string;
}

interface AudiosViewProps {
  questions: Pregunta[];
  temas: TemaOficial[];
}

export default function AudiosView({ questions = [], temas = [] }: AudiosViewProps) {
  // Modes: "preguntas" (Questions & Answers) or "articulos" (Summary Law Articles)
  const [activeMode, setActiveMode] = useState<"preguntas" | "articulos">("preguntas");

  // State for "Preguntas de Estudio" mode
  const [selectedTemaId, setSelectedTemaId] = useState<number>(() => {
    const active = temas.find(t => questions.some(q => isQuestionInTopic(q, t)));
    return active ? active.id : 1;
  });
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);

  // State for "Artículos de Leyes" mode
  const [selectedLaw, setSelectedLaw] = useState<string>("Constitución Política");
  const [currentArtIdx, setCurrentArtIdx] = useState(0);

  // Audio state
  const [isPlaying, setIsPlaying] = useState(false);
  const [speechRate, setSpeechRate] = useState(1); // Voice speed
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Hardcoded key law articles for reference (Mode: articulos)
  const leyesAudios: { [key: string]: ArticuloAudio[] } = {
    "Constitución Política": [
      { id: 1, titulo: "Artículo 1: Defensa de la persona", texto: "La defensa de la persona humana y el respeto de su dignidad son el fin supremo de la sociedad y del Estado." },
      { id: 2, titulo: "Artículo 2: Derechos fundamentales", texto: "Toda persona tiene derecho a la vida, a su identidad, a su integridad moral, psíquica y física y a su libre desarrollo y bienestar." },
      { id: 44, titulo: "Artículo 44: Deberes del Estado", texto: "Son deberes primordiales del Estado: defender la soberanía nacional; garantizar la plena vigencia de los derechos humanos; proteger a la población de las amenazas contra su seguridad." },
      { id: 166, titulo: "Artículo 166: Finalidad de la PNP", texto: "La Policía Nacional del Perú tiene por finalidad fundamental garantizar, mantener y restablecer el orden interno. Presta protección y ayuda a las personas y a la comunidad. Garantiza el cumplimiento de las leyes y la seguridad de los patrimonios públicos y privados. Previene, investiga y combate la delincuencia." }
    ],
    "Derechos Humanos": [
      { id: 1, titulo: "Declaración Universal - Artículo 1: Dignidad", texto: "Todos los seres humanos nacen libres e iguales en dignidad y derechos y, dotados como están de razón y conciencia, deben comportarse fraternalmente los unos con los otros." },
      { id: 3, titulo: "Declaración Universal - Artículo 3: Derechos Básicos", texto: "Todo individuo tiene derecho a la vida, a la libertad y a la seguridad de su persona. Nadie será sometido a esclavitud ni a torturas." }
    ],
    "Ley de la PNP": [
      { id: 1, titulo: "Decreto Legislativo 1267 - Artículo 1: Objeto", texto: "El presente Decreto Legislativo tiene por objeto establecer y definir la estructura, organización, competencias, funciones y atribuciones de la Policía Nacional del Perú." },
      { id: 2, titulo: "DL 1267 - Artículo 2: Naturaleza de la PNP", texto: "La Policía Nacional del Perú es una institución del Estado de carácter civil, jerarquizada, profesional, disciplinada y técnica, integrada en el Ministerio del Interior, que ejerce competencias en todo el territorio nacional." },
      { id: 3, titulo: "DL 1267 - Artículo 3: Atribuciones del Personal", texto: "Son atribuciones del personal de la Policía Nacional del Perú: Intervenir en las circunstancias que de acuerdo a ley sea necesario, incluso encontrándose de franco, de vacaciones o de licencia, para salvaguardar la vida y el orden público." }
    ],
    "Ley de la Carrera PNP": [
      { id: 1, titulo: "DL 1149 - Ámbito y Objeto", texto: "Normar la carrera, situación, ingresos, reincorporaciones, ascensos, términos de la carrera y situaciones del personal policial." },
      { id: 2, titulo: "Principio del Ascenso Policial", texto: "El Ascenso es la promoción del personal policial a la categoría o grado inmediato superior, en base a la idoneidad moral, profesional, técnica, rendimiento y disciplina." }
    ],
    "Lucha contra Corrupción": [
      { id: 1, titulo: "DL 1291 - Ley de Lucha contra la Corrupción", texto: "Establecer las normas, mecanismos y lineamientos para prevenir, detectar, sancionar y erradicar la corrupción en el sector interior y en la Policía Nacional del Perú." },
      { id: 2, titulo: "Principio de Probidad Policial", texto: "El personal policial debe actuar de forma recta, honesta y transparente, priorizando el interés público sobre intereses particulares en el ejercicio de sus funciones." }
    ],
    "Régimen Disciplinario PNP": [
      { id: 1, titulo: "Ley 30714 - Objeto del Régimen Disciplinario", texto: "La presente Ley tiene por objeto establecer las normas y procedimientos disciplinarios destinados a prevenir, regular y sancionar las infracciones cometidas por el personal de la Policía Nacional del Perú." },
      { id: 2, titulo: "Bienes Jurídicos Protegidos", texto: "Los bienes jurídicos protegidos del régimen disciplinario son: La Disciplina, el Servicio Policial, la Imagen Institucional y la Ética Policial." },
      { id: 3, titulo: "Definición de Infracción", texto: "Constituye infracción disciplinaria toda conducta del personal de la Policía Nacional del Perú que vulnere los deberes, obligaciones y prohibiciones establecidos en la normatividad legal." }
    ],
    "Formación Profesional PNP": [
      { id: 1, titulo: "Decreto Legislativo 1318 - Finalidad Educativa", texto: "Regular el régimen educativo de la formación profesional de la Policía Nacional del Perú, garantizando una preparación de alta calidad científica y humanista." },
      { id: 2, titulo: "Niveles de Formación", texto: "La formación profesional comprende la formación de pregrado, posgrado y educación continua, orientada a la excelencia profesional y ética en las escuelas policiales." }
    ],
    "Transparencia e Información": [
      { id: 1, titulo: "Ley 27806 - Principio de Publicidad", texto: "Todas las actividades y disposiciones de las entidades de la administración pública están sometidas al principio de publicidad, facilitando el acceso a la ciudadanía." },
      { id: 2, titulo: "Límites al Acceso", texto: "El acceso a la información puede ser restringido únicamente por razones de seguridad nacional, defensa nacional o confidencialidad regulada por ley." }
    ],
    "Ley de Ascensos PNP": [
      { id: 1, titulo: "Principio de Meritocracia en el Ascenso", texto: "El proceso de ascensos del personal de armas y de servicios se sustenta en la evaluación objetiva de sus méritos, aptitudes, disciplina y trayectoria profesional." },
      { id: 2, titulo: "Factores de Evaluación de Ascenso", texto: "Incluyen de forma rigurosa la aptitud profesional, académica, el perfil ético-disciplinario y el rendimiento en las funciones asignadas." }
    ],
    "Procedimiento Administrativo": [
      { id: 1, titulo: "Ley 27444 - Principio de Legalidad", texto: "Las autoridades administrativas deben actuar con respeto a la Constitución, la ley y al derecho, dentro de las facultades que le estén expresamente atribuidas." },
      { id: 2, titulo: "Principio del Debido Procedimiento", texto: "Los administrados gozan de todos los derechos y garantías inherentes al debido procedimiento administrativo, incluyendo el derecho a ser escuchados y recibir una decisión motivada." }
    ],
    "Código Procesal Penal": [
      { id: 1, titulo: "Decreto Legislativo 957 - Rol de la PNP", texto: "La Policía Nacional realiza la investigación del delito bajo la conducción y dirección jurídica del Ministerio Público, asegurando los elementos de prueba de forma lícita." },
      { id: 2, titulo: "La Flagrancia Delictiva", texto: "Se considera flagrancia cuando el autor es descubierto en la realización del hecho punible, o inmediatamente después de haber sido cometido, o si es capturado con objetos que lo vinculen." }
    ],
    "Código Penal": [
      { id: 1, titulo: "Decreto Legislativo 635 - Principio de Legalidad", texto: "Nadie será sancionado por un acto no previsto como delito o falta por la ley vigente al momento de su comisión, ni sometido a penas que no estén expresamente decretadas." },
      { id: 2, titulo: "Clasificación General del Delito", texto: "Son delitos y faltas las acciones u omisiones dolosas o culposas penadas por la ley, clasificadas según el bien jurídico protegido." }
    ],
    "Uso de la Fuerza PNP": [
      { id: 1, titulo: "DL 1186 - Principio de Necesidad", texto: "El uso de la fuerza es necesario cuando otros medios resulten ineficaces o no garanticen bajo ninguna circunstancia el logro del objetivo legal buscado." },
      { id: 2, titulo: "DL 1186 - Principio de Proporcionalidad", texto: "El nivel de fuerza aplicado por el efectivo policial debe ser equivalente y proporcional a la gravedad de la resistencia, amenaza o agresión activa del infractor." },
      { id: 3, titulo: "DL 1186 - Niveles de Uso de la Fuerza", texto: "El uso preventivo de la fuerza comprende la presencia policial, la verbalización y el control de contacto. El uso reactivo abarca el control físico, tácticas defensivas no letales y fuerza letal." }
    ],
    "Tráfico Ilícito de Drogas": [
      { id: 1, titulo: "Decreto Legislativo 1241 - Lucha contra el Tráfico", texto: "El Estado combate prioritariamente el tráfico ilícito de drogas y el desvío de insumos químicos controlados, mediante acciones coordinadas de prevención y represión policial." },
      { id: 2, titulo: "Sanciones al Tráfico Ilícito de Drogas", texto: "El que promueve, favorece o facilita el consumo ilegal de drogas mediante fabricación, comercialización o transporte, será castigado con penas proporcionales a la gravedad del delito." }
    ],
    "Lavado de Activos": [
      { id: 1, titulo: "DL 1106 - Lucha contra el Lavado de Activos", texto: "Establecer medidas eficaces contra el lavado de activos, minería ilegal y crimen organizado, sancionando la ocultación de dinero o bienes de procedencia delictiva." },
      { id: 2, titulo: "Actos de Conversión y Transferencia", texto: "Castigar penalmente a quien convierte o transfiere dinero, bienes o ganancias conociendo su origen ilícito, con la finalidad de evitar la incautación de los mismos." }
    ],
    "Violencia Familiar": [
      { id: 1, titulo: "Ley 30364 - Enfoque de Protección", texto: "Prevenir, sancionar y erradicar la violencia contra las mujeres y los integrantes del grupo familiar, garantizando el pleno ejercicio de sus derechos fundamentales." },
      { id: 2, titulo: "Deber de Intervención de la PNP", texto: "La Policía Nacional tiene el deber de registrar e intervenir de forma célere e inmediata ante denuncias de violencia familiar, ejecutando medidas de protección de urgencia." }
    ],
    "Crimen Organizado": [
      { id: 1, titulo: "Ley 30077 - Definición de Organización Criminal", texto: "Grupo estructurado de tres o más personas que actúan de manera concertada con el propósito de cometer delitos graves a fin de obtener beneficios ilícitos." },
      { id: 2, titulo: "Técnicas Especiales de Investigación", texto: "Permitir la interceptación de comunicaciones, agente encubierto, levantamiento de secreto bancario y entregas vigiladas con autorización correspondiente." }
    ],
    "Protocolos Procesales": [
      { id: 1, titulo: "DS 009-2018-JUS - Proceso Inmediato", texto: "Procedimiento de simplificación procesal aplicable en casos flagrantes, confesión sincera del investigado o ante pruebas indubitables recolectadas." },
      { id: 2, titulo: "Cadena de Custodia de Evidencias", texto: "Asegurar la inalterabilidad, preservación y registro riguroso de las evidencias recolectadas en la escena del delito bajo responsabilidad legal." }
    ],
    "Función de Investigación PNP": [
      { id: 1, titulo: "Ley 32130 - Fortalecimiento de la PNP", texto: "La Policía Nacional del Perú asume la conducción técnica y operativa de la investigación preliminar del delito, bajo la dirección del Ministerio Público." },
      { id: 2, titulo: "Diligencias Preliminares de Urgencia", texto: "La PNP realiza de oficio o por disposición fiscal las diligencias urgentes orientadas a constatar el hecho punible, identificar autores y recabar evidencias críticas." }
    ],
    "Lucha contra Extorsión": [
      { id: 1, titulo: "Decreto Legislativo 1611 - Combate a la Extorsión", texto: "Establecer medidas especiales inmediatas y herramientas tácticas para combatir los delitos de extorsión, chantaje y conexos en el territorio nacional." },
      { id: 2, titulo: "Protección a Víctimas y Denunciantes", texto: "Garantizar la protección, reserva de identidad y el anonimato de las personas que denuncian extorsiones o brindan información sobre organizaciones criminales." }
    ],
    "DDHH Función Policial": [
      { id: 1, titulo: "RM 487-2018-IN - Lineamientos", texto: "Asegurar que en todo procedimiento y acto de servicio, el personal policial respete, defienda y promueva los derechos humanos sin discriminación." },
      { id: 2, titulo: "Uso Ético de la Fuerza y Detención", texto: "La detención de personas y el uso de la fuerza del Estado deben someterse escrupulosamente a la normatividad nacional e internacional de derechos humanos." }
    ],
    "Desaparición de Personas": [
      { id: 1, titulo: "Decreto Legislativo 1428 - Alertas y Búsqueda", texto: "Garantizar la atención urgente, inmediata y especializada ante la desaparición de personas vulnerables, activando de inmediato las alertas de emergencia nacionales." },
      { id: 2, titulo: "Inmediatez de Acción Sin Demoras", texto: "La Policía Nacional está prohibida de exigir plazos mínimos de espera como veinticuatro horas antes de acoger la denuncia y comenzar el operativo de localización." }
    ]
  };

  // Get active selected theme object (Mode: preguntas)
  const currentTema = temas.find(t => t.id === selectedTemaId) || temas[0];

  // Filter questions for the selected theme
  const filteredQuestions = React.useMemo(() => {
    if (!currentTema) return [];
    return questions.filter(q => isQuestionInTopic(q, currentTema));
  }, [currentTema, questions]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      synthRef.current = window.speechSynthesis;
    }
    return () => {
      stopAudio();
    };
  }, []);

  const stopAudio = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setIsPlaying(false);
  };

  // Build natural voice text for questions
  const getQuestionAudioText = (q: Pregunta, idx: number, total: number) => {
    if (!q) return "";
    let text = `Pregunta número ${idx + 1} de ${total}. Enunciado: ${q.pregunta}. `;

    const correctLetter = (q.respuesta_correcta || "").trim().toUpperCase();
    let correctText = "";
    if (correctLetter === "A") correctText = q.alternativa_a;
    else if (correctLetter === "B") correctText = q.alternativa_b;
    else if (correctLetter === "C") correctText = q.alternativa_c;
    else if (correctLetter === "D") correctText = q.alternativa_d;
    else if (correctLetter === "E") correctText = q.alternativa_e;

    text += `La respuesta correcta es: ${correctText}. `;

    if (q.explicacion) {
      text += `Justificación y sustento legal: ${q.explicacion}.`;
    }

    return text;
  };

  const playAudio = (text: string) => {
    if (!synthRef.current) return;

    // Cancel current reading
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "es-ES";
    utterance.rate = speechRate;
    
    // Add callbacks for state updates
    utterance.onend = () => {
      // Auto play next item if available
      if (activeMode === "preguntas") {
        if (currentQuestionIdx < filteredQuestions.length - 1) {
          setCurrentQuestionIdx((prev) => prev + 1);
        } else {
          setIsPlaying(false);
        }
      } else {
        const list = leyesAudios[selectedLaw] || [];
        if (currentArtIdx < list.length - 1) {
          setCurrentArtIdx((prev) => prev + 1);
        } else {
          setIsPlaying(false);
        }
      }
    };

    utterance.onerror = () => {
      setIsPlaying(false);
    };

    utteranceRef.current = utterance;
    synthRef.current.speak(utterance);
    setIsPlaying(true);
  };

  // Monitor index change and auto play if reading is active (Preguntas Mode)
  useEffect(() => {
    if (isPlaying && activeMode === "preguntas") {
      const activeQ = filteredQuestions[currentQuestionIdx];
      if (activeQ) {
        const textToSpeak = getQuestionAudioText(activeQ, currentQuestionIdx, filteredQuestions.length);
        playAudio(textToSpeak);
      }
    }
  }, [currentQuestionIdx, filteredQuestions, activeMode]);

  // Monitor index change and auto play if reading is active (Leyes Mode)
  useEffect(() => {
    if (isPlaying && activeMode === "articulos") {
      const activeArtList = leyesAudios[selectedLaw] || [];
      const activeText = activeArtList[currentArtIdx]?.texto || "";
      if (activeText) {
        playAudio(`Artículo legislativo. ${activeArtList[currentArtIdx]?.titulo}. Detalle: ${activeText}`);
      }
    }
  }, [currentArtIdx, selectedLaw, activeMode]);

  // Adjust rate of speech on the fly
  useEffect(() => {
    if (isPlaying) {
      if (activeMode === "preguntas") {
        const activeQ = filteredQuestions[currentQuestionIdx];
        if (activeQ) {
          playAudio(getQuestionAudioText(activeQ, currentQuestionIdx, filteredQuestions.length));
        }
      } else {
        const activeArtList = leyesAudios[selectedLaw] || [];
        const activeText = activeArtList[currentArtIdx]?.texto || "";
        if (activeText) {
          playAudio(`Artículo legislativo. ${activeArtList[currentArtIdx]?.titulo}. Detalle: ${activeText}`);
        }
      }
    }
  }, [speechRate]);

  const handlePlayPause = () => {
    if (isPlaying) {
      if (synthRef.current?.paused) {
        synthRef.current.resume();
        setIsPlaying(true);
      } else {
        synthRef.current?.pause();
        setIsPlaying(false);
      }
    } else {
      if (activeMode === "preguntas") {
        const activeQ = filteredQuestions[currentQuestionIdx];
        if (activeQ) {
          playAudio(getQuestionAudioText(activeQ, currentQuestionIdx, filteredQuestions.length));
        } else {
          // No questions
          alert("No hay preguntas cargadas en este tema para reproducir.");
        }
      } else {
        const activeArtList = leyesAudios[selectedLaw] || [];
        const activeText = activeArtList[currentArtIdx]?.texto || "";
        if (activeText) {
          playAudio(`Artículo legislativo. ${activeArtList[currentArtIdx]?.titulo}. Detalle: ${activeText}`);
        }
      }
    }
  };

  const selectTemaTab = (id: number) => {
    stopAudio();
    setSelectedTemaId(id);
    setCurrentQuestionIdx(0);
  };

  const selectLawTab = (lawName: string) => {
    stopAudio();
    setSelectedLaw(lawName);
    setCurrentArtIdx(0);
  };

  const handleNextItem = () => {
    if (activeMode === "preguntas") {
      if (currentQuestionIdx < filteredQuestions.length - 1) {
        setCurrentQuestionIdx((prev) => prev + 1);
      }
    } else {
      const list = leyesAudios[selectedLaw] || [];
      if (currentArtIdx < list.length - 1) {
        setCurrentArtIdx((prev) => prev + 1);
      }
    }
  };

  const handlePrevItem = () => {
    if (activeMode === "preguntas") {
      if (currentQuestionIdx > 0) {
        setCurrentQuestionIdx((prev) => prev - 1);
      }
    } else {
      if (currentArtIdx > 0) {
        setCurrentArtIdx((prev) => prev - 1);
      }
    }
  };

  // Helper variables for displaying correct options
  const activeQuestion = filteredQuestions[currentQuestionIdx] || null;
  const activeArtList = leyesAudios[selectedLaw] || [];
  const currentArt = activeArtList[currentArtIdx] || { titulo: "", texto: "" };

  return (
    <div className="space-y-6 animate-fade-in" id="audios_tab">
      
      {/* Header and Mode Selector */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
            <Headphones className="h-6 w-6 text-emerald-800" />
          </div>
          <div>
            <h1 className="text-lg font-black text-[#063c25] uppercase tracking-tight flex items-center gap-2">
              Tutor de Estudio Auditivo Inteligente
              <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />
            </h1>
            <p className="text-xs text-slate-500 font-bold uppercase mt-0.5">
              Optimiza tu memoria a través de la repetición y lectura automática de temas
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* SIDEBAR: Topics Selector list depending on active mode */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between shadow-sm min-h-[500px]" id="audios_sidebar">
          <div className="space-y-4 flex-1 flex flex-col">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Headphones className="h-5 w-5 text-emerald-800" />
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest">
                {activeMode === "preguntas" ? "Temas del Balotario" : "Leyes en Audio"}
              </h2>
            </div>

            <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
              {activeMode === "preguntas" 
                ? "Selecciona cualquiera de los 22 temas oficiales del temario de ascenso para escuchar sus preguntas cargadas, alternativas y justificaciones legislativas."
                : "Escucha la lectura secuencial de los artículos jurídicos esenciales estructurados directamente en resúmenes prácticos de audio."
              }
            </p>

            {/* List of elements (temas o leyes) */}
            <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[400px] pr-1 mt-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
              {activeMode === "preguntas" ? (
                temas.map((tema) => {
                  const isActive = selectedTemaId === tema.id;
                  const qCount = questions.filter(q => isQuestionInTopic(q, tema)).length;
                  return (
                    <button
                      key={tema.id}
                      onClick={() => selectTemaTab(tema.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between focus:outline-none ${
                        isActive
                          ? "bg-emerald-50 border-emerald-500 text-[#063c25] ring-1 ring-emerald-500/10"
                          : "bg-white border-slate-150 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <div className="truncate max-w-[210px] space-y-0.5">
                        <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">TEMA {tema.id}</span>
                        <span className="block text-xs font-extrabold uppercase truncate leading-tight">{tema.abreviatura}</span>
                      </div>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        isActive ? "bg-emerald-200 text-emerald-950" : "bg-slate-100 text-slate-500"
                      }`}>
                        {qCount} Q
                      </span>
                    </button>
                  );
                })
              ) : (
                Object.keys(leyesAudios).map((lawName) => {
                  const isActive = selectedLaw === lawName;
                  const count = leyesAudios[lawName]?.length || 0;
                  return (
                    <button
                      key={lawName}
                      onClick={() => selectLawTab(lawName)}
                      className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between focus:outline-none ${
                        isActive
                          ? "bg-emerald-50 border-emerald-500 text-[#063c25] ring-1 ring-emerald-500/10"
                          : "bg-white border-slate-150 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <span className="text-xs font-extrabold uppercase truncate max-w-[210px]">{lawName}</span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        isActive ? "bg-emerald-200 text-emerald-950" : "bg-slate-100 text-slate-500"
                      }`}>
                        {count} Art.
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl flex items-start gap-2.5 mt-4">
            <AlertCircle className="h-4 w-4 text-emerald-800 shrink-0 mt-0.5" />
            <div className="text-[10px] text-slate-500 leading-normal font-semibold">
              ¿No escuchas el audio? Asegúrate de subir el volumen de tu dispositivo y otorgar permisos de voz si el navegador lo solicita.
            </div>
          </div>
        </div>

        {/* MAIN PANEL: Player & Display */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 lg:col-span-2 flex flex-col justify-between shadow-sm min-h-[500px]" id="audio_main_player">
          
          {/* Top Info Header */}
          <div className="pb-4 border-b border-slate-150 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <span className="text-[9px] bg-emerald-100 text-emerald-950 px-2.5 py-0.5 rounded-full font-black uppercase tracking-widest">
                {activeMode === "preguntas" ? "Modo: Preguntas de Estudio" : "Modo: Resúmenes de Leyes"}
              </span>
              <h3 className="text-sm font-black text-slate-800 uppercase mt-1">
                {activeMode === "preguntas" ? `TEMA ${currentTema.id}: ${currentTema.abreviatura}` : selectedLaw}
              </h3>
            </div>
            <div className="text-xs font-extrabold text-slate-400">
              {activeMode === "preguntas" ? (
                filteredQuestions.length > 0 
                  ? `Pregunta ${currentQuestionIdx + 1} de ${filteredQuestions.length}`
                  : "0 preguntas"
              ) : (
                `Artículo ${currentArtIdx + 1} de ${activeArtList.length}`
              )}
            </div>
          </div>

          {/* ACTIVE CONTENT VIEW */}
          <div className="flex-1 my-6 flex flex-col justify-center min-h-[220px]">
            {activeMode === "preguntas" ? (
              activeQuestion ? (
                <div className="space-y-4">
                  {/* Question Text Box */}
                  <div className="bg-emerald-50/40 border border-emerald-100 rounded-2xl p-5 relative">
                    <span className="absolute -top-2.5 left-4 bg-emerald-800 text-white text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                      Pregunta {currentQuestionIdx + 1}
                    </span>
                    <p className="text-sm sm:text-base font-black text-[#063c25] leading-relaxed">
                      {activeQuestion.pregunta}
                    </p>
                  </div>

                  {/* Correct Answer Display directly (No alternatives grid displayed as per user request) */}
                  {(() => {
                    const correctLetter = (activeQuestion.respuesta_correcta || "").trim().toUpperCase();
                    let correctText = "";
                    if (correctLetter === "A") correctText = activeQuestion.alternativa_a;
                    else if (correctLetter === "B") correctText = activeQuestion.alternativa_b;
                    else if (correctLetter === "C") correctText = activeQuestion.alternativa_c;
                    else if (correctLetter === "D") correctText = activeQuestion.alternativa_d;
                    else if (correctLetter === "E") correctText = activeQuestion.alternativa_e;

                    return (
                      <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-4 flex items-start gap-3.5 shadow-xs">
                        <span className="h-6 w-6 rounded-md bg-emerald-800 text-white shrink-0 flex items-center justify-center text-xs font-black">
                          {correctLetter}
                        </span>
                        <div>
                          <span className="block text-[10px] font-black uppercase text-emerald-800 tracking-wider">Respuesta Correcta:</span>
                          <p className="text-xs sm:text-sm font-bold text-slate-800 leading-tight uppercase mt-0.5">
                            {correctText}
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Legal Explanation Rationale */}
                  {activeQuestion.explicacion && (
                    <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4 text-[11px] text-amber-950 leading-relaxed font-semibold">
                      <strong className="block text-amber-900 uppercase text-[9px] font-black tracking-widest mb-1">Base Legal y Justificación:</strong>
                      {activeQuestion.explicacion}
                    </div>
                  )}

                </div>
              ) : (
                <div className="text-center py-10 space-y-3">
                  <HelpCircle className="h-12 w-12 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-500 uppercase">No hay preguntas de simulación para este tema específico aún.</p>
                  <p className="text-[10px] text-slate-400">Puedes seleccionar otro tema del menú lateral.</p>
                </div>
              )
            ) : (
              // Legislative Summary Articles View
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    Artículo Clave
                  </span>
                  <h4 className="text-base font-black text-slate-800 uppercase leading-snug">
                    {currentArt.titulo}
                  </h4>
                </div>
                <div className="bg-slate-50 border border-slate-150 p-6 rounded-2xl relative shadow-inner text-center min-h-[140px] flex items-center justify-center">
                  <p className="text-sm sm:text-base font-extrabold text-slate-700 leading-relaxed uppercase break-words select-none">
                    "{currentArt.texto}"
                  </p>
                </div>
              </div>
            )}

            {/* Sound wave animation while active */}
            {isPlaying && (
              <div className="flex items-center justify-center gap-1.5 h-6 mt-6">
                {[1, 2, 3, 4, 5, 4, 3, 2, 1, 3, 5, 2, 4, 1, 3].map((h, i) => (
                  <div 
                    key={i} 
                    className="w-1 bg-emerald-800 rounded-full animate-pulse"
                    style={{ 
                      height: `${h * 4.5}px`,
                      animationDelay: `${i * 0.08}s`,
                      animationDuration: "0.8s"
                    }}
                  ></div>
                ))}
              </div>
            )}
          </div>

          {/* LOWER CONTROLS PANEL */}
          <div className="pt-5 border-t border-slate-150 space-y-5">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              
              {/* Speed Selector */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Velocidad:</span>
                <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                  {[0.8, 1, 1.2, 1.5].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => setSpeechRate(rate)}
                      className={`px-3 py-1 text-[10px] font-black rounded-md cursor-pointer transition-colors ${
                        speechRate === rate
                          ? "bg-white text-emerald-950 shadow-sm border border-slate-150"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Main Media controls */}
              <div className="flex items-center gap-4">
                {/* Previous Item */}
                <button
                  onClick={handlePrevItem}
                  disabled={activeMode === "preguntas" ? currentQuestionIdx === 0 : currentArtIdx === 0}
                  className="p-3 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-full disabled:opacity-30 disabled:cursor-not-allowed transition-all focus:outline-none cursor-pointer"
                  title="Anterior"
                >
                  <SkipBack className="h-5 w-5" />
                </button>

                {/* Main Play Button */}
                <button
                  onClick={handlePlayPause}
                  className="p-5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-full shadow-lg hover:shadow-emerald-900/20 transition-all hover:-translate-y-0.5 active:scale-95 focus:outline-none cursor-pointer"
                  title={isPlaying ? "Pausar" : "Reproducir"}
                >
                  {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 fill-current text-white" />}
                </button>

                {/* Stop Button */}
                <button
                  onClick={stopAudio}
                  className="p-3 bg-slate-50 border border-slate-200 hover:bg-rose-50 hover:text-rose-600 text-slate-700 rounded-full transition-all focus:outline-none cursor-pointer"
                  title="Detener"
                >
                  <Square className="h-5 w-5 fill-current" />
                </button>

                {/* Next Item */}
                <button
                  onClick={handleNextItem}
                  disabled={
                    activeMode === "preguntas" 
                      ? currentQuestionIdx >= filteredQuestions.length - 1 
                      : currentArtIdx >= activeArtList.length - 1
                  }
                  className="p-3 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-full disabled:opacity-30 disabled:cursor-not-allowed transition-all focus:outline-none cursor-pointer"
                  title="Siguiente"
                >
                  <SkipForward className="h-5 w-5" />
                </button>
              </div>

              {/* Quick jump drop list or tracker */}
              <div className="text-[10px] text-slate-400 font-bold uppercase">
                Estudio manos libres
              </div>
            </div>

            {/* Questions list quick selection drawer for currently filtered topic (Mode: preguntas only) */}
            {activeMode === "preguntas" && filteredQuestions.length > 0 && (
              <div className="pt-3 border-t border-slate-100">
                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Saltar rápidamente a pregunta:</span>
                <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                  {filteredQuestions.map((_, i) => {
                    const isActive = currentQuestionIdx === i;
                    return (
                      <button
                        key={i}
                        onClick={() => {
                          stopAudio();
                          setCurrentQuestionIdx(i);
                        }}
                        className={`px-3 py-1.5 text-xs font-black rounded-lg border transition-all cursor-pointer shrink-0 ${
                          isActive
                            ? "bg-emerald-800 border-emerald-800 text-white shadow-sm"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        Q{i + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}
