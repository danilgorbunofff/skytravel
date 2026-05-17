-- Phase 2: search-perf indexes for ProviderTour.
-- Composite indexes covering common (source + filter) tuples used by the
-- public search routes. Verified against where/orderBy clauses in
-- alexandriaProvider.ts and orextravelProvider.ts.

CREATE INDEX `ProviderTour_source_transport_idx`
  ON `ProviderTour` (`source`, `transport`);

CREATE INDEX `ProviderTour_source_board_idx`
  ON `ProviderTour` (`source`, `board`);

CREATE INDEX `ProviderTour_source_startDate_idx`
  ON `ProviderTour` (`source`, `startDate`);

CREATE INDEX `ProviderTour_source_stateId_price_idx`
  ON `ProviderTour` (`source`, `stateId`, `price`);
