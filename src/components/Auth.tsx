import React, { useState } from "react";
import { auth, db } from "../firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { KeyRound, Mail, User, ShieldAlert, GraduationCap, ShieldCheck } from "lucide-react";
import { RolUsuario, Usuario } from "../types";

interface AuthProps {
  onAuthSuccess: (user: Usuario) => void;
}

export default function Auth({ onAuthSuccess }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [grado, setGrado] = useState("S3");
  const [rol, setRol] = useState<RolUsuario>(RolUsuario.USUARIO);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const checkAndElevateUser = async (uid: string, data: Usuario): Promise<Usuario> => {
    const emailLower = (data.email || "").toLowerCase().trim();
    const isAdminEmail = emailLower === "ccgavidia123@gmail.com";
    if (isAdminEmail && (data.rol !== RolUsuario.ADMINISTRADOR || data.accesoCompleto !== true)) {
      const elevatedUser: Usuario = {
        ...data,
        rol: RolUsuario.ADMINISTRADOR,
        accesoCompleto: true,
        nombre: data.nombre.includes("ADMINISTRADOR") ? data.nombre : `S2 PNP ${data.nombre.toUpperCase()} (ADMINISTRADOR)`
      };
      try {
        await setDoc(doc(db, "usuarios", uid), elevatedUser);
      } catch (err) {
        console.warn("Error saving elevated admin role in database:", err);
      }
      return elevatedUser;
    }
    return data;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isLogin) {
        // Sign in
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;
        
        // Fetch user doc
        const userDocRef = doc(db, "usuarios", uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const elevated = await checkAndElevateUser(uid, userDoc.data() as Usuario);
          onAuthSuccess(elevated);
        } else {
          // If profile missing, create a default Usuario/Admin role
          const emailLower = email.toLowerCase().trim();
          const isAdmin = emailLower === "ccgavidia123@gmail.com";
          const defaultUser: Usuario = {
            uid,
            nombre: isAdmin ? "CORONEL PNP CCGAVIDIA (ADMINISTRADOR)" : email.split("@")[0],
            email,
            rol: isAdmin ? RolUsuario.ADMINISTRADOR : RolUsuario.USUARIO,
            fecha_registro: new Date().toISOString(),
            accesoCompleto: isAdmin ? true : false
          };
          await setDoc(userDocRef, defaultUser);
          onAuthSuccess(defaultUser);
        }
      } else {
        // Sign up
        if (!nombre.trim()) {
          throw new Error("El nombre es requerido.");
        }
        if (!apellidos.trim()) {
          throw new Error("Los apellidos son requeridos.");
        }
        if (!grado.trim()) {
          throw new Error("El grado es requerido.");
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;

        const emailLower = email.toLowerCase().trim();
        const isAdmin = emailLower === "ccgavidia123@gmail.com";
        const newUser: Usuario = {
          uid,
          nombre,
          apellidos,
          grado,
          email,
          rol: isAdmin ? RolUsuario.ADMINISTRADOR : rol,
          fecha_registro: new Date().toISOString(),
          accesoCompleto: isAdmin ? true : false
        };

        // Save in Firestore
        await setDoc(doc(db, "usuarios", uid), newUser);
        onAuthSuccess(newUser);
      }
    } catch (err: any) {
      console.error(err);
      let errorMsg = "Ocurrió un error inesperado.";
      if (err?.message?.includes("permissions") || err?.message?.includes("permisos") || err?.code === "permission-denied") {
        errorMsg = "Error de permisos de Firestore: Asegúrate de haber copiado, pegado y publicado (hacer clic en el botón 'Publicar') las reglas de seguridad correctamente en tu consola de Firebase (Firestore Database -> pestaña Reglas).";
      } else if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        errorMsg = "Correo o contraseña incorrectos.";
      } else if (err.code === "auth/email-already-in-use") {
        errorMsg = "El correo ya se encuentra registrado.";
      } else if (err.code === "auth/weak-password") {
        errorMsg = "La contraseña debe tener al menos 6 caracteres.";
      } else if (err.code === "auth/operation-not-allowed") {
        errorMsg = "El inicio de sesión por correo/contraseña no está activado en tu consola de Firebase. Por favor, actívalo en Authentication -> Sign-in method o utiliza 'Iniciar con Google'.";
      } else if (err.message) {
        errorMsg = err.message;
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const uid = userCredential.user.uid;
      const email = userCredential.user.email || "";

      // Fetch user doc to see if it exists
      const userDocRef = doc(db, "usuarios", uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const elevated = await checkAndElevateUser(uid, userDoc.data() as Usuario);
        onAuthSuccess(elevated);
      } else {
        // If missing, create a default user profile
        const emailLower = email.toLowerCase().trim();
        const isAdmin = emailLower === "ccgavidia123@gmail.com";
        
        let parsedNombre = "Postulante";
        let parsedApellidos = "";
        
        if (userCredential.user.displayName) {
          const parts = userCredential.user.displayName.trim().split(/\s+/);
          if (parts.length > 1) {
            // Split into name (first parts) and surname (last part or last two parts if typical)
            parsedNombre = parts.slice(0, Math.max(1, parts.length - 1)).join(" ");
            parsedApellidos = parts.slice(Math.max(1, parts.length - 1)).join(" ");
          } else if (parts.length === 1) {
            parsedNombre = parts[0];
          }
        } else if (email) {
          parsedNombre = email.split("@")[0].toUpperCase();
        }

        const newUser: Usuario = {
          uid,
          nombre: isAdmin ? "CORONEL PNP CCGAVIDIA (ADMINISTRADOR)" : parsedNombre,
          apellidos: parsedApellidos,
          email,
          rol: isAdmin ? RolUsuario.ADMINISTRADOR : rol, // Use currently selected role
          fecha_registro: new Date().toISOString(),
          accesoCompleto: isAdmin ? true : false
        };
        await setDoc(userDocRef, newUser);
        onAuthSuccess(newUser);
      }
    } catch (err: any) {
      console.error(err);
      let errorMsg = "Error al iniciar sesión con Google.";
      if (err?.message?.includes("permissions") || err?.message?.includes("permisos") || err?.code === "permission-denied") {
        errorMsg = "Error de permisos de Firestore: Asegúrate de haber copiado, pegado y publicado (hacer clic en el botón 'Publicar') las reglas de seguridad correctamente en tu consola de Firebase (Firestore Database -> pestaña Reglas).";
      } else if (err.code === "auth/operation-not-allowed") {
        errorMsg = "El proveedor de inicio de sesión de Google no está activado en tu consola de Firebase. Por favor, actívalo en Authentication -> Sign-in method.";
      } else if (err.code === "auth/unauthorized-domain" || (err.message && err.message.includes("unauthorized-domain"))) {
        errorMsg = "Este dominio (simuladorexamenpnp.ai.studio) no está autorizado para Google Sign-In en Firebase por limitaciones de permisos del sandbox. Por favor, regístrate / inicia sesión usando Correo y Contraseña (que sí funciona aquí), o utiliza la URL de previsualización (ais-pre-...) donde Google Sign-In sí está autorizado.";
      } else if (err.message) {
        errorMsg = err.message;
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8 font-sans" id="auth_container">
      <div className="max-w-md w-full space-y-8 bg-white p-8 sm:p-10 rounded-2xl shadow-xl border border-slate-200">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-xl bg-slate-100 text-slate-700 mb-4 border border-slate-200">
            <GraduationCap className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase" id="auth_title">
            SIECOPOL 2026
          </h2>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            {isLogin 
              ? "Simulador de Examen de Ascenso para Suboficiales de Armas y Servicios" 
              : "Crea tu cuenta de estudio policial"}
          </p>
        </div>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit} id="auth_form">
          {error && (
            <div className="bg-red-50 border border-red-200 p-3.5 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-red-500 shrink-0" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          <div className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Nombre(s)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                      <User className="h-4 w-4" />
                    </span>
                    <input
                      type="text"
                      required
                      className="pl-9 block w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 text-xs font-medium"
                      placeholder="Ej. Juan Edgar"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      id="input_nombre"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Apellidos</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                      <User className="h-4 w-4" />
                    </span>
                    <input
                      type="text"
                      required
                      className="pl-9 block w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 text-xs font-medium"
                      placeholder="Ej. Alcántara Pérez"
                      value={apellidos}
                      onChange={(e) => setApellidos(e.target.value)}
                      id="input_apellidos"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Grado Policial Actual</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                      <GraduationCap className="h-4 w-4" />
                    </span>
                    <select
                      required
                      className="pl-9 block w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 text-xs font-medium appearance-none"
                      value={grado}
                      onChange={(e) => setGrado(e.target.value)}
                      id="select_grado"
                    >
                      <option value="S3">S3 (Suboficial de Tercera)</option>
                      <option value="S2">S2 (Suboficial de Segunda)</option>
                      <option value="S1">S1 (Suboficial de Primera)</option>
                      <option value="ST3">ST3 (Suboficial Técnico de Tercera)</option>
                      <option value="ST2">ST2 (Suboficial Técnico de Segunda)</option>
                      <option value="ST1">ST1 (Suboficial Técnico de Primera)</option>
                      <option value="SB">SB (Suboficial Brigadier)</option>
                      <option value="SS">SS (Suboficial Superior)</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Correo Electrónico Institucional / Personal</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  type="email"
                  required
                  className="pl-9 block w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 text-xs font-medium"
                  placeholder="ejemplo@pnp.gob.pe o personal"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  id="input_email"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Contraseña</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <KeyRound className="h-4 w-4" />
                </span>
                <input
                  type="password"
                  required
                  className="pl-9 block w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 text-xs font-medium"
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  id="input_password"
                />
              </div>
            </div>


          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent text-xs font-bold uppercase tracking-wider rounded-xl text-white bg-slate-900 hover:bg-slate-800 cursor-pointer transition-all disabled:bg-slate-400 disabled:cursor-not-allowed shadow-md"
              id="btn_auth_submit"
            >
              {loading ? "PROCESANDO..." : isLogin ? "INICIAR SESIÓN" : "CREAR CUENTA"}
            </button>
          </div>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-4 text-slate-400 text-[10px] font-black uppercase tracking-wider">O también</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          <div>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-slate-200 text-xs font-bold uppercase tracking-wider rounded-xl text-slate-700 bg-white hover:bg-slate-50 cursor-pointer transition-all disabled:bg-slate-100 disabled:cursor-not-allowed shadow-sm"
              id="btn_auth_google"
            >
              <svg className="h-4 w-4 mr-1 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.53-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l3.245-3.123C18.245 1.83 15.485 1 12.24 1 5.48 1 0 6.48 0 13.2s5.48 12.2 12.24 12.2c7.055 0 11.75-4.96 11.75-11.96 0-.805-.085-1.42-.19-1.926H12.24z"
                />
              </svg>
              INICIAR CON GOOGLE
            </button>
          </div>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-4 text-slate-400 text-[10px] font-black uppercase tracking-wider">O Modo Demo</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          <div>
            <button
              type="button"
              onClick={() => onAuthSuccess({
                uid: "demo_user_uid",
                nombre: "EDGAR ALEJANDRO",
                apellidos: "ALCANTARA PEREZ (POLICIA)",
                grado: "S2",
                email: "postulante@siecopol.com",
                rol: RolUsuario.USUARIO,
                fecha_registro: new Date().toISOString()
              })}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-dashed border-emerald-300 text-xs font-black uppercase tracking-wider rounded-xl text-emerald-800 bg-emerald-50/50 hover:bg-emerald-50 cursor-pointer transition-all disabled:bg-slate-100 disabled:cursor-not-allowed"
              id="btn_auth_demo"
            >
              INGRESAR COMO INVITADO (DEMO)
            </button>
          </div>

        </form>

        <div className="text-center mt-6">
          <button
            type="button"
            className="text-xs text-slate-500 hover:text-slate-800 font-bold transition-all cursor-pointer"
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
            }}
            id="toggle_auth_mode"
          >
            {isLogin 
              ? "¿No tienes una cuenta? Regístrate aquí" 
              : "¿Ya tienes cuenta? Inicia sesión aquí"}
          </button>
        </div>
      </div>
    </div>
  );
}
