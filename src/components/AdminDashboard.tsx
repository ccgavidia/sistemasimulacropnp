import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, doc, addDoc, setDoc, deleteDoc, getDocs, writeBatch } from "firebase/firestore";
import { Plus, Trash2, Edit2, ShieldAlert, Users, PlusCircle, CheckCircle, FileUp, Database, Brain, Sparkles, X, Filter, RefreshCw } from "lucide-react";
import { Pregunta, Usuario, RolUsuario, SimulacroPersonalizado, DocumentoDescarga } from "../types";
import { temarioOficial } from "../data/temarioOficial";
import { initialQuestions } from "../data/initialQuestions";
import * as XLSX from "xlsx";
import { normalizeText, getRowValue, isQuestionInTopic } from "../utils";

// Reusable topic resolver from text/name references
const resolveTopic = (rowTopicRef: string, availableTemas: any[]): any => {
  if (!rowTopicRef) return null;
  const cleanRef = rowTopicRef.trim();
  const normRef = normalizeText(cleanRef);
  
  if (!normRef) return null;

  // 1. Try matching by topic ID directly (e.g. "1" or 1)
  const numValue = Number(cleanRef);
  if (!isNaN(numValue) && numValue > 0) {
    const matched = availableTemas.find(t => Number(t.id) === numValue);
    if (matched) return matched;
  }

  // Try extracting digits if it contains text (e.g., "Tema 1", "Balota 12")
  const numericId = Number(cleanRef.replace(/[^0-9]/g, ""));
  if (!isNaN(numericId) && numericId > 0) {
    const matched = availableTemas.find(t => Number(t.id) === numericId);
    if (matched) return matched;
  }

  // 2. Try matching by exact abbreviation (normalized)
  let matched = availableTemas.find(t => normalizeText(t.abreviatura) === normRef);
  if (matched) return matched;

  // 3. Try matching by exact name (normalized)
  matched = availableTemas.find(t => normalizeText(t.nombre) === normRef);
  if (matched) return matched;

  // 4. Try matching by partial abbreviation
  matched = availableTemas.find(t => {
    const normAbbrev = normalizeText(t.abreviatura);
    return normRef.includes(normAbbrev) || normAbbrev.includes(normRef);
  });
  if (matched) return matched;

  // 5. Try matching by partial name
  matched = availableTemas.find(t => {
    const normName = normalizeText(t.nombre);
    return normRef.includes(normName) || normName.includes(normRef);
  });
  if (matched) return matched;

  return null;
};

// Reusable topic matcher based on question ranges
const findTopicByNum = (num: number, availableTemas: any[]): any => {
  for (const t of availableTemas) {
    if (t.rango) {
      const parts = t.rango.split("-");
      if (parts.length === 2) {
        const start = parseInt(parts[0].replace(/[^0-9]/g, ""));
        const end = parseInt(parts[1].replace(/[^0-9]/g, ""));
        if (!isNaN(start) && !isNaN(end) && num >= start && num <= end) {
          return t;
        }
      }
    }
  }
  return null;
};

// Safe date parsing and formatting helpers
const formatFechaDoc = (fechaInput: any): string => {
  if (!fechaInput) return "N/A";
  try {
    if (typeof fechaInput.toDate === "function") {
      return fechaInput.toDate().toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" });
    }
    if (fechaInput && typeof fechaInput === "object" && "seconds" in fechaInput) {
      return new Date(fechaInput.seconds * 1000).toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" });
    }
    const date = new Date(fechaInput);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" });
    }
  } catch (err) {
    console.error("Error parsing date:", err);
  }
  return "N/A";
};

const formatFechaUsuario = (fechaInput: any): string => {
  if (!fechaInput) return "N/A";
  try {
    if (typeof fechaInput.toDate === "function") {
      return fechaInput.toDate().toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    }
    if (fechaInput && typeof fechaInput === "object" && "seconds" in fechaInput) {
      return new Date(fechaInput.seconds * 1000).toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    }
    const date = new Date(fechaInput);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    }
  } catch (err) {
    console.error("Error parsing full date:", err);
  }
  return "N/A";
};

const getSafeTimeValue = (fecha: any): number => {
  if (!fecha) return 0;
  if (typeof fecha.toDate === "function") {
    return fecha.toDate().getTime();
  }
  if (fecha && typeof fecha === "object" && "seconds" in fecha) {
    return fecha.seconds * 1000;
  }
  const t = new Date(fecha).getTime();
  return isNaN(t) ? 0 : t;
};

interface AdminDashboardProps {
  user: Usuario;
  questions: Pregunta[];
  onRefreshQuestions: () => Promise<void>;
  temas?: any[];
  onRefreshTemas?: () => Promise<void>;
}

