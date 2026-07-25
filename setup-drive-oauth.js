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

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const http = require('http');
const url = require('url');
const readline = require('readline');

const envPath = path.resolve(__dirname, '.env');
require('dotenv').config({ path: envPath });

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
  console.log('  Google Drive OAuth2 Setup — Connect igentracker@gmail.com  ');
  console.log('══════════════════════════════════════════════════════════════');
  console.log('');

  let clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  let clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    clientId = await ask('Enter your OAuth2 Client ID: ');
    clientSecret = await ask('Enter your OAuth2 Client Secret: ');
  } else {
    console.log(`✅ Using Client ID from .env: ${clientId.substring(0, 20)}...`);
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId.trim(),
    clientSecret.trim(),
    REDIRECT_URI
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/drive'],
    prompt: 'consent',
    login_hint: 'igentracker@gmail.com'
  });

  console.log('');
  console.log('──────────────────────────────────────────────────────────────');
  console.log('👉 Click or Open this URL in your browser:');
  console.log('');
  console.log(authUrl);
  console.log('');
  console.log('Waiting for you to sign in with igentracker@gmail.com...');
  console.log('──────────────────────────────────────────────────────────────');

  // Listen on terminal for manual code paste OR HTTP server catch
  let isResolved = false;

  const codePromise = new Promise((resolve, reject) => {
    // 1. Temporary local server catch
    const server = http.createServer((req, res) => {
      const parsedUrl = url.parse(req.url, true);
      if (parsedUrl.pathname === '/oauth2callback') {
        const authCode = parsedUrl.query.code;
        if (authCode && !isResolved) {
          isResolved = true;
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body style="font-family:sans-serif;text-align:center;padding:60px;background:#0f172a;color:#f8fafc">
                <h1 style="color:#4ade80;font-size:32px">✅ Authorization Successful!</h1>
                <p style="font-size:18px">Google Drive storage is now linked to <b>igentracker@gmail.com</b>.</p>
                <p style="color:#94a3b8">Your .env file has been updated automatically. You can close this tab now.</p>
              </body>
            </html>
          `);
          server.close();
          resolve(authCode);
        }
      }
    });

    server.listen(8080, () => {
      console.log('🌐 Local OAuth listener running on http://localhost:8080');
    });

    // 2. Terminal manual paste fallback
    rl.question('\n(If browser shows code or code parameter in URL, paste it here): ', (manualCode) => {
      if (manualCode && manualCode.trim() && !isResolved) {
        isResolved = true;
        server.close();
        resolve(manualCode.trim());
      }
    });

    // Timeout after 30 minutes
    setTimeout(() => {
      if (!isResolved) {
        server.close();
        reject(new Error('Authorization timed out after 30 minutes'));
      }
    }, 30 * 60 * 1000);
  });

  const code = await codePromise;

  try {
    const { tokens } = await oauth2Client.getToken(code);

    if (tokens.refresh_token) {
      let envContent = fs.readFileSync(envPath, 'utf8');
      if (envContent.includes('GOOGLE_DRIVE_REFRESH_TOKEN=')) {
        envContent = envContent.replace(/GOOGLE_DRIVE_REFRESH_TOKEN=.*/g, `GOOGLE_DRIVE_REFRESH_TOKEN=${tokens.refresh_token}`);
      } else {
        envContent += `\nGOOGLE_DRIVE_REFRESH_TOKEN=${tokens.refresh_token}\n`;
      }
      fs.writeFileSync(envPath, envContent, 'utf8');

      console.log('');
      console.log('══════════════════════════════════════════════════════════════');
      console.log('🎉 SUCCESS! Refresh token obtained and saved to .env!');
      console.log(`GOOGLE_DRIVE_REFRESH_TOKEN=${tokens.refresh_token}`);
      console.log('══════════════════════════════════════════════════════════════');
    } else {
      console.log('⚠️ Token received without refresh_token:', tokens);
    }
  } catch (err) {
    console.error('❌ Error getting tokens:', err.message);
  }

  rl.close();
}

main();
