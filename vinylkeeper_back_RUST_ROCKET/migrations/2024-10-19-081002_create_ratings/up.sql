CREATE TABLE IF NOT EXISTS ratings (
    id SERIAL PRIMARY KEY,
    rating INTEGER CHECK (rating >= 0 AND rating <= 5), -- La note doit être comprise entre 0 et 5
    comment VARCHAR(255),  -- Commentaire facultatif
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Clé étrangère vers User
    album_id INTEGER NOT NULL REFERENCES albums(id) ON DELETE CASCADE, -- Clé étrangère vers Album
    CONSTRAINT user_album_unique UNIQUE (user_id, album_id) -- Un utilisateur ne peut évaluer un album qu'une fois
);
