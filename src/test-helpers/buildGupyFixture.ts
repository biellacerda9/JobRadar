/**
 * Builds a minimal HTML page shaped like Gupy's real job-search page: a
 * __NEXT_DATA__ script tag with the same JSON structure, trimmed to a couple of
 * jobs. Field shapes copied from a real page fetched during development — see
 * docs/superpowers/specs/2026-10-23-scraper-vagas-plano.md.
 */
export function buildGupyFixtureHtml(
  jobs: Array<Record<string, unknown>>,
): string {
  const nextData = {
    props: {
      pageProps: {
        initialJobList: {
          data: jobs,
          pagination: { total: jobs.length, limit: 12, offset: 0 },
        },
      },
    },
  };

  return `<!DOCTYPE html><html><head></head><body>
<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(nextData)}</script>
</body></html>`;
}

export const SAMPLE_GUPY_JOBS = [
  {
    id: 1,
    name: "Estágio em Desenvolvimento de Software",
    description: "Vaga de estágio pra time de backend. Requisitos: Node.js, Git.",
    careerPageName: "Empresa Exemplo",
    city: "São Paulo",
    state: "São Paulo",
    jobUrl: "https://empresa-exemplo.gupy.io/job/abc123",
    type: "vacancy_type_internship",
  },
  {
    id: 2,
    name: "Desenvolvedor Backend Júnior",
    description: "Vaga efetiva júnior. Stack: TypeScript, Express, PostgreSQL.",
    careerPageName: "Outra Empresa",
    city: "Remoto",
    state: "",
    jobUrl: "https://outra-empresa.gupy.io/job/def456",
    type: "vacancy_type_effective",
  },
];
