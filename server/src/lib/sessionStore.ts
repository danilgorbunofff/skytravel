import session from "express-session";
import MySQLStoreFactory from "express-mysql-session";

const MySQLStore = MySQLStoreFactory(session as never);

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

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  throw new Error("DATABASE_URL is required for session store");
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
