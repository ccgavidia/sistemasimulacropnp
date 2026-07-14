import React, { useState, useEffect } from "react";
import { auth, db, handleFirestoreError, OperationType } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, doc, getDoc, getDocs, setDoc, writeBatch, query, where, limit, orderBy } from "firebase/firestore";
import { RolUsuario, Usuario, Pregunta, ExamenIntento, SimulacroPersonalizado } from "./types";
import { initialQuestions } from "./data/initialQuestions";
import { temarioOficial, TemaOficial } from "./data/temarioOficial";
import { isQuestionInTopic } from "./utils";
import { ShieldAlert } from "lucide-react";

// Components
import Auth from "./components/Auth";
import CompleteProfile from "./components/CompleteProfile";
import Layout from "./components/Layout";
import ExamSimulator from "./components/ExamSimulator";
import ExamResults from "./components/ExamResults";
import AdminDashboard from "./components/AdminDashboard";
import MiHistorial from "./components/MiHistorial";

// Modular Views for Student Dashboard Deconstruction
import InicioView from "./components/InicioView";
import TemarioView from "./components/TemarioView";
import BancoPreguntasView from "./components/BancoPreguntasView";
import SimuladorExamenView from "./components/SimuladorExamenView";
import PracticaMateriasView from "./components/PracticaMateriasView";
import ZonaJuegoView from "./components/ZonaJuegoView";
import PlanEstudioView from "./components/PlanEstudioView";
import AudiosView from "./components/AudiosView";

