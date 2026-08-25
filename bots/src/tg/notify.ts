import { config } from "../config.js";
import { logger } from "../logger.js";
import type { BotLead } from "../generated/prisma/client/client.js";
import { ownerIntentText, ownerNewLeadText, ownerReviewText } from "./texts.js";

async function sendToOwnerRaw(text: string): Promise<void> {
  if (!config.telegram.ownerChatId) return;
  const { bot } = await import("./bot.js");
  await bot.api.sendMessage(config.telegram.ownerChatId, text);
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
  if (!config.telegram.ownerChatId) return;
  try {
    await sendToOwnerRaw(ownerReviewText(lead, "photo", caption ?? ""));
    const { bot } = await import("./bot.js");
    await bot.api.sendPhoto(config.telegram.ownerChatId, fileId);
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
