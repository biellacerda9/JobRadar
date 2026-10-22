import { jest } from "@jest/globals";
import {
  analyzeCurriculo,
  CurriculoAnalysisError,
} from "../services/curriculoAnalyzer.js";

type FetchLike = (...args: Parameters<typeof fetch>) => Promise<Response>;

const VALID_ANALYSIS = {
  estruturado: {
    secoes: [{ nome: "Experiência", conteudo: "..." }],
    habilidades: ["Node.js"],
    experiencias: [
      {
        empresa: "Empresa X",
        cargo: "Dev",
        periodo: "2025",
        descricao: "...",
      },
    ],
  },
  pontos_fortes: ["Boa experiência com Node.js"],
  pontos_a_melhorar: ["Faltam certificações"],
};

function fakeResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body } as Response;
}

function mockFetchOnce(content: string) {
  return jest
    .fn<FetchLike>()
    .mockResolvedValueOnce(fakeResponse({ message: { content } }));
}

describe("analyzeCurriculo", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("returns the parsed analysis when the LLM output matches the schema", async () => {
    global.fetch = mockFetchOnce(JSON.stringify(VALID_ANALYSIS));

    const result = await analyzeCurriculo("texto do currículo");

    expect(result).toEqual(VALID_ANALYSIS);
  });

  it("retries once and succeeds if the second attempt is valid", async () => {
    const fetchMock = jest
      .fn<FetchLike>()
      .mockResolvedValueOnce(fakeResponse({ message: { content: "not json" } }))
      .mockResolvedValueOnce(
        fakeResponse({ message: { content: JSON.stringify(VALID_ANALYSIS) } }),
      );
    global.fetch = fetchMock;

    const result = await analyzeCurriculo("texto do currículo");

    expect(result).toEqual(VALID_ANALYSIS);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws CurriculoAnalysisError after exhausting retries on invalid output", async () => {
    const invalid = { foo: "bar" };
    const fetchMock = jest
      .fn<FetchLike>()
      .mockResolvedValue(
        fakeResponse({ message: { content: JSON.stringify(invalid) } }),
      );
    global.fetch = fetchMock;

    await expect(analyzeCurriculo("texto do currículo")).rejects.toBeInstanceOf(
      CurriculoAnalysisError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws CurriculoAnalysisError when the Ollama request fails", async () => {
    const fetchMock = jest
      .fn<FetchLike>()
      .mockResolvedValue(fakeResponse({}, false, 500));
    global.fetch = fetchMock;

    await expect(analyzeCurriculo("texto do currículo")).rejects.toBeInstanceOf(
      CurriculoAnalysisError,
    );
  });
});