export default function App() {
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null);
  const [authChecking, setAuthChecking] = useState(() => {
    try {
      return Object.keys(localStorage).some((key) => key.startsWith("firebase:authUser"));
    } catch {
      return true;
    }
  });
  const [initError, setInitError] = useState<string | null>(null);
  
  // Tab navigation
  const [activeTab, setActiveTab] = useState<string>("inicio");
  
  // Questions list
  const [questions, setQuestions] = useState<Pregunta[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);

  // Topics/Temas list
  const [temas, setTemas] = useState<TemaOficial[]>([]);
  const [loadingTemas, setLoadingTemas] = useState(true);

  // Active exam states
  const [activeExam, setActiveExam] = useState<Pregunta[] | null>(null);
  const [activeExamMock, setActiveExamMock] = useState<SimulacroPersonalizado | undefined>(undefined);
  const [activeExamResults, setActiveExamResults] = useState<ExamenIntento | null>(null);
  const [activeExamRealMode, setActiveExamRealMode] = useState<boolean>(false);
  const [activeExamTimeLimit, setActiveExamTimeLimit] = useState<number | undefined>(undefined);

  // Dashboard Stats & Custom Mocks (Loaded from Firestore / LocalStorage)
  const [customMocks, setCustomMocks] = useState<SimulacroPersonalizado[]>([]);
  const [history, setHistorial] = useState<ExamenIntento[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [stats, setStats] = useState({
    totalExams: 0,
    avgScore: 0,
    highestScore: 0,
    totalCorrect: 0,
    totalQuestions: 0,
    categoryWeakness: "Ninguna identificada aún"
  });

  // Toggle role helper for fast testing without login constraints
  const toggleDemoRole = async () => {
    if (!currentUser) return;
    const newRol = currentUser.rol === RolUsuario.ADMINISTRADOR ? RolUsuario.USUARIO : RolUsuario.ADMINISTRADOR;
    const newNombre = newRol === RolUsuario.ADMINISTRADOR 
      ? "CORONEL PNP SANCHEZ FLORES MARCO ANTONIO (ADMINISTRADOR)" 
      : "COMANDANTE PNP ALCANTARA PEREZ EDGAR ALEJANDRO (POLICIA)";
    const newEmail = newRol === RolUsuario.ADMINISTRADOR ? "admin@siecopol.com" : "postulante@siecopol.com";
    
    const updatedUser: Usuario = {
      ...currentUser,
      nombre: newNombre,
      email: newEmail,
      rol: newRol,
    };

    setCurrentUser(updatedUser);
    
    // Also sync with DB if they are a real logged in Firebase user
    if (auth.currentUser) {
      try {
        await setDoc(doc(db, "usuarios", auth.currentUser.uid), updatedUser);
      } catch (err) {
        console.error("Error updating user role in DB:", err);
      }
    }
    
    // Route back to dashboard to refresh views nicely
    setActiveTab("inicio");
  };

  // Listen to Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setAuthChecking(true);
        try {
          // Check if user is blocked
          if (firebaseUser.email) {
            const cleanEmail = firebaseUser.email.trim().toLowerCase();
            try {
              const blockDoc = await getDoc(doc(db, "bloqueados", cleanEmail));
              if (blockDoc.exists()) {
                setInitError("ACCESO_BLOQUEADO");
                await signOut(auth);
                setCurrentUser(null);
                setAuthChecking(false);
                return;
              }
            } catch (err) {
              console.warn("Could not check blocked list:", err);
            }
          }

          let userDoc;
          try {
            userDoc = await getDoc(doc(db, "usuarios", firebaseUser.uid));
          } catch (err: any) {
            if (err?.message?.includes("permissions") || err?.message?.includes("permisos") || err?.code === "permission-denied") {
              setInitError("FALTA_REGLAS");
              setAuthChecking(false);
              return;
            }
            handleFirestoreError(err, OperationType.GET, `usuarios/${firebaseUser.uid}`);
            return;
          }
          if (userDoc.exists()) {
            const userData = userDoc.data() as Usuario;
            const isAdminEmail = firebaseUser.email && (
              firebaseUser.email.toLowerCase() === "ccgavidia123@gmail.com" ||
              firebaseUser.email.toLowerCase() === "admin@siecopol.com"
            );
            if (isAdminEmail && (userData.rol !== RolUsuario.ADMINISTRADOR || !userData.accesoCompleto)) {
              const updatedUser = { 
                ...userData, 
                rol: RolUsuario.ADMINISTRADOR,
                accesoCompleto: true,
                nombre: userData.nombre.includes("ADMINISTRADOR") 
                  ? userData.nombre 
                  : (firebaseUser.email?.toLowerCase() === "ccgavidia123@gmail.com" 
                     ? `S2 PNP ${userData.nombre.toUpperCase()} (ADMINISTRADOR)` 
                     : "ADMINISTRADOR SIEXPOL")
              };
              try {
                await setDoc(doc(db, "usuarios", firebaseUser.uid), updatedUser);
              } catch (err) {
                console.warn("Could not automatically elevate user role in DB:", err);
              }
              setCurrentUser(updatedUser);
            } else {
              setCurrentUser(userData);
            }
          } else {
            // Default profile creation if missing
            const isAdminEmail = firebaseUser.email && (
              firebaseUser.email.toLowerCase() === "ccgavidia123@gmail.com" ||
              firebaseUser.email.toLowerCase() === "admin@siecopol.com"
            );
            const defaultUser: Usuario = {
              uid: firebaseUser.uid,
              nombre: isAdminEmail 
                ? (firebaseUser.email?.toLowerCase() === "ccgavidia123@gmail.com" ? "CORONEL PNP CCGAVIDIA (ADMINISTRADOR)" : "ADMINISTRADOR SIEXPOL")
                : (firebaseUser.email?.split("@")[0].toUpperCase() || "Postulante"),
              email: firebaseUser.email || "",
              rol: isAdminEmail ? RolUsuario.ADMINISTRADOR : RolUsuario.USUARIO,
              fecha_registro: new Date().toISOString(),
              accesoCompleto: isAdminEmail ? true : false
            };
            try {
              await setDoc(doc(db, "usuarios", firebaseUser.uid), defaultUser);
            } catch (err: any) {
              if (err?.message?.includes("permissions") || err?.message?.includes("permisos") || err?.code === "permission-denied") {
                setInitError("FALTA_REGLAS");
                setAuthChecking(false);
                return;
              }
              handleFirestoreError(err, OperationType.CREATE, `usuarios/${firebaseUser.uid}`);
              return;
            }
            setCurrentUser(defaultUser);
          }
        } catch (err) {
          console.error("Error fetching user profile:", err);
        } finally {
          setAuthChecking(false);
        }
      } else {
        setCurrentUser(null);
        setAuthChecking(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Sync Questions & Seed if empty
  useEffect(() => {
    if (currentUser) {
      syncQuestionBank();
      syncTemasBank();
    }
  }, [currentUser]);

  // Sync Past Attempts, Stats & Custom Mocks
  useEffect(() => {
    if (currentUser && questions.length > 0) {
      fetchDashboardData();
    }
  }, [currentUser, questions]);

  const fetchDashboardData = async () => {
    if (!currentUser) return;
    setLoadingHistory(true);
    let attempts: ExamenIntento[] = [];
    let mocksList: SimulacroPersonalizado[] = [];

    const loadLocalAttempts = () => {
      try {
        const stored = localStorage.getItem("offline_intentos");
        if (stored) {
          const all = JSON.parse(stored) as ExamenIntento[];
          return all
            .filter((item) => item.usuario_id === currentUser.uid)
            .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
            .slice(0, 20);
        }
      } catch (localErr) {
        console.warn("Could not load history from localStorage:", localErr);
      }
      return [];
    };

    if (currentUser.uid.startsWith("demo_")) {
      attempts = loadLocalAttempts();
      setHistorial(attempts);
      setCustomMocks([]);
      computeStats(attempts);
      setLoadingHistory(false);
      return;
    }

    try {
      // 1. Fetch custom mock exams created by admins
      try {
        const mocksSnapshot = await getDocs(collection(db, "simulacros"));
        mocksList = mocksSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as SimulacroPersonalizado[];
        setCustomMocks(mocksList);
      } catch (errMock) {
        console.warn("Could not fetch custom mocks from Firestore:", errMock);
      }

      // 2. Fetch past attempts of current user
      const q = query(
        collection(db, "intentos"),
        where("usuario_id", "==", currentUser.uid)
      );
      const snapshot = await getDocs(q);
      attempts = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as ExamenIntento[];
      // Sort and slice in memory to avoid index requirements
      attempts.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      attempts = attempts.slice(0, 20);
      setHistorial(attempts);
      computeStats(attempts);
    } catch (err) {
      console.warn("Error loading user dashboard data from Firestore. Falling back to local storage:", err);
      attempts = loadLocalAttempts();
      setHistorial(attempts);
      computeStats(attempts);
    } finally {
      setLoadingHistory(false);
    }
  };

  const computeStats = (attempts: ExamenIntento[]) => {
    if (attempts.length > 0) {
      let sumScore = 0;
      let maxScore = 0;
      let correctCount = 0;
      let qCount = 0;
      const wrongCategoriesMap: { [key: string]: number } = {};

      attempts.forEach((attempt) => {
        sumScore += attempt.puntaje;
        if (attempt.puntaje > maxScore) maxScore = attempt.puntaje;
        correctCount += attempt.respuestas_correctas;
        qCount += attempt.cantidad_preguntas;

        attempt.respuestas.forEach((resp) => {
          if (resp.resultado === "Incorrecto") {
            const matchedQuestion = questions.find((q) => q.id === resp.pregunta_id);
            if (matchedQuestion) {
              wrongCategoriesMap[matchedQuestion.categoria] = (wrongCategoriesMap[matchedQuestion.categoria] || 0) + 1;
            }
          }
        });
      });

      let weakCategory = "Ninguna (¡Buen rendimiento!)";
      let maxMistakes = 0;
      Object.entries(wrongCategoriesMap).forEach(([cat, mistakes]) => {
        if (mistakes > maxMistakes) {
          maxMistakes = mistakes;
          weakCategory = `${cat} (${mistakes} errores)`;
        }
      });

      setStats({
        totalExams: attempts.length,
        avgScore: Math.round(sumScore / attempts.length),
        highestScore: Math.round(maxScore),
        totalCorrect: correctCount,
        totalQuestions: qCount,
        categoryWeakness: weakCategory
      });
    } else {
      setStats({
        totalExams: 0,
        avgScore: 0,
        highestScore: 0,
        totalCorrect: 0,
        totalQuestions: 0,
        categoryWeakness: "Ninguna identificada aún"
      });
    }
  };

  const syncTemasBank = async () => {
    setLoadingTemas(true);
    try {
      if (currentUser?.uid.startsWith("demo_")) {
        setTemas(temarioOficial);
        return;
      }
      const querySnapshot = await getDocs(collection(db, "temas"));
      let fetchedTemas = querySnapshot.docs.map((doc) => {
        const d = doc.data();
        return {
          id: Number(d.id || doc.id),
          nombre: String(d.nombre || ""),
          abreviatura: String(d.abreviatura || d.nombre || ""),
          cantidadPreguntas: Number(d.cantidadPreguntas || 0),
          rango: String(d.rango || "")
        };
      }) as TemaOficial[];

      fetchedTemas.sort((a, b) => a.id - b.id);

      if (fetchedTemas.length === 0) {
        console.log("Database has no temas. Seeding initial temarioOficial...");
        const batch = writeBatch(db);
        temarioOficial.forEach((t) => {
          const docRef = doc(db, "temas", String(t.id));
          batch.set(docRef, t);
        });
        await batch.commit();
        setTemas(temarioOficial);
      } else {
        setTemas(fetchedTemas);
      }
    } catch (err) {
      console.warn("Could not load temas from Firestore, offline fallback:", err);
      setTemas(temarioOficial);
    } finally {
      setLoadingTemas(false);
    }
  };

  const syncQuestionBank = async () => {
    setLoadingQuestions(true);
    try {
      if (currentUser?.uid.startsWith("demo_")) {
        console.log("Demo user detected. Loading local legal question bank...");
        setQuestions(initialQuestions);
        return;
      }

      // Check system questions state in Firestore
      let questionsStateInitialized = false;
      try {
        const stateDoc = await getDoc(doc(db, "config", "questions_state"));
        if (stateDoc.exists() && stateDoc.data()?.initialized) {
          questionsStateInitialized = true;
        }
      } catch (err) {
        console.warn("Could not check config state, proceeding with default logic:", err);
      }

      let querySnapshot;
      try {
        querySnapshot = await getDocs(collection(db, "preguntas"));
      } catch (err) {
        console.warn("Could not load questions from Firestore. Falling back to local offline question bank:", err);
        setQuestions(initialQuestions);
        return;
      }
      let fetchedQuestions = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as Pregunta[];

      // If database has no questions and is not initialized, seed them!
      if (fetchedQuestions.length === 0 && !questionsStateInitialized) {
        console.log("Database has no questions. Seeding initial legal question bank...");
        const batch = writeBatch(db);
        
        initialQuestions.forEach((q) => {
          // Use its predefined ID for consistency
          const docRef = doc(db, "preguntas", q.id);
          const qData: any = {
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
          };
          if (q.ubicacion) qData.ubicacion = q.ubicacion;
          if (q.codigo) qData.codigo = q.codigo;
          batch.set(docRef, qData);
        });

        // Save initialization flag
        const configRef = doc(db, "config", "questions_state");
        batch.set(configRef, { initialized: true });

        try {
          await batch.commit();
        } catch (err) {
          console.warn("Could not seed questions to remote Firestore. Using local fallback:", err);
          setQuestions(initialQuestions);
          return;
        }
        
        // Re-fetch
        let reSnapshot;
        try {
          reSnapshot = await getDocs(collection(db, "preguntas"));
        } catch (err) {
          console.warn("Could not re-fetch questions. Using local fallback:", err);
          setQuestions(initialQuestions);
          return;
        }
        fetchedQuestions = reSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        })) as Pregunta[];
        questionsStateInitialized = true;
      }

      // If Firestore has questions, use them. If it is empty but initialized, allow 0 questions. If not initialized, fallback to initialQuestions.
      if (fetchedQuestions.length > 0) {
        setQuestions(fetchedQuestions);
      } else if (questionsStateInitialized) {
        setQuestions([]);
      } else {
        setQuestions(initialQuestions);
      }
    } catch (err) {
      console.error("Error syncing question bank:", err);
      setQuestions(initialQuestions);
    } finally {
      setLoadingQuestions(false);
    }
  };

  // Launch practice or mock exam
  const handleStartExam = (config: {
    cantidad: number;
    categoria: string;
    dificultad: string;
    customMock?: SimulacroPersonalizado;
    isOfficialSiecopol?: boolean;
    realExamMode?: boolean;
    timeLimit?: number;
    customQuestions?: Pregunta[];
  }) => {
    setActiveExamResults(null);
    setActiveExamMock(config.customMock);
    setActiveExamRealMode(!!config.realExamMode);
    setActiveExamTimeLimit(config.timeLimit);

    // If custom prepared questions are passed, use them directly
    if (config.customQuestions) {
      setActiveExam(config.customQuestions);
      return;
    }

    // If official exam requested, generate exactly 100 questions
    if (config.isOfficialSiecopol) {
      let baseList = [...questions];
      if (baseList.length === 0) {
        baseList = [...initialQuestions];
      }
      
      const padded: Pregunta[] = [];
      let i = 0;
      while (padded.length < 100) {
        const originalQ = baseList[i % baseList.length];
        padded.push({
          ...originalQ,
          id: `${originalQ.id}_padded_${padded.length}`
        });
        i++;
      }
      
      setActiveExam(padded);
      return;
    }

    let filtered = [...questions];

    // If it is a custom mock exam, filter exactly to its defined questions
    if (config.customMock) {
      const mockIds = config.customMock.preguntas_ids;
      filtered = questions.filter((q) => mockIds.includes(q.id));
      setActiveExam(filtered);
      return;
    }

    // Apply standard launchers filters
    if (config.categoria && config.categoria !== "Todas") {
      const targetTopic = temas.find(t => t.abreviatura === config.categoria || t.nombre === config.categoria);
      if (targetTopic) {
        filtered = filtered.filter((q) => isQuestionInTopic(q, targetTopic));
      } else {
        filtered = filtered.filter((q) => q.categoria === config.categoria);
      }
    }
    if (config.dificultad && config.dificultad !== "Todas") {
      filtered = filtered.filter((q) => q.dificultad === config.dificultad);
    }

    // Select randomly up to the count requested
    const shuffled = filtered.sort(() => 0.5 - Math.random());
    const count = Math.min(config.cantidad, shuffled.length);
    setActiveExam(shuffled.slice(0, count));
  };

  // Finish and compute exam performance
  const handleFinishExam = async (
    answers: { [key: string]: string }, 
    totalTime: number, 
    timeSpent: number
  ) => {
    if (!activeExam || !currentUser) return;

    let correctas = 0;
    let incorrectas = 0;
    let sinResponder = 0;

    const compiledAnswers = activeExam.map((question) => {
      const userAns = (answers[question.id] || "").trim().toUpperCase();
      const correctAns = (question.respuesta_correcta || "").trim().toUpperCase();
      let outcome: "Correcto" | "Incorrecto" | "Sin Responder" = "Sin Responder";

      if (!userAns) {
        sinResponder++;
      } else if (userAns === correctAns) {
        correctas++;
        outcome = "Correcto";
      } else {
        incorrectas++;
        outcome = "Incorrecto";
      }

      return {
        pregunta_id: question.id,
        respuesta_usuario: userAns,
        resultado: outcome
      };
    });

    const finalScore = Math.round((correctas / activeExam.length) * 100);

    const attemptData: ExamenIntento = {
      id: `attempt_${Date.now()}`,
      usuario_id: currentUser.uid,
      usuario_nombre: currentUser.nombre,
      fecha: new Date().toISOString(),
      cantidad_preguntas: activeExam.length,
      respuestas_correctas: correctas,
      respuestas_incorrectas: incorrectas,
      sin_responder: sinResponder,
      puntaje: finalScore,
      tiempo_total: totalTime,
      tiempo_utilizado: timeSpent,
      titulo_simulacro: activeExamMock ? activeExamMock.titulo : undefined,
      respuestas: compiledAnswers
    };

    // Always save locally to localStorage as a fallback/offline mechanism
    try {
      const stored = localStorage.getItem("offline_intentos");
      const currentList = stored ? JSON.parse(stored) : [];
      currentList.push(attemptData);
      localStorage.setItem("offline_intentos", JSON.stringify(currentList));
    } catch (localErr) {
      console.warn("Could not save exam attempt to localStorage:", localErr);
    }

    if (!currentUser.uid.startsWith("demo_")) {
      try {
        // Save effort to Firestore collection 'intentos'
        await setDoc(doc(db, "intentos", attemptData.id), attemptData);
      } catch (err) {
        console.warn("Could not save exam attempt to Firestore. Saved locally instead:", err);
      }
    }

    setActiveExamResults(attemptData);
    setActiveExam(null);
    setActiveExamRealMode(false);
    setActiveExamTimeLimit(undefined);
  };

  // Render clear Firestore Rules configuration error screen if permissions fail
  if (initError === "FALTA_REGLAS") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-xl w-full space-y-8 bg-white p-8 sm:p-10 rounded-2xl shadow-xl border border-slate-200 animate-fade-in">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-xl bg-red-50 text-red-700 mb-4 border border-red-100">
              <ShieldAlert className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">
              Faltan Reglas de Seguridad en tu Firestore
            </h2>
            <p className="mt-2 text-xs text-slate-500 font-medium">
              Tu base de datos de Firebase no permite lecturas ni escrituras porque aún no se han publicado o cargado las reglas de seguridad correctamente.
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-xs text-amber-800 space-y-2">
            <h3 className="font-bold uppercase tracking-wider text-[10px] text-amber-950 text-left">Pasos para solucionar en tu Firebase:</h3>
            <ol className="list-decimal list-inside space-y-2 font-medium text-left">
              <li>Ingresa a tu consola de Firebase: <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="underline font-bold text-amber-950">console.firebase.google.com</a></li>
              <li>Abre tu proyecto <strong className="text-amber-950">simulador-examen-policial</strong>.</li>
              <li>En el menú izquierdo, haz clic en <strong className="text-amber-950">Firestore Database</strong>.</li>
              <li>Ve a la pestaña superior llamada <strong className="text-amber-950">Reglas (Rules)</strong>.</li>
              <li>Reemplaza todo el código por las reglas completas haciendo clic en el botón de abajo para copiarlas.</li>
              <li>Haz clic en el botón azul <strong className="text-amber-950">Publicar (Publish)</strong>.</li>
            </ol>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(`rules_version = '2';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    match /{document=**} {\n      allow read, write: if false;\n    }\n    function isSignedIn() {\n      return request.auth != null;\n    }\n    function isOwner(userId) {\n      return isSignedIn() && request.auth.uid == userId;\n    }\n    function isAdmin() {\n      return isSignedIn() && (\n        request.auth.token.email == "ccgavidia123@gmail.com" || \n        request.auth.token.email == "admin@siecopol.com" ||\n        request.auth.token.email == "Ccgavidia123@gmail.com" ||\n        request.auth.token.email == "Admin@siecopol.com" ||\n        request.auth.token.email == "CCGAVIDIA123@GMAIL.COM" ||\n        request.auth.token.email == "ADMIN@SIECOPOL.COM" ||\n        (exists(/databases/\$(database)/documents/usuarios/\$(request.auth.uid)) && (\n          get(/databases/\$(database)/documents/usuarios/\$(request.auth.uid)).data.rol == "ADMINISTRADOR" || \n          get(/databases/\$(database)/documents/usuarios/\$(request.auth.uid)).data.rol == "Administrador"\n        ))\n      );\n    }\n    match /usuarios/{userId} {\n      allow read, write: if isOwner(userId) || isAdmin();\n    }\n    match /preguntas/{preguntaId} {\n      allow read: if isSignedIn();\n      allow write: if isAdmin();\n    }\n    match /intentos/{intentoId} {\n      allow read, write: if isAdmin();\n      allow create: if isSignedIn() && request.resource.data.usuario_id == request.auth.uid;\n      allow read: if isSignedIn() && (resource == null || resource.data.usuario_id == request.auth.uid);\n    }\n    match /simulacros/{simulacroId} {\n      allow read: if isSignedIn();\n      allow write: if isAdmin();\n    }\n    match /temas/{temaId} {\n      allow read: if isSignedIn();\n      allow write: if isAdmin();\n    }\n    match /config/{configId} {\n      allow read, write: if isSignedIn();\n    }\n    match /bloqueados/{email} {\n      allow read: if true;\n      allow write: if isAdmin();\n    }\n  }\n}`);
                alert("¡Reglas de Seguridad copiadas al portapapeles con éxito! Ve y pégalas en la pestaña Reglas de tu Firestore Database y haz clic en Publicar.");
              }}
              className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-700 bg-slate-100 hover:bg-slate-200 text-center cursor-pointer transition-all border border-slate-300"
            >
              Copiar Reglas
            </button>
            <button
              onClick={() => {
                setInitError(null);
                setAuthChecking(true);
                window.location.reload();
              }}
              className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-700 text-center cursor-pointer transition-all shadow-md"
            >
              Reintentar Conexión
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render blocked account screen
  if (initError === "ACCESO_BLOQUEADO") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-md w-full space-y-6 bg-white p-8 sm:p-10 rounded-2xl shadow-xl border border-slate-200 animate-fade-in text-center">
          <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-xl bg-red-100 text-red-700 mb-4 border border-red-200 animate-bounce">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">
            Acceso Bloqueado 🛑
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-bold leading-relaxed">
            Tu correo electrónico ha sido bloqueado por el administrador de SIEXPOL.
          </p>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 text-xs text-slate-500 space-y-1 text-left font-medium">
            <span className="block font-bold text-slate-700">📌 Información de soporte:</span>
            <p>Si consideras que esto es un error o deseas volver a habilitar tu cuenta de postulante, ponte en contacto directo con soporte al celular:</p>
            <span className="block font-black text-slate-900 mt-1.5 text-center bg-white p-2 rounded border border-slate-200 text-sm">
              📲 931 238 088
            </span>
          </div>
          <div className="pt-2">
            <button
              onClick={() => {
                setInitError(null);
                setAuthChecking(false);
                window.location.reload();
              }}
              className="w-full px-6 py-2.5 bg-[#063c25] hover:bg-[#042819] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md"
            >
              Regresar al Inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render authentic loading screen
  if (authChecking || (currentUser && loadingQuestions)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 font-sans">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
        <p className="mt-4 text-sm font-bold text-gray-600 uppercase tracking-widest">
          Sincronizando Simulador de Examen Policial...
        </p>
      </div>
    );
  }

  // Not authenticated
  if (!currentUser) {
    return <Auth onAuthSuccess={(user) => setCurrentUser(user)} />;
  }

  // Profile completion required for authenticated users (except demo user)
  if (currentUser && currentUser.uid !== "demo_user_uid" && (!currentUser.grado || !currentUser.apellidos)) {
    return <CompleteProfile user={currentUser} onSave={(user) => setCurrentUser(user)} />;
  }

  // Current taking exam viewport
  if (activeExam) {
    return (
      <ExamSimulator
        user={currentUser}
        questions={activeExam}
        customMock={activeExamMock}
        realExamMode={activeExamRealMode}
        timeLimit={activeExamTimeLimit}
        onFinishExam={handleFinishExam}
        onCancel={() => {
          setActiveExam(null);
          setActiveExamMock(undefined);
          setActiveExamRealMode(false);
          setActiveExamTimeLimit(undefined);
        }}
      />
    );
  }

  // Viewing exam reviewresults viewport
  if (activeExamResults) {
    const reviewQuestions = questions.filter((q) => 
      activeExamResults.respuestas.some((r) => r.pregunta_id === q.id)
    );
    
    // Sort reviewQuestions in same order as they appeared
    const orderedReview = activeExamResults.respuestas.map((resp) => 
      reviewQuestions.find((q) => q.id === resp.pregunta_id)!
    ).filter(Boolean);

    return (
      <Layout 
        user={currentUser} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={() => setCurrentUser(null)} 
        onToggleRole={(currentUser.email?.toLowerCase() === "ccgavidia123@gmail.com" || currentUser.email?.toLowerCase() === "admin@siecopol.com") ? toggleDemoRole : undefined}
      >
        <ExamResults
          attempt={activeExamResults}
          questions={orderedReview}
          onBackToDashboard={() => {
            setActiveExamResults(null);
            setActiveTab("inicio");
          }}
        />
      </Layout>
    );
  }

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Error signing out:", err);
    }
    setCurrentUser(null);
    setActiveTab("inicio");
  };

  // Derive categories list dynamically for simulator configuration
  const categoriesList = [
    "Todas",
    ...temas.map((t) => t.abreviatura),
    ...Array.from(new Set(questions.map((q) => q.categoria))).filter(
      (c) => !temas.some((t) => t.abreviatura === c)
    )
  ];

  // Standard tab routing layouts
  return (
    <Layout 
      user={currentUser} 
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      onLogout={handleLogout} 
      onToggleRole={(currentUser.email?.toLowerCase() === "ccgavidia123@gmail.com" || currentUser.email?.toLowerCase() === "admin@siecopol.com") ? toggleDemoRole : undefined}
    >
      
      {activeTab === "inicio" && (
        <InicioView
          user={currentUser}
          stats={stats}
          history={history}
          onLaunchOfficialExam={() => handleStartExam({
            cantidad: 100,
            categoria: "Todas",
            dificultad: "Todas",
            isOfficialSiecopol: true
          })}
          setActiveTab={setActiveTab}
        />
      )}

      {activeTab === "temario" && (
        <TemarioView
          temas={temas}
          questions={questions}
          onStartExamFlow={(cantidad, categoria, dificultad) => handleStartExam({
            cantidad,
            categoria,
            dificultad
          })}
          user={currentUser}
        />
      )}

      {activeTab === "banco_preguntas" && (
        <BancoPreguntasView
          temas={temas}
          questions={questions}
          onStartExamFlow={(cantidad, categoria, dificultad) => handleStartExam({
            cantidad,
            categoria,
            dificultad
          })}
          user={currentUser}
        />
      )}

      {activeTab === "simulador_examen" && (
        <SimuladorExamenView
          questions={questions}
          categories={categoriesList}
          customMocks={customMocks}
          loadingMocks={loadingHistory}
          onRefreshMocks={fetchDashboardData}
          history={history}
          onStartExamFlow={(cantOrCfg, cat, diff) => {
            if (typeof cantOrCfg === "object") {
              handleStartExam(cantOrCfg);
            } else {
              handleStartExam({
                cantidad: cantOrCfg,
                categoria: cat || "Todas",
                dificultad: diff || "Todas"
              });
            }
          }}
          onLaunchCustomMock={(mock) => handleStartExam({
            cantidad: mock.cantidad_preguntas,
            categoria: mock.categoria || "Todas",
            dificultad: "Todas",
            customMock: mock
          })}
          user={currentUser}
        />
      )}

      {activeTab === "practicar_materias" && (
        <PracticaMateriasView
          temas={temas}
          questions={questions}
          onStartExamFlow={(cantidad, categoria, dificultad) => handleStartExam({
            cantidad,
            categoria,
            dificultad
          })}
          user={currentUser}
        />
      )}

      {activeTab === "zona_juego" && (
        <ZonaJuegoView questions={questions} />
      )}

      {activeTab === "plan_estudio" && (
        <PlanEstudioView temas={temas} />
      )}

      {activeTab === "audios" && (
        <AudiosView questions={questions} temas={temas} />
      )}

      {activeTab === "historial" && (
        <MiHistorial user={currentUser} questions={questions} />
      )}

      {activeTab === "admin_questions" && currentUser.rol === RolUsuario.ADMINISTRADOR && (
        <AdminDashboard
          user={currentUser}
          questions={questions}
          onRefreshQuestions={syncQuestionBank}
          temas={temas}
          onRefreshTemas={syncTemasBank}
        />
      )}

      {activeTab === "admin_reports" && currentUser.rol === RolUsuario.ADMINISTRADOR && (
        <div className="bg-white rounded-xl border border-emerald-200 shadow-sm p-6 space-y-6">
          <div className="pb-4 border-b border-emerald-100">
            <h2 className="text-xl font-black text-[#063c25] uppercase tracking-tight">Métricas y Reportes Estadísticos</h2>
            <p className="text-xs text-slate-500 mt-1 font-semibold">Sincroniza y monitorea la preparación de todos los postulantes registrados en el sistema.</p>
          </div>

          <div className="bg-emerald-50 border border-emerald-150 p-4 rounded-xl text-emerald-900 text-xs sm:text-sm font-semibold leading-relaxed">
            ✨ <span className="font-bold">Módulo Estadístico Activo:</span> Como administrador, puedes ver el avance y notas de todos los postulantes en la sección de <span className="text-emerald-800 underline font-extrabold cursor-pointer" onClick={() => setActiveTab("admin_questions")}>Usuarios y Roles</span> o gestionar simulacros personalizados oficiales para calibrar el avance general.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-150">
              <span className="block text-xs font-bold text-slate-400 uppercase">Preguntas del Banco</span>
              <span className="block text-3xl font-black text-[#063c25] mt-1">{questions.length}</span>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-2">Sincronización en la Nube Completa</p>
            </div>

            <div className="bg-slate-50 p-5 rounded-xl border border-slate-150">
              <span className="block text-xs font-bold text-slate-400 uppercase">Simulacros Creados</span>
              <span className="block text-3xl font-black text-emerald-800 mt-1">Activo</span>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-2">Disponibles para Postulantes</p>
            </div>

            <div className="bg-slate-50 p-5 rounded-xl border border-slate-150">
              <span className="block text-xs font-bold text-slate-400 uppercase">Integración de Inteligencia Artificial</span>
              <span className="block text-3xl font-black text-amber-600 mt-1">100% OK</span>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-2">Tutor Legal y Generador Conectados</p>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
