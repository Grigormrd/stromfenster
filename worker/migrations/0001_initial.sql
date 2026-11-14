-- One value per series and quarter hour.
-- `ts` is the start of the quarter hour in epoch seconds (UTC).
-- WITHOUT ROWID: the primary key is the table, so a write touches one row,
-- not a row plus an index entry. Written rows are what the free plan limits.
CREATE TABLE points (
  series TEXT NOT NULL,
  ts INTEGER NOT NULL,
  value REAL NOT NULL,
  PRIMARY KEY (series, ts)
) WITHOUT ROWID;

-- One row per import, to see whether imports run and what they changed.
CREATE TABLE import_runs (
  id INTEGER PRIMARY KEY,
  -- The moment the import ran for (its scheduled time), in epoch seconds.
  ran_at INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ok', 'partial', 'failed')),
  inserted INTEGER NOT NULL,
  updated INTEGER NOT NULL,
  -- Rows read and written as reported by D1; these count against the plan.
  rows_read INTEGER NOT NULL,
  rows_written INTEGER NOT NULL,
  -- JSON object: series id -> error message
  failures TEXT NOT NULL DEFAULT '{}'
);
