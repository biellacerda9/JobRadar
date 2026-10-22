import {
  curriculoComparacaoSchema,
  type CurriculoComparacao,
} from "./curriculoComparacao.schema.js";
import { chatJson } from "./ollamaClient.js";

const MAX_ATTEMPTS = 2;

export class CurriculoComparacaoError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "CurriculoComparacaoError";
  }
}

const SYSTEM_PROMPT = `Você compara um currículo com uma vaga de emprego, ambos em português.
Receberá o texto bruto do currículo e, em seguida, o texto da vaga, separados por
"---VAGA---". Responda SOMENTE com um JSON válido no seguinte formato, sem nenhum
texto fora do JSON:

{
  "score": number (0 a 100, o quão aderente o currículo está à vaga),
  "pontos_fortes": string[] (pontos do currículo que atendem bem a vaga),
  "pontos_a_melhorar": string[] (lacunas do currículo em relação a essa vaga específica),
  "sugestoes": [{ "secao": string, "sugestao": string }] (ajustes concretos e acionáveis,
    por seção/bullet do currículo, pra aumentar a aderência a essa vaga)
}

Seja específico: cite tecnologias, requisitos ou palavras-chave da vaga que o currículo
atende ou não atende, em vez de avaliações genéricas.`;

/**
 * Calls the local LLM (Ollama) to compare a resume's raw text against a pasted job
 * description, returning an adherence score plus structured suggestions. Same
 * retry-once pattern as curriculoAnalyzer — local models are less reliable at
 * structured output than hosted APIs.
 */
export async function compararCurriculoComVaga(
  rawContent: string,
  vagaTexto: string,
): Promise<CurriculoComparacao> {
  const userContent = `${rawContent}\n---VAGA---\n${vagaTexto}`;
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const parsed = await chatJson(SYSTEM_PROMPT, userContent);
      return curriculoComparacaoSchema.parse(parsed);
    } catch (error) {
      lastError = error;
    }
  }

  throw new CurriculoComparacaoError(
    "Failed to get a valid comparison from the LLM",
    { cause: lastError },
  );
}
