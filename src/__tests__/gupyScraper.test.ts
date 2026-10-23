import { jest } from "@jest/globals";
import { fetchGupyJobs } from "../scraper/gupy.js";
import {
  buildGupyFixtureHtml,
  SAMPLE_GUPY_JOBS,
} from "../test-helpers/buildGupyFixture.js";

type FetchLike = (...args: Parameters<typeof fetch>) => Promise<Response>;

function fakeResponse(body: string, ok = true, status = 200): Response {
  return { ok, status, text: async () => body } as Response;
}

describe("fetchGupyJobs", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("parses jobs out of the __NEXT_DATA__ script tag", async () => {
    const html = buildGupyFixtureHtml(SAMPLE_GUPY_JOBS);
    global.fetch = jest
      .fn<FetchLike>()
      .mockResolvedValueOnce(fakeResponse(html));

    const jobs = await fetchGupyJobs("estagio");

    expect(jobs).toHaveLength(2);
    expect(jobs[0]).toEqual({
      fonte: "gupy",
      url_original: "https://empresa-exemplo.gupy.io/job/abc123",
      titulo: "Estágio em Desenvolvimento de Software",
      empresa: "Empresa Exemplo",
      descricao_bruta: "Vaga de estágio pra time de backend. Requisitos: Node.js, Git.",
      localizacao: "São Paulo, São Paulo",
      nivel: "vacancy_type_internship",
    });
  });

  it("handles missing city/state gracefully (null localizacao)", async () => {
    const html = buildGupyFixtureHtml(SAMPLE_GUPY_JOBS);
    global.fetch = jest
      .fn<FetchLike>()
      .mockResolvedValueOnce(fakeResponse(html));

    const jobs = await fetchGupyJobs("desenvolvedor junior");

    expect(jobs[1]?.localizacao).toBe("Remoto");
  });

  it("throws when the page doesn't have __NEXT_DATA__", async () => {
    global.fetch = jest
      .fn<FetchLike>()
      .mockResolvedValueOnce(fakeResponse("<html><body>no data here</body></html>"));

    await expect(fetchGupyJobs("estagio")).rejects.toThrow("__NEXT_DATA__");
  });

  it("throws on a non-ok HTTP response", async () => {
    global.fetch = jest
      .fn<FetchLike>()
      .mockResolvedValueOnce(fakeResponse("", false, 503));

    await expect(fetchGupyJobs("estagio")).rejects.toThrow("status 503");
  });
});
