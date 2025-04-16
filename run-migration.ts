import { exec } from 'child_process';

console.log('Running custom migration...');

// Execute the migration script
exec('npx tsx migrations/add_question_columns.ts', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error.message}`);
    return;
  }
  
  if (stderr) {
    console.error(`stderr: ${stderr}`);
    return;
  }
  
  console.log(`Migration output:\n${stdout}`);
  console.log('Migration completed successfully. Starting application...');

  // Restart the application after migration
  exec('npm run dev', (err, out, serr) => {
    if (err) {
      console.error(`Error starting app: ${err.message}`);
      return;
    }
    
    console.log('Application started.');
  });
});