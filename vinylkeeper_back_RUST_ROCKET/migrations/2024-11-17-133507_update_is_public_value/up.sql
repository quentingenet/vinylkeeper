UPDATE collections
SET is_public = TRUE
WHERE is_public IS NULL;

ALTER TABLE collections
ALTER COLUMN is_public SET DEFAULT TRUE,
ALTER COLUMN is_public SET NOT NULL;