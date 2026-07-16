import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

// Pool and db are only initialized when DATABASE_URL is present.
// The API server no longer uses Drizzle — all data goes through Supabase.
// These exports remain for tooling (drizzle-kit push) and future use.
export const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null as any;

export const db = process.env.DATABASE_URL
  ? drizzle(pool, { schema })
  : null as any;

export * from "./schema";
