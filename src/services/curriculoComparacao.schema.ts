import { z } from "zod";

export const sugestaoSchema = z.object({
  secao: z.string(),
  sugestao: z.string(),
});

export const curriculoComparacaoSchema = z.object({
  score: z.number().min(0).max(100),
  pontos_fortes: z.array(z.string()),
  pontos_a_melhorar: z.array(z.string()),
  sugestoes: z.array(sugestaoSchema),
});

export type CurriculoComparacao = z.infer<typeof curriculoComparacaoSchema>;

export const comparacaoVagaInputSchema = z.object({
  vagaTexto: z.string().min(20, {
    message: "vagaTexto must be at least 20 characters long",
  }),
});
