import { config } from "../config.js";
import { logger } from "./logger.js";

/** Escapes text for Telegram's HTML parse mode. */
export function tgEscape(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function isTelegramLeadsConfigured(): boolean {
  return Boolean(config.telegramLeads.botToken && config.telegramLeads.chatIds.length > 0);
}

/**
 * Sends an HTML-formatted message to every configured leads chat
 * (TELEGRAM_LEADS_CHAT_ID, comma-separated). Returns true when at least one
 * chat received it.
 */
export async function sendTelegramLeadMessage(html: string): Promise<boolean> {
  const { botToken, chatIds } = config.telegramLeads;
  if (!botToken || chatIds.length === 0) return false;

  const results = await Promise.all(
    chatIds.map(async (chatId) => {
      try {
        const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: html,
            parse_mode: "HTML",
            disable_web_page_preview: true,
          }),
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) {
          logger.error({ status: res.status, chatId }, "Telegram sendMessage failed");
          return false;
        }
        return true;
      } catch (err) {
        logger.error({ err, chatId }, "Telegram sendMessage error");
        return false;
      }
    }),
  );
  return results.some(Boolean);
}
