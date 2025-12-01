<html>
<head>
<meta charset="utf-8">
<title>Agora Live — Kingofseavibe</title>
<style>body{font-family:Arial;margin:20px}#local,#remote{border:1px solid #ccc;width:48%;height:360px;display:inline-block;vertical-align:top;background:#000;color:#fff}button{padding:8px 12px;margin-right:6px}</style>
</head>
<body>
<h2 style="text-align:center">Agora Live — Kingofseavibe</h2>
<div>Channel: <input id="channel" value="Kingofseavibe" /> Role:
<select id="role"><option value="host">Host</option><option value="audience" selected>Audience</option></select>
<button id="join">Join</button><button id="leave" disabled>Leave</button></div>
<div id="local">Local (host)</div><div id="remote">Remote (others)</div>
<script src="https://download.agora.io/sdk/release/AgoraRTC_N.js"></script>
<script>
const APP_ID = "c68f1bd91c3648c09a5a197c9b70ddc2";
const STATIC_TOKEN = "007eJxTYDDb5L9xToys3+OgVs7nhs/kDFY2b5o/3WHRqmNhW8TFlHcrMCSbWaQZJqVYGiYbm5lYJBtYJpomGlqaJ1smmRukpCQb3VimktkQyMhwa/ozJkYGRgYWIAbxmcAkM5hkgb";
let client=null, localVideo=null, localAudio=null;
const localEl=document.getElementById('local'), remoteEl=document.getElementById('remote');
async function initClient(){ if(typeof AgoraRTC==='undefined'){alert('Agora SDK not loaded');return;} client=AgoraRTC.createClient({mode:'live',codec:'vp8'}); client.on('user-published',async(user,mediaType)=>{ await client.subscribe(user,mediaType); if(mediaType==='video'){ const id='player-'+user.uid; let p=document.getElementById(id); if(!p){ p=document.createElement('div'); p.id=id; p.style.width='100%'; p.style.height='360px'; p.style.marginBottom='8px'; remoteEl.appendChild(p);} user.videoTrack.play(id);} if(mediaType==='audio'){ user.audioTrack.play(); }}); client.on('user-unpublished',user=>{ const id='player-'+user.uid; const el=document.getElementById(id); if(el) el.remove(); });}
async function join(){ const channel=document.getElementById('channel').value||'Kingofseavibe'; const role=document.getElementById('role').value; document.getElementById('join').disabled=true; try{ if(!client) await initClient(); if(role==='host') await client.setClientRole('host'); await client.join(APP_ID, channel, STATIC_TOKEN, null); if(role==='host'){ localVideo=await AgoraRTC.createCameraVideoTrack(); localAudio=await AgoraRTC.createMicrophoneAudioTrack(); localVideo.play(localEl); await client.publish([localVideo, localAudio]); } else { localEl.innerHTML='Viewing as audience'; } document.getElementById('leave').disabled=false; }catch(e){ alert('Could not const express = require('express');
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