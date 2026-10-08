# JobRadar

Sistema pessoal de monitoramento de vagas de estágio/júnior integrado a uma análise de
currículo assistida por IA. Toda vaga coletada é automaticamente avaliada contra o
currículo do usuário, gerando um score de aderência e sugestões de melhoria — a
ferramenta não só encontra vagas, como mostra o quão perto o usuário está delas.

> Projeto em desenvolvimento ativo. Arquitetura completa e plano de sprints em
> [docs/superpowers/specs/2026-09-27-jobradar-curriculo-design.md](docs/superpowers/specs/2026-09-27-jobradar-curriculo-design.md).

## Stack

| Componente | Tecnologia |
|---|---|
| Backend API | Node.js + TypeScript (Express) |
| Banco de dados | PostgreSQL + Drizzle ORM |
| Autenticação | JWT + bcrypt |
| Validação | Zod |
| Testes | Jest |
| CI | GitHub Actions (lint + testes a cada push/PR) |

## Rodando localmente

### Pré-requisitos

- Node.js 22+
- Docker (para o Postgres)

### Setup

```bash
npm install
```

Crie um arquivo `.env` na raiz com:

```
POSTGRES_USER=
POSTGRES_PASSWORD=
POSTGRES_DB=
POSTGRES_PORT=5432
DATABASE_URL=postgresql://<usuario>:<senha>@localhost:<porta>/<banco>
SECRET_KEY=
```

Suba o banco:

```bash
docker compose up -d
```

Aplique as migrations:

```bash
npx drizzle-kit migrate
```

Rode o servidor:

```bash
npm run dev
```

### Scripts disponíveis

| Comando | Descrição |
|---|---|
| `npm run dev` | Sobe o servidor em modo desenvolvimento (`tsx`) |
| `npm run lint` | Roda o ESLint |
| `npm test` | Roda a suíte de testes (Jest) |
| `npx drizzle-kit generate` | Gera uma nova migration a partir do schema |
| `npx drizzle-kit migrate` | Aplica as migrations pendentes no banco |

## Endpoints

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/auth/register` | Cria um novo usuário |
| `POST` | `/auth/login` | Autentica e retorna um token JWT |

## Modelagem de dados (parcial)

- `users` — conta do usuário (nome, email, senha com hash)
- `curriculos` — ponteiro para a versão atual de currículo de um usuário
- `curriculo_versions` — histórico de versões do currículo (conteúdo bruto e estruturado)

Modelo completo (incluindo vagas, matches e notificações) no documento de arquitetura
linkado acima.
