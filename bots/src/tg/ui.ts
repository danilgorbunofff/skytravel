import { type InlineKeyboard, type Context } from "grammy";
import prisma from "../prisma.js";
import { logger } from "../logger.js";

function isPrivateChat(ctx: Context): boolean {
  return ctx.chat?.type === "private";
}

async function storedMessageId(chatId: string): Promise<number | null> {
  const row = await prisma.botUiState.findUnique({ where: { chatId } });
  return row?.messageId ?? null;
}

async function saveMessageId(chatId: string, messageId: number): Promise<void> {
  await prisma.botUiState
    .upsert({
      where: { chatId },
      create: { chatId, messageId },
      update: { messageId },
    })
    .catch((e) => logger.warn(e, "failed to save ui state"));
}

export async function show(ctx: Context, text: string, keyboard?: InlineKeyboard): Promise<void> {
  if (!isPrivateChat(ctx)) return;

  const chatId = String(ctx.chat?.id ?? "");
  const other = {
    reply_markup: keyboard ?? { inline_keyboard: [] },
  };

  const pressedMessageId = ctx.callbackQuery?.message?.message_id ?? null;
  const targetId = pressedMessageId ?? (await storedMessageId(chatId));

  if (targetId) {
    try {
      await ctx.api.editMessageText(chatId, targetId, text, other);
      await saveMessageId(chatId, targetId);
      return;
    } catch (e) {
      const msg = String((e as Error)?.message ?? "");
      if (msg.includes("message is not modified")) {
        await saveMessageId(chatId, targetId);
        return;
      }
      logger.warn({ targetId, msg }, "edit failed, replacing with new message");
      await ctx.api.deleteMessage(chatId, targetId).catch(() => undefined);
    }
  }

  const sent = await ctx.reply(text, other);
  await saveMessageId(chatId, sent.message_id);
}
