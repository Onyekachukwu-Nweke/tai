-- Concepts are generated from a page range; location keeps the start page.
ALTER TABLE concept_requests ADD COLUMN end_location INTEGER CHECK(end_location IS NULL OR end_location BETWEEN 1 AND 50);
