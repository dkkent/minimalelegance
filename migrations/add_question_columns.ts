import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import 'dotenv/config';

// Get the database URL from environment variables
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL environment variable is not defined');
  process.exit(1);
}

// Create a Postgres client
const client = postgres(connectionString);
const db = drizzle(client);

async function main() {
  try {
    // Check if user_generated column exists
    const checkUserGeneratedColumn = await client`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'questions' AND column_name = 'user_generated'
    `;

    if (checkUserGeneratedColumn.length === 0) {
      console.log('Adding user_generated column to questions table...');
      await client`
        ALTER TABLE questions 
        ADD COLUMN user_generated BOOLEAN DEFAULT FALSE
      `;
      console.log('user_generated column added successfully.');
    } else {
      console.log('user_generated column already exists, skipping.');
    }

    // Check if is_approved column exists
    const checkIsApprovedColumn = await client`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'questions' AND column_name = 'is_approved'
    `;

    if (checkIsApprovedColumn.length === 0) {
      console.log('Adding is_approved column to questions table...');
      await client`
        ALTER TABLE questions 
        ADD COLUMN is_approved BOOLEAN DEFAULT TRUE
      `;
      console.log('is_approved column added successfully.');
    } else {
      console.log('is_approved column already exists, skipping.');
    }

    // Check if created_by_id column exists
    const checkCreatedByIdColumn = await client`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'questions' AND column_name = 'created_by_id'
    `;

    if (checkCreatedByIdColumn.length === 0) {
      console.log('Adding created_by_id column to questions table...');
      await client`
        ALTER TABLE questions 
        ADD COLUMN created_by_id INTEGER 
        REFERENCES users(id)
      `;
      console.log('created_by_id column added successfully.');
    } else {
      console.log('created_by_id column already exists, skipping.');
    }

    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();