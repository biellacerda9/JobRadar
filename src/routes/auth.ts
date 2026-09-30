import bcrypt from "bcrypt";
import { db } from "../index.js";
import { users } from "../db/schema.js";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import express, { type Request, type Response } from "express";
import { validationMiddleware } from "../middleware/validationMiddleware.js";
import { createUserSchema, loginUserSchema } from "./auth.schema.js";

const router = express.Router();

router.use(express.json());

const saltRounds = 12;
const SECRET_KEY = process.env.SECRET_KEY;

interface TokenPayload {
  userId: string;
}

export function generateToken(userId: string) {
  const payload: TokenPayload = { userId };
  return jwt.sign(payload, SECRET_KEY!, { expiresIn: "30m" });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, SECRET_KEY!) as TokenPayload;
    return decoded;
  } catch (error) {
    console.error("Token verification failed:", error);
    return null;
  }
}

export async function registerUser(userData: {
  name: string;
  email: string;
  password: string;
}) {
  const { name, email, password } = userData;

  const password_hash = await bcrypt.hash(password, saltRounds);

  const [user] = await db
    .insert(users)
    .values({
      name,
      email,
      password_hash,
    })
    .returning();

  const userWithoutPassword = { ...user, password_hash: undefined };

  if (!user) {
    throw new Error("User registration failed");
  }

  return { user: userWithoutPassword, token: generateToken(user.id) };
}

export async function loginUser(userData: { email: string; password: string }) {
  const { email, password } = userData;

  const user = await db.select().from(users).where(eq(users.email, email));

  const password_hash = user[0]?.password_hash;

  if (!user[0] || !password_hash) {
    throw new Error("E-mail or password is incorrect");
  }

  const isPasswordValid = await bcrypt.compare(password, password_hash);

  if (!isPasswordValid) {
    throw new Error("Invalid password");
  }

  const token = generateToken(user[0].id);

  return { token };
}

//rota de registro
//modelagem: rota post, recebe name, email e password, valida os dados, chama registerUser e retorna o usuário sem a senha e o token
router.post(
  "/register",
  validationMiddleware(createUserSchema),
  async (req: Request, res: Response) => {
    try {
      const { name, email, password } = req.body;

      const { user, token } = await registerUser({ name, email, password });

      res.status(201).json({ user, token });
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

//rota de login
//modelagem: rota post, recebe email e password, valida os dados, chama loginUser e retorna o token
router.post(
  "/login",
  validationMiddleware(loginUserSchema),
  async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      const { token } = await loginUser({ email, password });

      res.status(200).json({ token });
    } catch (error) {
      console.error("Error logging in user:", error);
      res.status(401).json({ error: "Invalid email or password" });
    }
  },
);

export default router;
