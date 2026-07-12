export interface TemaOficial {
  id: number;
  nombre: string;
  abreviatura: string; // short name for tags or categories
  cantidadPreguntas: number;
  rango: string;
}

export const temarioOficial: TemaOficial[] = [
  {
    id: 1,
    nombre: "Constitución Política del Perú (Texto actualizado con modificatorias Ley 31988 del 20MAY2024)",
    abreviatura: "Constitución Política",
    cantidadPreguntas: 100,
    rango: "1 - 100"
  },
  {
    id: 2,
    nombre: "Declaración Universal de los Derechos Humanos",
    abreviatura: "Derechos Humanos",
    cantidadPreguntas: 15,
    rango: "101 - 115"
  },
  {
    id: 3,
    nombre: "Ley de la PNP - Decreto Legislativo N° 1267 y modificatorias (DL 1318 y DL N° 1451)",
    abreviatura: "Ley de la PNP",
    cantidadPreguntas: 90,
    rango: "116 - 205"
  },
  {
    id: 4,
    nombre: "Decreto Legislativo N° 1149 - Ley de la Carrera y Situación del Personal PNP y modificatorias (DL N° 1230, DL N° 242, Ley 30686 y Ley N° 31379)",
    abreviatura: "Ley de la Carrera PNP",
    cantidadPreguntas: 110,
    rango: "206 - 315"
  },
  {
    id: 5,
    nombre: "Decreto Legislativo N° 1291 - Ley de Lucha contra la Corrupción en el Sector Interior y Reglamento DS N° 013-17-IN (modif. DS N° 001-2019-IN)",
    abreviatura: "Lucha contra Corrupción",
    cantidadPreguntas: 50,
    rango: "316 - 365"
  },
  {
    id: 6,
    nombre: "Ley N° 30714 - Ley de Régimen Disciplinario de la Policía Nacional del Perú",
    abreviatura: "Régimen Disciplinario PNP",
    cantidadPreguntas: 125,
    rango: "366 - 490"
  },
  {
    id: 7,
    nombre: "Decreto Legislativo N° 1318 - Ley que regula la Formación Profesional de la Policía Nacional del Perú",
    abreviatura: "Formación Profesional PNP",
    cantidadPreguntas: 40,
    rango: "491 - 530"
  },
  {
    id: 8,
    nombre: "TUO de la Ley 27806 - Ley de Transparencia y Acceso a la Información Pública (DS 021-2019-JUS)",
    abreviatura: "Transparencia e Información",
    cantidadPreguntas: 60,
    rango: "531 - 590"
  },
  {
    id: 9,
    nombre: "Ley que regula los Procesos de Ascensos del Personal de la Policía Nacional del Perú",
    abreviatura: "Ley de Ascensos PNP",
    cantidadPreguntas: 40,
    rango: "591 - 630"
  },
  {
    id: 10,
    nombre: "Ley N° 27444 - Ley del Procedimiento Administrativo General",
    abreviatura: "Procedimiento Administrativo",
    cantidadPreguntas: 120,
    rango: "631 - 750"
  },
  {
    id: 11,
    nombre: "Decreto Legislativo N° 957 - Código Procesal Penal y modificatorias",
    abreviatura: "Código Procesal Penal",
    cantidadPreguntas: 170,
    rango: "751 - 920"
  },
  {
    id: 12,
    nombre: "Decreto Legislativo N° 635 - Código Penal y modificatorias (No incluye penas)",
    abreviatura: "Código Penal",
    cantidadPreguntas: 170,
    rango: "921 - 1090"
  },
  {
    id: 13,
    nombre: "Decreto Legislativo N° 1186 - Ley que regula el Uso de la Fuerza por parte de la PNP, modificatorias y Reglamento DS N° 012-2016-IN",
    abreviatura: "Uso de la Fuerza PNP",
    cantidadPreguntas: 45,
    rango: "1091 - 1135"
  },
  {
    id: 14,
    nombre: "Decreto Legislativo N° 1241 - Lucha contra el Tráfico Ilícito de Drogas",
    abreviatura: "Tráfico Ilícito de Drogas",
    cantidadPreguntas: 45,
    rango: "1136 - 1180"
  },
  {
    id: 15,
    nombre: "Decreto Legislativo N° 1106 - Lucha Eficaz contra el Lavado de Activos, Minería Ilegal y Crimen Organizado",
    abreviatura: "Lavado de Activos",
    cantidadPreguntas: 50,
    rango: "1181 - 1230"
  },
  {
    id: 16,
    nombre: "Ley N° 30364 - Ley para Prevenir, Sancionar y Erradicar la Violencia contra las Mujeres y los Integrantes del Grupo Familiar",
    abreviatura: "Violencia Familiar",
    cantidadPreguntas: 50,
    rango: "1231 - 1280"
  },
  {
    id: 17,
    nombre: "Ley N° 30077 - Ley contra el Crimen Organizado y modificatorias (DL N° 1244)",
    abreviatura: "Crimen Organizado",
    cantidadPreguntas: 25,
    rango: "1281 - 1305"
  },
  {
    id: 18,
    nombre: "Decreto Supremo N° 009-2018-JUS - Protocolos de Actuación Interinstitucional para Proceso Inmediato y DS N° 010-2018-JUS (Código Procesal Penal)",
    abreviatura: "Protocolos Procesales",
    cantidadPreguntas: 25,
    rango: "1306 - 1330"
  },
  {
    id: 19,
    nombre: "Ley N° 32130 - Ley que modifica el Código Procesal Penal para fortalecer la Investigación del Delito como Función de la PNP",
    abreviatura: "Función de Investigación PNP",
    cantidadPreguntas: 45,
    rango: "1331 - 1375"
  },
  {
    id: 20,
    nombre: "Decreto Legislativo N° 1611 - Medidas Especiales para la Prevención e Investigación del Delito de Extorsión y Conexos",
    abreviatura: "Lucha contra Extorsión",
    cantidadPreguntas: 25,
    rango: "1376 - 1400"
  },
  {
    id: 21,
    nombre: "Derechos Humanos Aplicados a la Función Policial (Resolución Ministerial N° 487-2018-IN)",
    abreviatura: "DDHH Función Policial",
    cantidadPreguntas: 75,
    rango: "1401 - 1475"
  },
  {
    id: 22,
    nombre: "Decreto Legislativo N° 1428 - Atención de Casos de Desaparición de Personas en Situación de Vulnerabilidad",
    abreviatura: "Desaparición de Personas",
    cantidadPreguntas: 25,
    rango: "1476 - 1500"
  }
];
