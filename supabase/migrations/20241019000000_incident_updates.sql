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
