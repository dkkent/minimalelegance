const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
require('dotenv').config();

async function makeUserAdmin(userId, role = 'admin') {
  // Connect to the database
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const client = postgres(connectionString);
  const db = drizzle(client);

  try {
    // Update the user role
    const result = await client.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, email, role',
      [role, userId]
    );

    if (result.length === 0) {
      console.error(`No user found with ID ${userId}`);
      process.exit(1);
    }

    console.log(`User updated successfully:`);
    console.log(result[0]);
    
    // List all users with their roles
    const users = await client.query(
      'SELECT id, name, email, role FROM users ORDER BY id'
    );
    
    console.log('\nAll users:');
    users.forEach(user => {
      console.log(`ID: ${user.id}, Name: ${user.name}, Email: ${user.email}, Role: ${user.role}`);
    });
  } catch (error) {
    console.error('Error updating user:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Get user ID from command line arguments
const userId = process.argv[2];
const role = process.argv[3] || 'admin';

if (!userId) {
  console.error('Please provide a user ID: node make-admin.js <userId> [role]');
  console.error('Role is optional and defaults to "admin". Use "superadmin" for full privileges.');
  process.exit(1);
}

makeUserAdmin(parseInt(userId), role);