# Plano de execução — Scraper de vagas (Sprint 4)

Data: 2026-10-23

Sprint 4 definida em
[2026-09-27-jobradar-curriculo-design.md](2026-09-27-jobradar-curriculo-design.md).
Fase 2 do projeto começa aqui. Escopo desta sprint: scraper funcional + persistência,
sem scheduler nem deduplicação de verdade (isso é Sprint 5).

## Decisão — fonte de vagas (preciso do seu OK)

Recomendo **só Gupy** nesta sprint (não 2 fontes ainda): estrutura de página pública
mais estável pra scraping, usado por muita empresa BR, sem bloqueio agressivo
conhecido. **Evitar LinkedIn** — ToS proíbe scraping explicitamente e tem anti-bot
pesado (rate limit agressivo, captcha); fonte 2 fica pra quando a 1 estiver validada.

Confirmado pelo usuário: **Gupy**, ciente das limitações discutidas (robots.txt,
rate limit, sem paralelismo agressivo).

## Investigação técnica — como o Gupy serve os dados

Antes de codar, chequei a página real:

- **`robots.txt` libera geral** (`Disallow:` vazio) — sem restrição de rota.
- **Não precisa de browser headless**: `https://portal.gupy.io/job-search/term=<termo>`
  é Next.js com SSR — a página já vem com um `<script id="__NEXT_DATA__">` contendo o
  JSON completo da lista de vagas. Fetch simples (`fetch`/HTTP GET) + parse de JSON
  resolve. **Sem Playwright, sem dependência nova pesada.**
- **Descrição completa já vem na listagem** (campo `description` de cada vaga) —
  não precisa visitar a página individual de cada vaga, um fetch por termo de busca
  já traz tudo.
- **Paginação**: tentei via `offset` e via rota de dados do Next (`_next/data/.../*.json`),
  nenhum dos dois mudou o resultado (sempre volta página 1) — a paginação real do site
  usa uma chamada client-side que não identifiquei sem inspecionar o bundle JS a fundo.
  **Decisão de escopo**: pra essa sprint, só a primeira página por termo de busca
  (12 vagas/termo). Não é cobertura completa, mas é dado real o suficiente pra validar
  o pipeline; paginação completa fica pra quando/se precisar de mais volume (já que
  o scheduler da Sprint 5 vai rodar isso periodicamente, cobertura cresce com o tempo
  mesmo sem paginação logo de cara).
- **Mapeamento de campos** (`name`→titulo, `description`→descricao_bruta,
  `careerPageName`→empresa, `city`+`state`→localizacao, `jobUrl`→url_original,
  `type`→nivel, valores vistos: `vacancy_type_internship`, `vacancy_type_effective`,
  `vacancy_type_trainee`).
- **Termos de busca**: `estagio`, `desenvolvedor junior`, `programador junior` — bate
  com o perfil do projeto (estágio/júnior).

## Decisão descartada — análise de perfil LinkedIn via bot logado

Discutido e fechado (não entra no projeto): usuário cogitou um bot com conta própria
do LinkedIn, sempre logada, pra receber o link de perfil de qualquer usuário do
JobRadar e analisar sem exigir upload manual. Motivos pra descartar:

- Mesma restrição de ToS do scraping de vagas (seção acima), agora pra perfil.
- Login automatizado é frágil (2FA/checkpoint de segurança trava conta nova logando
  de IP/dispositivo novo; captcha nessas telas não é automatizável de forma confiável).
- **Commercial Use Limit do LinkedIn**: mesmo conta logada "normal" tem teto mensal de
  quantos perfis pode abrir. Uma conta só servindo todos os usuários do app estoura
  esse teto rápido — não escala, independente de detecção de bot.
- Risco de ban cresce com uso, forçando criar conta nova em ciclo.

**Decisão final**: reaproveitar o `POST /curriculo/upload` já existente. LinkedIn tem
exportação nativa "Salvar como PDF" do próprio perfil (2 cliques, usuário já logado
na própria conta, zero risco) — cai direto no pipeline de PDF que já funciona desde a
Sprint 1. **Nenhum código novo necessário** pra esse caso de uso.

Limitação aceita: o PDF exportado não inclui posts/atividade do feed (só a página de
perfil — resumo, experiência, formação, habilidades, certificações). Não é problema
pro escopo atual: RF06/RF07 avaliam currículo (experiência/skills), não atividade de
conteúdo — isso seria outra feature, fora de escopo.

## Passos

1. **Fonte confirmada** (acima).
2. **Tabela `Vaga`** no schema Drizzle: `id`, `fonte`, `url_original` (unique, pra
   RF02 — constraint entra agora, lógica de tratar conflito fica pra Sprint 5),
   `titulo`, `empresa`, `descricao_bruta`, `requisitos_estruturados` (jsonb),
   `localizacao`, `nivel`, `coletado_em`. Depois disso, `match_analises.vaga_id`
   ganha FK de verdade (hoje é uuid solto).
3. **Scraper como módulo**, não serviço/processo separado: `src/scraper/gupy.ts`
   (fetch + parse) e um script runner (`src/scraper/run.ts`). A decisão original do
   design (serviço isolado por causa de browser headless/falhas diferentes) não se
   aplica mais — descobri que não precisa de Playwright, é só HTTP fetch, mesmo
   runtime/dependências do resto do projeto. Processo separado de verdade (serviço
   próprio) só passa a fazer sentido se entrar algo que realmente precise de
   isolamento (ex. Playwright pra outra fonte, no futuro).
4. **Coleta de 1 fonte** (Gupy): fetch por termo de busca, parse do `__NEXT_DATA__`,
   grava no banco via o mesmo schema Drizzle (`Vaga`). Sem fetch por vaga individual
   (descrição já vem na listagem, ver investigação acima).
5. **Fixtures de HTML** salvos localmente (páginas reais baixadas 1x) pra parser não
   depender de rede nos testes.
6. **Testes de parsing** contra as fixtures.
7. **Teste manual real**: rodar o scraper contra o Gupy de verdade 1x, confirmar que
   grava vaga real no banco.
8. **Commits separados + push**, como vem sendo feito.

## Fora de escopo nesta etapa

- Scheduler (node-cron) — Sprint 5.
- Deduplicação com tratamento de conflito — Sprint 5 (constraint unique já entra,
  comportamento ao colidir não).
- Classificação de vaga por stack/nível via IA — Sprint 5.
- Notificação Telegram / vínculo automático com score — Sprint 6.
- Segunda fonte de vagas.

## Risco conhecido

RNF01 (não sobrecarregar site-fonte, respeitar robots.txt) — vou checar o
`robots.txt` do Gupy antes de implementar a coleta e ir devagar (sem paralelismo
agressivo, delay entre requests). Se o robots.txt proibir as rotas que eu precisar
scraping, paro e aviso antes de seguir.

## Resultado

Implementado, testado e commitado/pushed (`dcdcadc..f5bb6fa`).

- `robots.txt` do Gupy libera geral — scraping dentro das regras do site.
- `npm run scrape` roda os 3 termos de busca, 1s de delay entre requests.
- **Teste real**: rodado contra o Gupy de verdade — **34 vagas reais inseridas, 0
  erro**. Dados confirmados no banco (título, empresa, localização, nível batendo
  com o site real).
- `vagas` ganhou FK de verdade em `match_analises.vaga_id` (antes era uuid solto,
  já que a tabela não existia).

Sprint 4 fechada dentro do escopo combinado (sem scheduler, sem dedup com tratamento
de conflito, sem segunda fonte — tudo isso fica pra Sprint 5/6 como já estava
planejado).
