-- Add new columns to scheduled_maintenances table
ALTER TABLE scheduled_maintenances
ADD COLUMN impact TEXT CHECK (impact IN ('none', 'minor', 'major', 'critical'));

-- Remove the status column from scheduled_maintenances table
ALTER TABLE scheduled_maintenances
DROP COLUMN status;

-- Create maintenance_updates table
CREATE TABLE maintenance_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scheduled_maintenance_id UUID NOT NULL REFERENCES scheduled_maintenances(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID NOT NULL REFERENCES users(id)
);

-- Add index for faster queries
CREATE INDEX idx_maintenance_updates_scheduled_maintenance_id ON maintenance_updates(scheduled_maintenance_id);

