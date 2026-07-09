/**
 * One-time OAuth2 Setup Script for Google Drive
 * 
 * Generates a refresh token so the backend can upload files
 * to YOUR Google Drive (consumer/personal account).
 * 
 * Prerequisites:
 * 1. Go to https://console.cloud.google.com/apis/credentials
 * 2. Create OAuth Client ID → type "Web application"
 * 3. Add redirect URI: http://localhost:8080/oauth2callback
 * 4. Copy Client ID and Client Secret
 * 5. Run: node setup-drive-oauth.js
 */

const { google } = require('googleapis');
const http = require('http');
const url = require('url');
const readline = require('readline');

const REDIRECT_URI = 'http://localhost:8080/oauth2callback';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

async function main() {
  console.log('');
  console.log('══════════════════════════════════════════════════════════════');
  console.log('  Google Drive OAuth2 Setup — One-time Refresh Token Generator');
  console.log('══════════════════════════════════════════════════════════════');
  console.log('');

  const clientId = await ask('Enter your OAuth2 Client ID: ');
  const clientSecret = await ask('Enter your OAuth2 Client Secret: ');

  const oauth2Client = new google.auth.OAuth2(
    clientId.trim(),
    clientSecret.trim(),
    REDIRECT_URI
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/drive'],
    prompt: 'consent'
  });

  console.log('');
  console.log('──────────────────────────────────────────────────────────────');
  console.log('📋 Open this URL in your browser:');
  console.log('');
  console.log(authUrl);
  console.log('');
  console.log('Waiting for you to authorize in the browser...');
  console.log('──────────────────────────────────────────────────────────────');

  // Start a temporary local server to catch the redirect
  const code = await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const parsedUrl = url.parse(req.url, true);
      if (parsedUrl.pathname === '/oauth2callback') {
        const authCode = parsedUrl.query.code;
        if (authCode) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<html><body style="font-family:sans-serif;text-align:center;padding:60px;background:#1a1a2e;color:#e0e0e0"><h1 style="color:#4ade80">✅ Authorization Successful!</h1><p>You can close this tab and go back to the terminal.</p></body></html>');
          server.close();
          resolve(authCode);
        } else {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end('<html><body style="font-family:sans-serif;text-align:center;padding:60px;background:#1a1a2e;color:#e0e0e0"><h1 style="color:#f87171">❌ Authorization Failed</h1><p>No code received. Please try again.</p></body></html>');
          server.close();
          reject(new Error('No authorization code received'));
        }
      }
    });

    server.listen(8080, () => {
      console.log('🌐 Local server listening on http://localhost:8080');
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      server.close();
      reject(new Error('Authorization timed out after 5 minutes'));
    }, 5 * 60 * 1000);
  });

  try {
    const { tokens } = await oauth2Client.getToken(code);

    console.log('');
    console.log('══════════════════════════════════════════════════════════════');
    console.log('✅ SUCCESS! Add these 3 lines to your .env file:');
    console.log('══════════════════════════════════════════════════════════════');
    console.log('');
    console.log(`GOOGLE_DRIVE_CLIENT_ID=${clientId.trim()}`);
    console.log(`GOOGLE_DRIVE_CLIENT_SECRET=${clientSecret.trim()}`);
    console.log(`GOOGLE_DRIVE_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log('');
    console.log('After adding, restart your backend server and you\'re done!');
    console.log('══════════════════════════════════════════════════════════════');
  } catch (err) {
    console.error('❌ Error getting tokens:', err.message);
  }

  rl.close();
}

main();
