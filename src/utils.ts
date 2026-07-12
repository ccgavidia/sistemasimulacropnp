import { Pregunta } from "./types";
import { temarioOficial } from "./data/temarioOficial";

export const normalizeText = (str: string): string => {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
};

export const getMatchScore = (q: Pregunta, topic: any): number => {
  if (!q) return 0;
  let score = 0;

  const cat = q.categoria ? q.categoria.trim() : "";
  const tema = q.tema ? q.tema.trim() : "";
  const normCat = cat.toLowerCase();
  const normTema = tema.toLowerCase();

  const normAbbr = topic.abreviatura ? topic.abreviatura.toLowerCase().trim() : "";
  const normName = topic.nombre ? topic.nombre.toLowerCase().trim() : "";

  const topicIdStr = String(topic.id);

  // 1. Explicit Topic ID References like "Tema 1", "T1", "Balota 12"
  const topicRegexes = [
    new RegExp(`\\b(tema|balota|t|nro|nº)\\s*${topicIdStr}\\b`, "i"),
    new RegExp(`\\b${topicIdStr}\\s*(:|\\-|\\.)`, "i"), // e.g. "1: Constitución"
  ];

  const hasExplicitIdInCat = topicRegexes.some(r => r.test(cat)) || normCat === topicIdStr;
  const hasExplicitIdInTema = topicRegexes.some(r => r.test(tema)) || normTema === topicIdStr;

  if (hasExplicitIdInCat) {
    score += 150;
  } else if (hasExplicitIdInTema) {
    score += 130;
  }

  // 2. Exact Law/Decree/Resolution Number Matches (Highly Specific)
  const lawNumbers: { [key: number]: string[] } = {
    3: ["1267"],
    4: ["1149", "1230", "242", "30686", "31379"],
    5: ["1291", "013-17", "013-17-IN"],
    6: ["30714"],
    7: ["1318"],
    8: ["27806", "021-2019-jus"],
    10: ["27444"],
    11: ["957"],
    12: ["635"],
    13: ["1186", "012-2016-in"],
    14: ["1241"],
    15: ["1106"],
    16: ["30364"],
    17: ["30077", "1244"],
    18: ["009-2018", "010-2018", "009-2018-jus"],
    19: ["32130"],
    20: ["1611"],
    21: ["487-2018", "487-2018-in"],
    22: ["1428"]
  };

  const topicLawNums = lawNumbers[topic.id];
  if (topicLawNums) {
    const mentionsLawInCat = topicLawNums.some(num => normCat.includes(num));
    const mentionsLawInTema = topicLawNums.some(num => normTema.includes(num));
    if (mentionsLawInCat) {
      score += 100;
    } else if (mentionsLawInTema) {
      score += 80;
    }
  }

  // 3. Exact matches of category/theme with abbreviation or name
  const textCat = normalizeText(cat);
  const textTema = normalizeText(tema);
  const textAbbr = normalizeText(topic.abreviatura);
  const textName = normalizeText(topic.nombre);

  if (textCat && textAbbr && textCat === textAbbr) score += 60;
  if (textTema && textAbbr && textTema === textAbbr) score += 50;
  if (textCat && textName && textCat === textName) score += 45;
  if (textTema && textName && textTema === textName) score += 40;

  // 4. Partial matches (one contains the other)
  if (textCat && textAbbr && (textCat.includes(textAbbr) || textAbbr.includes(textCat))) score += 20;
  if (textTema && textAbbr && (textTema.includes(textAbbr) || textAbbr.includes(textTema))) score += 15;
  if (textCat && textName && (textCat.includes(textName) || textName.includes(textCat))) score += 10;
  if (textTema && textName && (textTema.includes(textName) || textName.includes(textTema))) score += 5;

  return score;
};

const bestTopicCache = new Map<string, any>();

export const getBestTopicForQuestion = (q: Pregunta, availableTemas?: any[]): any => {
  if (!q) return null;

  const cacheKey = `${q.id || ""}_${q.categoria || ""}_${q.tema || ""}_${availableTemas?.length || 0}`;
  if (bestTopicCache.has(cacheKey)) {
    return bestTopicCache.get(cacheKey);
  }

  const temasToUse = availableTemas && availableTemas.length > 0 ? availableTemas : temarioOficial;
  let bestTopic = null;
  let maxScore = 0;

  temasToUse.forEach(topic => {
    const score = getMatchScore(q, topic);
    if (score > maxScore) {
      maxScore = score;
      bestTopic = topic;
    }
  });

  const result = maxScore >= 5 ? bestTopic : null;
  bestTopicCache.set(cacheKey, result);
  return result;
};

export const isQuestionInTopic = (q: Pregunta, topic: any, availableTemas?: any[]): boolean => {
  const best = getBestTopicForQuestion(q, availableTemas);
  return best ? best.id === topic.id : false;
};

export const getRowValue = (row: any, possibleKeys: string[]): any => {
  const normalizedPossibles = possibleKeys.map(k => normalizeText(k));
  // Iterate through the requested keys in PRIORITY order!
  for (const possible of normalizedPossibles) {
    for (const rowKey of Object.keys(row)) {
      const normRowKey = normalizeText(rowKey);
      if (normRowKey === possible) {
        return row[rowKey];
      }
    }
  }
  return undefined;
};
