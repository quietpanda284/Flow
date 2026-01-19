-- Create the database
CREATE DATABASE IF NOT EXISTS flowstate;
USE flowstate;

-- Create Categories table
CREATE TABLE IF NOT EXISTS Categories (
    id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type ENUM('focus', 'meeting', 'break', 'other') NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY name (name)
);

-- Create TimeBlocks table
CREATE TABLE IF NOT EXISTS TimeBlocks (
    id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    app VARCHAR(255) NOT NULL DEFAULT 'Manual',
    date DATE NOT NULL,             -- Format: YYYY-MM-DD
    startTime VARCHAR(10) NOT NULL, -- Format: HH:MM
    endTime VARCHAR(10) NOT NULL,   -- Format: HH:MM
    durationMinutes INTEGER NOT NULL,
    type VARCHAR(50) NOT NULL,      -- Stores the CategoryType string
    categoryId VARCHAR(36),         -- Changed from CHAR to VARCHAR to avoid padding on 'custom'   
    description TEXT,
    isPlanned BOOLEAN DEFAULT FALSE,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY categoryId (categoryId),
    KEY date (date)
);
