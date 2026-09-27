# Job Radar & Currículo IA — Arquitetura e Plano de Sprints

Data: 2026-09-27

## Visão geral

Sistema pessoal com dois módulos integrados: (1) monitoramento automático de vagas de
estágio/júnior compatíveis com o perfil do usuário, e (2) análise de currículo assistida
por IA, pura ou comparada a uma vaga específica, com pontuação (score) e sugestões de
melhoria.

O diferencial não é nenhum módulo isoladamente, mas a integração: toda vaga coletada é
automaticamente avaliada contra o currículo atual, e o usuário recebe não só a vaga, mas
o quão aderente ele está a ela e o que falta ajustar.

## Objetivos do projeto

- Ferramenta pessoal usada de verdade na busca de estágio, não projeto de vitrine.
- Peça de portfólio tecnicamente densa (pipeline de IA, arquitetura de serviços
  separados, dados reais) que se diferencie de CRUDs genéricos.
- Aprender na prática integração de LLM com output estruturado e, na fase final, RAG
  com embeddings.

## Fora de escopo (v1)

- Cobrança/monetização (mesmo sendo multi-usuário).
- Aplicação automática em vagas — o usuário decide e aplica manualmente.

## Requisitos funcionais

| ID | Requisito | Módulo |
|----|-----------|--------|
| RF01 | Coletar vagas de fontes públicas (LinkedIn, Gupy, sites de empresa) periodicamente | Monitor de vagas |
| RF02 | Deduplicar vagas já coletadas anteriormente | Monitor de vagas |
| RF03 | Classificar vaga por stack, nível (estágio/júnior) e localização | Monitor de vagas |
| RF04 | Notificar o usuário via Telegram quando uma vaga relevante for encontrada | Monitor de vagas |
| RF05 | Upload/atualização do currículo do usuário (texto ou PDF) | Análise de currículo |
| RF06 | Analisar currículo de forma pura (sem vaga associada) e gerar pontos fortes/fracos | Análise de currículo |
| RF07 | Comparar currículo com uma vaga específica e calcular score de aderência | Análise de currículo |
| RF08 | Gerar sugestões estruturadas de ajuste (por bullet point, por seção) | Análise de currículo |
| RF09 | Recalcular o score após o usuário ajustar o currículo | Análise de currículo |
| RF10 | Vincular automaticamente cada vaga coletada a um score de match com o currículo atual | Integração |
| RF11 | Permitir cadastro e login de múltiplos usuários, cada um com seu próprio currículo e histórico de vagas/scores | Conta / autenticação |
| RF12 | Fornecer uma interface web (dashboard) para login, upload de currículo, listagem de vagas com score e visualização da análise/sugestões | Frontend |

## Requisitos não funcionais

| ID | Requisito |
|----|-----------|
| RNF01 | Coleta de vagas não deve sobrecarregar os sites-fonte (rate limiting, respeito a robots.txt) |
| RNF02 | Resposta da análise de currículo em até ~15s por chamada de IA |
| RNF03 | Custo de API de IA controlado — uso de modelo econômico como padrão, cache de resultados repetidos |
| RNF04 | Sistema deve rodar de forma independente (containerizado), sem depender do ambiente local do usuário |
| RNF05 | Dados sensíveis (currículo, API keys) nunca versionados em texto puro no repositório |
| RNF06 | Cobertura de testes automatizados nas camadas de parsing, matching e nos endpoints principais |
| RNF07 | Isolamento de dados entre usuários — currículo, vagas e análises de um usuário nunca visíveis a outro |

## Arquitetura

Scheduler dispara o Scraper Service periodicamente; ele coleta vagas das fontes públicas
e grava no banco. O Backend API (Node.js/TypeScript) é o hub: lê vagas e currículo do
banco, chama a API de LLM para gerar análise/score, e envia notificações via Bot
Telegram, que também recebe comandos do usuário (ex.: "analisar currículo").

```
Fontes de vagas → Scraper Service → Banco de dados
                        ↑                  │
                   Scheduler (cron)        ↓
                                    Backend API ──→ Bot Telegram
                                        │  │             │
                                        │  └──→ Frontend │
                                        ↓                ↓
                                    API de LLM        Usuário
```

O Frontend (React/Next.js) consome a mesma API REST do Backend, dando ao usuário uma
interface web para currículo, vagas e análises, sem depender só do bot.

