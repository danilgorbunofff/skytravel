-- AddIndex: source + destination prefix index for fast text search
CREATE INDEX `ProviderTour_source_destination_idx`
  ON `ProviderTour` (`source`, `destination`(100));
