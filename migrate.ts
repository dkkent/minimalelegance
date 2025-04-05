// migrate.ts
import { db } from './server/db';
import * as schema from './shared/schema';

async function main() {
  try {
    console.log('Running migrations...');
    
    // Create enum type if it doesn't exist
    try {
      await db.execute(`CREATE TYPE conversation_outcome AS ENUM ('connected', 'tried_and_listened', 'hard_but_honest', 'no_outcome')`);
      console.log('Created conversation_outcome enum type');
    } catch (error) {
      console.log('conversation_outcome enum type might already exist, continuing...');
    }
    
    // Create partnerships table
    try {
      await db.execute(`
      CREATE TABLE IF NOT EXISTS partnerships (
        id SERIAL PRIMARY KEY,
        user1_id INTEGER NOT NULL REFERENCES users(id),
        user2_id INTEGER NOT NULL REFERENCES users(id),
        started_at TIMESTAMP NOT NULL DEFAULT NOW(),
        ended_at TIMESTAMP,
        is_active BOOLEAN NOT NULL DEFAULT TRUE
      )`);
      console.log('Created partnerships table');
    } catch (error) {
      console.error('Error creating partnerships table:', error);
    }
    
    // Create tables
    try {
      await db.execute(`
      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        loveslice_id INTEGER REFERENCES loveslices(id),
        starter_id INTEGER REFERENCES conversation_starters(id),
        initiated_by_user_id INTEGER NOT NULL REFERENCES users(id),
        partnership_id INTEGER REFERENCES partnerships(id),
        started_at TIMESTAMP NOT NULL DEFAULT NOW(),
        ended_at TIMESTAMP,
        duration_seconds INTEGER,
        outcome conversation_outcome DEFAULT 'no_outcome',
        created_spoken_loveslice BOOLEAN DEFAULT FALSE,
        end_initiated_by_user_id INTEGER REFERENCES users(id),
        end_initiated_at TIMESTAMP,
        end_confirmed_by_user_id INTEGER REFERENCES users(id),
        end_confirmed_at TIMESTAMP,
        final_note TEXT
      )`);
      console.log('Created conversations table');
    } catch (error) {
      console.error('Error creating conversations table:', error);
    }
    
    try {
      await db.execute(`
      CREATE TABLE IF NOT EXISTS conversation_messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER NOT NULL REFERENCES conversations(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        content TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`);
      console.log('Created conversation_messages table');
    } catch (error) {
      console.error('Error creating conversation_messages table:', error);
    }
    
    try {
      await db.execute(`
      CREATE TABLE IF NOT EXISTS spoken_loveslices (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER NOT NULL REFERENCES conversations(id),
        user1_id INTEGER NOT NULL REFERENCES users(id),
        user2_id INTEGER NOT NULL REFERENCES users(id),
        partnership_id INTEGER REFERENCES partnerships(id),
        outcome conversation_outcome NOT NULL,
        theme TEXT NOT NULL,
        duration_seconds INTEGER NOT NULL,
        continued_offline BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`);
      console.log('Created spoken_loveslices table');
    } catch (error) {
      console.error('Error creating spoken_loveslices table:', error);
    }
    
    try {
      await db.execute(`
      CREATE TABLE IF NOT EXISTS journal_entries (
        id SERIAL PRIMARY KEY,
        user1_id INTEGER NOT NULL REFERENCES users(id),
        user2_id INTEGER NOT NULL REFERENCES users(id),
        partnership_id INTEGER REFERENCES partnerships(id),
        written_loveslice_id INTEGER REFERENCES loveslices(id),
        spoken_loveslice_id INTEGER REFERENCES spoken_loveslices(id),
        theme TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        searchable_content TEXT NOT NULL
      )`);
      console.log('Created journal_entries table');
    } catch (error) {
      console.error('Error creating journal_entries table:', error);
    }
    
    // Alter existing tables
    try {
      await db.execute(`
      ALTER TABLE loveslices 
      ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'written',
      ADD COLUMN IF NOT EXISTS has_started_conversation BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS partnership_id INTEGER REFERENCES partnerships(id)
      `);
      console.log('Altered loveslices table');
    } catch (error) {
      console.error('Error altering loveslices table:', error);
    }
    
    try {
      await db.execute(`
      ALTER TABLE conversation_starters
      ADD COLUMN IF NOT EXISTS marked_as_meaningful BOOLEAN DEFAULT FALSE
      `);
      console.log('Altered conversation_starters table');
    } catch (error) {
      console.error('Error altering conversation_starters table:', error);
    }
    
    // Alter conversations table for new columns if it already exists
    try {
      await db.execute(`
      ALTER TABLE conversations
      ADD COLUMN IF NOT EXISTS partnership_id INTEGER REFERENCES partnerships(id),
      ADD COLUMN IF NOT EXISTS end_initiated_by_user_id INTEGER REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS end_initiated_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS end_confirmed_by_user_id INTEGER REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS end_confirmed_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS final_note TEXT
      `);
      console.log('Updated conversations table with additional columns');
    } catch (error) {
      console.error('Error updating conversations table:', error);
    }
    
    // Alter spoken_loveslices table for new columns if it already exists
    try {
      await db.execute(`
      ALTER TABLE spoken_loveslices
      ADD COLUMN IF NOT EXISTS partnership_id INTEGER REFERENCES partnerships(id),
      ADD COLUMN IF NOT EXISTS continued_offline BOOLEAN NOT NULL DEFAULT FALSE
      `);
      console.log('Updated spoken_loveslices table with additional columns');
    } catch (error) {
      console.error('Error updating spoken_loveslices table:', error);
    }
    
    // Alter journal_entries table for new columns if it already exists
    try {
      await db.execute(`
      ALTER TABLE journal_entries
      ADD COLUMN IF NOT EXISTS partnership_id INTEGER REFERENCES partnerships(id)
      `);
      console.log('Updated journal_entries table with additional columns');
    } catch (error) {
      console.error('Error updating journal_entries table:', error);
    }
    
    console.log('Migrations completed!');
  } catch (error) {
    console.error('Error during migrations:', error);
    process.exit(1);
  }
}

main();