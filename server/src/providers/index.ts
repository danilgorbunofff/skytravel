// ──────────────────────────────────────────────
// Provider barrel — registers all providers
// ──────────────────────────────────────────────

import { registerProvider } from "./registry.js";
import { AlexandriaProvider } from "./alexandriaProvider.js";
registerProvider(new AlexandriaProvider());

export * from "./types.js";
export { registerProvider, getProvider, getAllProviders } from "./registry.js";
