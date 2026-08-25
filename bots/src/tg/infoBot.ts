import { Bot } from "grammy";
import { config } from "../config.js";

let _infoBot: Bot | null = null;

export function getInfoBot(): Bot | null {
  if (_infoBot) return _infoBot;
  const token = config.telegram.infoToken;
  if (!token) return null;
  _infoBot = new Bot(token);
  return _infoBot;
}

export function infoBotEnabled(): boolean {
  return (config.telegram.infoToken?.length ?? 0) > 0;
}
