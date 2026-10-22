# Plano de execução — Score e comparação com vaga (Sprint 3)

Data: 2026-10-22

Sprint 3 definida em
[2026-09-27-jobradar-curriculo-design.md](2026-09-27-jobradar-curriculo-design.md).
Objetivo: usuário cola o texto de uma vaga, sistema compara com o currículo atual e
retorna score de aderência (0-100) + sugestões estruturadas de ajuste. **Gate 1 do
MVP** fecha aqui.

## Decisões de design (minhas, não bloqueiam — registro pra revisão)

- **Score via LLM, não algoritmo determinístico**: mesmo padrão da Sprint 2 (prompt +
  Zod schema + retry), em vez de montar lógica própria de matching de keywords.
  Mais simples de manter, mas o score fica sujeito à variação do modelo local — não é
  um cálculo auditável/determinístico. Se isso virar problema (score inconsistente
  entre rodadas do mesmo par currículo/vaga), reavalio pra algo híbrido.
- **Texto da vaga não persiste em tabela própria ainda**: a tabela `Vaga` do design
  só existe a partir da Sprint 4 (scraper). Aqui o texto é colado e usado só na hora —
  `match_analises.vaga_id` continua null. Adiciono uma coluna nova,
  `vaga_colada_texto` (nullable), só pra manter rastreável qual texto gerou aquele
  score, sem precisar da tabela `Vaga` completa ainda.
- **Sugestões (RF08) como campo novo `sugestoes`**: `{ secao, sugestao }[]`, separado
  de `pontos_fortes`/`pontos_a_melhorar` (que já existem da Sprint 2, mantidos como
  estão pra não quebrar o que já roda). `sugestoes` só é preenchido na comparação com
  vaga, fica null na análise pura.

## Passos

1. **Migration**: adicionar `vaga_colada_texto` (text, nullable) e `sugestoes`
   (jsonb, nullable) em `match_analises`.
2. **Schema Zod** do novo contrato de saída do LLM (score 0-100, pontos_fortes,
   pontos_a_melhorar, sugestoes por seção/bullet).
3. **Service** `compararCurriculoComVaga(rawContent, vagaTexto)` — novo prompt,
   mesmo padrão de chamada/validação/retry do `curriculoAnalyzer.ts`.
4. **Endpoint** `POST /curriculo/comparar-vaga` — autenticado, body `{ vagaTexto }`
   validado via Zod (`validationMiddleware`, não-vazio), usa a versão atual do
   currículo do usuário, roda o service, grava `match_analise` (vaga_id null,
   vaga_colada_texto preenchido).
5. **Casos de teste**:
   - Unitário do contrato (mock do LLM), como na Sprint 2.
   - **Gabarito manual** (pede o design): montar 2-3 pares currículo/vaga reais e
     avaliar manualmente se o score e as sugestões fazem sentido — isso é
     verificação qualitativa, não dá pra automatizar como assert de valor exato com
     um modelo local não-determinístico. Vou rodar e reportar o resultado, não vai
     virar teste de CI.
6. **Validar Gate 1**: score gerado a partir de um currículo e vaga reais, ponta a
   ponta.
7. **Commits separados** por unidade lógica + push, como vem sendo feito.

## Resultado

Implementado, testado e commitado/pushed (`4da13b7..ee6e13c`). Endpoint
`POST /curriculo/comparar-vaga` funcional.

**Gate 1 validado** — mesmo currículo real, duas vagas coladas:
- Vaga aderente (backend júnior Node.js/TypeScript, bate quase tudo): **score 95**
- Vaga completamente fora do perfil (ML sênior, Python/Kubernetes/mestrado): **score 20**

Modelo diferencia bem os dois casos — score reage de forma sensata à aderência real,
não é número arbitrário.

### Testes adicionais (pedido do usuário, pós-entrega)

Mesmo currículo real, mais casos:
- Vaga parcialmente aderente (frontend pleno, stack parcialmente sobreposta, nível
  acima do currículo): **score 60** — gradação condizente entre os 3 pontos (20 / 60 / 95).
- **Consistência**: mesmo par currículo/vaga (o caso de score 95) rodado 3x seguidas →
  **95, 95, 95**. O risco de variação entre rodadas que eu tinha registrado no plano
  original não se confirmou nesse teste — na prática, pra esse modelo e esse prompt, o
  score saiu estável. Não é garantia formal (amostra pequena), mas reduz a preocupação
  inicial.

## Fora de escopo nesta etapa

- Persistir vaga como entidade própria / deduplicação (Sprint 4).
- Qualquer scraping (Sprint 4).
- RF09 (recalcular score após usuário editar currículo) — decorre naturalmente do
  endpoint existir, mas não vou automatizar gatilho nenhum agora, só o endpoint sob
  demanda.
