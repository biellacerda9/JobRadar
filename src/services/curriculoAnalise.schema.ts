import { z } from "zod";

export const experienciaSchema = z.object({
  empresa: z.string(),
  cargo: z.string(),
  periodo: z.string(),
  descricao: z.string(),
});

export const curriculoEstruturadoSchema = z.object({
  secoes: z.array(
    z.object({
      nome: z.string(),
      conteudo: z.string(),
    }),
  ),
  habilidades: z.array(z.string()),
  experiencias: z.array(experienciaSchema),
});

export const curriculoAnaliseSchema = z.object({
  estruturado: curriculoEstruturadoSchema,
  pontos_fortes: z.array(z.string()),
  pontos_a_melhorar: z.array(z.string()),
});

export type CurriculoAnalise = z.infer<typeof curriculoAnaliseSchema>;
