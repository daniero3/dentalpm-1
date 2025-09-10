-- Initialize database for Dental Practice Management - Madagascar
-- This file runs automatically when PostgreSQL container starts

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Set timezone for Madagascar
SET timezone = 'Indian/Antananarivo';

-- Create initial database structure will be handled by Sequelize migrations
-- This file ensures proper extensions and timezone are set

SELECT 'Database initialized for Dental Practice Management - Madagascar' AS message;