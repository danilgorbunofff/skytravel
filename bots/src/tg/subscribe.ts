import type { Api } from "grammy";

const ACTIVE_STATUSES = new Set(["creator", "administrator", "member"]);

export async function isSubscribed(
  api: Api,
  channelId: string,
  userId: number,
): Promise<boolean | null> {
  try {
    const member = await api.getChatMember(channelId, userId);
    return ACTIVE_STATUSES.has(member.status);
  } catch {
    return null;
  }
}
