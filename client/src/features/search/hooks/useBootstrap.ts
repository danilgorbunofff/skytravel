import { useCallback, useEffect, useMemo, useState } from "react";
import { loadBootstrap } from "../../../api/bootstrapCache";
import { loadDestinations as loadDestinationsCache } from "../../../api/destinationsCache";
import type { ProviderMeta, PublicDestinationSummary } from "../../../types/providers";

type DestinationsStatus = "loading" | "error" | "ready";

export interface BootstrapState {
  providers: ProviderMeta[];
  providerLabels: Record<string, string>;
  destinations: PublicDestinationSummary[];
  destinationsStatus: DestinationsStatus;
  destinationsError: string | null;
  retryDestinations: () => void;
}

export function useBootstrap(): BootstrapState {
  const [providers, setProviders] = useState<ProviderMeta[]>([]);
  const [destinationsState, setDestinationsState] = useState<{
    status: DestinationsStatus;
    items: PublicDestinationSummary[];
    message: string | null;
  }>({ status: "loading", items: [], message: null });

  // Load providers
  useEffect(() => {
    let cancelled = false;
    const { cached, fresh } = loadBootstrap();

    function applyBootstrap(data: { providers: ProviderMeta[] }) {
      if (cancelled) return;
      setProviders(data.providers);
    }

    if (cached) {
      applyBootstrap(cached);
    }

    fresh
      .then((data) => {
        applyBootstrap(data);
      })
      .catch((err) => {
        if (cancelled) return;
        if (!cached) {
          // If we have no cache, we can't do much
          console.warn("Bootstrap load failed:", err);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Load destinations
  const loadDestinations = useCallback(() => {
    let cancelled = false;
    const { cached, fresh } = loadDestinationsCache();

    if (cached) {
      setDestinationsState({
        status: "ready",
        items: cached.items,
        message: null,
      });
    } else {
      setDestinationsState({ status: "loading", items: [], message: null });
    }

    fresh
      .then((data) => {
        if (cancelled) return;
        setDestinationsState({
          status: "ready",
          items: data.items,
          message: null,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        if (!cached) {
          setDestinationsState({
            status: "error",
            items: [],
            message: err instanceof Error ? err.message : "Nepodařilo se načíst destinace.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const cleanup = loadDestinations();
    return cleanup;
  }, [loadDestinations]);

  const providerLabels = useMemo(
    () => Object.fromEntries(providers.map((p) => [p.id, p.label])),
    [providers],
  );

  return {
    providers,
    providerLabels,
    destinations: destinationsState.items,
    destinationsStatus: destinationsState.status,
    destinationsError: destinationsState.message,
    retryDestinations: loadDestinations,
  };
}
