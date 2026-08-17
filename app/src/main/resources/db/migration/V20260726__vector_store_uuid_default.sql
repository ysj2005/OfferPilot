ALTER TABLE vector_store
    ALTER COLUMN id SET DEFAULT uuid_generate_v4();
