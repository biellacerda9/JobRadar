# Plano de execução — Correções de robustez (pós-Sprint 4)

Data: 2026-10-23

Revisão de riscos depois da Sprint 4. Três falhas que não apareceram nos testes
(currículo de teste pequeno) mas vão aparecer com uso real.

## Correções

1. **Janela de contexto do Ollama** — log do Ollama confirma `n_ctx = 4096` (padrão do
   runtime; o modelo suporta 32k). Currículo real + vaga + prompt + resposta pode
   passar disso, e o Ollama corta o começo da entrada sem erro (justamente o system
   prompt com o formato JSON). Fix: `options: { num_ctx: 8192 }` em
   `src/services/ollamaClient.ts`. 8192 cobre ~10k chars de currículo + vaga +
   resposta com folga, sem estourar RAM numa máquina sem GPU.
2. **`raw_content` com limite de 10.000 chars** — `varchar(10000)` rejeita PDF de
   LinkedIn de perfil mais longo (upload dá 500). Fix: trocar pra `text` + migration.
   Conversão `varchar` → `text` no Postgres não perde dado.
3. **Detecção de duplicata no scraper** — Drizzle embrulha o erro do Postgres
   (`DrizzleQueryError`, mensagem `"Failed query: ..."`), então o check por
   `message.includes("unique")` nunca bate. Fix aplicado (melhor que o planejado):
   `onConflictDoNothing({ target: url_original })` — o próprio banco ignora a
   duplicata, sem parsear erro nenhum. Erro de verdade continua sendo logado.

## Verificação

- Teste unitário: `chatJson` envia `num_ctx > 4096` no body.
- Manual: rodar `npm run scrape` 2x — segunda rodada deve mostrar duplicatas sem log
  de erro.
- Manual: upload de texto > 10.000 chars passa e a comparação roda sem truncar.

## Resultado

- **Scraper 2x**: `Inserted: 0, duplicates: 34, failed: 0` — sem log de erro.
- **Currículo de 11.471 chars**: upload 201 (antes: 500 por estourar `varchar(10000)`).
- **Comparação com vaga real do Gupy**: prompt de **4008 tokens** (4539 com resposta)
  — com o limite antigo de 4096 teria sido truncado. Log do Ollama:
  `n_ctx_slot = 8192`, `truncated = 0`. Score 35, 3 sugestões, JSON válido.
- **Latência**: 4min45s em CPU com contexto grande. Funciona, mas reforça o risco
  RNF02 já registrado — resposta assíncrona ou máquina com GPU resolvem se virar
  problema de uso.

## Fora de escopo

- Autostart do Ollama após reboot (operacional, não código).
- `unique` em `curriculos.user_id` (risco baixo em uso pessoal).
