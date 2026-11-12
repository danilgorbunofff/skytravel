import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./AppRoutes";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { SsrDataContext } from "./ssr/SsrDataContext";
import type { SsrPayload } from "./ssr/types";

export default function App({ ssrData = null }: { ssrData?: SsrPayload | null }) {
  return (
    <ErrorBoundary>
      <SsrDataContext.Provider value={ssrData}>
        <BrowserRouter>
          <AppRoutes initialDict={ssrData?.dict} initialDictLang={ssrData?.lang} />
        </BrowserRouter>
      </SsrDataContext.Provider>
    </ErrorBoundary>
  );
}
