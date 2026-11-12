import { config } from "../config.js";
import { logger } from "./logger.js";

export const SITE_URL = "https://sky-travel.tours";
export const INDEXNOW_KEY_PATH = "/indexnow-key.txt";
const ENDPOINT = "https://api.indexnow.org/indexnow";

/**
 * Notifies IndexNow (shared by Seznam, Bing, Yandex…) that URLs changed.
 * Run after a deploy: `npm --workspace server run indexnow`.
 */
export async function submitToIndexNow(urls: string[]): Promise<{ ok: boolean; status: number }> {
  if (!config.indexNowKey) throw new Error("INDEXNOW_KEY is not set");
  const host = new URL(SITE_URL).host;
  const urlList = urls.filter((u) => u.startsWith(SITE_URL)).slice(0, 10_000);
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host,
      key: config.indexNowKey,
      keyLocation: `${SITE_URL}${INDEXNOW_KEY_PATH}`,
      urlList,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  logger.info({ status: res.status, count: urlList.length }, "IndexNow submitted");
  return { ok: res.status === 200 || res.status === 202, status: res.status };
}
