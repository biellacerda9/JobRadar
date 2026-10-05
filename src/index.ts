import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import express from "express";
import bodyParser from "body-parser";
//import { registerUser, loginUser } from "./routes/auth.js";
import authRouter from "./routes/auth.js";

const app = express();
const PORT = 3001;

app.use(bodyParser.json());
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
export const db = drizzle({ client: pool });

app.use(authRouter);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
