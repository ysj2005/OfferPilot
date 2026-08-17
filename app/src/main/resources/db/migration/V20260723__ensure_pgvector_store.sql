DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'hstore') THEN
    CREATE EXTENSION hstore WITH SCHEMA public;
  END IF;

 IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp') THEN
   CREATE EXTENSION "uuid-ossp" WITH SCHEMA public;
 END IF;

  -- vector extension skipped - install pgvector separately if needed
END
$$;