export default function AdminDashboard({ user, questions, onRefreshQuestions, temas, onRefreshTemas }: AdminDashboardProps) {
  const [users, setUsers] = useState<Usuario[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [activeSubTab, setActiveTab] = useState<"questions" | "users" | "custom_mocks">("questions");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  // Question Form state
  const [isEditingQuestion, setIsEditingQuestion] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [categoria, setCategoria] = useState("");
  const [tema, setTema] = useState("");
  const [preguntaTxt, setPreguntaTxt] = useState("");
  const [altA, setAltA] = useState("");
  const [altB, setAltB] = useState("");
  const [altC, setAltC] = useState("");
  const [altD, setAltD] = useState("");
  const [altE, setAltE] = useState("");
  const [ansCorrect, setAnsCorrect] = useState<"A" | "B" | "C" | "D" | "E">("A");
  const [explicacion, setExplicacion] = useState("");
  const [dificultad, setDificultad] = useState<"Fácil" | "Medio" | "Difícil">("Medio");
  const [ubicacionInput, setUbicacionInput] = useState("");
  const [codigoInput, setCodigoInput] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Search and Filter states
  const [qSearch, setQSearch] = useState("");
  const [qCategoryFilter, setQCategoryFilter] = useState("Todas");
  const uniqueCategories = ["Todas", ...Array.from(new Set(questions.map((q) => q.categoria)))];

  // Custom Mock Form state
  const [mockTitle, setMockTitle] = useState("");
  const [mockDesc, setMockDescription] = useState("");
  const [mockCategory, setMockCategory] = useState("");
  const [mockCount, setMockCount] = useState(20);
  const [mockTime, setMockTime] = useState(30); // minutes
  const [createdMocks, setCreatedMocks] = useState<SimulacroPersonalizado[]>([]);

  // Bulk Raw Text Import state
  const [bulkText, setBulkText] = useState("");

  // Excel Preview state
  const [excelPreview, setExcelPreview] = useState<{
    filename: string;
    total: number;
    valid: number;
    duplicates: number;
    items: any[];
    totalTemas?: number;
    itemsTemas?: any[];
  } | null>(null);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const showMsg = (text: string, type: "success" | "error") => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 5000);
  };

  const fetchAdminData = async () => {
    setLoading(true);
    let usersLoaded = false;
    let mocksLoaded = false;

    // 1. Fetch Users
    try {
      const usersSnapshot = await getDocs(collection(db, "usuarios"));
      const usersList = usersSnapshot.docs.map((doc) => doc.data() as Usuario);
      setUsers(usersList);
      usersLoaded = true;
    } catch (err: any) {
      console.error("Error loading admin users:", err);
    }

    // 1b. Fetch Blocked Users
    try {
      const blockedSnapshot = await getDocs(collection(db, "bloqueados"));
      const blockedList = blockedSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setBlockedUsers(blockedList);
    } catch (err: any) {
      console.error("Error loading blocked users:", err);
    }

    // 2. Fetch Mocks
    try {
      const mocksSnapshot = await getDocs(collection(db, "simulacros"));
      const mocksList = mocksSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as SimulacroPersonalizado[];
      setCreatedMocks(mocksList);
      mocksLoaded = true;
    } catch (err: any) {
      console.error("Error loading admin simulacros:", err);
    }

    if (!usersLoaded && !mocksLoaded) {
      showMsg("Error al cargar datos del administrador: Permisos insuficientes.", "error");
    } else if (!usersLoaded || !mocksLoaded) {
      const failed = [];
      if (!usersLoaded) failed.push("Usuarios");
      if (!mocksLoaded) failed.push("Simulacros");
      showMsg(`Cargado parcialmente. Error al obtener: ${failed.join(", ")}`, "error");
    }

    setLoading(false);
  };

  // CRUD Question operations
  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoria.trim() || !tema.trim() || !preguntaTxt.trim() || !altA.trim() || !altB.trim() || !altC.trim() || !altD.trim() || !altE.trim() || !explicacion.trim()) {
      showMsg("Por favor, completa todos los campos de la pregunta.", "error");
      return;
    }

    try {
      const qData: any = {
        categoria: categoria.trim(),
        tema: tema.trim(),
        pregunta: preguntaTxt.trim(),
        alternativa_a: altA.trim(),
        alternativa_b: altB.trim(),
        alternativa_c: altC.trim(),
        alternativa_d: altD.trim(),
        alternativa_e: altE.trim(),
        respuesta_correcta: ansCorrect,
        explicacion: explicacion.trim(),
        dificultad
      };
      if (ubicacionInput.trim()) qData.ubicacion = ubicacionInput.trim();
      if (codigoInput.trim()) qData.codigo = codigoInput.trim();

      if (isEditingQuestion) {
        await setDoc(doc(db, "preguntas", editingId), qData);
        showMsg("Pregunta actualizada con éxito.", "success");
      } else {
        const docRef = await addDoc(collection(db, "preguntas"), qData);
        // Sync ID locally
      }

      resetQuestionForm();
      await onRefreshQuestions();
    } catch (err: any) {
      console.error(err);
      showMsg(`Error al guardar la pregunta: ${err.message}`, "error");
    }
  };

  const handleEditQuestionClick = (q: Pregunta) => {
    setIsEditingQuestion(true);
    setEditingId(q.id);
    setCategoria(q.categoria);
    setTema(q.tema);
    setPreguntaTxt(q.pregunta);
    setAltA(q.alternativa_a);
    setAltB(q.alternativa_b);
    setAltC(q.alternativa_c);
    setAltD(q.alternativa_d);
    setAltE(q.alternativa_e);
    setAnsCorrect(q.respuesta_correcta);
    setExplicacion(q.explicacion);
    setDificultad(q.dificultad);
    setUbicacionInput(q.ubicacion || "");
    setCodigoInput(q.codigo || "");
    
    // Scroll to form
    const formEl = document.getElementById("question_form_anchor");
    if (formEl) formEl.scrollIntoView({ behavior: "smooth" });
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar esta pregunta de forma permanente del banco?")) return;
    try {
      await deleteDoc(doc(db, "preguntas", id));
      showMsg("Pregunta eliminada con éxito.", "success");
      await onRefreshQuestions();
    } catch (err: any) {
      console.error(err);
      showMsg(`Error al eliminar pregunta: ${err.message}`, "error");
    }
  };

  const resetQuestionForm = () => {
    setIsEditingQuestion(false);
    setEditingId("");
    setCategoria("");
    setTema("");
    setPreguntaTxt("");
    setAltA("");
    setAltB("");
    setAltC("");
    setAltD("");
    setAltE("");
    setAnsCorrect("A");
    setExplicacion("");
    setDificultad("Medio");
    setUbicacionInput("");
    setCodigoInput("");
  };

  // Roles management
  const handleToggleRole = async (targetUser: Usuario) => {
    const nextRole = targetUser.rol === RolUsuario.ADMINISTRADOR ? RolUsuario.USUARIO : RolUsuario.ADMINISTRADOR;
    if (!window.confirm(`¿Deseas cambiar el rol de ${targetUser.nombre} a '${nextRole}'?`)) return;

    try {
      await setDoc(doc(db, "usuarios", targetUser.uid), {
        ...targetUser,
        rol: nextRole
      });
      showMsg("Rol actualizado con éxito.", "success");
      await fetchAdminData();
    } catch (err: any) {
      console.error(err);
      showMsg(`Error al cambiar el rol: ${err.message}`, "error");
    }
  };

  const handleToggleAccess = async (targetUser: Usuario) => {
    const nextAccess = !targetUser.accesoCompleto;
    if (!window.confirm(`¿Deseas cambiar el nivel de acceso de ${targetUser.nombre} a '${nextAccess ? "Acceso Completo 🟢" : "Demo Limitado 🟡"}'?`)) return;

    try {
      await setDoc(doc(db, "usuarios", targetUser.uid), {
        ...targetUser,
        accesoCompleto: nextAccess
      });
      showMsg("Acceso actualizado con éxito.", "success");
      await fetchAdminData();
    } catch (err: any) {
      console.error(err);
      showMsg(`Error al cambiar el nivel de acceso: ${err.message}`, "error");
    }
  };

  const handleDeleteUser = async (targetUser: Usuario) => {
    if (!window.confirm(`¿Estás seguro de ELIMINAR a ${targetUser.nombre} de la base de datos?\n\nSu cuenta se eliminará, pero podrá registrarse nuevamente en el futuro.`)) return;

    try {
      await deleteDoc(doc(db, "usuarios", targetUser.uid));
      showMsg("Usuario eliminado de la base de datos con éxito.", "success");
      await fetchAdminData();
    } catch (err: any) {
      console.error(err);
      showMsg(`Error al eliminar usuario: ${err.message}`, "error");
    }
  };

  const handleDeleteAndBlockUser = async (targetUser: Usuario) => {
    if (!window.confirm(`¿Estás completamente seguro de ELIMINAR Y BLOQUEAR a ${targetUser.nombre}?\n\nEsto eliminará su cuenta actual de la base de datos y registrará su correo (${targetUser.email}) en la lista negra. No podrá volver a ingresar al sistema.`)) return;

    try {
      // Delete user doc
      await deleteDoc(doc(db, "usuarios", targetUser.uid));

      // Block email
      if (targetUser.email) {
        const cleanEmail = targetUser.email.trim().toLowerCase();
        await setDoc(doc(db, "bloqueados", cleanEmail), {
          email: cleanEmail,
          nombre_anterior: targetUser.nombre,
          fecha_bloqueo: new Date().toISOString(),
          uid_anterior: targetUser.uid
        });
      }

      showMsg("Usuario eliminado y correo bloqueado permanentemente.", "success");
      await fetchAdminData();
    } catch (err: any) {
      console.error(err);
      showMsg(`Error al eliminar y bloquear usuario: ${err.message}`, "error");
    }
  };

  const handleUnblockUser = async (email: string) => {
    if (!window.confirm(`¿Deseas desbloquear el correo ${email}?\n\nEsto le permitirá registrarse e ingresar al sistema de nuevo.`)) return;

    try {
      await deleteDoc(doc(db, "bloqueados", email));
      showMsg("Correo electrónico desbloqueado con éxito.", "success");
      await fetchAdminData();
    } catch (err: any) {
      console.error(err);
      showMsg(`Error al desbloquear correo: ${err.message}`, "error");
    }
  };

  // Custom mock exam creation
  const handleCreateMock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mockTitle.trim() || !mockDesc.trim()) {
      showMsg("Por favor completa el título y descripción del simulacro.", "error");
      return;
    }

    try {
      // Find eligible questions based on selected category (if specified)
      let eligibleQuestions = questions;
      if (mockCategory && mockCategory !== "Todas") {
        eligibleQuestions = questions.filter((q) => q.categoria === mockCategory);
      }

      if (eligibleQuestions.length < mockCount) {
        showMsg(
          `No hay suficientes preguntas en la categoría '${mockCategory}' para crear este simulacro. Requieres ${mockCount} y sólo hay ${eligibleQuestions.length} en el banco.`,
          "error"
        );
        return;
      }

      // Randomly select mockCount questions IDs
      const shuffled = [...eligibleQuestions].sort(() => 0.5 - Math.random());
      const selectedIds = shuffled.slice(0, mockCount).map((q) => q.id);

      const mockData = {
        titulo: mockTitle.trim(),
        descripcion: mockDesc.trim(),
        categoria: mockCategory || "Todas",
        cantidad_preguntas: mockCount,
        tiempo_limite: mockTime,
        creado_por: user.uid,
        fecha_creacion: new Date().toISOString(),
        preguntas_ids: selectedIds
      };

      await addDoc(collection(db, "simulacros"), mockData);
      showMsg("Simulacro personalizado creado con éxito.", "success");
      
      setMockTitle("");
      setMockDescription("");
      setMockCategory("");
      setMockCount(20);
      setMockTime(30);

      await fetchAdminData();
    } catch (err: any) {
      console.error(err);
      showMsg(`Error al crear simulacro: ${err.message}`, "error");
    }
  };

  const handleDeleteMock = async (id: string) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar este simulacro personalizado?")) return;
    try {
      await deleteDoc(doc(db, "simulacros", id));
      showMsg("Simulacro eliminado con éxito.", "success");
      await fetchAdminData();
    } catch (err: any) {
      console.error(err);
      showMsg(`Error al eliminar simulacro: ${err.message}`, "error");
    }
  };

  // Bulk Excel Upload parser with Chunked Firestore Writes (supports 500+ items limit), 2-sheet parsing, and Anti-Duplication
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const sheetNames = wb.SheetNames;

        let parsedTemas: any[] = [];
        let parsedQuestions: any[] = [];
        let rawQuestionsData: any[] = [];

        // Parse Sheet 1: Temas, Sheet 2: Preguntas (if at least 2 sheets exist)
        if (sheetNames.length >= 2) {
          const wsTemas = wb.Sheets[sheetNames[0]];
          const rawTemasData = XLSX.utils.sheet_to_json(wsTemas) as any[];
          
          rawTemasData.forEach((row: any, index: number) => {
            const idVal = getRowValue(row, ["id", "nro", "numero", "codigo"]);
            const id = idVal !== undefined ? Number(idVal) : (index + 1);
            const nombre = String(getRowValue(row, ["nombre", "tema", "descripcion", "description", "title", "titulo", "temario"]) || "").trim();
            const abreviatura = String(getRowValue(row, ["abreviatura", "corto", "nombre_corto", "abbrev", "tag", "categoria", "category"]) || nombre).trim();
            const cantidadPreguntas = Number(getRowValue(row, ["cantidadpreguntas", "cantidad_preguntas", "cantidad", "preguntas", "n_preguntas", "count"]) || 0);
            const rango = String(getRowValue(row, ["rango", "rango_preguntas", "intervalo", "range"]) || "").trim();

            if (nombre) {
              parsedTemas.push({
                id,
                nombre,
                abreviatura,
                cantidadPreguntas,
                rango
              });
            }
          });

          const wsQuestions = wb.Sheets[sheetNames[1]];
          rawQuestionsData = XLSX.utils.sheet_to_json(wsQuestions) as any[];
        } else {
          // Backward compatibility: single sheet -> only questions
          const wsQuestions = wb.Sheets[sheetNames[0]];
          rawQuestionsData = XLSX.utils.sheet_to_json(wsQuestions) as any[];
        }

        if (rawQuestionsData.length === 0 && parsedTemas.length === 0) {
          throw new Error("El archivo Excel está vacío o no contiene temas ni preguntas válidas.");
        }

        const getQuestionUniqueKey = (q: any) => {
          const normPregunta = normalizeText(q.pregunta);
          const normA = normalizeText(q.alternativa_a);
          const normB = normalizeText(q.alternativa_b);
          const normC = normalizeText(q.alternativa_c);
          const normD = normalizeText(q.alternativa_d);
          const normE = normalizeText(q.alternativa_e);
          const normAns = normalizeText(q.respuesta_correcta || "");
          return `${normPregunta}|${normA}|${normB}|${normC}|${normD}|${normE}|${normAns}`;
        };

        const existingKeys = new Set(
          questions.map((q) => getQuestionUniqueKey(q))
        );

        const pendingQuestions: any[] = [];
        let countSkipped = 0;

        rawQuestionsData.forEach((row, rowIndex) => {
          // Read the topic reference from standard columns
          const topicRefValue = String(
            getRowValue(row, ["tema", "categoria", "category", "categoría", "balota", "id_tema", "temario", "grupo", "topic", "subtema", "pertenece", "materia", "nro_tema"]) || ""
          ).trim();

          let targetCategory = "General";
          let targetTema = "Temario";

          const availableTemas = parsedTemas.length > 0 ? parsedTemas : (temas && temas.length > 0 ? temas : temarioOficial);
          let matchedTopic = resolveTopic(topicRefValue, availableTemas);

          // SMART FALLBACK BY QUESTION NUMBER / RANGE INDEX:
          if (!matchedTopic) {
            // Try to extract question number from row columns
            const rawNumber = getRowValue(row, ["nro", "numero", "nº", "num", "#", "codigo", "código", "id_pregunta", "nro_pregunta", "id", "index", "n"]);
            let qNumber = NaN;
            if (rawNumber !== undefined && rawNumber !== null) {
              qNumber = parseInt(String(rawNumber).replace(/[^0-9]/g, ""));
            }
            if (isNaN(qNumber) || qNumber <= 0 || qNumber > 1600) {
              qNumber = rowIndex + 1;
            }
            matchedTopic = findTopicByNum(qNumber, availableTemas);
          }

          if (matchedTopic) {
            targetCategory = matchedTopic.abreviatura;
            targetTema = matchedTopic.nombre;
          } else {
            targetCategory = String(getRowValue(row, ["categoria", "category", "categoría", "grupo"]) || "General").trim();
            targetTema = String(getRowValue(row, ["tema", "topic", "subtema"]) || "Temario").trim();
          }

          const altAVal = String(getRowValue(row, ["alternativa_a", "alternativa a", "opcion a", "opcion_a", "alt a", "alta", "a"]) || "").trim();
          const altBVal = String(getRowValue(row, ["alternativa_b", "alternativa b", "opcion b", "opcion_b", "alt b", "altb", "b"]) || "").trim();
          const altCVal = String(getRowValue(row, ["alternativa_c", "alternativa c", "opcion c", "opcion_c", "alt c", "altc", "c"]) || "").trim();
          const altDVal = String(getRowValue(row, ["alternativa_d", "alternativa d", "opcion d", "opcion_d", "alt d", "altd", "d"]) || "").trim();
          const altEVal = String(getRowValue(row, ["alternativa_e", "alternativa e", "opcion e", "opcion_e", "alt e", "alte", "e"]) || "").trim();

          let rawCorrect = String(
            getRowValue(row, [
              "respuesta_correcta", "correcta", "respuesta", "correct", "key", "solucion", "solución", "rpta", "rpta.", "clave", "alternativa_correcta", "alternativa correcta", "clave correcta", "opcion correcta", "opción correcta", "verdadero", "verdadera", "ans", "answer"
            ]) || ""
          ).trim().toUpperCase();

          // Convert numeric answers 1-5 to letters A-E
          if (rawCorrect === "1") rawCorrect = "A";
          else if (rawCorrect === "2") rawCorrect = "B";
          else if (rawCorrect === "3") rawCorrect = "C";
          else if (rawCorrect === "4") rawCorrect = "D";
          else if (rawCorrect === "5") rawCorrect = "E";

          // If rawCorrect starts with A-E followed by space or punctuation, extract it
          const letterMatch = rawCorrect.match(/^([A-E])(?:[\s\)\.\,\-\/:]|$)/i);
          if (letterMatch) {
            rawCorrect = letterMatch[1].toUpperCase();
          }

          let cleanCorrect = ["A", "B", "C", "D", "E"].includes(rawCorrect) ? rawCorrect : "";

          // If the correct answer is not A-E directly, check if it contains the text of one of the options
          if (!cleanCorrect && rawCorrect) {
            const normRawCorrect = normalizeText(rawCorrect);
            if (normRawCorrect) {
              const normA = normalizeText(altAVal);
              const normB = normalizeText(altBVal);
              const normC = normalizeText(altCVal);
              const normD = normalizeText(altDVal);
              const normE = normalizeText(altEVal);

              if (normRawCorrect === normA) cleanCorrect = "A";
              else if (normRawCorrect === normB) cleanCorrect = "B";
              else if (normRawCorrect === normC) cleanCorrect = "C";
              else if (normRawCorrect === normD) cleanCorrect = "D";
              else if (normRawCorrect === normE) cleanCorrect = "E";
              // Check partial matches/inclusions
              else if (normA && (normRawCorrect.includes(normA) || normA.includes(normRawCorrect))) cleanCorrect = "A";
              else if (normB && (normRawCorrect.includes(normB) || normB.includes(normRawCorrect))) cleanCorrect = "B";
              else if (normC && (normRawCorrect.includes(normC) || normC.includes(normRawCorrect))) cleanCorrect = "C";
              else if (normD && (normRawCorrect.includes(normD) || normD.includes(normRawCorrect))) cleanCorrect = "D";
              else if (normE && (normRawCorrect.includes(normE) || normE.includes(normRawCorrect))) cleanCorrect = "E";
            }
          }

          if (!cleanCorrect) {
            cleanCorrect = "A"; // Default fallback
          }

          const qData: any = {
            categoria: targetCategory,
            tema: targetTema,
            pregunta: String(getRowValue(row, ["pregunta", "question", "enunciado", "texto"]) || "").trim(),
            alternativa_a: altAVal,
            alternativa_b: altBVal,
            alternativa_c: altCVal,
            alternativa_d: altDVal,
            alternativa_e: altEVal,
            respuesta_correcta: cleanCorrect,
            explicacion: String(getRowValue(row, [
              "fundamento desarrollado (base legal)", 
              "fundamento desarrollado", 
              "fundamento", 
              "desarrollo", 
              "explicacion", 
              "explicación", 
              "retroalimentacion", 
              "sustento", 
              "base legal"
            ]) || "").trim(),
            dificultad: (String(getRowValue(row, ["dificultad", "difficulty", "nivel"]) || "Medio").trim()) as any
          };

          const rawUbicacion = getRowValue(row, ["ubicacion", "ubicación", "donde", "referencia"]);
          if (rawUbicacion !== undefined) {
            qData.ubicacion = String(rawUbicacion).trim();
          }

          const rawCodigo = getRowValue(row, ["codigo", "código", "id_pregunta", "nro_pregunta", "code"]);
          if (rawCodigo !== undefined) {
            qData.codigo = String(rawCodigo).trim();
          }

          if (qData.pregunta && qData.alternativa_a) {
            const key = getQuestionUniqueKey(qData);
            if (existingKeys.has(key)) {
              countSkipped++;
            } else {
              pendingQuestions.push(qData);
              existingKeys.add(key);
            }
          }
        });

        setExcelPreview({
          filename: file.name,
          total: rawQuestionsData.length,
          valid: pendingQuestions.length,
          duplicates: countSkipped,
          items: pendingQuestions,
          totalTemas: parsedTemas.length,
          itemsTemas: parsedTemas
        });

        let welcomeMsg = `Archivo procesado.`;
        if (parsedTemas.length > 0) {
          welcomeMsg += ` Se detectaron ${parsedTemas.length} temas (Hoja 1) y ${rawQuestionsData.length} preguntas (Hoja 2).`;
        } else {
          welcomeMsg += ` Se detectaron ${rawQuestionsData.length} preguntas en el archivo.`;
        }
        showMsg(welcomeMsg, "success");
      } catch (err: any) {
        console.error(err);
        showMsg(`Error al procesar el archivo Excel: ${err.message}`, "error");
      } finally {
        setLoading(false);
        e.target.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  // Upload parsed Excel preview questions and topics to Firestore in parallel batches
  const handleConfirmExcelUpload = async () => {
    if (!excelPreview) return;
    setLoading(true);
    try {
      // 1. Upload Temas if present
      if (excelPreview.itemsTemas && excelPreview.itemsTemas.length > 0) {
        const temasToUpload = excelPreview.itemsTemas;
        const chunkSize = 400;
        const promisesTemas = [];

        for (let j = 0; j < temasToUpload.length; j += chunkSize) {
          const chunk = temasToUpload.slice(j, j + chunkSize);
          const batch = writeBatch(db);
          chunk.forEach((t) => {
            const docRef = doc(db, "temas", String(t.id));
            batch.set(docRef, t);
          });
          promisesTemas.push(batch.commit());
        }
        await Promise.all(promisesTemas);
      }

      // 2. Upload Questions if present
      const itemsToUpload = excelPreview.items;
      const chunkSize = 400;
      let countImported = 0;
      const promisesQuestions = [];

      for (let j = 0; j < itemsToUpload.length; j += chunkSize) {
        const chunk = itemsToUpload.slice(j, j + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach((q) => {
          const docRef = doc(collection(db, "preguntas"));
          batch.set(docRef, q);
          countImported++;
        });
        promisesQuestions.push(batch.commit());
      }

      await Promise.all(promisesQuestions);

      let successMsg = `¡Importación exitosa! Se subieron ${countImported} preguntas nuevas.`;
      if (excelPreview.duplicates > 0) {
        successMsg += ` Se omitieron ${excelPreview.duplicates} duplicados.`;
      }
      if (excelPreview.itemsTemas && excelPreview.itemsTemas.length > 0) {
        successMsg += ` Se subieron/actualizaron ${excelPreview.itemsTemas.length} temas en la base de datos.`;
      }

      showMsg(successMsg, "success");
      setExcelPreview(null);
      await onRefreshQuestions();
      if (onRefreshTemas) {
        await onRefreshTemas();
      }
    } catch (err: any) {
      console.error(err);
      showMsg(`Error al subir datos a Firestore: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelExcelUpload = () => {
    setExcelPreview(null);
  };

  // Bulk plain text tab-separated pasting parser with Chunked Firestore Writes and Anti-Duplication
  const handleBulkTextImport = async () => {
    if (!bulkText.trim()) return;
    setLoading(true);
    try {
      const lines = bulkText.split("\n");
      const getQuestionUniqueKey = (q: any) => {
        const normPregunta = normalizeText(q.pregunta);
        const normA = normalizeText(q.alternativa_a);
        const normB = normalizeText(q.alternativa_b);
        const normC = normalizeText(q.alternativa_c);
        const normD = normalizeText(q.alternativa_d);
        const normE = normalizeText(q.alternativa_e);
        const normAns = normalizeText(q.respuesta_correcta || "");
        return `${normPregunta}|${normA}|${normB}|${normC}|${normD}|${normE}|${normAns}`;
      };

      const existingKeys = new Set(
        questions.map((q) => getQuestionUniqueKey(q))
      );

      const pendingData: any[] = [];
      let countSkipped = 0;

      lines.forEach((line, rowIndex) => {
        const parts = line.split("\t"); // Tab-separated copy pastes
        if (parts.length >= 11) {
          let rawCorrect = parts[8].trim().toUpperCase();
          
          // Convert numeric answers 1-5 to letters A-E
          if (rawCorrect === "1") rawCorrect = "A";
          else if (rawCorrect === "2") rawCorrect = "B";
          else if (rawCorrect === "3") rawCorrect = "C";
          else if (rawCorrect === "4") rawCorrect = "D";
          else if (rawCorrect === "5") rawCorrect = "E";

          // If rawCorrect starts with A-E followed by space or punctuation, extract it
          const letterMatch = rawCorrect.match(/^([A-E])(?:[\s\)\.\,\-\/:]|$)/i);
          if (letterMatch) {
            rawCorrect = letterMatch[1].toUpperCase();
          }

          const cleanCorrect = ["A", "B", "C", "D", "E"].includes(rawCorrect) ? rawCorrect : "A";

          let targetCategory = parts[0].trim();
          let targetTema = parts[1].trim();

          const availableTemas = temas && temas.length > 0 ? temas : temarioOficial;
          let matchedTopic = resolveTopic(targetCategory || targetTema, availableTemas);

          // SMART FALLBACK BY LINE INDEX / QUESTION NUMBER:
          if (!matchedTopic) {
            matchedTopic = findTopicByNum(rowIndex + 1, availableTemas);
          }

          if (matchedTopic) {
            targetCategory = matchedTopic.abreviatura;
            targetTema = matchedTopic.nombre;
          } else {
            if (!targetCategory) targetCategory = "General";
            if (!targetTema) targetTema = "Temario";
          }

          const qData = {
            categoria: targetCategory,
            tema: targetTema,
            pregunta: parts[2].trim(),
            alternativa_a: parts[3].trim(),
            alternativa_b: parts[4].trim(),
            alternativa_c: parts[5].trim(),
            alternativa_d: parts[6].trim(),
            alternativa_e: parts[7].trim(),
            respuesta_correcta: cleanCorrect,
            explicacion: parts[9].trim(),
            dificultad: (parts[10].trim() || "Medio") as any
          };
          
          if (qData.pregunta && qData.alternativa_a) {
            const key = getQuestionUniqueKey(qData);
            if (existingKeys.has(key)) {
              countSkipped++;
            } else {
              pendingData.push(qData);
              existingKeys.add(key);
            }
          }
        }
      });

      if (pendingData.length === 0) {
        setLoading(false);
        if (countSkipped > 0) {
          showMsg(`Las preguntas pegadas (${countSkipped}) ya se encuentran registradas en la base de datos (se omitieron los duplicados).`, "success");
        } else {
          showMsg("No se encontraron registros tabulados válidos. El formato requerido es: Categoría \\t Tema \\t Pregunta \\t A \\t B \\t C \\t D \\t E \\t Respuesta Correcta \\t Explicación \\t Dificultad.", "error");
        }
        return;
      }

      const chunkSize = 400;
      let countImported = 0;

      for (let j = 0; j < pendingData.length; j += chunkSize) {
        const chunk = pendingData.slice(j, j + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach((q) => {
          const docRef = doc(collection(db, "preguntas"));
          batch.set(docRef, q);
          countImported++;
        });
        await batch.commit();
      }

      showMsg(`¡Importación de texto exitosa! Se subieron ${countImported} preguntas nuevas. Se omitieron ${countSkipped} duplicados.`, "success");
      setBulkText("");
      await onRefreshQuestions();
    } catch (err: any) {
      console.error(err);
      showMsg(`Error al importar texto: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  // Force seed / sync all 22 official topics questions from local file to Firestore with Anti-Duplication
  const handleForceSeedRemote = async () => {
    if (!window.confirm("¿Deseas sincronizar todas las preguntas oficiales del balotario local a tu base de datos Firestore? Las preguntas ya cargadas no se duplicarán, solo se completarán los temas que falten.")) return;
    setLoading(true);
    try {
      const getQuestionUniqueKey = (q: any) => {
        const normPregunta = normalizeText(q.pregunta);
        const normA = normalizeText(q.alternativa_a);
        const normB = normalizeText(q.alternativa_b);
        const normC = normalizeText(q.alternativa_c);
        const normD = normalizeText(q.alternativa_d);
        const normE = normalizeText(q.alternativa_e);
        const normAns = normalizeText(q.respuesta_correcta || "");
        return `${normPregunta}|${normA}|${normB}|${normC}|${normD}|${normE}|${normAns}`;
      };

      const existingIds = new Set(questions.map((q) => q.id));
      const existingKeys = new Set(
        questions.map((q) => getQuestionUniqueKey(q))
      );

      const pendingData: any[] = [];

      initialQuestions.forEach((q) => {
        const key = getQuestionUniqueKey(q);
        if (!existingIds.has(q.id) && !existingKeys.has(key)) {
          pendingData.push(q);
          existingKeys.add(key); // Prevent duplicates inside the set
        }
      });

      if (pendingData.length === 0) {
        showMsg("La base de datos en la nube ya se encuentra completamente sincronizada con todas las preguntas del balotario oficial de 22 temas.", "success");
        setLoading(false);
        return;
      }

      const chunkSize = 400;
      let countSeeded = 0;

      for (let j = 0; j < pendingData.length; j += chunkSize) {
        const chunk = pendingData.slice(j, j + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach((q) => {
          const docRef = doc(db, "preguntas", q.id);
          batch.set(docRef, {
            categoria: q.categoria,
            tema: q.tema,
            pregunta: q.pregunta,
            alternativa_a: q.alternativa_a,
            alternativa_b: q.alternativa_b,
            alternativa_c: q.alternativa_c,
            alternativa_d: q.alternativa_d,
            alternativa_e: q.alternativa_e,
            respuesta_correcta: q.respuesta_correcta,
            explicacion: q.explicacion,
            dificultad: q.dificultad
          });
          countSeeded++;
        });
        await batch.commit();
      }

      showMsg(`¡Sincronización exitosa! Se subieron ${countSeeded} preguntas oficiales faltantes a tu base de datos Firestore.`, "success");
      await onRefreshQuestions();
    } catch (err: any) {
      console.error(err);
      showMsg(`Error al sincronizar base de datos remota: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  // Securely delete all questions in Firestore in batches of 400
  const handleDeleteAllQuestions = () => {
    setShowDeleteConfirm(true);
    setDeleteConfirmText("");
  };

  const handleExecuteDeleteAll = async () => {
    if (deleteConfirmText.trim().toUpperCase() !== "ELIMINAR") return;
    setLoading(true);
    try {
      // Mark system state as initialized in configuration so App.tsx knows we explicitly cleared it and won't auto-seed default questions
      await setDoc(doc(db, "config", "questions_state"), { initialized: true });

      const qSnapshot = await getDocs(collection(db, "preguntas"));
      const docsToDelete = qSnapshot.docs;
      
      if (docsToDelete.length === 0) {
        showMsg("La base de datos ya se encuentra totalmente vacía.", "success");
        await onRefreshQuestions();
        setShowDeleteConfirm(false);
        setDeleteConfirmText("");
        return;
      }

      const chunkSize = 400;
      let deletedCount = 0;

      for (let i = 0; i < docsToDelete.length; i += chunkSize) {
        const chunk = docsToDelete.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach((docSnap) => {
          batch.delete(docSnap.ref);
        });
        await batch.commit();
        deletedCount += chunk.length;
      }

      showMsg(`¡Banco de preguntas vaciado con éxito! Se han eliminado las ${deletedCount} preguntas del servidor. Tu sistema ahora está a Cero (0) preguntas y listo para que importes tu nuevo balotario completo.`, "success");
      await onRefreshQuestions();
      setShowDeleteConfirm(false);
      setDeleteConfirmText("");
    } catch (err: any) {
      console.error(err);
      showMsg(`Error al vaciar el banco de preguntas: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  // Filter questions list based on search term
  const filteredQuestions = questions.filter((q) => {
    const matchesSearch = 
      q.pregunta.toLowerCase().includes(qSearch.toLowerCase()) ||
      q.tema.toLowerCase().includes(qSearch.toLowerCase()) ||
      q.explicacion.toLowerCase().includes(qSearch.toLowerCase());
    const matchesCategory = qCategoryFilter === "Todas" || q.categoria === qCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-8 animate-fade-in font-sans" id="admin_dashboard_page">
      
      {/* Admin Title Card */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-red-600" />
            Panel de Control del Administrador
          </h1>
          <p className="text-sm text-gray-500 mt-1">Crea simulacros oficiales y gestiona el banco de preguntas de conocimientos policiales.</p>
        </div>

        {/* Local Message banner inside card */}
        {message.text && (
          <div className={`text-xs font-bold px-4 py-2.5 rounded-lg shadow-sm border ${
            message.type === "success" ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"
          }`}>
            {message.text}
          </div>
        )}
      </div>

      {/* Sub Tabs Toggle Nav */}
      <div className="flex border-b border-gray-200" id="admin_sub_tabs">
        {[
          { id: "questions", label: "Gestión del Banco", icon: Database },
          { id: "custom_mocks", label: "Simulacros Oficiales", icon: PlusCircle },
          { id: "users", label: "Usuarios y Roles", icon: Users },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-3.5 border-b-2 font-bold text-sm transition-colors focus:outline-none ${
                active 
                  ? "border-blue-600 text-blue-600" 
                  : "border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* SUB TAB: Questions Bank CRUD */}
      {activeSubTab === "questions" && (
        <div className="space-y-8" id="subtab_questions">
          
          {/* Create/Edit Form */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6" id="question_form_anchor">
            <h2 className="text-lg font-extrabold text-gray-900 flex items-center gap-2 pb-3 border-b border-gray-100">
              <Plus className="h-5 w-5 text-blue-600" />
              {isEditingQuestion ? `Editar Pregunta ID: ${editingId}` : "Registrar Nueva Pregunta Manual"}
            </h2>

            <form onSubmit={handleSaveQuestion} className="space-y-4" id="frm_question">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Categoría</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm font-semibold"
                    placeholder="Ej. Constitución Política"
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tema Específico</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm font-semibold"
                    placeholder="Ej. Derechos Fundamentales"
                    value={tema}
                    onChange={(e) => setTema(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nivel Dificultad</label>
                  <select
                    value={dificultad}
                    onChange={(e) => setDificultad(e.target.value as any)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm font-semibold"
                  >
                    <option value="Fácil">Fácil</option>
                    <option value="Medio">Medio</option>
                    <option value="Difícil">Difícil</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Enunciado de la Pregunta</label>
                <textarea
                  rows={2}
                  required
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm font-semibold"
                  placeholder="Escribe la pregunta o caso práctico..."
                  value={preguntaTxt}
                  onChange={(e) => setPreguntaTxt(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { key: "A", val: altA, set: setAltA },
                  { key: "B", val: altB, set: setAltB },
                  { key: "C", val: altC, set: setAltC },
                  { key: "D", val: altD, set: setAltD },
                  { key: "E", val: altE, set: setAltE },
                ].map((item) => (
                  <div key={item.key}>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Alternativa {item.key}</label>
                    <input
                      type="text"
                      required
                      className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm font-semibold"
                      placeholder={`Contenido de la opción ${item.key}...`}
                      value={item.val}
                      onChange={(e) => item.set(e.target.value)}
                    />
                  </div>
                ))}

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Respuesta Correcta</label>
                  <select
                    value={ansCorrect}
                    onChange={(e) => setAnsCorrect(e.target.value as any)}
                    className="w-full bg-blue-50 border border-blue-300 text-blue-900 rounded-lg p-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="A">Opción A</option>
                    <option value="B">Opción B</option>
                    <option value="C">Opción C</option>
                    <option value="D">Opción D</option>
                    <option value="E">Opción E</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Código Identificador (Opcional)</label>
                  <input
                    type="text"
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm font-semibold"
                    placeholder="Ej. MAT-1416 o P-102"
                    value={codigoInput}
                    onChange={(e) => setCodigoInput(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ubicación / Referencia del Documento (Opcional)</label>
                  <input
                    type="text"
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm font-semibold"
                    placeholder="Ej. Página 24, Párrafo 2 o Ley PNP Art. 12"
                    value={ubicacionInput}
                    onChange={(e) => setUbicacionInput(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Base Legal / Explicación Didáctica</label>
                <textarea
                  rows={2}
                  required
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm font-semibold"
                  placeholder="Cita los artículos y leyes aplicables que sustentan por qué esta es la respuesta correcta..."
                  value={explicacion}
                  onChange={(e) => setExplicacion(e.target.value)}
                />
              </div>

              <div className="flex gap-3 justify-end pt-4">
                {isEditingQuestion && (
                  <button
                    type="button"
                    onClick={resetQuestionForm}
                    className="px-5 py-2.5 border border-gray-300 text-gray-700 font-bold text-xs rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar Edición
                  </button>
                )}
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-lg text-xs shadow transition-colors"
                >
                  {isEditingQuestion ? "Actualizar Pregunta" : "Registrar en el Banco"}
                </button>
              </div>
            </form>
          </div>

          {/* Bulk Import Options Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="bulk_imports_row">
            {/* Importer 1: Excel */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                <FileUp className="h-5 w-5 text-indigo-600 shrink-0" />
                <h3 className="font-extrabold text-sm text-gray-900 uppercase tracking-wide">Importar desde Excel (.xlsx / .xls)</h3>
              </div>
              
              {!excelPreview ? (
                <>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Sube tu hoja de cálculo local. El sistema procesará el archivo del lado del cliente. Asegúrate de que las columnas coincidan con los campos de preguntas: <code className="bg-gray-100 px-1 rounded text-[10px] font-mono">categoria</code>, <code className="bg-gray-100 px-1 rounded text-[10px] font-mono">tema</code>, <code className="bg-gray-100 px-1 rounded text-[10px] font-mono">pregunta</code>, <code className="bg-gray-100 px-1 rounded text-[10px] font-mono">alternativa_a</code>, etc.
                  </p>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      onChange={handleExcelUpload}
                      disabled={loading}
                      className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer disabled:opacity-50"
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-3 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 animate-fade-in text-xs">
                  <div className="font-bold text-indigo-950 flex items-center gap-1.5 break-all">
                    <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                    {excelPreview.filename}
                  </div>
                  <div className="space-y-1 text-gray-600">
                    {excelPreview.totalTemas && excelPreview.totalTemas > 0 ? (
                      <div className="flex justify-between border-b border-indigo-100/50 pb-1 text-indigo-950 font-bold">
                        <span>Temas detectados (Hoja 1):</span>
                        <span>{excelPreview.totalTemas} temas</span>
                      </div>
                    ) : null}
                    <div className="flex justify-between border-b border-indigo-100/50 pb-1">
                      <span>Total de preguntas en archivo:</span>
                      <span className="font-bold text-gray-900">{excelPreview.total}</span>
                    </div>
                    <div className="flex justify-between border-b border-indigo-100/50 pb-1">
                      <span>Nuevas por subir:</span>
                      <span className="font-bold text-emerald-600">+{excelPreview.valid}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Omitidas (duplicadas):</span>
                      <span className="font-bold text-amber-600">{excelPreview.duplicates}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 pt-2">
                    <button
                      onClick={handleConfirmExcelUpload}
                      disabled={loading || (excelPreview.valid === 0 && (!excelPreview.itemsTemas || excelPreview.itemsTemas.length === 0))}
                      className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-extrabold text-xs py-2 px-4 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1.5 w-full cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          Subiendo a Firestore...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-3.5 w-3.5" />
                          Subir {excelPreview.valid} preguntas {excelPreview.totalTemas && excelPreview.totalTemas > 0 ? `y ${excelPreview.totalTemas} temas` : ""}
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleCancelExcelUpload}
                      disabled={loading}
                      className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold text-xs py-2 px-4 rounded-lg transition-colors w-full cursor-pointer"
                    >
                      Cancelar y Cambiar Archivo
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Importer 2: Google Sheets Raw paste area */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                <Database className="h-5 w-5 text-teal-600 shrink-0" />
                <h3 className="font-extrabold text-sm text-gray-900 uppercase tracking-wide">Copiar y Pegar desde Google Sheets</h3>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Copia las columnas de tu hoja de Google Sheets (separadas por tabulación) y pégalas aquí. Cada línea corresponde a una pregunta.
              </p>
              <textarea
                rows={2}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-[10px] font-mono"
                placeholder="Pega las celdas aquí..."
              />
              {bulkText.trim() && (
                <button
                  onClick={handleBulkTextImport}
                  className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold py-2 px-4 rounded-lg shadow transition-colors w-full"
                >
                  Procesar e Importar Celdas
                </button>
              )}
            </div>

            {/* Importer 3: Force Sync Official Question Bank */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                  <RefreshCw className="h-5 w-5 text-blue-600 shrink-0" />
                  <h3 className="font-extrabold text-sm text-gray-900 uppercase tracking-wide">Sincronizar Balotario Oficial</h3>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  ¿Faltan temas o preguntas preestablecidas en tu base de datos Firestore? Este asistente subirá automáticamente las preguntas por defecto de los 22 temas oficiales del balotario para completar tu base de datos remota.
                </p>
              </div>
              <button
                onClick={handleForceSeedRemote}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-xs font-bold py-2.5 px-4 rounded-lg shadow transition-colors flex items-center justify-center gap-2 w-full mt-2"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Sincronizando...' : 'Completar y Subir a Firestore'}
              </button>
            </div>
          </div>

          {/* Table List of Bank Questions */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-600 shrink-0" />
                <h2 className="text-lg font-extrabold text-gray-900">Banco de Preguntas ({filteredQuestions.length})</h2>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={handleDeleteAllQuestions}
                  disabled={loading}
                  className="bg-red-50 hover:bg-red-100 border border-red-200 hover:border-red-300 text-red-700 font-extrabold py-1.5 px-3 rounded-lg text-xs transition-colors flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 cursor-pointer"
                  title="Eliminar permanentemente todas las preguntas de la base de datos Firestore"
                >
                  <Trash2 className="h-3.5 w-3.5 shrink-0" />
                  Vaciar Banco
                </button>

                <div className="relative flex-1 sm:flex-initial">
                  <input
                    type="text"
                    value={qSearch}
                    onChange={(e) => setQSearch(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg py-1.5 px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Buscar pregunta..."
                  />
                </div>

                <div className="relative">
                  <select
                    value={qCategoryFilter}
                    onChange={(e) => setQCategoryFilter(e.target.value)}
                    className="bg-gray-50 border border-gray-300 rounded-lg py-1.5 px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {uniqueCategories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Questions Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-xs text-left">
                <thead>
                  <tr className="text-[10px] font-bold text-gray-400 uppercase bg-gray-50">
                    <th className="px-6 py-3 rounded-l-lg">ID</th>
                    <th className="px-6 py-3">Categoría / Tema</th>
                    <th className="px-6 py-3">Pregunta</th>
                    <th className="px-6 py-3 text-center">Correcta</th>
                    <th className="px-6 py-3 text-center">Dificultad</th>
                    <th className="px-6 py-3 text-right rounded-r-lg">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150 font-semibold text-gray-700">
                  {filteredQuestions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500 font-medium">
                        No se encontraron preguntas en el banco que coincidan con la búsqueda.
                      </td>
                    </tr>
                  ) : (
                    filteredQuestions.map((q) => (
                      <tr key={q.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-[10px] text-gray-400 font-mono">
                          {q.codigo ? (
                            <span className="font-extrabold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">{q.codigo}</span>
                          ) : (
                            q.id.substring(0, 8)
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="block text-gray-900 font-bold">{q.categoria}</span>
                          <span className="block text-[10px] text-gray-400 font-bold uppercase">{q.tema}</span>
                        </td>
                        <td className="px-6 py-4 max-w-sm" title={q.pregunta}>
                          <span className="block text-gray-900 font-medium line-clamp-2">{q.pregunta}</span>
                          {q.ubicacion && (
                            <span className="block text-[10px] text-indigo-600 font-bold mt-1">
                              📍 Ubicación: {q.ubicacion}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center font-black text-sm text-blue-700">{q.respuesta_correcta}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                            q.dificultad === "Fácil" ? "bg-green-50 text-green-700" : q.dificultad === "Medio" ? "bg-yellow-50 text-yellow-700" : "bg-red-50 text-red-700"
                          }`}>
                            {q.dificultad}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleEditQuestionClick(q)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors focus:outline-none"
                              title="Editar"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteQuestion(q.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors focus:outline-none"
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* SUB TAB: Custom Mock Exams */}
      {activeSubTab === "custom_mocks" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="subtab_custom_mocks">
          
          {/* Creator Form */}
          <div className="lg:col-span-1 bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
            <h2 className="text-lg font-extrabold text-gray-900 flex items-center gap-2 pb-3 border-b border-gray-100">
              <PlusCircle className="h-5 w-5 text-indigo-600" />
              Nuevo Simulacro Oficial
            </h2>

            <form onSubmit={handleCreateMock} className="space-y-4" id="frm_mock">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Título del Simulacro</label>
                <input
                  type="text"
                  required
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm font-semibold"
                  placeholder="Ej. Examen de Admisión General II"
                  value={mockTitle}
                  onChange={(e) => setMockTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descripción / Indicaciones</label>
                <textarea
                  rows={2}
                  required
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm font-semibold"
                  placeholder="Ej. Temas de Constitución Política y Ley PNP..."
                  value={mockDesc}
                  onChange={(e) => setMockDescription(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Filtrar por Categoría</label>
                <select
                  value={mockCategory}
                  onChange={(e) => setMockCategory(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm font-semibold text-gray-800"
                >
                  <option value="">Todas las categorías (Aleatorio)</option>
                  {uniqueCategories.filter(c => c !== "Todas").map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Preguntas</label>
                  <input
                    type="number"
                    required
                    min={5}
                    max={100}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm font-semibold text-gray-800"
                    value={mockCount}
                    onChange={(e) => setMockCount(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Minutos</label>
                  <input
                    type="number"
                    required
                    min={5}
                    max={180}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm font-semibold text-gray-800"
                    value={mockTime}
                    onChange={(e) => setMockTime(Number(e.target.value))}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-lg shadow text-xs transition-colors flex items-center justify-center gap-1.5 focus:outline-none"
              >
                <PlusCircle className="h-4 w-4" />
                Crear Simulacro Oficial
              </button>
            </form>
          </div>

          {/* Active Mocks Table List */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
            <h2 className="text-lg font-extrabold text-gray-900 pb-3 border-b border-gray-100">
              Simulacros Oficiales Creados ({createdMocks.length})
            </h2>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-xs text-left">
                <thead>
                  <tr className="text-[10px] font-bold text-gray-400 uppercase bg-gray-50">
                    <th className="px-6 py-3 rounded-l-lg">Título</th>
                    <th className="px-6 py-3">Filtro Categoría</th>
                    <th className="px-6 py-3 text-center">Preguntas</th>
                    <th className="px-6 py-3 text-center">Tiempo Límite</th>
                    <th className="px-6 py-3 text-right rounded-r-lg">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150 font-semibold text-gray-700">
                  {createdMocks.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500 font-medium">
                        Aún no se han programado simulacros oficiales.
                      </td>
                    </tr>
                  ) : (
                    createdMocks.map((mock) => (
                      <tr key={mock.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="block font-bold text-gray-900">{mock.titulo}</span>
                          <span className="block text-[10px] text-gray-400">{mock.descripcion}</span>
                        </td>
                        <td className="px-6 py-4">{mock.categoria}</td>
                        <td className="px-6 py-4 text-center font-bold text-blue-700">{mock.cantidad_preguntas}</td>
                        <td className="px-6 py-4 text-center text-gray-500">{mock.tiempo_limite} min</td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleDeleteMock(mock.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors focus:outline-none"
                            title="Eliminar simulacro"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* SUB TAB: Users and Roles Management */}
      {activeSubTab === "users" && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6" id="subtab_users">
          <h2 className="text-lg font-extrabold text-gray-900 pb-3 border-b border-gray-100">
            Postulantes PNP Registrados ({users.length})
          </h2>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-xs text-left">
              <thead>
                <tr className="text-[10px] font-bold text-gray-400 uppercase bg-gray-50">
                  <th className="px-6 py-3 rounded-l-lg">Nombre de Postulante</th>
                  <th className="px-6 py-3">Correo Electrónico</th>
                  <th className="px-6 py-3">Fecha de Registro</th>
                  <th className="px-6 py-3 text-center">Rol de Acceso</th>
                  <th className="px-6 py-3 text-center">Nivel de Acceso</th>
                  <th className="px-6 py-3 text-right rounded-r-lg">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 font-semibold text-gray-700">
                {users.map((targetUser) => (
                  <tr key={targetUser.uid} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900">{targetUser.nombre}</td>
                    <td className="px-6 py-4 text-gray-600">{targetUser.email}</td>
                    <td className="px-6 py-4 text-xs text-gray-400">
                      {formatFechaUsuario(targetUser.fecha_registro)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block font-extrabold px-2.5 py-0.5 rounded text-[10px] uppercase ${
                        targetUser.rol === RolUsuario.ADMINISTRADOR ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"
                      }`}>
                        {targetUser.rol}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block font-extrabold px-2.5 py-0.5 rounded text-[10px] uppercase ${
                        targetUser.accesoCompleto ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                      }`}>
                        {targetUser.accesoCompleto ? "Acceso Completo 🟢" : "Demo Limitado 🟡"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {targetUser.uid !== user.uid ? (
                        <div className="flex flex-wrap justify-end items-center gap-2 sm:gap-3">
                          <button
                            onClick={() => handleToggleRole(targetUser)}
                            className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors focus:outline-none"
                            id={`toggle_role_btn_${targetUser.uid}`}
                          >
                            Cambiar Rol
                          </button>
                          <button
                            onClick={() => handleToggleAccess(targetUser)}
                            className="text-xs font-black text-emerald-600 hover:text-emerald-800 transition-colors focus:outline-none"
                            id={`toggle_access_btn_${targetUser.uid}`}
                          >
                            {targetUser.accesoCompleto ? "Degradar a Demo" : "Habilitar Acceso"}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(targetUser)}
                            className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors focus:outline-none"
                            id={`delete_user_btn_${targetUser.uid}`}
                          >
                            Eliminar
                          </button>
                          <button
                            onClick={() => handleDeleteAndBlockUser(targetUser)}
                            className="text-xs font-extrabold text-red-700 hover:text-red-900 bg-red-50 hover:bg-red-100 border border-red-200 hover:border-red-300 px-2 py-1 rounded-lg transition-all focus:outline-none"
                            id={`block_user_btn_${targetUser.uid}`}
                          >
                            Eliminar y Bloquear
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Tú (Propietario)</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Blocked Users Blacklist Section */}
          <div className="pt-6 border-t border-gray-150">
            <h3 className="text-sm font-black text-red-800 uppercase tracking-tight flex items-center gap-1.5 mb-4">
              <ShieldAlert className="h-4 w-4 text-red-600 shrink-0 animate-pulse" />
              Lista Negra / Correos Bloqueados ({blockedUsers.length})
            </h3>
            
            {blockedUsers.length === 0 ? (
              <p className="text-xs text-gray-500 bg-gray-50 p-4 rounded-xl border border-gray-150 font-semibold">
                No hay ningún correo electrónico bloqueado en el sistema actualmente.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-xs text-left">
                  <thead>
                    <tr className="text-[10px] font-bold text-gray-400 uppercase bg-gray-50">
                      <th className="px-6 py-3 rounded-l-lg">Correo Bloqueado</th>
                      <th className="px-6 py-3">Nombre Anterior</th>
                      <th className="px-6 py-3">Fecha de Bloqueo</th>
                      <th className="px-6 py-3 text-right rounded-r-lg">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150 font-semibold text-gray-700">
                    {blockedUsers.map((blocked) => (
                      <tr key={blocked.id} className="hover:bg-red-50/20 transition-colors">
                        <td className="px-6 py-4 font-bold text-red-700">{blocked.email}</td>
                        <td className="px-6 py-4 text-gray-600">{blocked.nombre_anterior || "N/A"}</td>
                        <td className="px-6 py-4 text-xs text-gray-400">
                          {formatFechaUsuario(blocked.fecha_bloqueo)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleUnblockUser(blocked.id)}
                            className="text-xs font-black text-emerald-600 hover:text-emerald-800 border border-emerald-200 hover:border-emerald-300 bg-emerald-50 hover:bg-emerald-100 px-3 py-1 rounded-lg transition-all focus:outline-none animate-pulse"
                          >
                            Desbloquear
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de confirmación para vaciar banco de preguntas */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-md w-full p-6 relative overflow-hidden">
            <button 
              onClick={() => {
                setShowDeleteConfirm(false);
                setDeleteConfirmText("");
              }}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-start gap-4 mt-2">
              <div className="p-3 bg-red-100 rounded-full text-red-600 shrink-0">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="text-base font-black text-gray-900 leading-tight">
                  ⚠️ ¡ALERTA CRÍTICA DE CONTROL!
                </h3>
                <p className="text-xs text-gray-500 font-bold leading-relaxed">
                  ¿Estás absolutamente seguro de que deseas eliminar todas las preguntas del banco de datos? Esta acción es <span className="text-red-600 font-extrabold underline">permanente</span>, vaciará por completo la base de datos Firestore de preguntas y no se puede revertir.
                </p>
                <div className="bg-red-50/70 rounded-lg p-3 border border-red-100 space-y-2 mt-2">
                  <p className="text-[11px] font-extrabold text-red-800">
                    Por favor, escribe exactamente <span className="font-black underline select-all bg-red-100 px-1.5 py-0.5 rounded text-red-900">ELIMINAR</span> en mayúsculas para proceder a vaciar la base de datos:
                  </p>
                  <input
                    type="text"
                    className="w-full bg-white border border-red-200 rounded-lg p-2.5 text-xs font-black text-center uppercase text-red-700 placeholder-red-300 focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Escribe ELIMINAR aquí"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmText("");
                }}
                className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 transition-colors focus:outline-none bg-gray-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleExecuteDeleteAll}
                disabled={deleteConfirmText.trim().toUpperCase() !== "ELIMINAR" || loading}
                className="px-5 py-2 text-xs font-extrabold text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-100 disabled:text-gray-400 rounded-lg transition-colors focus:outline-none disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {loading ? "Vaciando..." : "Sí, Eliminar Todo"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
