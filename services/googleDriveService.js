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
 * Delete existing files in a folder matching a category ('photo' or 'resume')
 */
const deleteExistingFilesInFolder = async (folderId, type) => {
  const drive = await getDriveClient();
  if (!drive || !folderId) return;

  try {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    });

    if (response.data.files && response.data.files.length > 0) {
      for (const file of response.data.files) {
        const isPhoto = file.name.toLowerCase().startsWith('photo') || (file.mimeType && file.mimeType.startsWith('image/'));
        const isResume = file.name.toLowerCase().startsWith('resume') || (file.mimeType && (file.mimeType.includes('pdf') || file.mimeType.includes('word') || file.mimeType.includes('document') || file.mimeType.includes('octet-stream')));

        if ((type === 'photo' && isPhoto) || (type === 'resume' && isResume)) {
          console.log(`🗑️ Deleting old Google Drive file: ${file.name} (${file.id})`);
          await drive.files.delete({
            fileId: file.id,
            supportsAllDrives: true
          });
        }
      }
    }
  } catch (err) {
    console.error(`⚠️ Failed to delete existing ${type} files from Google Drive folder:`, err.message);
  }
};

/**
 * Extract Google Drive File ID from a URL or raw ID string
 */
const extractDriveFileId = (urlOrId) => {
  if (!urlOrId) return null;
  if (!urlOrId.includes('/') && !urlOrId.includes('=')) return urlOrId;
  const matchThumb = urlOrId.match(/id=([a-zA-Z0-9_-]+)/);
  if (matchThumb) return matchThumb[1];
  const matchPath = urlOrId.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (matchPath) return matchPath[1];
  return null;
};

/**
 * Delete a specific file from Google Drive by URL or File ID
 */
const deleteFileFromDrive = async (fileIdOrUrl) => {
  const drive = await getDriveClient();
  if (!drive) return false;

  const fileId = extractDriveFileId(fileIdOrUrl);
  if (!fileId) return false;

  try {
    console.log(`🗑️ Deleting Google Drive file: ${fileId}`);
    await drive.files.delete({
      fileId: fileId,
      supportsAllDrives: true
    });
    return true;
  } catch (err) {
    console.error(`⚠️ Failed to delete file ${fileId} from Google Drive:`, err.message);
    return false;
  }
};

/**
 * Get or create the "igen candidates" root folder in Google Drive.
 * All candidate folders are nested inside this root folder.
 */
const ROOT_FOLDER_NAME = 'igen candidates';
let cachedRootFolderId = null;

const getOrCreateRootFolder = async () => {
  if (cachedRootFolderId) return cachedRootFolderId;

  // Search for the root folder at Drive root level (no parent filter)
  const drive = await getDriveClient();
  if (!drive) return null;

  const query = `name = '${ROOT_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false and 'root' in parents`;
  const response = await drive.files.list({
    q: query,
    spaces: 'drive',
    fields: 'files(id, name)',
    pageSize: 1
  });

  if (response.data.files && response.data.files.length > 0) {
    cachedRootFolderId = response.data.files[0].id;
    console.log(`📁 Found existing root folder "${ROOT_FOLDER_NAME}": ${cachedRootFolderId}`);
  } else {
    console.log(`📁 Creating root folder "${ROOT_FOLDER_NAME}" in Google Drive...`);
    cachedRootFolderId = await createFolder(ROOT_FOLDER_NAME, null);
    console.log(`📁 Root folder "${ROOT_FOLDER_NAME}" created: ${cachedRootFolderId}`);
  }

  return cachedRootFolderId;
};

/**
 * Main service method to process file uploads for a candidate.
 * Structure: igen candidates/ → Candidate Name - Candidate Code or ID / → photo + resume
 */
const uploadCandidateFiles = async (name, candidateCodeOrMobile, photoDataUrl, resumeDataUrl, resumeFilename) => {
  const drive = await getDriveClient();

  if (!drive) {
    console.warn('⚠️ Google Drive client not configured. Files are not uploaded. Storing original values.');
    return {
      photoUrl: photoDataUrl || '',
      resumeUrl: resumeDataUrl || '',
      resumeFilename: resumeFilename || ''
    };
  }

  try {
    // Step 1: Get or create root "igen candidates" folder
    const rootFolderId = await getOrCreateRootFolder();
    if (!rootFolderId) throw new Error('Could not get or create root folder "igen candidates"');

    // Step 2: Get or create "Candidate Name - Candidate Code/ID" folder inside "igen candidates"
    const candidateFolderName = `${name} - ${candidateCodeOrMobile}`;
    let candidateFolderId = await findFolder(candidateFolderName, rootFolderId);

    if (!candidateFolderId) {
      console.log(`📁 Creating candidate folder "${candidateFolderName}" inside "${ROOT_FOLDER_NAME}"...`);
      candidateFolderId = await createFolder(candidateFolderName, rootFolderId);
      console.log(`📁 Candidate folder created: ${candidateFolderId}`);
    } else {
      console.log(`📁 Found existing candidate folder "${candidateFolderName}": ${candidateFolderId}`);
    }

    let photoUrl = photoDataUrl || '';
    let resumeUrl = resumeDataUrl || '';

    // Step 3: Upload photo (delete old one first)
    if (photoDataUrl && photoDataUrl.startsWith('data:')) {
      await deleteExistingFilesInFolder(candidateFolderId, 'photo');

      const parsed = parseBase64DataUrl(photoDataUrl);
      if (parsed) {
        let ext = 'jpg';
        if (parsed.mimeType === 'image/png') ext = 'png';
        else if (parsed.mimeType === 'image/gif') ext = 'gif';

        const fileName = `photo_${name.replace(/\s+/g, '_')}.${ext}`;
        const photoSizeKB = Math.round(parsed.buffer.length / 1024);
        console.log(`📤 Uploading photo "${fileName}" (${photoSizeKB} KB) to Drive: igen candidates/${candidateFolderName}/`);
        const fileData = await uploadFileToFolder(fileName, parsed.mimeType, parsed.buffer, candidateFolderId);

        if (fileData && fileData.id) {
          photoUrl = `https://drive.google.com/thumbnail?id=${fileData.id}&sz=w500`;
          console.log(`✅ Photo uploaded (${photoSizeKB} KB). Link: ${photoUrl}`);
        }
      }
    }

    // Step 4: Upload resume (delete old one first)
    if (resumeDataUrl && resumeDataUrl.startsWith('data:')) {
      await deleteExistingFilesInFolder(candidateFolderId, 'resume');

      const parsed = parseBase64DataUrl(resumeDataUrl);
      if (parsed) {
        const fileName = resumeFilename || `resume_${name.replace(/\s+/g, '_')}.pdf`;
        const resumeSizeKB = Math.round(parsed.buffer.length / 1024);
        console.log(`📤 Uploading resume "${fileName}" (${resumeSizeKB} KB) to Drive: igen candidates/${candidateFolderName}/`);
        const fileData = await uploadFileToFolder(fileName, parsed.mimeType, parsed.buffer, candidateFolderId);

        if (fileData && fileData.webViewLink) {
          resumeUrl = fileData.webViewLink;
          console.log(`✅ Resume uploaded. Link: ${resumeUrl}`);
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
  getDriveClient,
  deleteFileFromDrive,
  deleteExistingFilesInFolder
};

