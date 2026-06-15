import session from "express-session";
import MySQLStoreFactory from "express-mysql-session";
import { config } from "../config.js";

// The express-mysql-session types expect the express-session module type.
// This works correctly at runtime; the types just don't align perfectly.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
const MySQLStore = MySQLStoreFactory(session as unknown as typeof import("express-session"));

function parseDatabaseUrl(url: string) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: Number(parsed.port) || 3306,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.slice(1), // remove leading '/'
  };
}

const dbUrl = config.databaseUrl;
if (!dbUrl) {
  const msg = "FATAL: DATABASE_URL must be set in the environment.";
  console.error(msg);
  throw new Error(msg);
}

export const sessionStore = new MySQLStore({
  ...parseDatabaseUrl(dbUrl),
  clearExpired: true,
  checkExpirationInterval: 15 * 60 * 1000, // 15 min
  expiration: 8 * 60 * 60 * 1000, // 8 hours (matches cookie maxAge)
  createDatabaseTable: true,
  schema: {
    tableName: "sessions",
    columnNames: {
      session_id: "session_id",
      expires: "expires",
      data: "data",
    },
  },
});
