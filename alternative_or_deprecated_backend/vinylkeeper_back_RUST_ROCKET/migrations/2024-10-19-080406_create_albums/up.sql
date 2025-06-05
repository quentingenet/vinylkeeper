CREATE TABLE IF NOT EXISTS albums (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    artist_id INTEGER NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    genre_id INTEGER NOT NULL REFERENCES genres(id) ON DELETE SET NULL,
    collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE SET NULL,
    release_year INTEGER,
    description TEXT,
    cover_condition TEXT, -- Représentation de l'enum ConditionEnum
    record_condition TEXT, -- Représentation de l'enum ConditionEnum
    mood TEXT, -- Représentation de l'enum MoodEnum
    updated_at TIMESTAMPTZ DEFAULT NOW() -- Si nécessaire
);
