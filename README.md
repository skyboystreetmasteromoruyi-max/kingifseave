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
async function join(){ const channel=document.getElementById('channel').value||'Kingofseavibe'; const role=document.getElementById('role').value; document.getElementById('join').disabled=true; try{ if(!client) await initClient(); if(role==='host') await client.setClientRole('host'); await client.join(APP_ID, channel, STATIC_TOKEN, null); if(role==='host'){ localVideo=await AgoraRTC.createCameraVideoTrack(); localAudio=await AgoraRTC.createMicrophoneAudioTrack(); localVideo.play(localEl); await client.publish([localVideo, localAudio]); } else { localEl.innerHTML='Viewing as audience'; } document.getElementById('leave').disabled=false; }catch(e){ alert('Could not join: '+(e.message||e)); document.getElementById('join').disabled=false; } }
async function leave(){ try{ if(localVideo){ localVideo.stop(); localVideo.close(); localVideo=null;} if(localAudio){ localAudio.stop(); localAudio.close(); localAudio=null;} if(client) await client.leave(); remoteEl.innerHTML=''; localEl.innerHTML='Local (host)'; }catch(e){console.warn(e);} finally{ document.getElementById('join').disabled=false; document.getElementById('leave').disabled=true; } }
document.getElementById('join').onclick=join; document.getElementById('leave').onclick=leave;
</script></body>
</html>