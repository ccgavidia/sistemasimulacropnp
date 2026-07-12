export enum RolUsuario {
  ADMINISTRADOR = "Administrador",
  USUARIO = "Usuario"
}

export interface Usuario {
  uid: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
  fecha_registro: string;
  accesoCompleto?: boolean;
  apellidos?: string;
  grado?: string;
}

export interface Pregunta {
  id: string; // Firestore doc ID or custom
  categoria: string; // e.g., Constitución, Ley PNP, DDHH, Procesal Penal, etc.
  tema: string; // Specific topic
  pregunta: string;
  alternativa_a: string;
  alternativa_b: string;
  alternativa_c: string;
  alternativa_d: string;
  alternativa_e: string;
  respuesta_correcta: "A" | "B" | "C" | "D" | "E";
  explicacion: string;
  dificultad: "Fácil" | "Medio" | "Difícil";
  ubicacion?: string;
  codigo?: string;
}

export interface ExamenIntento {
  id: string;
  usuario_id: string;
  usuario_nombre: string;
  fecha: string;
  cantidad_preguntas: number;
  respuestas_correctas: number;
  respuestas_incorrectas: number;
  sin_responder: number;
  puntaje: number; // Percentage or scale (e.g. 0-20 or 0-100)
  tiempo_total: number; // in seconds
  tiempo_utilizado: number; // in seconds
  titulo_simulacro?: string; // If it was a custom mock exam
  // We can embed the answers here or in a subcollection
  respuestas: {
    pregunta_id: string;
    respuesta_usuario: string; // "A" | "B" | "C" | "D" | "E" | ""
    resultado: "Correcto" | "Incorrecto" | "Sin Responder";
  }[];
}

export interface SimulacroPersonalizado {
  id: string;
  titulo: string;
  descripcion: string;
  categoria?: string;
  cantidad_preguntas: number;
  tiempo_limite: number; // in minutes
  creado_por: string; // Admin uid
  fecha_creacion: string;
  preguntas_ids: string[]; // List of specific question IDs
}
