import crypto from "node:crypto";
import { Router, type Request, type Response } from "express";
import { config } from "../config.js";
import { logger } from "../logger.js";
import prisma from "../prisma.js";
import { matchKeyword } from "../keywords.js";
import { igPrivateReply, PUBLIC_COMMENT_REPLY } from "../tg/texts.js";
import { sendPrivateReply, replyToCommentPublicly } from "./graph.js";

interface IgCommentValue {
  id?: string;
  text?: string;
  from?: { id?: string; username?: string };
  media?: { id?: string };
}

interface IgWebhookEntry {
  changes?: Array<{ field?: string; value?: IgCommentValue }>;
}

export const instagramRouter = Router();

instagramRouter.get("/", (req: Request, res: Response) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === config.instagram.verifyToken) {
    res.status(200).send(String(challenge ?? ""));
    return;
  }
  res.sendStatus(403);
});

instagramRouter.post("/", (req: Request, res: Response) => {
  if (!isValidSignature(req)) {
    logger.warn("invalid x-hub-signature-256");
    res.sendStatus(403);
    return;
  }
  res.sendStatus(200);

  const body = req.body as { entry?: IgWebhookEntry[] } | undefined;
  for (const entry of body?.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "comments" || !change.value) continue;
      void processComment(change.value);
    }
  }
});

function isValidSignature(req: Request): boolean {
  const secret = config.instagram.appSecret;
  if (!secret) {
    return !config.instagram.pageToken;
  }
  const header = req.headers["x-hub-signature-256"];
  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
  if (typeof header !== "string" || !rawBody) return false;
  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(header));
  } catch {
    return false;
  }
}

export function warnInstagramConfig(): void {
  if (config.instagram.pageToken && !config.instagram.appSecret) {
    logger.error(
      "META_APP_SECRET is not set while META_PAGE_TOKEN is configured — Instagram webhook rejects all POST requests",
    );
  }
}

async function processComment(value: IgCommentValue): Promise<void> {
  const commentId = value.id;
  const text = value.text ?? "";
  if (!commentId) return;

  const keyword = matchKeyword(text);
  if (!keyword) return;

  try {
    await prisma.keywordHit.create({
      data: {
        keyword: keyword.word,
        branch: keyword.branch,
        commentId,
        mediaId: value.media?.id ?? null,
        commenter: value.from?.username ?? null,
      },
    });
  } catch {
    logger.info({ commentId }, "duplicate comment webhook ignored");
    return;
  }

  const dmText = igPrivateReply(keyword.branch);
  const sent = await sendPrivateReply(commentId, dmText);

  if (!sent && text.length > 0) {
    await replyToCommentPublicly(commentId, PUBLIC_COMMENT_REPLY);
  }

  logger.info({ keyword: keyword.word, commentId, sent }, "keyword processed");
}
