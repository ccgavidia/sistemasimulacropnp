import React, { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Usuario } from "../types";
import { User, GraduationCap, ShieldCheck, ShieldAlert } from "lucide-react";

interface CompleteProfileProps {
  user: Usuario;
  onSave: (updatedUser: Usuario) => void;
}

export default function CompleteProfile({ user, onSave }: CompleteProfileProps) {
  const [nombre, setNombre] = useState(user.nombre || "");
  const [apellidos, setApellidos] = useState(user.apellidos || "");
  const [grado, setGrado] = useState(user.grado || "S3");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!nombre.trim()) {
      setError("El nombre es requerido.");
      setLoading(false);
      return;
    }
    if (!apellidos.trim()) {
      setError("Los apellidos son requeridos.");
      setLoading(false);
      return;
    }

    const updatedUser: Usuario = {
      ...user,
      nombre: nombre.trim(),
      apellidos: apellidos.trim(),
      grado: grado,
    };

    try {
      await setDoc(doc(db, "usuarios", user.uid), updatedUser, { merge: true });
      onSave(updatedUser);
    } catch (err: any) {
      console.error("Error saving completed profile:", err);
      setError(err.message || "No se pudo actualizar la información del perfil.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8 font-sans" id="complete_profile_container">
      <div className="max-w-md w-full space-y-8 bg-white p-8 sm:p-10 rounded-2xl shadow-xl border border-slate-200">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-xl bg-emerald-50 text-emerald-800 mb-4 border border-emerald-100">
            <ShieldCheck className="h-7 w-7 animate-pulse" />
          </div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase" id="complete_profile_title">
            Completa tu Perfil Policial
          </h2>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            Por favor, ingresa tus datos reales para personalizar tus simulacros y actas de examen.
          </p>
        </div>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit} id="complete_profile_form">
          {error && (
            <div className="bg-red-50 border border-red-200 p-3.5 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-red-500 shrink-0" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Nombre(s)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <User className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  required
                  className="pl-9 block w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#063c25] focus:border-[#063c25] text-xs font-medium"
                  placeholder="Ej. Juan Edgar"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  id="complete_input_nombre"
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
                  className="pl-9 block w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#063c25] focus:border-[#063c25] text-xs font-medium"
                  placeholder="Ej. Alcántara Pérez"
                  value={apellidos}
                  onChange={(e) => setApellidos(e.target.value)}
                  id="complete_input_apellidos"
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
                  className="pl-9 block w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#063c25] focus:border-[#063c25] text-xs font-medium appearance-none"
                  value={grado}
                  onChange={(e) => setGrado(e.target.value)}
                  id="complete_select_grado"
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
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent text-xs font-bold uppercase tracking-wider rounded-xl text-white bg-emerald-800 hover:bg-emerald-900 cursor-pointer transition-all disabled:bg-slate-400 disabled:cursor-not-allowed shadow-md"
              id="btn_complete_submit"
            >
              {loading ? "GUARDANDO..." : "COMPLETAR REGISTRO"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
