-- The import now runs every minute for one series at a time.

-- Which series a run was responsible for, as a JSON array of series ids.
-- Runs recorded before this migration imported every series at once.
ALTER TABLE import_runs ADD COLUMN series TEXT NOT NULL DEFAULT '[]';

-- The status summary reads the runs of the last 48 hours. Without this index
-- it would scan the whole log, which grows by 1,440 rows a day.
CREATE INDEX import_runs_ran_at ON import_runs (ran_at);
