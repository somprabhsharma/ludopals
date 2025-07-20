-- LudoPals Database Schema for Supabase PostgreSQL
-- This file contains all the necessary tables and configurations for the Ludo game

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Game Rooms Table
-- Stores information about game rooms
CREATE TABLE IF NOT EXISTS game_rooms (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    room_id VARCHAR(10) UNIQUE NOT NULL, -- Short room code for sharing
    max_players INTEGER NOT NULL DEFAULT 4 CHECK (max_players >= 2 AND max_players <= 4),
    ai_players INTEGER NOT NULL DEFAULT 0 CHECK (ai_players >= 0),
    game_state VARCHAR(20) NOT NULL DEFAULT 'waiting' CHECK (game_state IN ('waiting', 'playing', 'finished', 'abandoned')),
    current_turn INTEGER DEFAULT 0, -- Index of current player's turn
    winner_id UUID NULL, -- Reference to winning player
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure AI players don't exceed max players
    CONSTRAINT valid_ai_count CHECK (ai_players < max_players)
);

-- Players Table
-- Stores player information and their association with rooms
CREATE TABLE IF NOT EXISTS players (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    player_id VARCHAR(20) UNIQUE NOT NULL, -- Client-generated player ID
    room_id UUID REFERENCES game_rooms(id) ON DELETE CASCADE,
    player_name VARCHAR(50) NOT NULL,
    player_color VARCHAR(10) NOT NULL CHECK (player_color IN ('red', 'blue', 'green', 'yellow')),
    is_host BOOLEAN DEFAULT FALSE,
    is_ai BOOLEAN DEFAULT FALSE,
    is_connected BOOLEAN DEFAULT TRUE,
    socket_id VARCHAR(50) NULL, -- Current socket connection ID
    player_order INTEGER NOT NULL, -- Turn order (0-3)
    pieces_home INTEGER DEFAULT 4, -- Number of pieces still at home
    pieces_finished INTEGER DEFAULT 0, -- Number of pieces that reached finish
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique color per room
    UNIQUE(room_id, player_color),
    -- Ensure unique player order per room
    UNIQUE(room_id, player_order),
    -- Ensure only one host per room
    EXCLUDE USING btree (room_id WITH =) WHERE (is_host = true)
);

-- Game State Table
-- Stores the current state of game pieces and board
CREATE TABLE IF NOT EXISTS game_state (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    room_id UUID REFERENCES game_rooms(id) ON DELETE CASCADE,
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    piece_number INTEGER NOT NULL CHECK (piece_number >= 1 AND piece_number <= 4),
    position INTEGER NOT NULL DEFAULT -1, -- -1 = home, 0-51 = board positions, 52-57 = finish area
    is_safe BOOLEAN DEFAULT FALSE, -- Whether piece is on a safe tile
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique piece per player
    UNIQUE(player_id, piece_number)
);

-- Game History Table
-- Stores game moves and events for replay/analysis
CREATE TABLE IF NOT EXISTS game_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    room_id UUID REFERENCES game_rooms(id) ON DELETE CASCADE,
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    move_type VARCHAR(20) NOT NULL CHECK (move_type IN ('dice_roll', 'piece_move', 'piece_cut', 'game_start', 'game_end', 'player_join', 'player_leave')),
    dice_value INTEGER NULL CHECK (dice_value >= 1 AND dice_value <= 6),
    piece_number INTEGER NULL CHECK (piece_number >= 1 AND piece_number <= 4),
    from_position INTEGER NULL,
    to_position INTEGER NULL,
    cut_player_id UUID NULL REFERENCES players(id), -- If a piece was cut
    move_data JSONB NULL, -- Additional move data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Player Sessions Table
-- Tracks player sessions for reconnection
CREATE TABLE IF NOT EXISTS player_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    player_uuid VARCHAR(50) UNIQUE NOT NULL, -- Client-side generated UUID
    player_name VARCHAR(50) NOT NULL,
    current_room_id UUID NULL REFERENCES game_rooms(id) ON DELETE SET NULL,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quick Play Queue Table
