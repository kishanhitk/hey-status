-- Add a new table for incident updates
CREATE TABLE incident_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('investigating', 'identified', 'monitoring', 'resolved')),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID NOT NULL REFERENCES users(id)
);

-- Add an index for faster queries
CREATE INDEX idx_incident_updates_incident_id ON incident_updates(incident_id);

-- Remove the status column from the incidents table
ALTER TABLE incidents DROP COLUMN status;

-- Add a function to get the latest status for an incident
CREATE OR REPLACE FUNCTION get_latest_incident_status(incident_id UUID)
RETURNS TEXT AS $$
DECLARE
  latest_status TEXT;
BEGIN
  SELECT status INTO latest_status
  FROM incident_updates
  WHERE incident_id = $1
  ORDER BY created_at DESC
  LIMIT 1;
  
  RETURN latest_status;
END;
$$ LANGUAGE plpgsql;
