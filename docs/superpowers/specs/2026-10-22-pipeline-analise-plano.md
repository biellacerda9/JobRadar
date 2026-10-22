# Plano de execução — Pipeline de análise estruturada (Sprint 2)

Data: 2026-10-22

Sprint 2 definida em
[2026-09-27-jobradar-curriculo-design.md](2026-09-27-jobradar-curriculo-design.md).
Objetivo: analisar o texto bruto já extraído (Sprint 1) com um LLM e retornar um JSON
estruturado (seções, skills, experiências).

## Decisão: LLM local via Ollama (grátis)

Troca em relação ao RNF03 original (API paga) — usuário decidiu rodar local via
[Ollama](https://ollama.com), sem custo de API, sem chave. Ollama não está instalado
nesta máquina ainda (`ollama: comando não encontrado`).

**Bloqueio — decisão do usuário**: qual modelo puxar. Recomendo `qwen2.5:7b-instruct`
(bom em structured output / JSON, roda em ~8GB RAM) ou `llama3.1:8b` (mais testado,
ligeiramente mais pesado). Ambos suportam o modo JSON do Ollama (`format: "json"` na
API) que ajuda a manter a saída estruturada.

Também preciso de OK explícito pra instalar o Ollama no sistema (`curl -fsSL
https://ollama.com/install.sh | sh`, download de alguns GB pro modelo) — é instalação
de sistema, não só dependência do projeto.

Sem isso não dá pra seguir além do passo 1.

## Passos

1. **Bloqueio acima resolvido** — Ollama instalado, modelo escolhido puxado
   (`ollama pull <modelo>`).
2. **Definir o schema JSON de saída** com Zod (seções, skills, experiências) —
   `src/routes/curriculo-analise.schema.ts` ou similar, reaproveitando o padrão de
   `auth.schema.ts`.
3. **Service de chamada ao LLM** (`src/services/curriculoAnalyzer.ts`) — monta prompt a
   partir do `raw_content` de uma `curriculo_version`, chama a API local do Ollama
   (`http://localhost:11434/api/chat`, `format: "json"`), valida a resposta contra o
   schema do passo 2, com retry se a validação falhar (LLM local erra formato mais que
   API paga).
4. **Endpoint de análise pura** — `POST /curriculo/analise` (autenticado), sem vaga
   associada: pega a versão atual do currículo do usuário, roda o service, grava o
   resultado em `curriculo_versions.structured_content` (hoje `{}` por placeholder da
   Sprint 1).
5. **Testes** — unitário do parser/validador do JSON de saída do LLM, com resposta
   mockada (sem chamada real ao Ollama no CI, que não tem o serviço rodando). Teste
   manual com chamada real local, 1x, pra validar o prompt na prática.
6. **Avaliar depois**: adicionar o Ollama ao `docker-compose.yml` (RNF04 pede sistema
   containerizado) — fica pra quando o fluxo estiver validado manualmente, pra não
   gastar tempo containerizando algo que ainda pode mudar de prompt/schema.
7. **Commits separados** por unidade lógica (schema, service, endpoint, testes), como
   combinado — e um md de plano como este pra cada próxima tarefa.

## Fora de escopo nesta etapa

- Comparação com vaga específica / score de aderência (Sprint 3).
- Qualquer scraping de vaga (Sprint 4+).

## Resultado

Implementado, testado (manual end-to-end + unitário com mock) e commitado. Schema
real:

- `match_analises` (nova tabela): `vaga_id` nullable (sem FK até Sprint 4),
  `versao_curriculo_id` FK not null, `score` numeric nullable (análise pura não
  calcula score — isso é RF07, Sprint 3), `pontos_fortes`/`pontos_a_melhorar` jsonb.
- `POST /curriculo/analise`: autenticado, roda o LLM sobre a versão atual do
  currículo, grava `structured_content` na própria `curriculo_version` e cria uma
  `match_analise` com `vaga_id` null.

**Risco conhecido — RNF02 não atendido**: meta do design é ~15s por análise; teste
manual local deu **65s** de inferência (CPU, `qwen2.5:7b-instruct`). GPU reduziria
bastante, mas não assumo que exista nesta máquina. Não bloqueia a sprint, mas fica
registrado: se virar problema real de UX, trocar por modelo menor
(ex. `qwen2.5:3b-instruct`) ou aceitar resposta assíncrona (poll) em vez de síncrona.
