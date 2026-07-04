import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"

import { env } from "@/lib/env"
import * as schema from "./schema"

const globalForDb = globalThis as unknown as { pgPool?: Pool }

function createPool(): Pool {
  const pool = new Pool({
    connectionString: env().DATABASE_URL,
    max: 10,
    // Neon (serverless Postgres) suspends its compute after ~5 min idle. Give
    // a fresh connection time to wake it instead of failing the first request.
    connectionTimeoutMillis: 10_000,
    keepAlive: true,
  })
  // When Neon suspends, it drops idle connections. Without this listener,
  // node-postgres turns that idle-client termination into an *unhandled*
  // exception that can crash the process and poisons the pool — which shows
  // up as intermittent "Failed query" errors on the first request after an
  // idle period. Swallow it; the pool discards the dead client and opens a
  // fresh one on the next query.
  pool.on("error", (err) => {
    console.warn("[db] idle client error (recovering):", err.message)
  })
  return pool
}

// Reuse the pool across dev hot-reloads so we don't leak connections (and so
// the error listener above is attached exactly once per pool).
const pool = (globalForDb.pgPool ??= createPool())

export const db = drizzle(pool, { schema, casing: "snake_case" })

export type Db = typeof db
export { schema }
