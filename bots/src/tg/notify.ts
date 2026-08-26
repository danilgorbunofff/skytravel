import { config } from "../config.js";
import { logger } from "../logger.js";
import type { BotLead } from "../generated/prisma/client/client.js";
import { ownerIntentText, ownerNewLeadText, ownerReviewText } from "./texts.js";
import { getInfoBot } from "./infoBot.js";

async function sendToOwnerRaw(text: string): Promise<void> {
  const targets = config.telegram.ownerChatIds;
  if (targets.length === 0) return;
  const infoBot = getInfoBot();
  for (const chatId of targets) {
    let sent = false;
    if (infoBot) {
      try {
        await infoBot.api.sendMessage(chatId, text);
        sent = true;
      } catch (e) {
        logger.warn(e, `info bot send to ${chatId} failed, falling back to main bot`);
      }
    }
    if (!sent) {
      const { bot } = await import("./bot.js");
      await bot.api.sendMessage(chatId, text);
    }
  }
}

export async function notifyOwnerNewLead(lead: BotLead): Promise<void> {
  try {
    await sendToOwnerRaw(ownerNewLeadText(lead));
  } catch (e) {
    logger.error(e, "failed to notify owner");
  }
}

export async function notifyOwnerIntent(lead: BotLead, intent: string): Promise<void> {
  try {
    await sendToOwnerRaw(ownerIntentText(lead, intent));
  } catch (e) {
    logger.error(e, "failed to notify owner about intent");
  }
}

export async function forwardReview(
  lead: BotLead,
  kind: "text" | "photo",
  body: string,
): Promise<void> {
  try {
    await sendToOwnerRaw(ownerReviewText(lead, kind, body));
  } catch (e) {
    logger.error(e, "failed to forward review");
  }
}

export async function forwardPhotoToOwner(
  lead: BotLead,
  fileId: string,
  caption?: string,
): Promise<void> {
  const targets = config.telegram.ownerChatIds;
  if (targets.length === 0) return;
  try {
    await sendToOwnerRaw(ownerReviewText(lead, "photo", caption ?? ""));
    const infoBot = getInfoBot();
    const targetBot = infoBot ?? (await import("./bot.js")).bot;
    for (const chatId of targets) {
      try {
        await targetBot.api.sendPhoto(chatId, fileId);
      } catch (e) {
        logger.warn(e, `forward photo to ${chatId} failed`);
      }
    }
  } catch (e) {
    logger.error(e, "failed to forward photo");
  }
}

export async function sendToOwner(text: string): Promise<void> {
  try {
    await sendToOwnerRaw(text);
  } catch (e) {
    logger.error(e, "failed to message owner");
  }
}
