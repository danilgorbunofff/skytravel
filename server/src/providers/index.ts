// ──────────────────────────────────────────────
// Provider barrel — registers all providers
// ──────────────────────────────────────────────

import { registerProvider } from "./registry.js";
import { AlexandriaProvider } from "./alexandriaProvider.js";
import { OrextravelProvider } from "./orextravelProvider.js";

registerProvider(new AlexandriaProvider());
registerProvider(new OrextravelProvider());

export * from "./types.js";
export { registerProvider, getProvider, getAllProviders } from "./registry.js";
