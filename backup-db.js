
const { exec } = require('child_process');
const fs = require('fs');

// Get database URL from environment
const dbUrl = new URL(process.env.DATABASE_URL);

// Extract credentials
const username = dbUrl.username;
const password = dbUrl.password;
const database = dbUrl.pathname.slice(1);
const host = dbUrl.hostname;
const port = dbUrl.port;

// Create backup command
const command = `PGPASSWORD="${password}" pg_dump -h ${host} -p ${port} -U ${username} -F c -b -v -f "backup.dump" ${database}`;

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error('Backup failed:', error);
    return;
  }
  console.log('Database backup completed successfully');
  console.log('Backup file saved as: backup.dump');
});
