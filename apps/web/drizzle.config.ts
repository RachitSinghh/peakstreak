import net from "node:net"

import "dotenv/config"
import { config } from "dotenv"
import { defineConfig } from "drizzle-kit"

// drizzle-kit runs in its own process without lib/db, so it misses the Happy
// Eyeballs fix there. Node 20+ abandons each connect attempt after 250ms;
// Neon's IPv4 endpoint needs longer, so migrate would hang then ETIMEDOUT.
// Disable the autoSelect race here too so `db:migrate` can connect.
net.setDefaultAutoSelectFamily(false)

config({ path: ".env.local" })

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set — copy .env.example to .env.local and fill it in")
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Migrations need a direct (unpooled) connection when using Neon/pgbouncer.
    url: process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL,
  },
  strict: true,
  verbose: true,
})
