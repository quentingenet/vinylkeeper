CREATE TABLE IF NOT EXISTS loans (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    album_id INTEGER NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
    loan_date TIMESTAMPTZ DEFAULT NOW(),
    return_date TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
