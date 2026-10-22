import { jest } from "@jest/globals";
import {
  compararCurriculoComVaga,
  CurriculoComparacaoError,
} from "../services/curriculoComparador.js";

type FetchLike = (...args: Parameters<typeof fetch>) => Promise<Response>;

const VALID_COMPARACAO = {
  score: 72,
  pontos_fortes: ["Experiência sólida em Node.js"],
  pontos_a_melhorar: ["Sem experiência com a nuvem exigida na vaga"],
  sugestoes: [
    { secao: "Habilidades", sugestao: "Adicionar experiência com AWS, se houver" },
  ],
};

function fakeResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body } as Response;
}

describe("compararCurriculoComVaga", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("returns the parsed comparison when the LLM output matches the schema", async () => {
    const fetchMock = jest
      .fn<FetchLike>()
      .mockResolvedValueOnce(
        fakeResponse({ message: { content: JSON.stringify(VALID_COMPARACAO) } }),
      );
    global.fetch = fetchMock;

    const result = await compararCurriculoComVaga("currículo...", "vaga...");

    expect(result).toEqual(VALID_COMPARACAO);
  });

  it("rejects a score outside 0-100 and retries", async () => {
    const outOfRange = { ...VALID_COMPARACAO, score: 150 };
    const fetchMock = jest
      .fn<FetchLike>()
      .mockResolvedValueOnce(
        fakeResponse({ message: { content: JSON.stringify(outOfRange) } }),
      )
      .mockResolvedValueOnce(
        fakeResponse({ message: { content: JSON.stringify(VALID_COMPARACAO) } }),
      );
    global.fetch = fetchMock;

    const result = await compararCurriculoComVaga("currículo...", "vaga...");

    expect(result).toEqual(VALID_COMPARACAO);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws CurriculoComparacaoError after exhausting retries", async () => {
    const fetchMock = jest
      .fn<FetchLike>()
      .mockResolvedValue(fakeResponse({ message: { content: "not json" } }));
    global.fetch = fetchMock;

    await expect(
      compararCurriculoComVaga("currículo...", "vaga..."),
    ).rejects.toBeInstanceOf(CurriculoComparacaoError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
