-- Top-level PDF bookmarks (chapter title + start page) captured at extraction.
ALTER TABLE material_imports ADD COLUMN outline_json TEXT NOT NULL DEFAULT '[]';
