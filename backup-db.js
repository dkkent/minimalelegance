
import { exec } from 'child_process';
import dotenv from 'dotenv';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

// Get database URL from environment
const dbUrl = new URL(process.env.DATABASE_URL);

// Extract credentials
const username = dbUrl.username;
const password = dbUrl.password;
const database = dbUrl.pathname.slice(1);
const host = dbUrl.hostname;
const port = dbUrl.port || '5432'; // Default PostgreSQL port if not specified

// Full path to pg_dump and output file
const pgDumpPath = '/nix/store/0z5iwcvalafm3j2c5pfhllsfbxrbyzf4-postgresql-16.5/bin/pg_dump';
const backupPath = `${__dirname}/backup.dump`;

// Create backup command with proper quotation
const command = `PGPASSWORD='${password}' ${pgDumpPath} -h ${host} -p ${port} -U ${username} -F c -b -v -f "${backupPath}" "${database}"`;

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error('Backup failed:', error);
    return;
  }
  console.log('Database backup completed successfully');
  console.log('Backup file saved as:', backupPath);
  console.log('Stdout:', stdout);
  console.log('Stderr:', stderr);
});
