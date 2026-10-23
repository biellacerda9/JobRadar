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

Confirma Gupy, ou prefere outra fonte pra começar?

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
3. **Serviço scraper separado**: pasta própria (`scraper/` na raiz, não dentro de
   `src/`), Node.js, decisão do design original de ser processo independente da API
   (ciclo de vida/falhas diferentes). `npm` próprio ali ou workspace — decido na hora
   conforme o que for mais simples de rodar.
4. **Coleta de 1 fonte** (Gupy): busca por termo/stack, parse de listagem + página de
   vaga individual, grava no banco via o mesmo schema Drizzle (`Vaga`).
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
