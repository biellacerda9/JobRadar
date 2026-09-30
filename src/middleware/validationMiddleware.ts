import type { Request, Response, NextFunction } from "express";
import { ZodError, ZodObject } from "zod";
import type { ZodRawShape } from "zod";

export const validationMiddleware =
  (schema: ZodObject<ZodRawShape>) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync(req.body);
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ errors: error.issues });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  };