**Decisão arquitetural chave:** o Scraper Service fica separado do Backend API (serviço
independente), porque scraping tem ciclo de vida, falhas e dependências diferentes
(headless browser, bloqueios, retries) do resto do sistema — isso evita que uma falha de
scraping derrube a API principal.

### Stack por componente

| Componente | Tecnologia | Responsabilidade |
|------------|-----------|-------------------|
| Scraper Service | Node.js + Playwright/Cheerio | Coleta e parsing de vagas das fontes públicas |
| Scheduler | Cron (node-cron ou job separado) | Dispara coletas periódicas |
| Banco de dados | PostgreSQL (+ pgvector na fase 3) | Persistência de vagas, currículo, análises e scores |
| Backend API | TypeScript + Node.js (Express/Fastify) | Orquestra coleta, análise, matching e notificação |
| API de LLM | Anthropic/OpenAI (chat + embeddings) | Extração estruturada, geração de sugestões, scoring |
| Bot Telegram | Telegram Bot API | Notificação de vagas e interface de comando do usuário |
| Frontend | React/Next.js | Login, upload de currículo, listagem de vagas com score, tela de análise |

## Modelagem de dados

Um `Curriculo` tem várias `VersaoCurriculo` (histórico de versões). Uma `Vaga` coletada
gera um `MatchAnalise` que liga a vaga a uma versão de currículo específica, com score e
sugestões daquele momento.

### Usuario
| Campo | Tipo | Observação |
|-------|------|------------|
| id | UUID | PK |
| email | varchar | único, usado no login |
| senha_hash | varchar | |
| nome | varchar | |
| chat_id_telegram | varchar | nullable, vinculado quando o usuário conecta o bot |
| criado_em | timestamp | |

### Curriculo
| Campo | Tipo | Observação |
|-------|------|------------|
| id | UUID | PK |
| usuario_id | UUID | FK para Usuario |
| versao_atual_id | UUID | FK para a versão ativa |

### VersaoCurriculo
| Campo | Tipo | Observação |
|-------|------|------------|
| id | UUID | PK |
| curriculo_id | UUID | FK |
| conteudo_bruto | text | texto extraído do PDF/DOCX |
| conteudo_estruturado | jsonb | seções, skills, experiências parseadas pela IA |
| criado_em | timestamp | |

### Vaga
| Campo | Tipo | Observação |
|-------|------|------------|
| id | UUID | PK |
| fonte | varchar | LinkedIn, Gupy, site da empresa etc. |
| url_original | varchar | usada para deduplicação |
| titulo | varchar | |
| empresa | varchar | |
| descricao_bruta | text | |
| requisitos_estruturados | jsonb | skills/requisitos extraídos pela IA |
| localizacao | varchar | |
| nivel | varchar | estágio, júnior etc. |
| coletado_em | timestamp | |

### MatchAnalise
| Campo | Tipo | Observação |
|-------|------|------------|
| id | UUID | PK |
| vaga_id | UUID | FK, nullable (null = análise pura, sem vaga) |
| versao_curriculo_id | UUID | FK |
| score | numeric | 0–100 |
| pontos_fortes | jsonb | lista estruturada |
| pontos_a_melhorar | jsonb | lista estruturada, por bullet/seção quando aplicável |
| gerado_em | timestamp | |

### Notificacao
| Campo | Tipo | Observação |
|-------|------|------------|
| id | UUID | PK |
| vaga_id | UUID | FK |
| canal | varchar | telegram (fixo na v1) |
| enviado_em | timestamp | |

### Índices e decisões
- Índice único em `Vaga.url_original` para deduplicação eficiente.
- `conteudo_estruturado` e `requisitos_estruturados` em jsonb evitam modelar cada skill
  como linha separada na v1 — normaliza depois, se necessário, quando o matching por
  embeddings (fase 3) precisar de uma tabela de skills própria.
- Fase 3 (RAG): tabela adicional `BaseConhecimento` com `conteudo`, `embedding
  vector(1536)` via pgvector, usada só no retrieval da análise de currículo.

## Ordem de desenvolvimento

Primeiro o módulo de análise de currículo sozinho (gera valor mais rápido, usável desde
já), depois o monitor de vagas se conecta a ele, e só na última fase entra RAG — quando
já existe um sistema funcionando onde a limitação do prompt genérico fica visível na
prática.

**Fase 1 — MVP Currículo** (semanas 1–3): análise pura + comparação com vaga, sem RAG.
Gate: score gerado a partir de currículo real.

