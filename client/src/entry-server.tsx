/**
 * Server-side rendering entry. Built with `vite build --ssr` into
 * client/dist-ssr/entry-server.js and loaded by the Express server
 * (server/src/ssr/renderer.ts).
 */
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import AppRoutes from "./AppRoutes";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { SsrDataContext, serializeSsrPayload } from "./ssr/SsrDataContext";
import type { SsrPayload } from "./ssr/types";
import { headDataFor, renderHead } from "./seo/head";
import csDict from "./data/translations/cs";
import ruDict from "./data/translations/ru";

export interface RenderResult {
  html: string;
  head: string;
  /** JSON for <script type="application/json" id="__SSR_DATA__"> */
  data: string;
  htmlLang: string;
}

export function render(input: Omit<SsrPayload, "dict">): RenderResult {
  const payload: SsrPayload = {
    ...input,
    dict: (input.lang === "ru" ? ruDict : csDict) as Record<string, string>,
  };

  const html = renderToString(
    <ErrorBoundary>
      <SsrDataContext.Provider value={payload}>
        <StaticRouter location={payload.path}>
          <AppRoutes initialDict={payload.dict} initialDictLang={payload.lang} />
        </StaticRouter>
      </SsrDataContext.Provider>
    </ErrorBoundary>,
  );

  return {
    html,
    head: renderHead(headDataFor(payload)),
    data: serializeSsrPayload(payload),
    htmlLang: payload.lang,
  };
}
