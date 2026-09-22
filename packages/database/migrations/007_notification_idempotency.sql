-- Event workers retry by design. This key makes internal notifications
-- idempotent across retries and concurrent deliveries.
DELETE FROM notifications older
USING notifications newer
WHERE older.recipient_id = newer.recipient_id
  AND older.type = newer.type
  AND older.reference_id = newer.reference_id
  AND older.reference_id IS NOT NULL
  AND (older.created_at < newer.created_at OR (older.created_at = newer.created_at AND older.id < newer.id));

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_delivery_unique
  ON notifications(recipient_id, type, reference_id);
