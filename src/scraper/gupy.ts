const SEARCH_URL = "https://portal.gupy.io/job-search/term=";

export interface GupyVaga {
  fonte: "gupy";
  url_original: string;
  titulo: string;
  empresa: string | null;
  descricao_bruta: string;
  localizacao: string | null;
  nivel: string | null;
}

interface GupyJob {
  name: string;
  description: string;
  careerPageName?: string;
  city?: string;
  state?: string;
  jobUrl: string;
  type?: string;
}

function extractNextData(html: string): unknown {
  const match = html.match(
    /<script id="__NEXT_DATA__"[^>]*>(.+?)<\/script>/s,
  );
  if (!match?.[1]) {
    throw new Error("__NEXT_DATA__ script tag not found in Gupy page");
  }
  return JSON.parse(match[1]);
}

function mapJob(job: GupyJob): GupyVaga {
  const localizacao = [job.city, job.state].filter(Boolean).join(", ") || null;

  return {
    fonte: "gupy",
    url_original: job.jobUrl,
    titulo: job.name,
    empresa: job.careerPageName || null,
    descricao_bruta: job.description,
    localizacao,
    nivel: job.type ?? null,
  };
}

/**
 * Fetches the first page of Gupy's job search results for a given term. Gupy's
 * search page is server-rendered (Next.js) and embeds the full job list, including
 * each job's full description, in a __NEXT_DATA__ script tag — no headless browser
 * and no per-job page fetch needed.
 *
 * Scope note: only the first page (~12 results) per term. Pagination is served by an
 * internal client-side call that wasn't worth reverse-engineering for this sprint —
 * see docs/superpowers/specs/2026-10-23-scraper-vagas-plano.md.
 */
export async function fetchGupyJobs(termo: string): Promise<GupyVaga[]> {
  const url = `${SEARCH_URL}${encodeURIComponent(termo)}`;
  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (JobRadar scraper)" },
  });

  if (!response.ok) {
    throw new Error(`Gupy request failed with status ${response.status}`);
  }

  const html = await response.text();
  const data = extractNextData(html) as {
    props: { pageProps: { initialJobList: { data: GupyJob[] } } };
  };

  return data.props.pageProps.initialJobList.data.map(mapJob);
}
