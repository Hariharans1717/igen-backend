require('dotenv').config();
const pool = require('./config/db');
const googleDriveService = require('./services/googleDriveService');

async function resetAllData() {
  console.log('🚀 Starting complete data & Google Drive cleanup...');

  // Step 1: Clean Database Tables
  try {
    console.log('🗄️ Cleaning PostgreSQL Database tables...');
    await pool.query(`
      TRUNCATE TABLE candidate_history, candidate_notes, candidate_timeline, interviews, greyhr_archive CASCADE;
      DELETE FROM candidates;
    `);
    console.log('✅ PostgreSQL DB wiped clean (candidates, interviews, notes, timeline, history).');
  } catch (dbErr) {
    console.error('❌ Database cleanup failed:', dbErr.message);
  }

  // Step 2: Clean Google Drive Folders
  try {
    console.log('☁️ Connecting to Google Drive API...');
    const drive = await googleDriveService.getDriveClient();

    if (!drive) {
      console.warn('⚠️ Google Drive client not configured. Skipping Drive cleanup.');
    } else {
      // Find old "igen users" or "igen candidates" root folders
      const searchFolders = ["igen users", "igen candidates"];
      
      for (const folderName of searchFolders) {
        const query = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
        const res = await drive.files.list({
          q: query,
          spaces: 'drive',
          fields: 'files(id, name)',
          supportsAllDrives: true,
          includeItemsFromAllDrives: true
        });

        if (res.data.files && res.data.files.length > 0) {
          for (const file of res.data.files) {
            console.log(`🗑️ Deleting Google Drive folder "${file.name}" (${file.id})...`);
            try {
              await drive.files.delete({
                fileId: file.id,
                supportsAllDrives: true
              });
              console.log(`✅ Deleted "${file.name}" folder (${file.id})`);
            } catch (delErr) {
              console.error(`⚠️ Could not delete folder ${file.id}:`, delErr.message);
            }
          }
        }
      }

      // Re-create single clean "igen candidates" root folder
      console.log('📁 Creating single root folder "igen candidates" in Google Drive...');
      const createRes = await drive.files.create({
        resource: {
          name: 'igen candidates',
          mimeType: 'application/vnd.google-apps.folder'
        },
        fields: 'id',
        supportsAllDrives: true
      });

      const rootFolderId = createRes.data.id;
      console.log(`✅ Root folder "igen candidates" created: ${rootFolderId}`);

      // Set reader permissions
      try {
        await drive.permissions.create({
          fileId: rootFolderId,
          requestBody: {
            role: 'reader',
            type: 'anyone'
          },
          supportsAllDrives: true
        });
        console.log('✅ Public read permissions set on "igen candidates" root folder.');
      } catch (permErr) {
        console.warn('⚠️ Could not set public permissions on root folder:', permErr.message);
      }
    }
  } catch (driveErr) {
    console.error('❌ Google Drive cleanup failed:', driveErr.message);
  }

  console.log('\n🎉 ALL DONE! Database and Google Drive cleaned successfully.');
  process.exit(0);
}

resetAllData();
