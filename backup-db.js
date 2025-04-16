
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

// Get database URL from environment
const dbUrl = new URL(process.env.DATABASE_URL);

// Extract credentials
const username = dbUrl.username;
const password = dbUrl.password;
const database = dbUrl.pathname.slice(1);
const host = dbUrl.hostname;
const port = dbUrl.port;

// Create backup command with full pg_dump path
const command = `PGPASSWORD="${password}" /nix/store/0z5iwcvalafm3j2c5pfhllsfbxrbyzf4-postgresql-16.5/bin/pg_dump -h ${host} -p ${port} -U ${username} -F c -b -v -f "backup.dump" ${database}`;

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error('Backup failed:', error);
    return;
  }
  console.log('Database backup completed successfully');
  console.log('Backup file saved as: backup.dump');
});
