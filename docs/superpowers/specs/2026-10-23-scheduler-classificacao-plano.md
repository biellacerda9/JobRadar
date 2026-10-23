# Plano de execução — Scheduler + classificação de vagas (Sprint 5)

Data: 2026-10-23

Sprint 5 definida em
[2026-09-27-jobradar-curriculo-design.md](2026-09-27-jobradar-curriculo-design.md):
agendamento periódico, deduplicação por URL, classificação por stack/nível/localização,
testes de dedup e de agendamento.

## O que já está pronto (não refaço)

- **Deduplicação por URL**: índice único em `vagas.url_original` (Sprint 4) +
  `onConflictDoNothing` (correções de robustez). Testado com 2 rodadas reais seguidas.
- **Nível e localização**: já vêm prontos do Gupy (`type` e `city`/`state`) e são
  gravados no scrape.

Sobra: **agendamento** e **classificação por stack**.

## Decisão — classificação por stack (confirmada: palavras-chave)

O design fala em extrair requisitos "pela IA". Recomendo **lista de palavras-chave**
(Node.js, React, Python, SQL...) em vez de LLM nesta etapa:

| | Palavras-chave | LLM (Ollama) |
|---|---|---|
| Tempo por vaga | instantâneo | ~30s–2min em CPU |
| 34 vagas por rodada | < 1s | ~20–60 min |
| Disputa com o usuário | nenhuma | Ollama roda 1 pedido por vez — análise do usuário fica na fila atrás da classificação |
| Depende do Ollama estar no ar | não | sim (e ele não sobe sozinho após reboot) |
| Precisão | só pega o que está na lista | entende contexto |

Pra que a stack serve no projeto: filtrar quais vagas são relevantes pro usuário
(RF03/RF04) antes da comparação pesada com o currículo, que já usa LLM (Sprint 6).
Pra filtro, palavra-chave basta. Se a lista ficar curta na prática, troco pra LLM
depois sem mudar o formato salvo.

## Passos

1. **Decisão acima confirmada.**
2. **`classificarStack(descricao)`** em `src/scraper/classificar.ts` — lista fixa de
   tecnologias, busca sem diferenciar maiúscula/minúscula e respeitando limite de
   palavra (pra "Java" não casar com "JavaScript", "Go" não casar com "Google").
   Resultado gravado em `vagas.requisitos_estruturados` como `{ "stack": [...] }`.
3. **Classificação no fluxo do scrape**: depois de inserir, classifica toda vaga com
   `requisitos_estruturados` nulo — cobre as 34 vagas já no banco (backfill) sem
   script separado.
4. **Agendamento**: refatorar `run.ts` pra exportar `runScrape()`, e um processo novo
   `npm run scrape:schedule` que roda na hora e depois a cada N horas
   (`SCRAPE_INTERVAL_HOURS`, padrão 6). `setInterval` em vez de `node-cron` — intervalo
   fixo não precisa de expressão cron nem dependência nova. Se uma rodada ainda
   estiver em andamento quando a próxima chegar, pula (sem rodadas sobrepostas).
   Processo separado da API, como o design pede.
5. **`restart: unless-stopped`** no Postgres do `docker-compose.yml` — senão, depois de
   reiniciar a máquina, o agendador sobe e não acha banco.
6. **Testes**:
   - `classificarStack`: casos de limite de palavra (Java vs JavaScript, Go vs Google,
     Node.js com ponto), texto colado sem espaço (o Gupy junta seções:
     `"mercado.Responsabilidades"`).
   - Agendamento com relógio falso do Jest (`jest.useFakeTimers`): roda na hora, roda
     de novo após o intervalo, não sobrepõe rodada lenta.
   - Dedup: já coberto pelo teste manual de 2 rodadas; registro aqui, não duplico.
7. **Teste real**: rodar o agendador com intervalo curto, confirmar backfill das 34
   vagas e uma segunda rodada automática sem duplicar.
8. **Commits separados + push.**

## Resultado

- **Testes**: 27 passando. O teste do classificador pegou um bug antes de ir pro banco:
  o apelido `js` casava com o `.js` de "Node.js", marcando JavaScript em toda vaga de
  Node — removido (limitação aceita: vaga que só escreve "JS" não é detectada).
- **Organização**: `scrape.ts` (um ciclo), `scheduler.ts` (loop testável),
  `run.ts` (linha de comando: `npm run scrape` ou `npm run scrape:schedule`).
- **Teste real** com `SCRAPE_INTERVAL_HOURS=0.01` (36s):
  - 1º ciclo: 12 vagas novas, 22 duplicatas, **46 classificadas** (backfill das 34
    antigas + 12 novas).
  - 2º ciclo, automático 36s depois: 0 novas, 34 duplicatas, 0 pendentes.
  - Encerrou limpo com Ctrl+C (SIGINT).
- **Qualidade**: 26 de 46 vagas com stack detectada; as 20 sem stack são estágios fora
  de TI (administração, saúde, engenharia) — esperado. Conferi o caso mais estranho
  (vaga front-end VTEX marcada com Go/Flutter/Kubernetes): a descrição cita mesmo as
  três, não é falso positivo.
- **Postgres** com `restart: unless-stopped`; container recriado sem perda de dado.

## Fora de escopo

- Notificação Telegram e score automático vaga x currículo — Sprint 6.
- Paginação completa do Gupy / segunda fonte.
- Agendador subir sozinho após reboot (systemd/serviço do sistema) — fica pra Sprint 10
  (Docker Compose completo resolve junto com API e Ollama).
