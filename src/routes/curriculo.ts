import express, { type Response } from "express";
import multer from "multer";
import { eq, count } from "drizzle-orm";
import { db } from "../index.js";
import { curriculos, curriculo_versions, match_analises } from "../db/schema.js";
import { authMiddleware, type AuthenticatedRequest } from "../middleware/authMiddleware.js";
import {
  extractRawText,
  SUPPORTED_MIME_TYPES,
  UnsupportedFileTypeError,
} from "../services/curriculoParser.js";
import {
  analyzeCurriculo,
  CurriculoAnalysisError,
} from "../services/curriculoAnalyzer.js";
import {
  compararCurriculoComVaga,
  CurriculoComparacaoError,
} from "../services/curriculoComparador.js";
import { comparacaoVagaInputSchema } from "../services/curriculoComparacao.schema.js";
import { validationMiddleware } from "../middleware/validationMiddleware.js";

const router = express.Router();

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, callback) => {
    if (!SUPPORTED_MIME_TYPES.includes(file.mimetype as never)) {
      callback(new UnsupportedFileTypeError(file.mimetype));
      return;
    }
    callback(null, true);
  },
});

async function getOrCreateCurriculo(userId: string) {
  const [existing] = await db
    .select()
    .from(curriculos)
    .where(eq(curriculos.user_id, userId));

  if (existing) return existing;

  const [created] = await db
    .insert(curriculos)
    .values({ user_id: userId })
    .returning();

  if (!created) {
    throw new Error("Failed to create curriculo");
  }

  return created;
}

router.post(
  "/upload",
  authMiddleware,
  (req: AuthenticatedRequest, res: Response, next) => {
    upload.single("file")(req, res, (error: unknown) => {
      if (error instanceof UnsupportedFileTypeError) {
        return res.status(400).json({ error: error.message });
      }
      if (error instanceof multer.MulterError) {
        return res.status(400).json({ error: error.message });
      }
      if (error) return next(error);
      next();
    });
  },
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const rawContent = await extractRawText(file.buffer, file.mimetype);

      if (!rawContent) {
        return res
          .status(422)
          .json({ error: "Could not extract text from file" });
      }

      const curriculo = await getOrCreateCurriculo(userId);

      const [versionCountRow] = await db
        .select({ value: count() })
        .from(curriculo_versions)
        .where(eq(curriculo_versions.curriculo_id, curriculo.id));

      const nextVersionNumber = String((versionCountRow?.value ?? 0) + 1);

      const [version] = await db
        .insert(curriculo_versions)
        .values({
          curriculo_id: curriculo.id,
          version_number: nextVersionNumber,
          raw_content: rawContent,
          structured_content: {},
        })
        .returning();

      if (!version) {
        throw new Error("Failed to create curriculo version");
      }

      await db
        .update(curriculos)
        .set({ actual_version: version.id })
        .where(eq(curriculos.id, curriculo.id));

      res.status(201).json({
        curriculoId: curriculo.id,
        versionId: version.id,
        versionNumber: version.version_number,
      });
    } catch (error) {
      if (error instanceof UnsupportedFileTypeError) {
        return res.status(400).json({ error: error.message });
      }
      console.error("Error uploading curriculo:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.post(
  "/analise",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.userId!;

      const [curriculo] = await db
        .select()
        .from(curriculos)
        .where(eq(curriculos.user_id, userId));

      if (!curriculo?.actual_version) {
        return res
          .status(404)
          .json({ error: "No curriculo uploaded for this user yet" });
      }

      const [version] = await db
        .select()
        .from(curriculo_versions)
        .where(eq(curriculo_versions.id, curriculo.actual_version));

      if (!version) {
        return res.status(404).json({ error: "Curriculo version not found" });
      }

      const analise = await analyzeCurriculo(version.raw_content);

      await db
        .update(curriculo_versions)
        .set({ structured_content: analise.estruturado })
        .where(eq(curriculo_versions.id, version.id));

      const [matchAnalise] = await db
        .insert(match_analises)
        .values({
          versao_curriculo_id: version.id,
          pontos_fortes: analise.pontos_fortes,
          pontos_a_melhorar: analise.pontos_a_melhorar,
        })
        .returning();

      res.status(201).json({
        curriculoId: curriculo.id,
        versionId: version.id,
        estruturado: analise.estruturado,
        pontosFortes: analise.pontos_fortes,
        pontosAMelhorar: analise.pontos_a_melhorar,
        analiseId: matchAnalise?.id,
      });
    } catch (error) {
      if (error instanceof CurriculoAnalysisError) {
        return res.status(502).json({ error: error.message });
      }
      console.error("Error analyzing curriculo:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.post(
  "/comparar-vaga",
  authMiddleware,
  validationMiddleware(comparacaoVagaInputSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const { vagaTexto } = req.body as { vagaTexto: string };

      const [curriculo] = await db
        .select()
        .from(curriculos)
        .where(eq(curriculos.user_id, userId));

      if (!curriculo?.actual_version) {
        return res
          .status(404)
          .json({ error: "No curriculo uploaded for this user yet" });
      }

      const [version] = await db
        .select()
        .from(curriculo_versions)
        .where(eq(curriculo_versions.id, curriculo.actual_version));

      if (!version) {
        return res.status(404).json({ error: "Curriculo version not found" });
      }

      const comparacao = await compararCurriculoComVaga(
        version.raw_content,
        vagaTexto,
      );

      const [matchAnalise] = await db
        .insert(match_analises)
        .values({
          versao_curriculo_id: version.id,
          score: String(comparacao.score),
          pontos_fortes: comparacao.pontos_fortes,
          pontos_a_melhorar: comparacao.pontos_a_melhorar,
          vaga_colada_texto: vagaTexto,
          sugestoes: comparacao.sugestoes,
        })
        .returning();

      res.status(201).json({
        curriculoId: curriculo.id,
        versionId: version.id,
        score: comparacao.score,
        pontosFortes: comparacao.pontos_fortes,
        pontosAMelhorar: comparacao.pontos_a_melhorar,
        sugestoes: comparacao.sugestoes,
        analiseId: matchAnalise?.id,
      });
    } catch (error) {
      if (error instanceof CurriculoComparacaoError) {
        return res.status(502).json({ error: error.message });
      }
      console.error("Error comparing curriculo to vaga:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;
