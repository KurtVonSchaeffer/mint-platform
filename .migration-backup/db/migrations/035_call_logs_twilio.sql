-- Add Twilio fields to call_logs
ALTER TABLE call_logs
  ADD COLUMN IF NOT EXISTS twilio_call_sid TEXT,
  ADD COLUMN IF NOT EXISTS recording_url   TEXT;

CREATE INDEX IF NOT EXISTS call_logs_twilio_call_sid_idx ON call_logs (twilio_call_sid);
