CREATE TABLE IF NOT EXISTS collections (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);