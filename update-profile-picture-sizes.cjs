/**
 * Script to update user profiles with the new size mappings
 * This script creates a mapping between original profile pictures and their generated sizes
 * and updates the user records in the database.
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Connect to the database
const client = new Client({
  connectionString: process.env.DATABASE_URL
});

// From the output of the resize-profile-pictures.cjs script, we know the original-to-sized mappings
// Original images with their corresponding UUIDs for the resized versions 
const originalToSizedMappings = {
  // Original: 199128bb-083c-4eb4-a494-d124557ceaba.jpg
  '199128bb-083c-4eb4-a494-d124557ceaba.jpg': 'f66171c5-77dc-48d8-b4b9-281ff919e286',
  
  // Original: 4c589270-cf57-431a-ab03-f3dee77282c1.jpg
  '4c589270-cf57-431a-ab03-f3dee77282c1.jpg': '8859d9cc-6c41-472b-a944-d2ae55a96660',
  
  // Original: e68c5543-2b8b-478f-b95c-cf6a5c3f5a0b.png
  'e68c5543-2b8b-478f-b95c-cf6a5c3f5a0b.png': '725b8407-05c8-4e78-930e-89ff52745862',
  
  // Original: fallback-1744076136621.jpg
  'fallback-1744076136621.jpg': 'd47f9e57-fecb-4a7c-b359-9bba46d2be27'
};

// Store the size mappings for each UUID
const imageSizeMappings = {};

// Function to build the size mappings based on the expected structure
function buildSizeMappings() {
  // For each sized UUID, create the mappings for small, medium, large, original
  for (const [originalFile, sizedUuid] of Object.entries(originalToSizedMappings)) {
    imageSizeMappings[sizedUuid] = {
      small: `/uploads/profile_pictures/${sizedUuid}-small.jpg`,
      medium: `/uploads/profile_pictures/${sizedUuid}-medium.jpg`,
      large: `/uploads/profile_pictures/${sizedUuid}-large.jpg`,
      original: `/uploads/profile_pictures/${sizedUuid}-original.jpg`
    };
  }
  
  console.log(`Built size mappings for ${Object.keys(imageSizeMappings).length} images`);
}

// Function to find users with original profile pictures and update them with the size mappings
async function updateUserProfiles() {
  try {
    // First, get all users with profile pictures
    const userResult = await client.query(`
      SELECT "id", "profile_picture" as "profilePicture", "profile_picture_sizes" as "profilePictureSizes" 
      FROM "users" 
      WHERE "profile_picture" IS NOT NULL
    `);
    
    console.log(`Found ${userResult.rows.length} users with profile pictures`);
    
    let updatedCount = 0;
    
    // Process each user
    for (const user of userResult.rows) {
      // Skip if already has sized versions
      if (user.profilePictureSizes && 
          typeof user.profilePictureSizes === 'object' && 
          Object.keys(user.profilePictureSizes || {}).length > 0) {
        console.log(`User ${user.id} already has sized images, skipping`);
        continue;
      }
      
      // Extract the original filename from the profile picture path
      const profilePicturePath = user.profilePicture;
      if (!profilePicturePath) continue;
      
      const filename = path.basename(profilePicturePath);
      
      // Check if we have a mapping for this original file
      const sizedUuid = originalToSizedMappings[filename];
      
      if (sizedUuid) {
        const sizeMappings = imageSizeMappings[sizedUuid];
        
        if (sizeMappings) {
          try {
            await client.query(
              `UPDATE "users" SET "profile_picture_sizes" = $1 WHERE "id" = $2`,
              [JSON.stringify(sizeMappings), user.id]
            );
            
            console.log(`Updated user ${user.id} with size mappings for original: ${filename}`);
            updatedCount++;
          } catch (err) {
            console.error(`Error updating user ${user.id}:`, err);
          }
        } else {
          console.log(`No size mappings found for UUID ${sizedUuid}`);
        }
      } else {
        console.log(`No mapping found for original file: ${filename}`);
      }
    }
    
    console.log(`Updated ${updatedCount} users with profile picture size mappings`);
  } catch (error) {
    console.error('Error updating user profiles:', error);
  }
}

// Main function
async function main() {
  try {
    // Connect to the database
    await client.connect();
    console.log('Connected to the database');
    
    // Build size mappings from our known original-to-sized pairs
    buildSizeMappings();
    
    // Update user profiles
    await updateUserProfiles();
    
    // Close the database connection
    await client.end();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error in main function:', error);
    if (client) {
      await client.end();
    }
  }
}

// Run the script
main().then(() => {
  console.log('Script completed');
  process.exit(0);
}).catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});