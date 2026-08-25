import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "./generated/prisma/client/client.js";
import { config } from "./config.js";
import { logger } from "./logger.js";

const poolUrl = new URL(config.databaseUrl);
poolUrl.searchParams.set("connectionLimit", "3");
const adapter = new PrismaMariaDb(poolUrl.toString());
const prisma = new PrismaClient({ adapter });

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS bot_leads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  telegram_id VARCHAR(64) NOT NULL,
  username VARCHAR(255),
  display_name VARCHAR(255),
  lang VARCHAR(8) NOT NULL DEFAULT 'ru',
  source VARCHAR(32) NOT NULL DEFAULT 'direct',
  branch VARCHAR(32) NOT NULL DEFAULT 'guide',
  direction VARCHAR(128),
  travel_month VARCHAR(64),
  duration VARCHAR(64),
  party VARCHAR(128),
  adults INT,
  children INT,
  child_ages VARCHAR(64),
  budget VARCHAR(64),
  status VARCHAR(32) NOT NULL DEFAULT 'new',
  subscribed BOOLEAN NOT NULL DEFAULT false,
  unsubscribed BOOLEAN NOT NULL DEFAULT false,
  last_follow_up INT NOT NULL DEFAULT 0,
  departure_date DATETIME(3),
  tour_title VARCHAR(255),
  tour_price INT,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL,
  UNIQUE INDEX bot_leads_telegram_id_key (telegram_id),
  INDEX bot_leads_status_idx (status),
  INDEX bot_leads_branch_idx (branch),
  INDEX bot_leads_created_at_idx (created_at)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bot_quiz_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  chat_id VARCHAR(64) NOT NULL,
  step INT NOT NULL DEFAULT 0,
  direction VARCHAR(128),
  travel_month VARCHAR(64),
  duration VARCHAR(64),
  adults INT,
  has_children INT,
  child_count INT,
  child_ages VARCHAR(64),
  budget VARCHAR(64),
  source VARCHAR(32) NOT NULL DEFAULT 'direct',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL,
  UNIQUE INDEX bot_quiz_sessions_chat_id_key (chat_id)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bot_keyword_hits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  keyword VARCHAR(32) NOT NULL,
  branch VARCHAR(32) NOT NULL,
  comment_id VARCHAR(64) NOT NULL,
  media_id VARCHAR(64),
  commenter VARCHAR(255),
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX bot_keyword_hits_comment_id_key (comment_id),
  INDEX bot_keyword_hits_keyword_created_at_idx (keyword, created_at)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bot_chat_ui (
  chat_id VARCHAR(64) NOT NULL PRIMARY KEY,
  message_id INT NOT NULL,
  updated_at DATETIME(3) NOT NULL
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bot_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  telegram_id VARCHAR(64) NOT NULL,
  direction VARCHAR(128),
  travel_month VARCHAR(64),
  duration VARCHAR(64),
  adults INT,
  children INT,
  child_ages VARCHAR(255),
  budget VARCHAR(64),
  wishes VARCHAR(1000),
  source VARCHAR(32) NOT NULL DEFAULT 'direct',
  status VARCHAR(32) NOT NULL DEFAULT 'new',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX bot_requests_telegram_created_idx (telegram_id, created_at)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
`;

const COLUMNS_TO_ADD: Array<[string, string, string]> = [
  ["bot_leads", "child_ages", "VARCHAR(64)"],
  ["bot_leads", "unsubscribed", "BOOLEAN NOT NULL DEFAULT false"],
  ["bot_leads", "departure_date", "DATETIME(3)"],
  ["bot_leads", "tour_title", "VARCHAR(255)"],
  ["bot_leads", "tour_price", "INT"],
  ["bot_leads", "adults", "INT"],
  ["bot_leads", "children", "INT"],
  ["bot_leads", "duration", "VARCHAR(64)"],
  ["bot_leads", "lang", "VARCHAR(8) NOT NULL DEFAULT 'ru'"],
  ["bot_quiz_sessions", "child_ages", "VARCHAR(64)"],
  ["bot_quiz_sessions", "adults", "INT"],
  ["bot_quiz_sessions", "has_children", "INT"],
  ["bot_quiz_sessions", "child_count", "INT"],
  ["bot_quiz_sessions", "duration", "VARCHAR(64)"],
  ["bot_quiz_sessions", "lang", "VARCHAR(8) NOT NULL DEFAULT 'ru'"],
  ["bot_quiz_sessions", "wishes", "VARCHAR(1000)"],
  ["bot_leads", "wishes", "VARCHAR(1000)"],
];

export async function ensureSchema(): Promise<void> {
  for (const statement of SCHEMA_SQL.split(";")) {
    const trimmed = statement.trim();
    if (trimmed.length > 0) {
      await prisma.$executeRawUnsafe(trimmed);
    }
  }
  for (const [table, column, definition] of COLUMNS_TO_ADD) {
    if (!(await columnExists(table, column))) {
      await prisma.$executeRawUnsafe(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
  }
  logger.info("Bot schema ensured");
}

async function columnExists(table: string, column: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ cnt: number }>>`
    SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ${table} AND COLUMN_NAME = ${column}
  `;
  return (rows[0]?.cnt ?? 0) > 0;
}

function shutdown() {
  prisma.$disconnect().catch((e: unknown) => logger.error(e, "prisma disconnect error"));
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

export default prisma;
