-- Atomic rate limiting for serverless API instances.
-- Run with the same migration process used for packages/database/migrations.

CREATE OR REPLACE FUNCTION consume_rate_limit(
  p_key text,
  p_window_ms integer,
  p_max integer
) RETURNS TABLE (
  allowed boolean,
  remaining integer,
  reset_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count integer;
  v_reset_at timestamptz;
  v_now timestamptz := clock_timestamp();
BEGIN
  IF p_key IS NULL OR length(p_key) > 512 OR p_window_ms < 1000 OR p_max < 1 THEN
    RAISE EXCEPTION 'invalid rate limit parameters';
  END IF;

  INSERT INTO rate_limits AS current_bucket (key, count, reset_at)
  VALUES (p_key, 1, v_now + make_interval(secs => p_window_ms::double precision / 1000))
  ON CONFLICT (key) DO UPDATE SET
    count = CASE
      WHEN current_bucket.reset_at <= v_now THEN 1
      ELSE current_bucket.count + 1
    END,
    reset_at = CASE
      WHEN current_bucket.reset_at <= v_now
        THEN v_now + make_interval(secs => p_window_ms::double precision / 1000)
      ELSE current_bucket.reset_at
    END
  RETURNING current_bucket.count, current_bucket.reset_at
  INTO v_count, v_reset_at;

  RETURN QUERY SELECT
    v_count <= p_max,
    greatest(p_max - v_count, 0),
    v_reset_at;
END;
$$;

REVOKE ALL ON FUNCTION consume_rate_limit(text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION consume_rate_limit(text, integer, integer) TO service_role;

