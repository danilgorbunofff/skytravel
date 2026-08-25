import { config } from "../config.js";
import { logger } from "../logger.js";

const GRAPH_BASE = "https://graph.facebook.com";

export async function sendPrivateReply(commentId: string, text: string): Promise<boolean> {
  const url = `${GRAPH_BASE}/${config.instagram.apiVersion}/${config.instagram.igUserId}/messages`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        access_token: config.instagram.pageToken,
        recipient: { comment_id: commentId },
        message: { text },
      }),
    });
    if (!res.ok) {
      logger.error({ status: res.status, body: await res.text() }, "private reply failed");
      return false;
    }
    return true;
  } catch (e) {
    logger.error(e, "private reply error");
    return false;
  }
}

export async function replyToCommentPublicly(commentId: string, text: string): Promise<void> {
  const url = `${GRAPH_BASE}/${config.instagram.apiVersion}/${commentId}/replies`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        access_token: config.instagram.pageToken,
        message: text,
      }),
    });
    if (!res.ok) {
      logger.warn({ status: res.status }, "public comment reply failed");
    }
  } catch (e) {
    logger.warn(e, "public comment reply error");
  }
}
