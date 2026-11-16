-- docs/25 S6 (finding 9, decision Q6: R2 only). The social mockup feature was never built: no code ever wrote a row
-- to this table (the only references were a delete in user anonymization and a NOT EXISTS in the unused-upload
-- cleanup, both removed with this migration). The site was never deployed, so there is no production row to keep.
-- Its foreign keys, indexes and CHECKs go with the table; no enum belonged to it.
DROP TABLE "social_mockups";
