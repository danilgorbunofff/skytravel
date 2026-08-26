import { Bot } from "grammy";
import { config } from "../config.js";

let _infoBot: Bot | null = null;

export function getInfoBot(): Bot | null {
  if (_infoBot) return _infoBot;
  const token = config.telegram.infoToken;
  if (!token) return null;
  _infoBot = new Bot(token);
  _infoBot.api.config.use(async (prev, method, payload, signal) => {
    if (
      (method === "sendMessage" || method === "editMessageText") &&
      payload &&
      typeof payload === "object" &&
      !("parse_mode" in payload)
    ) {
      (payload as { parse_mode?: string }).parse_mode = "HTML";
    }
    return prev(method, payload, signal);
  });
  return _infoBot;
}

export function infoBotEnabled(): boolean {
  return (config.telegram.infoToken?.length ?? 0) > 0;
}
