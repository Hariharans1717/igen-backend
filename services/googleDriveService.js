const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');
const stream = require('stream');

let driveClient = null;

/**
 * Initialize Google Drive Client
 * 
 * Strategy:
 * - If GOOGLE_DRIVE_REFRESH_TOKEN is set, use OAuth2 with refresh token (consumer accounts)
 * - Otherwise, try Service Account credentials (Google Workspace accounts)
 */
const getDriveClient = async () => {
  if (driveClient) return driveClient;

  // Strategy 1: OAuth2 with refresh token (works with consumer Gmail)
  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;

  if (clientId && clientSecret && refreshToken) {
    try {
      const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, 'urn:ietf:wg:oauth:2.0:oob');
      oauth2Client.setCredentials({ refresh_token: refreshToken });
      
      // Force a token refresh to verify credentials
      await oauth2Client.getAccessToken();
      
      driveClient = google.drive({ version: 'v3', auth: oauth2Client });
      console.log('✅ Google Drive client initialized via OAuth2 refresh token.');
      return driveClient;
    } catch (err) {
      console.error('❌ Failed to initialize Google Drive via OAuth2:', err.message);
      return null;
    }
  }

  // Strategy 2: Service Account (works with Google Workspace)
  let credentials;
  const credsEnv = process.env.GOOGLE_DRIVE_CREDENTIALS;
  const credsPath = process.env.GOOGLE_DRIVE_CREDENTIALS_PATH || path.join(__dirname, '../config/google-service-account.json');

  try {
    if (credsEnv) {
      credentials = JSON.parse(credsEnv);
    } else if (fs.existsSync(credsPath)) {
      credentials = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
    }
  } catch (err) {
    console.error('❌ Error loading Google Drive credentials:', err.message);
  }

  if (!credentials) {
    console.warn('⚠️ Google Drive credentials not configured. Files will be stored as base64 in DB.');
    return null;
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: credentials,
      scopes: ['https://www.googleapis.com/auth/drive']
    });

    const authClient = await auth.getClient();
    driveClient = google.drive({ version: 'v3', auth: authClient });
    console.log('✅ Google Drive client initialized via Service Account.');
    return driveClient;
  } catch (err) {
    console.error('❌ Failed to initialize Google Drive client:', err.message);
    return null;
  }
};

/**
 * Parse a base64 Data URL to extract its MIME type and buffer
 */
const parseBase64DataUrl = (dataUrl) => {
  const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    return null;
  }
  return {
    mimeType: matches[1],
    buffer: Buffer.from(matches[2], 'base64')
  };
};

/**
 * Find folder inside Google Drive
 */
const findFolder = async (folderName, parentFolderId) => {
  const drive = await getDriveClient();
  if (!drive) return null;

  let query = `name = '${folderName.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  if (parentFolderId) {
    query += ` and '${parentFolderId}' in parents`;
  }

  const response = await drive.files.list({
    q: query,
    spaces: 'drive',
    fields: 'files(id, name)',
    pageSize: 1,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true
  });

  return response.data.files && response.data.files.length > 0 ? response.data.files[0].id : null;
};

/**
 * Create a new folder in Google Drive
 */
const createFolder = async (folderName, parentFolderId) => {
  const drive = await getDriveClient();
  if (!drive) return null;

  const fileMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: parentFolderId ? [parentFolderId] : []
  };

  const folder = await drive.files.create({
    resource: fileMetadata,
    fields: 'id',
    supportsAllDrives: true
  });

  // Share folder so anyone with the link can view its contents
  try {
    await drive.permissions.create({
      fileId: folder.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      },
      supportsAllDrives: true
    });
  } catch (err) {
    console.error('⚠️ Failed to set folder permissions:', err.message);
  }

  return folder.data.id;
};

/**
 * Upload a raw file buffer to Google Drive
 */
const uploadFileToFolder = async (fileName, mimeType, buffer, folderId) => {
  const drive = await getDriveClient();
  if (!drive) return null;

  const bufferStream = new stream.PassThrough();
  bufferStream.end(buffer);

  const fileMetadata = {
    name: fileName,
    parents: folderId ? [folderId] : []
  };

  const media = {
    mimeType: mimeType,
    body: bufferStream
  };

  const file = await drive.files.create({
    resource: fileMetadata,
    media: media,
    fields: 'id, webViewLink, webContentLink',
    supportsAllDrives: true
  });

  // Grant read access to the uploaded file
  try {
    await drive.permissions.create({
      fileId: file.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      },
      supportsAllDrives: true
    });
  } catch (err) {
    console.error(`⚠️ Failed to set permissions for file ${fileName}:`, err.message);
  }

  return file.data;
};

/**
 * Main service method to process file uploads for a candidate
 */
const uploadCandidateFiles = async (name, mobile, photoDataUrl, resumeDataUrl, resumeFilename) => {
  const drive = await getDriveClient();
  const parentFolderId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;

  if (!drive) {
    console.warn('⚠️ Google Drive client not configured. Files are not uploaded. Storing original values.');
    return {
      photoUrl: photoDataUrl || '',
      resumeUrl: resumeDataUrl || '',
      resumeFilename: resumeFilename || ''
    };
  }

  try {
    const folderName = `${name} - ${mobile}`;
    let folderId = await findFolder(folderName, parentFolderId);

    if (!folderId) {
      console.log(`📁 Candidate folder "${folderName}" not found. Creating a new one...`);
      folderId = await createFolder(folderName, parentFolderId);
      console.log(`📁 Candidate folder created successfully: ${folderId}`);
    } else {
      console.log(`📁 Found existing candidate folder: ${folderId}`);
    }

    let photoUrl = photoDataUrl || '';
    let resumeUrl = resumeDataUrl || '';

    // Process photo base64
    if (photoDataUrl && photoDataUrl.startsWith('data:')) {
      const parsed = parseBase64DataUrl(photoDataUrl);
      if (parsed) {
        let ext = 'jpg';
        if (parsed.mimeType === 'image/png') ext = 'png';
        else if (parsed.mimeType === 'image/gif') ext = 'gif';

        const fileName = `photo_${Date.now()}.${ext}`;
        console.log(`Uploading candidate photo (${fileName}) to Google Drive...`);
        const fileData = await uploadFileToFolder(fileName, parsed.mimeType, parsed.buffer, folderId);
        
        if (fileData && fileData.id) {
          photoUrl = `https://lh3.googleusercontent.com/d/${fileData.id}`;
          console.log(`✅ Photo uploaded successfully. Link: ${photoUrl}`);
        }
      }
    }

    // Process resume base64
    if (resumeDataUrl && resumeDataUrl.startsWith('data:')) {
      const parsed = parseBase64DataUrl(resumeDataUrl);
      if (parsed) {
        const fileName = resumeFilename || `resume_${Date.now()}.pdf`;
        console.log(`Uploading candidate CV/resume (${fileName}) to Google Drive...`);
        const fileData = await uploadFileToFolder(fileName, parsed.mimeType, parsed.buffer, folderId);

        if (fileData && fileData.webViewLink) {
          resumeUrl = fileData.webViewLink;
          console.log(`✅ Resume uploaded successfully. Link: ${resumeUrl}`);
        }
      }
    }

    return {
      photoUrl,
      resumeUrl,
      resumeFilename: resumeFilename || ''
    };
  } catch (error) {
    console.error('❌ Error uploading files to Google Drive:', error.message);
    return {
      photoUrl: photoDataUrl || '',
      resumeUrl: resumeDataUrl || '',
      resumeFilename: resumeFilename || ''
    };
  }
};

module.exports = {
  uploadCandidateFiles,
  getDriveClient
};
