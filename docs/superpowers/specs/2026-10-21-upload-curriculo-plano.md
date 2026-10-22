# Plano de execução — Upload de currículo (Sprint 1, item final)

Data: 2026-10-21

Parte da Sprint 1 definida em
[2026-09-27-jobradar-curriculo-design.md](2026-09-27-jobradar-curriculo-design.md).
Já implementado em código, nesta etapa falta ligar, validar e testar.

## Já criado (não ligado ainda)

- `src/services/curriculoParser.ts` — extração de texto bruto de PDF (`pdf-parse`) e
  DOCX (`mammoth`), com whitelist de mimetypes suportados.
- `src/middleware/authMiddleware.ts` — autenticação via JWT (`Authorization: Bearer`),
  necessário porque upload de currículo é por usuário.
- `src/routes/curriculo.ts` — `POST /curriculo/upload`, multer (memória, limite 5MB),
  cria ou reaproveita o `curriculo` do usuário, grava nova `curriculo_version` e
  atualiza `actual_version`.

## Passos restantes

1. **Ligar a rota** em `src/index.ts` — `app.use("/curriculo", curriculoRouter)`.
2. **Checagem estática** — `npx tsc --noEmit` e `npm run lint` limpos nos 3 arquivos
   novos.
3. **Teste manual end-to-end** — registrar/logar usuário de teste, enviar um PDF e um
   DOCX reais via curl/Postman, conferir no banco que `curriculos` e
   `curriculo_versions` gravaram corretamente.
4. **Testes unitários do parser** — `extractRawText` com fixtures de PDF e DOCX reais
   (sem rede, sem banco), cobrindo extração correta e tipo de arquivo não suportado.
5. **Commit.**

## Fora de escopo nesta etapa

- Análise estruturada do conteúdo extraído (Sprint 2, pipeline de LLM).
- Qualquer decisão de custo de API de IA ou de deploy — fica para quando a Sprint 2
  começar, decisão do usuário.