-- Manages players waiting for quick play matchmaking
CREATE TABLE IF NOT EXISTS quick_play_queue (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    player_uuid VARCHAR(50) NOT NULL,
    player_name VARCHAR(50) NOT NULL,
    preferred_players INTEGER DEFAULT 4 CHECK (preferred_players IN (2, 4)),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure player is only in queue once
    UNIQUE(player_uuid)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_game_rooms_room_id ON game_rooms(room_id);
CREATE INDEX IF NOT EXISTS idx_game_rooms_state ON game_rooms(game_state);
CREATE INDEX IF NOT EXISTS idx_game_rooms_activity ON game_rooms(last_activity);

CREATE INDEX IF NOT EXISTS idx_players_room_id ON players(room_id);
CREATE INDEX IF NOT EXISTS idx_players_player_id ON players(player_id);
CREATE INDEX IF NOT EXISTS idx_players_connected ON players(is_connected);

CREATE INDEX IF NOT EXISTS idx_game_state_room_id ON game_state(room_id);
CREATE INDEX IF NOT EXISTS idx_game_state_player_id ON game_state(player_id);

CREATE INDEX IF NOT EXISTS idx_game_history_room_id ON game_history(room_id);
CREATE INDEX IF NOT EXISTS idx_game_history_created_at ON game_history(created_at);

CREATE INDEX IF NOT EXISTS idx_player_sessions_uuid ON player_sessions(player_uuid);
CREATE INDEX IF NOT EXISTS idx_player_sessions_active ON player_sessions(last_active);

CREATE INDEX IF NOT EXISTS idx_quick_play_queue_joined_at ON quick_play_queue(joined_at);

-- Functions and Triggers

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_game_rooms_updated_at BEFORE UPDATE ON game_rooms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON players FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_game_state_updated_at BEFORE UPDATE ON game_state FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_player_sessions_updated_at BEFORE UPDATE ON player_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update room last_activity when players or game_state changes
CREATE OR REPLACE FUNCTION update_room_activity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE game_rooms 
    SET last_activity = NOW() 
    WHERE id = COALESCE(NEW.room_id, OLD.room_id);
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Triggers to update room activity
CREATE TRIGGER update_room_activity_on_player_change 
    AFTER INSERT OR UPDATE OR DELETE ON players 
    FOR EACH ROW EXECUTE FUNCTION update_room_activity();

CREATE TRIGGER update_room_activity_on_game_state_change 
    AFTER INSERT OR UPDATE OR DELETE ON game_state 
    FOR EACH ROW EXECUTE FUNCTION update_room_activity();

-- Function to initialize game pieces when a player joins
CREATE OR REPLACE FUNCTION initialize_player_pieces()
RETURNS TRIGGER AS $$
BEGIN
    -- Create 4 pieces for the new player, all starting at home (position -1)
    INSERT INTO game_state (room_id, player_id, piece_number, position)
    SELECT NEW.room_id, NEW.id, generate_series(1, 4), -1;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to initialize pieces when player is created
CREATE TRIGGER initialize_pieces_on_player_create 
    AFTER INSERT ON players 
    FOR EACH ROW EXECUTE FUNCTION initialize_player_pieces();

-- Row Level Security (RLS) Policies
-- Enable RLS on all tables
ALTER TABLE game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_play_queue ENABLE ROW LEVEL SECURITY;

-- Policies for game_rooms (allow read for all, write for authenticated)
CREATE POLICY "Allow read access to game rooms" ON game_rooms FOR SELECT USING (true);
CREATE POLICY "Allow insert for authenticated users" ON game_rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for authenticated users" ON game_rooms FOR UPDATE USING (true);
CREATE POLICY "Allow delete for authenticated users" ON game_rooms FOR DELETE USING (true);

-- Policies for players (allow read for all, write for authenticated)
CREATE POLICY "Allow read access to players" ON players FOR SELECT USING (true);
CREATE POLICY "Allow insert for authenticated users" ON players FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for authenticated users" ON players FOR UPDATE USING (true);
CREATE POLICY "Allow delete for authenticated users" ON players FOR DELETE USING (true);

-- Policies for game_state (allow read for all, write for authenticated)
CREATE POLICY "Allow read access to game state" ON game_state FOR SELECT USING (true);
CREATE POLICY "Allow insert for authenticated users" ON game_state FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for authenticated users" ON game_state FOR UPDATE USING (true);
CREATE POLICY "Allow delete for authenticated users" ON game_state FOR DELETE USING (true);

-- Policies for game_history (allow read for all, write for authenticated)
CREATE POLICY "Allow read access to game history" ON game_history FOR SELECT USING (true);
CREATE POLICY "Allow insert for authenticated users" ON game_history FOR INSERT WITH CHECK (true);

-- Policies for player_sessions (allow read/write for authenticated)
CREATE POLICY "Allow full access to player sessions" ON player_sessions FOR ALL USING (true);

-- Policies for quick_play_queue (allow read/write for authenticated)
CREATE POLICY "Allow full access to quick play queue" ON quick_play_queue FOR ALL USING (true);

-- Views for easier data access

-- View to get complete room information with players
CREATE OR REPLACE VIEW room_details AS
SELECT 
    gr.id,
    gr.room_id,
    gr.max_players,
    gr.ai_players,
    gr.game_state,
    gr.current_turn,
    gr.winner_id,
    gr.created_at,
    gr.last_activity,
    COUNT(p.id) as current_players,
    json_agg(
        json_build_object(
            'id', p.id,
            'player_id', p.player_id,
            'name', p.player_name,
            'color', p.player_color,
            'is_host', p.is_host,
            'is_ai', p.is_ai,
            'is_connected', p.is_connected,
            'player_order', p.player_order,
            'pieces_home', p.pieces_home,
            'pieces_finished', p.pieces_finished
        ) ORDER BY p.player_order
    ) as players
FROM game_rooms gr
LEFT JOIN players p ON gr.id = p.room_id
GROUP BY gr.id, gr.room_id, gr.max_players, gr.ai_players, gr.game_state, 
         gr.current_turn, gr.winner_id, gr.created_at, gr.last_activity;

-- View to get complete game state for a room
CREATE OR REPLACE VIEW room_game_state AS
SELECT 
    gs.room_id,
    json_agg(
        json_build_object(
            'player_id', gs.player_id,
            'player_color', p.player_color,
            'piece_number', gs.piece_number,
            'position', gs.position,
            'is_safe', gs.is_safe
        ) ORDER BY p.player_order, gs.piece_number
    ) as pieces
FROM game_state gs
JOIN players p ON gs.player_id = p.id
GROUP BY gs.room_id;

-- Comments for documentation
COMMENT ON TABLE game_rooms IS 'Stores game room information and settings';
COMMENT ON TABLE players IS 'Stores player information and their association with rooms';
COMMENT ON TABLE game_state IS 'Stores the current position of all game pieces';
COMMENT ON TABLE game_history IS 'Stores all game moves and events for replay';
COMMENT ON TABLE player_sessions IS 'Tracks player sessions for reconnection';
COMMENT ON TABLE quick_play_queue IS 'Manages players waiting for quick play matchmaking';

COMMENT ON COLUMN game_rooms.room_id IS 'Short alphanumeric code for sharing room links';
COMMENT ON COLUMN game_state.position IS '-1=home, 0-51=board, 52-57=finish area';
COMMENT ON COLUMN players.player_order IS 'Turn order in the game (0-3)';