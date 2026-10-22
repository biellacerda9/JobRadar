import { curriculoAnaliseSchema, type CurriculoAnalise } from "./curriculoAnalise.schema.js";
import { chatJson } from "./ollamaClient.js";

const MAX_ATTEMPTS = 2;

export class CurriculoAnalysisError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "CurriculoAnalysisError";
  }
}

const SYSTEM_PROMPT = `Você analisa currículos em português. A partir do texto bruto de um currículo,
responda SOMENTE com um JSON válido no seguinte formato, sem nenhum texto fora do JSON:

{
  "estruturado": {
    "secoes": [{ "nome": string, "conteudo": string }],
    "habilidades": string[],
    "experiencias": [{ "empresa": string, "cargo": string, "periodo": string, "descricao": string }]
  },
  "pontos_fortes": string[],
  "pontos_a_melhorar": string[]
}

"secoes" deve refletir as seções reais do currículo (ex.: Experiência, Formação, Habilidades).
"pontos_fortes" e "pontos_a_melhorar" são uma avaliação objetiva e específica do currículo,
sem considerar nenhuma vaga em particular.`;

/**
 * Calls the local LLM (Ollama) to produce a structured analysis of a resume's raw
 * text. Retries once if the model's output doesn't match the expected schema —
 * local models are less reliable at structured output than hosted APIs.
 */
export async function analyzeCurriculo(
  rawContent: string,
): Promise<CurriculoAnalise> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const parsed = await chatJson(SYSTEM_PROMPT, rawContent);
      return curriculoAnaliseSchema.parse(parsed);
    } catch (error) {
      lastError = error;
    }
  }

  throw new CurriculoAnalysisError(
    "Failed to get a valid structured analysis from the LLM",
    { cause: lastError },
  );
}
