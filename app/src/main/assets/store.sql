-- Schema v1. A validated aggregate is the atomic consistency boundary.
CREATE TABLE state (
    id INTEGER PRIMARY KEY CHECK(id = 1),
    revision INTEGER NOT NULL CHECK(revision > 0),
    payload TEXT NOT NULL,
    updated_at INTEGER NOT NULL
);
CREATE TABLE history (
    revision INTEGER PRIMARY KEY,
    payload TEXT NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Schema v2: disposable drafts, separate from confirmed data.
CREATE TABLE draft (
    id INTEGER PRIMARY KEY CHECK(id = 1),
    payload TEXT NOT NULL
);