**Fase 2 — Monitor de Vagas** (semanas 4–7): scraper, scheduler, notificação com score e
frontend. Gate: vaga real notificada com score de match.

**Fase 3 — RAG** (semanas 8–10): embeddings, pgvector e retrieval na análise.

## Cronograma em sprints

Sprints semanais, 10 no total. Cada sprint fecha com testes rodando no CI antes de
começar a próxima.

### Sprint 1 — Setup + parsing de currículo
- Criar repositório e estrutura do projeto (Node.js + TypeScript)
- Configurar CI básico (lint + testes no push)
- Implementar cadastro/login (JWT + bcrypt)
- Implementar upload de currículo (PDF/DOCX)
- Extrair texto bruto do arquivo enviado
- Testes unitários do parser com arquivos de formatos variados

### Sprint 2 — Pipeline de análise estruturada
- Definir schema JSON de saída (seções, skills, experiências)
- Implementar chamada à API de LLM com structured output
- Endpoint de análise pura de currículo (sem vaga)
- Validar o contrato do JSON retornado
- Testes unitários do parser de output do LLM

### Sprint 3 — Score e comparação com vaga
- Endpoint que recebe currículo + texto de vaga colado
- Lógica de cálculo de score de aderência
- Geração de sugestões estruturadas por seção/bullet
- Montar conjunto de casos de teste (pares currículo/vaga com gabarito manual)
- Validar Gate 1: score gerado a partir de currículo real

### Sprint 4 — Scraper Service
- Criar serviço separado (Node.js) para scraping
- Implementar coleta de 1–2 fontes de vagas
- Persistir vagas coletadas no banco
- Salvar fixtures de HTML para testes sem depender de rede
- Testes de parsing com as fixtures

### Sprint 5 — Scheduler + deduplicação
- Configurar agendamento periódico (node-cron)
- Implementar deduplicação por URL (índice único + tratamento de erro)
- Classificar vaga por stack/nível/localização
- Testes de deduplicação e de agendamento (mock de tempo)

### Sprint 6 — Notificação + integração
- Criar bot no BotFather e configurar webhook/polling
- Notificar usuário quando vaga relevante é coletada
- Vincular automaticamente vaga coletada ao score de match do usuário
- Teste de integração end-to-end (vaga coletada → notificação com score)
- Validar Gate 2: vaga real notificada com score de match

### Sprint 7 — Frontend (dashboard)
- Setup do projeto frontend (React/Next.js)
- Telas de cadastro/login
- Tela de upload/edição de currículo
- Lista de vagas coletadas, com score de match visível por vaga
- Tela de análise de currículo (pura e comparada a uma vaga), mostrando score e sugestões
- Testes de componente nas telas principais
- Teste e2e do fluxo completo: login → upload de currículo → ver vaga com score

### Sprint 8 — Base de conhecimento + embeddings
- Instalar e configurar pgvector no Postgres
- Selecionar/escrever documentos-base (boas práticas, critérios de ATS)
- Gerar embeddings dos documentos e persistir
- Testes de geração e persistência de embeddings

### Sprint 9 — Retrieval + RAG na análise
- Implementar retrieval (similaridade) contra a base de conhecimento
- Plugar o contexto recuperado no prompt de análise
- Rodar os casos de teste da Sprint 3 com e sem RAG
- Comparar e documentar a diferença de qualidade

### Sprint 10 — Polimento, deploy e documentação
- Configurar Docker Compose (todos os serviços + banco)
- Fazer deploy (Railway, Render ou similar)
- Escrever README completo do projeto
- Documentar case do projeto para portfólio/LinkedIn
- Rodar suíte de regressão completa no CI

## Estratégia de teste geral

- **Unitários**: parsing, cálculo de score, deduplicação — rodam sem rede nem LLM real (mocks).
- **Integração**: fluxo completo vaga → análise → notificação, contra banco real (Testcontainers).
- **Regressão de IA**: conjunto fixo de casos currículo/vaga com gabarito, reexecutado a
  cada sprint que toca o pipeline de análise — permite medir objetivamente o ganho do RAG
  na Sprint 9.
- **Definition of Done por sprint**: código com testes passando no CI, endpoint testável
  manualmente (Postman/Swagger), entrega documentada em 2–3 linhas no README.

## Pontos em aberto

- Qual modelo de LLM será usado (RNF03) — decisão adiada para quando o módulo de IA for
  implementado (Sprint 2), não bloqueia o setup inicial.
