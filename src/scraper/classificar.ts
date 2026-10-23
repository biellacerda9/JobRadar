// Canonical stack name -> aliases as they appear in job descriptions.
const STACK_ALIASES: Record<string, string[]> = {
  // ponytail: no bare "js" alias — it matches the ".js" in Node.js/Next.js/Vue.js.
  // Posts that only say "JS" are missed; add a smarter rule if that shows up.
  JavaScript: ["javascript"],
  TypeScript: ["typescript"],
  "Node.js": ["node.js", "nodejs", "node"],
  React: ["react", "react.js", "reactjs"],
  "Next.js": ["next.js", "nextjs"],
  Angular: ["angular"],
  Vue: ["vue", "vue.js", "vuejs"],
  HTML: ["html", "html5"],
  CSS: ["css", "css3"],
  Python: ["python"],
  Django: ["django"],
  Flask: ["flask"],
  FastAPI: ["fastapi"],
  Java: ["java"],
  Spring: ["spring", "spring boot"],
  Kotlin: ["kotlin"],
  "C#": ["c#"],
  ".NET": [".net", "dotnet", "asp.net"],
  PHP: ["php"],
  Laravel: ["laravel"],
  Ruby: ["ruby"],
  Rails: ["rails"],
  // ponytail: "Go" alone matches too much Portuguese/English text; only the
  // unambiguous spellings. Add a case-sensitive "Go" rule if it misses real posts.
  Go: ["golang", "linguagem go"],
  Rust: ["rust"],
  Flutter: ["flutter"],
  SQL: ["sql"],
  PostgreSQL: ["postgresql", "postgres"],
  MySQL: ["mysql"],
  MongoDB: ["mongodb", "mongo"],
  Redis: ["redis"],
  Docker: ["docker"],
  Kubernetes: ["kubernetes", "k8s"],
  AWS: ["aws", "amazon web services"],
  Azure: ["azure"],
  GCP: ["gcp", "google cloud"],
  Git: ["git", "github", "gitlab"],
  Linux: ["linux"],
  "Power BI": ["power bi", "powerbi"],
  Excel: ["excel"],
};

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// A match must not touch a letter or digit on either side, so "Java" doesn't match
// "JavaScript" and "SQL" doesn't match "PostgreSQL". Punctuation counts as a
// boundary, which also handles Gupy's glued sections ("mercado.Node.js").
const STACK_PATTERNS = Object.entries(STACK_ALIASES).map(([stack, aliases]) => ({
  stack,
  pattern: new RegExp(
    `(?<![\\p{L}\\p{N}])(?:${aliases.map(escapeRegex).join("|")})(?![\\p{L}\\p{N}])`,
    "iu",
  ),
}));

/** Returns the known technologies mentioned in a job description. */
export function classificarStack(descricao: string): string[] {
  return STACK_PATTERNS.filter(({ pattern }) => pattern.test(descricao)).map(
    ({ stack }) => stack,
  );
}
