function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function optional(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

export const config = {
  port: Number(process.env.BOT_PORT ?? 3005),
  logLevel: optional("LOG_LEVEL", "info"),
  databaseUrl: required("DATABASE_URL"),

  telegram: {
    token: optional("TELEGRAM_BOT_TOKEN"),
    botUsername: optional("TELEGRAM_BOT_USERNAME"),
    infoToken: optional("TELEGRAM_INFO_BOT_TOKEN"),
    ownerChatId: optional("OWNER_CHAT_ID"),
    ownerChatIds: (() => {
      const raw = optional("OWNER_CHAT_IDS") || optional("OWNER_CHAT_ID");
      return raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    })(),
    channelId: optional("CHANNEL_ID", "@your_channel"),
    channelUsername: optional("CHANNEL_USERNAME"),
    managerContact: optional("MANAGER_CONTACT"),
    polling: process.env.TELEGRAM_POLLING === "true" || process.env.TELEGRAM_POLLING === "1",
  },

  instagram: {
    verifyToken: optional("IG_VERIFY_TOKEN"),
    appSecret: optional("META_APP_SECRET"),
    pageToken: optional("META_PAGE_TOKEN"),
    igUserId: optional("IG_USER_ID"),
    apiVersion: optional("META_API_VERSION", "v23.0"),
  },
} as const;

export function telegramEnabled(): boolean {
  return config.telegram.token.length > 0;
}

export function channelLink(): string {
  if (config.telegram.channelUsername) {
    return `https://t.me/${config.telegram.channelUsername.replace("@", "")}`;
  }
  const fallback = config.telegram.channelId.replace("@", "").replace("-100", "");
  return `https://t.me/${fallback}`;
}

export function instagramEnabled(): boolean {
  return config.instagram.pageToken.length > 0 && config.instagram.igUserId.length > 0;
}
