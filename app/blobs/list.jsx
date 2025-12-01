
const express = require('express');
const { RtcTokenBuilder, RtcRole } = require('agora-token');

// ⚠️ CRITICAL: Replace these placeholders with the actual sensitive keys from your logs.
// These are the keys found in your uploaded files:
const APP_ID = '23788a6b52644e6f8c5758f2b2c5d468';
const APP_CERTIFICATE = 'aacab5eec7ae427b80567b6d2711fe64';

const PORT = 3000;
const app = express();

// Set up the token expiration time (in seconds)
// 3600 seconds = 1 hour. This is a common and secure practice.
const expirationTimeInSeconds = 3600;
const currentTimestamp = Math.floor(Date.now() / 1000);
const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

// Middleware to prevent caching
const noCache = (req, resp, next) => {
  resp.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  resp.header('Expires', '-1');
  resp.header('Pragma', 'no-cache');
  next();
}

// Endpoint to generate the RTC Token
app.get('/token', noCache, (req, resp) => {
    // 1. Get channelName and uid from the request query parameters (matching your log URL)
    const channelName = req.query.channel;
    const uid = req.query.uid; // Your log shows uid=0, which is an integer UID.

    if (!channelName) {
        return resp.status(500).json({ 'error': 'channel parameter is required' });
    }
    if (!uid) {
        return resp.status(500).json({ 'error': 'uid parameter is required' });
    }

    // 2. Define the user's role: publisher or audience.
    // Assuming the user initiating the stream is a publisher (host).
    const role = RtcRole.PUBLISHER; 

    // 3. Generate the token
    const token = RtcTokenBuilder.buildTokenWithUid(
        APP_ID, 
        APP_CERTIFICATE, 
        channelName, 
        parseInt(uid), // Ensure UID is an integer
        role, 
        privilegeExpiredTs
    );

    // 4. Send the token back to the client
    return resp.json({ 'token': token });
});

app.listen(PORT, () => {
    console.log(`Agora Token Server listening on port: ${PORT}`);
    console.log(`Test URL: http://localhost:${PORT}/token?channel=kingofseavibes&uid=0`);
});