-- Add FULLTEXT index on ProviderTour title + description for fast text searches
-- This optimises CONTAINS queries used by admin tour search and public search.
ALTER TABLE ProviderTour ADD FULLTEXT INDEX provider_tour_search_idx (title, description);
