CREATE TABLE material_imports (
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  space_id TEXT NOT NULL REFERENCES study_spaces(id) ON DELETE CASCADE,
  document_id TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  state TEXT NOT NULL CHECK(state IN ('writing', 'ready', 'failed', 'cleanup')),
  filename TEXT NOT NULL,
  format TEXT NOT NULL CHECK(format IN ('pdf', 'txt')),
  warnings_json TEXT NOT NULL,
  PRIMARY KEY(user_id, space_id),
  UNIQUE(user_id, document_id)
);

CREATE TABLE material_sections (
  user_id TEXT NOT NULL,
  space_id TEXT NOT NULL,
  location INTEGER NOT NULL CHECK(location BETWEEN 1 AND 50),
  text TEXT NOT NULL,
  PRIMARY KEY(user_id, space_id, location),
  FOREIGN KEY(user_id, space_id) REFERENCES material_imports(user_id, space_id) ON DELETE CASCADE
);

CREATE TABLE material_chunks (
  user_id TEXT NOT NULL,
  space_id TEXT NOT NULL,
  id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  location INTEGER NOT NULL,
  start_offset INTEGER NOT NULL,
  end_offset INTEGER NOT NULL,
  text TEXT NOT NULL,
  PRIMARY KEY(user_id, space_id, id),
  FOREIGN KEY(user_id, space_id, location) REFERENCES material_sections(user_id, space_id, location) ON DELETE CASCADE
);
