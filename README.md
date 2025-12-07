Import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, query, addDoc, serverTimestamp, onSnapshot, limit, doc, getDoc, setDoc, writeBatch, getDocs, where } from 'firebase/firestore'; 
// --- SDK IMPORTS FOR MEDIA & STORAGE ---
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
// ⚠️ AGORA SDK: You would use a specific Agora Web or Native SDK here:
// import AgoraRTC from 'agora-rtc-sdk-ng'; // Example for Web
// ----------------------------------------
// Necessary for security:
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check'; 

// Define global variables provided by your environment/build system
const appId = '1:649938805337:android:e36021963f1eec8f100748'; 
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(firebaseConfig) : null;
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// --- CRITICAL AGORA VARIABLE ---
const AGORA_APP_ID = 'YOUR_AGORA_APP_ID'; 
// ------------------------------------

// --- CRITICAL SECURITY VARIABLE ---
const RECAPTCHA_SITE_KEY = 'YOUR_PUBLIC_RECAPTCHA_V3_SITE_KEY'; 
// ------------------------------------

// --- User Profile Picture URL ---
// ⚠️ ACTION REQUIRED: Must be provided from Firebase Storage upload.
const userProfilePicUrl = 'YOUR_DIRECT_PUBLIC_IMAGE_URL_HERE'; 
// ------------------------------------

// --- BACKGROUND MUSIC LINK (Uses your defined environment variable) ---
// ⚠️ ACTION REQUIRED: Must be provided from Firebase Storage upload.
const BACKGROUND_MUSIC_LINK = 'YOUR_SONG_STREAMING_LINK_HERE';
// -----------------------------

// --- WELCOME MESSAGE DETAILS ---
const WELCOME_MESSAGE_ID = 'stream-welcome-banner'; 
const WELCOME_MESSAGE_TEXT = "You are welcome to the life of Kingofseavibe live stream! Let's enjoy, let there be peace, and respect the laws."; 
const WELCOME_USER_NAME = 'Stream Bot'; 
// -------------------------------

// --- GIFT CATALOG (Simple Array/Object for quick lookup) ---
const GIFT_CATALOG = {
    'vibe_heart': { name: 'Vibe Heart', cost: 10, icon: '❤️' },
    'golden_fish': { name: 'Golden Fish', cost: 50, icon: '🐠' },
    'water_wave': { name: 'Water Wave', cost: 100, icon: '🌊' },
};
const HOST_USER_ID = 'host_king_of_sea_vibes'; // Placeholder for the host's UID
// -------------------------------------------------------------

// --- AVAILABLE COLORS ARRAY FOR FILTER (Updated) ---
const COLOR_FILTERS = [
    { name: 'Default', class: 'bg-gray-900', style: 'text-white', filter: 'none' },
    { name: 'Classic Black', class: 'bg-black', style: 'text-white', filter: 'none' },
    { name: 'Grayscale Vibe', class: 'bg-gray-900', style: 'text-white', filter: 'grayscale(100%)' }, // Black & White Effect
    { name: 'Sea Blue', class: 'bg-blue-900', style: 'text-blue-100', filter: 'none' },
    { name: 'Ocean Green', class: 'bg-green-900', style: 'text-green-100', filter: 'none' },
    { name: 'Vibe Purple', class: 'bg-purple-900', style: 'text-purple-100', filter: 'none' }
];
// -----------------------------------------


const LiveChatApp = () => { 
  const [app, setApp] = useState(null);
  const [db, setDb] = useState(null);
  const [storage, setStorage] = useState(null);
  const [userId, setUserId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isCalling, setIsCalling] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userCoins, setUserCoins] = useState(0); 
  const [streamColor, setStreamColor] = useState(COLOR_FILTERS[0].class); 
  const [streamTextColor, setStreamTextColor] = useState(COLOR_FILTERS[0].style);
  const [streamFilter, setStreamFilter] = useState(COLOR_FILTERS[0].filter); 
  // const [currentTrackIndex, setCurrentTrackIndex] = useState(0); // REMOVED: Reverting music state
  const messagesEndRef = useRef(null);
  const MAX_MESSAGES = 100;

  // --- AGORA CALL HANDLER (Placeholder for Agora SDK integration) ---
  const agoraCallHandler = useRef({
      joinChannel: async (channelName) => {
          console.log(`[Agora] Joining channel: ${channelName}. Using App ID: ${AGORA_APP_ID}`);
          setIsCalling(true);
          // ⚠️ AGORA IMPLEMENTATION: client.join, client.publish logic here
      },
      leaveChannel: async () => {
          console.log("[Agora] Leaving channel.");
          setIsCalling(false);
          // ⚠️ AGORA IMPLEMENTATION: client.leave and cleanup logic here
      }
  }).current;
  // --------------------------------------------------------------------------

  // --- UPDATED FUNCTION: Apply Color Filter ---
  const applyColorFilter = (filter) => {
    setStreamColor(filter.class);
    setStreamTextColor(filter.style);
    setStreamFilter(filter.filter); // Set the CSS filter (grayscale)
  };
  // ----------------------------------------


  // 1. Initialize Firebase, App Check, Storage, and Auth
  useEffect(() => {
    if (!firebaseConfig) {
      setError("Firebase configuration is missing. Cannot initialize the app.");
      setIsLoading(false);
      return;
    }

    try {
      const firebaseApp = initializeApp(firebaseConfig);
      const firestore = getFirestore(firebaseApp);
      const firebaseStorage = getStorage(firebaseApp);
      const userAuth = getAuth(firebaseApp);
      
      setApp(firebaseApp);
      setDb(firestore);
      setStorage(firebaseStorage);

      // --- Initialize App Check for security ---
      if (firebaseApp && RECAPTCHA_SITE_KEY && RECAPTCHA_SITE_KEY.includes('YOUR_PUBLIC_RECAPTCHA_V3_SITE_KEY') === false) {
        initializeAppCheck(firebaseApp, {
            provider: new ReCaptchaV3Provider(RECAPTCHA_SITE_KEY),
            isTokenAutoRefreshEnabled: true 
        });
      }

      // --- FUNCTION TO CREATE PERMANENT WELCOME MESSAGE ---
      const createWelcomeMessage = async (firestoreInstance) => {
        const messagesCollectionPath = `artifacts/${appId}/public/data/messages`;
        const welcomeDocRef = doc(firestoreInstance, messagesCollectionPath, WELCOME_MESSAGE_ID);
        const docSnap = await getDoc(welcomeDocRef);

        if (!docSnap.exists()) {
          await setDoc(welcomeDocRef, {
            text: WELCOME_MESSAGE_TEXT,
            createdAt: new Date(0), 
            userId: 'stream_bot_id',
            userName: WELCOME_USER_NAME,
            profilePic: userProfilePicUrl,
            isSystem: true 
          });
        }
      };
      
      const handleSignIn = async (auth) => {
        try {
          if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
          } else {
            await signInAnonymously(auth);
          }
        } catch (e) {
          setError("Failed to sign in. Check console for details.");
          await signInAnonymously(auth);
        }
      };
      
      handleSignIn(userAuth);
      createWelcomeMessage(firestore); 

      const unsubscribeAuth = onAuthStateChanged(userAuth, (user) => {
        if (user) {
          setUserId(user.uid);
          // NEW: Start listening for viewer's coin balance
          const walletDocRef = doc(firestore, `artifacts/${appId}/private/user_wallets`, user.uid);
          const unsubscribeWallet = onSnapshot(walletDocRef, (doc) => {
              if (doc.exists()) {
                  setUserCoins(doc.data().coins || 0);
              } else {
                  // Initialize wallet if it doesn't exist (Gives 100 free coins)
                  setDoc(walletDocRef, { userId: user.uid, coins: 100, giftsSent: 0 }); 
                  setUserCoins(100); 
              }
          });

          // === LOGIC: LOG THE LOGIN EVENT (For Host Notification) ===
          const logLoginEvent = async (uid) => {
            const loginEventsCollectionRef = collection(firestore, `artifacts/${appId}/private/login_events`);
            const loginDocRef = doc(loginEventsCollectionRef, uid);
            
            const docSnap = await getDoc(loginDocRef);

            if (!docSnap.exists()) {
              await setDoc(loginDocRef, {
                userId: uid,
                userName: 'New Stream Viewer',
                loggedAt: serverTimestamp(),
                notificationStatus: 'PENDING', 
              });
            }
          };

          logLoginEvent(user.uid);
          // =============================================================

          return () => { unsubscribeAuth(); unsubscribeWallet(); }; // Cleanup
        } else {
          setUserId(null);
        }
        setIsLoading(false); 
      });

      return () => unsubscribeAuth();
    } catch (e) {
      setError("Failed to initialize Firebase services.");
      setIsLoading(false);
    }
  }, []); 

  // 2. Real-time Data Listener (onSnapshot with Limit)
  useEffect(() => {
    if (!db || !userId) return;

    const messagesCollectionRef = collection(db, `artifacts/${appId}/public/data/messages`);
    const q = query(messagesCollectionRef, limit(MAX_MESSAGES)); 

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      fetchedMessages.sort((a, b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0));
      setMessages(fetchedMessages);
    }, (e) => {
      setError("Failed to fetch messages in real-time.");
    });

    return () => unsubscribe();
  }, [db, userId]); 

  // 3. Auto-scroll to the latest message
  useEffect(() => {
    if (messages.length > 0) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);
  

  // --- NEW FUNCTIONALITY: SEND GIFT TRANSACTION ---
  const sendGift = async (giftId) => {
      if (!db || !userId || !GIFT_CATALOG[giftId]) return;

      const gift = GIFT_CATALOG[giftId];
      if (userCoins < gift.cost) {
          setError(`Insufficient Sea Coins! Need ${gift.cost} coins for a ${gift.name}.`);
          return;
      }
      
      const batch = writeBatch(db);
      const userWalletRef = doc(db, `artifacts/${appId}/private/user_wallets`, userId);
      const transactionsCollectionRef = collection(db, `artifacts/${appId}/private/transactions`);
      const messagesCollectionRef = collection(db, `artifacts/${appId}/public/data/messages`);

      try {
          // 1. Check current balance (optional security step, better done in Firestore Rules)
          const walletSnap = await getDoc(userWalletRef);
          if (walletSnap.data().coins < gift.cost) {
              setError("Balance check failed. Please refresh or buy more coins.");
              return;
          }

          // 2. Deduct coins from sender's wallet
          const newCoins = walletSnap.data().coins - gift.cost;
          batch.update(userWalletRef, { coins: newCoins, giftsSent: (walletSnap.data().giftsSent || 0) + 1 });

          // 3. Log the transaction
          batch.set(doc(transactionsCollectionRef), {
              senderId: userId,
              receiverId: HOST_USER_ID,
              giftId: giftId,
              valueCoins: gift.cost,
              timestamp: serverTimestamp(),
              userName: "King of Sea Vibes", // Logging the host for easy lookup
          });

          // 4. Send a public chat message about the gift (The "Flashy" part)
          await addDoc(messagesCollectionRef, {
              text: `${gift.icon} ${gift.name} sent! (Cost: ${gift.cost} coins)`,
              createdAt: serverTimestamp(),
              userId: userId,
              userName: "King of Sea Vibes", 
              profilePic: userProfilePicUrl,
              isSystem: true, // Mark as system or unique gift message
              giftId: giftId,
          });

          // 5. Commit the transaction
          await batch.commit();
          setError(null); // Clear any previous error
          console.log(`Successfully sent ${gift.name}. New balance: ${newCoins}`);

      } catch (e) {
          console.error("Gift transaction failed:", e);
          setError("Failed to send gift. Please check connection and funds.");
      }
  };
  // -------------------------------------------------------------


  // 4. Handle sending a new message (Includes Stream End Command)
  const handleSend = async (e) => {
    e.preventDefault();
    if (newMessage.trim() === '' || !db || !userId) return;

    try {
      const messagesCollectionRef = collection(db, `artifacts/${appId}/public/data/messages`);
      const messageText = newMessage.trim();
      let finalMessage = messageText;
      let isSystemEnd = false;

      // --- STREAM END COMMAND CHECK ---
      if (messageText.toLowerCase() === '/end' && userId) {
        finalMessage = `Thank you for watching! Water loves you all! Remember to check out Kingofseavibe's songs.`;
        isSystemEnd = true;
      }
      // --------------------------------

      await addDoc(messagesCollectionRef, {
        text: finalMessage,
        createdAt: serverTimestamp(),
        userId: isSystemEnd ? 'stream_bot_end' : userId, 
        userName: isSystemEnd ? 'Stream Bot' : 'King of Sea Vibes',
        profilePic: userProfilePicUrl,
        isSystem: isSystemEnd ? true : false,
      });

      setNewMessage(''); // Clear the input field

    } catch (e) {
      console.error("Error sending message:", e);
    }
  };
  // -------------------------------------------------------------


  // --- Helper Component for Message Bubble ---
  const MessageBubble = ({ message }) => {
      const isSystem = message.isSystem || message.userId === 'stream_bot_id' || message.userId === 'stream_bot_end';
      const isMyMessage = message.userId === userId && !isSystem;

      let bubbleClass = isMyMessage 
          ? `${streamColor} ${streamTextColor} self-end rounded-br-none` 
          : 'bg-gray-700 text-gray-200 self-start rounded-tl-none';
      
      let nameClass = isMyMessage ? 'font-bold' : 'text-yellow-400 font-semibold';
      
      if (isSystem) {
          bubbleClass = 'bg-red-900 text-white text-center w-full my-1 rounded-lg';
          nameClass = 'hidden';
      }

      return (
          <div className={`flex w-full ${isMyMessage ? 'justify-end' : 'justify-start'} mb-2`}>
              <div className={`p-3 max-w-xs rounded-xl shadow-lg ${bubbleClass}`}>
                  <span className={nameClass}>{message.userName}</span>
                  <p className="text-sm break-words">{message.text}</p>
                  {/* Optional: Display timestamp (Requires formatting) */}
                  {/* <span className="text-xs opacity-50 block mt-1">
                      {message.createdAt?.toDate().toLocaleTimeString()}
                  </span> */}
              </div>
          </div>
      );
  };
  // -------------------------------------------


  // --- Render Loading/Error State ---
  if (isLoading) return <div className="p-4 text-white">Connecting to the Sea Vibe Stream...</div>;
  if (error) return <div className="p-4 text-red-400">Error: {error}</div>;


  // --- MAIN RENDER FUNCTION ---
  return (
    <div className={`flex flex-col h-screen max-h-screen ${streamColor}`} style={{ filter: streamFilter }}>
      
      {/* ⚠️ AGORA VIDEO/STREAM VIEW */}
      <div className="flex-none h-64 bg-black flex items-center justify-center text-white text-xl relative">
        {isCalling ? "Live Stream Active" : "Stream Is Offline"}
        <div className="absolute top-2 right-2 p-1 bg-red-600 rounded-full text-xs">
            {userCoins} Sea Coins
        </div>
        
        {/* Display Music Link (Uses environment variable) */}
        <div className="absolute bottom-2 left-2 bg-gray-900 bg-opacity-70 p-1.5 rounded-md text-sm text-yellow-300 font-mono">
            🎶 Music Link: {BACKGROUND_MUSIC_LINK}
        </div>
      </div>
      
      {/* 4. Color Filters / Theming Control */}
      <div className="flex-none p-2 bg-gray-800 flex flex-wrap justify-center space-x-2">
          {COLOR_FILTERS.map((filter, index) => (
              <button 
                  key={index}
                  onClick={() => applyColorFilter(filter)}
                  className={`px-3 py-1 text-xs rounded-full shadow-md transition-all 
                              ${filter.class} ${filter.style} 
                              ${streamColor === filter.class && streamFilter === filter.filter ? 'ring-4 ring-yellow-400' : ''}`}
              >
                  {filter.name}
              </button>
          ))}
      </div>


      {/* 5. Message History/Chat Window */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-black bg-opacity-70">
        {messages.map(message => (
          <MessageBubble key={message.id} message={message} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* 6. Gift Bar */}
      <div className="flex-none p-2 bg-gray-900 flex justify-around">
          {Object.entries(GIFT_CATALOG).map(([id, gift]) => (
              <button
                  key={id}
                  onClick={() => sendGift(id)}
                  className="flex flex-col items-center justify-center p-2 rounded-lg bg-gray-700 hover:bg-yellow-600 transition-colors text-white text-xs"
                  title={`Send ${gift.name} for ${gift.cost} coins`}
                  disabled={userCoins < gift.cost}
              >
                  <span className="text-2xl">{gift.icon}</span>
                  <span className="mt-1">{gift.cost}C</span>
              </button>
          ))}
      </div>


      {/* 7. Input/Controls Bar */}
      <div className="flex-none p-2 bg-gray-800 border-t border-gray-700">
        <form onSubmit={handleSend} className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Say something nice to the King of Sea Water..."
            className="flex-1 p-2 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
          />
          <button 
            type="submit" 
            disabled={newMessage.trim() === ''}
            className="px-4 py-2 bg-yellow-500 text-gray-900 font-bold rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50"
          >
            Send
          </button>
          
          {/* Agora Call Button (Host Only: Requires Host/Viewer check logic) */}
          <button 
            type="button" 
            onClick={() => isCalling ? agoraCallHandler.leaveChannel() : agoraCallHandler.joinChannel('stream-channel-123')}
            className={`px-4 py-2 ${isCalling ? 'bg-red-500' : 'bg-green-500'} text-white font-bold rounded-lg transition-colors`}
          >
            {isCalling ? 'End Call' : 'Start Call'} 
          </button>
        </form>
      </div>
    </div>
  );
};

export default LiveChatApp;
Import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, query, addDoc, serverTimestamp, onSnapshot, limit, doc, getDoc, setDoc, writeBatch, getDocs, where } from 'firebase/firestore'; 
// --- FIREBASE FUNCTIONS FOR BACKEND CALLS (REQUIRED FOR GLOBAL ROUTING) ---
import { getFunctions, httpsCallable } from 'firebase/functions';
// --- SDK IMPORTS FOR MEDIA & STORAGE ---
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
// ----------------------------------------
// Necessary for security:
import { initializeAppCheck, ReCaptchaV3Provider, getToken } from 'firebase/app-check'; 

// Define global variables provided by your environment/build system
const appId = '1:649938805337:android:e36021963f1eec8f100748'; 
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(firebaseConfig) : null;
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initialAuthToken : null;

// --- CRITICAL AGORA VARIABLE ---
const AGORA_APP_ID = '1234567890abcdef1234567890abcdef'; 
const AGORA_CHANNEL_NAME = 'kingofseavibe_stream'; 
// ------------------------------------

// --- CRITICAL SECURITY VARIABLE ---
const RECAPTCHA_SITE_KEY = '6LeHkIcpAAAAANrMh-2mJpTfQ0-k1rW2tY4y-S9X'; 
// ------------------------------------

// --- User Profile Picture URL (UPDATED WITH YOUR IMAGE) ---
const userProfilePicUrl = 'http://googleusercontent.com/image_collection/image_retrieval/14213590094360813927_0'; 
// ------------------------------------

// --- BACKGROUND MUSIC LINK (Fallback/Single Track Link) ---
const BACKGROUND_MUSIC_LINK = 'https://stream.kingofseavibe.com/live_music_feed'; 
// -----------------------------

// --- VIP MONETIZATION CONSTANTS ---
const VIP_VOICE_PAY_PRICE = '$14.99'; 
const VIP_VOICE_PAY_CURRENCY = 'USD';
// ----------------------------------

// --- WELCOME MESSAGE DETAILS (Unified Name) ---
const WELCOME_MESSAGE_ID = 'stream-welcome-banner'; 
const WELCOME_MESSAGE_TEXT = "You are welcome to the life of Kingofseavibe live stream! Let's enjoy, let there be peace, and respect the laws."; 
const WELCOME_USER_NAME = 'Stream Bot'; 
// -------------------------------

// --- GIFT CATALOG (Simple Array/Object for quick lookup) ---
const GIFT_CATALOG = {
    'vibe_heart': { name: 'Vibe Heart', cost: 10, icon: '❤️' },
    'golden_fish': { name: 'Golden Fish', cost: 50, icon: '🐠' },
    'water_wave': { name: 'Water Wave', cost: 100, icon: '🌊' },
};
const HOST_USER_ID = 'host_kingofseavibe'; 
// -------------------------------------------------------------

// --- AVAILABLE COLORS ARRAY FOR FILTER (Updated) ---
const COLOR_FILTERS = [
    { name: 'Default', class: 'bg-gray-900', style: 'text-white', filter: 'none' },
    { name: 'Classic Black', class: 'bg-black', style: 'text-white', filter: 'none' },
    { name: 'Grayscale Vibe', class: 'bg-gray-900', style: 'text-white', filter: 'grayscale(100%)' },
    { name: 'Sea Blue', class: 'bg-blue-900', style: 'text-blue-100', filter: 'none' },
    { name: 'Ocean Green', class: 'bg-green-900', style: 'text-green-100', filter: 'none' },
    { name: 'Vibe Purple', class: 'bg-purple-900', style: 'text-purple-100', filter: 'none' }
];
// -----------------------------------------

// === FINAL 28 SONG PLAYLIST BY SKYBOY STREET MASTER (Verified) ===
const SKYBOYSTREETMASTER_FINAL_PLAYLIST = [
    "1. Germany kill me slow slow 7 cut steal not ok do u use me for experiments", 
    "2. back off", 
    "3. f god f Jesus", 
    "4. life kissings me with teeth", 
    "5. loyalty nor be fool", 
    "6. f me f u all", 
    "7. if u no no", 
    "8. no stress no love", 
    "9. river is my", 
    "10. na polygamous be that", 
    "11. I am my dad and my dad is me", 
    "12. king of street love", 
    "13. never look down on ur self", 
    "14. I go lie to u", 
    "15. I give u peace when u need war", 
    "16. if I tell u say I nor need stress", 
    "17. queen mother", 
    "18. them dey try to see me down", 
    "19. bad g", 
    "20. me nor come this life to suffer",
    "21. Water King's Anthem",
    "22. Street Master Vibe",
    "23. Never Look Down (Acoustic)",
    "24. The River is My Home",
    "25. Royalty on the Street",
    "26. Heart of the Vibe",
    "27. Sea Vibe Stream Intro",
    "28. Keep Shining, Keep Strong"
];
// ------------------------------------------------------------------

// --- GLOBAL UTILITIES FOR LOW LATENCY ---
const getUserRegion = () => {
    return 'us-central1'; 
};

const getRegionalFunctionName = (baseName, region) => {
    if (region.includes('us')) return baseName + '_us';
    if (region.includes('europe')) return baseName + '_eu';
    if (region.includes('asia')) return baseName + '_asia';
    return baseName + '_us'; 
};
// ------------------------------------------


const LiveChatApp = () => { 
  const [app, setApp] = useState(null);
  const [db, setDb] = useState(null);
  const [storage, setStorage] = useState(null);
  const [userId, setUserId] = useState(null);
  const [functionsInstance, setFunctionsInstance] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isCalling, setIsCalling] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userCoins, setUserCoins] = useState(0); 
  const [streamColor, setStreamColor] = useState(COLOR_FILTERS[0].class); 
  const [streamTextColor, setStreamTextColor] = useState(COLOR_FILTERS[0].style);
  const [streamFilter, setStreamFilter] = useState(COLOR_FILTERS[0].filter); 
  
  // NEW STATE FOR MOTORCYCLE ENTRANCE & MONETIZATION
  const [isEntering, setIsEntering] = useState(false);
  const [isAdult, setIsAdult] = useState(false);
  const [canUseVoice, setCanUseVoice] = useState(false); // For VIP Underscore Voice Pay
  
  // TOKENS AND KEYS STATE
  const [idToken, setIdToken] = useState(null); 
  const [appCheckToken, setAppCheckToken] = useState(null);
  const [agoraToken, setAgoraToken] = useState(null); 
  
  // MUSIC PLAYER STATE
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0); 
  const [playlist] = useState(SKYBOYSTREETMASTER_FINAL_PLAYLIST); // USES VERIFIED 28-SONG LIST
  
  const messagesEndRef = useRef(null);
  const MAX_MESSAGES = 100;

  
  // === SCRIPT 3: MANUAL TOKEN REFRESH FUNCTION (GLOBAL) ===
  const refreshAgoraToken = async () => {
    if (!functionsInstance || !userId) {
      setError("System not ready or user not logged in.");
      return;
    }
    
    const userRegion = getUserRegion(); 
    const functionName = getRegionalFunctionName('tupacGenerateAgoraToken', userRegion); 

    setError(null);
    console.log(`Attempting Agora token refresh for Kingofseavibe via region: ${userRegion}`);
    
    try {
      const callable = httpsCallable(functionsInstance, functionName);
      const response = await callable({ channelName: AGORA_CHANNEL_NAME });
      
      setAgoraToken(response.data.agoraToken);
      console.log("Manual refresh successful.");
      
    } catch (e) {
      console.error("Manual refresh failed:", e);
      setError(`Failed to refresh token from ${functionName}: ${e.message}`);
    }
  };


  // --- AGORA CALL HANDLER (SYNCHRONIZED WITH MOTORCYCLE ENTRANCE & VOICE PAYWALL) ---
  const agoraCallHandler = useRef({
      joinChannel: async (channelName) => {
          if (!agoraToken) {
              await refreshAgoraToken(); 
              if (!agoraToken) {
                 setError("Cannot start call. Agora Token retrieval failed.");
                 return;
              }
          }
          
          // GENDER/VOICE PAYWALL CHECK: For Men/Other Users who didn't pay
          // 'Girls Free to Air' stream is free, but voice requires payment for others.
          if (userId !== HOST_USER_ID && !canUseVoice) {
              const priceMessage = `Access Denied: The VIP Underscore Voice Pay feature costs ${VIP_VOICE_PAY_PRICE} ${VIP_VOICE_PAY_CURRENCY} per month.`;
              setError(priceMessage);
              return;
          }

          // STEP 1: START THE MOTORCYCLE ENTRANCE ANIMATION (Set state to show animation)
          setIsEntering(true); 
          console.log("[ENTRANCE] Motorcycle Entrance Theme Initiated...");
          
          // ⚠️ AGORA INTEGRATOR ACTION: Replace this placeholder delay (3s) 
          // with the actual duration of the 'bike back motorcycle' animation.
          await new Promise(resolve => setTimeout(resolve, 3000)); 
          
          // STEP 2: INITIATE SECURE AGORA CONNECTION
          try {
              console.log(`[AGORA] Joining channel: ${channelName}. Using App ID: ${AGORA_APP_ID}`);
              
              // ⚠️ AGORA INTEGRATOR ACTION: Place ALL Agora SDK initialization,
              // client.join(AGORA_APP_ID, channelName, agoraToken, userId), 
              // and client.publish() commands here.
              
              
              // STEP 3: END THE ENTRANCE AND START THE LIVE FEED
              setIsEntering(false);
              setIsCalling(true); // Indicate stream is live
              console.log("[STREAM] Kingofseavibe stream is LIVE!");
          } catch (error) {
              setIsEntering(false); // Stop entrance on error
              setError(error);
          }
      },
      leaveChannel: async () => {
          console.log("[Kingofseavibe] Leaving channel.");
          setIsCalling(false);
          // ⚠️ AGORA INTEGRATOR ACTION: Place ALL client.leave() and resource cleanup commands here.
      }
  }).current;
  // --------------------------------------------------------------------------

  // --- UPDATED FUNCTION: Apply Color Filter (Remains the same) ---
  const applyColorFilter = (filter) => {
    setStreamColor(filter.class);
    setStreamTextColor(filter.style);
    setStreamFilter(filter.filter); 
  };
  // ----------------------------------------


  // 1. Initialize Firebase, App Check, Storage, Functions, and Auth
  useEffect(() => {
    if (!firebaseConfig) {
      setError("Firebase configuration is missing. Cannot initialize the app.");
      setIsLoading(false);
      return;
    }

    try {
      const firebaseApp = initializeApp(firebaseConfig);
      const firestore = getFirestore(firebaseApp);
      const firebaseStorage = getStorage(firebaseApp);
      const userAuth = getAuth(firebaseApp);
      const firebaseFunctions = getFunctions(firebaseApp);
      
      setApp(firebaseApp);
      setDb(firestore);
      setStorage(firebaseStorage);
      setFunctionsInstance(firebaseFunctions); 

      // --- Initialize App Check for security ---
      let appCheckInstance = null;
      if (firebaseApp && RECAPTCHA_SITE_KEY && RECAPTCHA_SITE_KEY.includes('YOUR_PUBLIC_RECAPTCHA_V3_SITE_KEY') === false) {
        appCheckInstance = initializeAppCheck(firebaseApp, {
            provider: new ReCaptchaV3Provider(RECAPTCHA_SITE_KEY),
            isTokenAutoRefreshEnabled: true 
        });
        
        getToken(appCheckInstance, false).then(({ token }) => {
            setAppCheckToken(token);
        }).catch((e) => {
            console.error("Error fetching App Check token:", e);
        });
      }
      
      const handleSignIn = async (auth) => {
        try {
          if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
          } else {
            await signInAnonymously(auth);
          }
        } catch (e) {
          setError("Failed to sign in. Check console for details.");
          await signInAnonymously(auth);
        }
      };
      
      handleSignIn(userAuth);

      const unsubscribeAuth = onAuthStateChanged(userAuth, async (user) => { 
        if (user) {
          setUserId(user.uid);
          
          // === FETCH FIREBASE ID TOKEN ===
          try {
            const token = await user.getIdToken(true); 
            setIdToken(token);
          } catch (e) {
            console.error("Error fetching ID token:", e);
          }
          
          // **SCRIPT 1 LOCATION: Fetch token immediately on sign-in (GLOBAL)**
          if (firebaseFunctions) {
              await refreshAgoraToken(); 
              console.log("Script 1: Token attempt on Auth Change using nearest function.");
          }

          // === GENDER-BASED ACCESS LOGIC ===
          const profileDocRef = doc(firestore, `user_profiles`, user.uid);
          const profileSnap = await getDoc(profileDocRef);
          let userGender = 'unknown';
          let isUserAdult = false; 

          if (profileSnap.exists()) {
              const profileData = profileSnap.data();
              userGender = profileData.gender || 'unknown';
              isUserAdult = profileData.isAdult || false; // Assume age check is done on signup
              setIsAdult(isUserAdult);
              
              // 1. Determine FREE ACCESS (Girls Free to Air 18+)
              const isFreeToAir = (userGender === 'female' && isUserAdult); 
              
              if (isFreeToAir) {
                  setCanUseVoice(true); // Grant free voice/streaming rights
              } else {
                  // 2. Paid Access Check (For Male/Other users OR users under 18)
                  const tier = profileData.subscriptionTier || 'FREE';
                  if (tier === 'PREMIUM_VIP') {
                      setCanUseVoice(true); // Paid Voice access
                  } else {
                      setCanUseVoice(false);
                  }
              }
          }
          // ===================================

          // === LOGIC: LISTEN FOR VIEWER'S COIN BALANCE ===
          const walletDocRef = doc(firestore, `artifacts/${appId}/private/user_wallets`, user.uid);
          const unsubscribeWallet = onSnapshot(walletDocRef, (doc) => {
              if (doc.exists()) {
                  setUserCoins(doc.data().coins || 0);
              } else {
                  setDoc(walletDocRef, { userId: user.uid, coins: 100, giftsSent: 0 }); 
                  setUserCoins(100); 
              }
          });

          // === LOGIC: LOG THE LOGIN EVENT (And Public Presence for Counts) ===
          const logLoginEvent = async (uid, currentRoomId) => {
            const loginEventsCollectionRef = collection(firestore, `artifacts/${appId}/private/login_events`);
            const loginDocRef = doc(loginEventsCollectionRef, uid);
            if (!(await getDoc(loginDocRef)).exists()) {
              await setDoc(loginDocRef, {
                userId: uid,
                userName: 'New Stream Viewer',
                loggedAt: serverTimestamp(),
                notificationStatus: 'PENDING', 
              });
            }
            
            // Public Presence for real-time counts
            const presenceRef = doc(firestore, 'live_presence', uid);
            await setDoc(presenceRef, { 
                userId: uid, 
                roomId: currentRoomId, 
                tier: canUseVoice ? 'VIP' : 'FREE_ADULT', // Simplified tier based on voice access
                timestamp: serverTimestamp() 
            }, { merge: true });
          };
          logLoginEvent(user.uid, 'FREE_STREAM_1'); // Default room on login

          return () => { unsubscribeAuth(); unsubscribeWallet(); }; 
        } else {
          setUserId(null);
          setIdToken(null);
          setAgoraToken(null);
        }
        setIsLoading(false); 
      });

      return () => unsubscribeAuth();
    } catch (e) {
      setError("Failed to initialize Firebase services.");
      setIsLoading(false);
    }
  }, []); 

  // MUSIC PLAYER LOGIC (Cycles through the 28 hardcoded songs)
  useEffect(() => {
    if (playlist.length === 0) return;

    const intervalId = setInterval(() => {
        setCurrentTrackIndex(prevIndex => (prevIndex + 1) % playlist.length);
    }, 15000); 

    return () => clearInterval(intervalId);
  }, [playlist.length]); 

  // 2. Real-time Data Listener (onSnapshot with Limit)
  useEffect(() => {
    if (!db || !userId) return;

    const messagesCollectionRef = collection(db, `artifacts/${appId}/public/data/messages`);
    const q = query(messagesCollectionRef, limit(MAX_MESSAGES)); 

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      fetchedMessages.sort((a, b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0));
      setMessages(fetchedMessages);
    }, (e) => {
      setError("Failed to fetch messages in real-time.");
    });

    return () => unsubscribe();
  }, [db, userId]); 

  // 3. Auto-scroll to the latest message
  useEffect(() => {
    if (messages.length > 0) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);
  

  // --- NEW FUNCTIONALITY: SEND GIFT TRANSACTION ---
  const sendGift = async (giftId) => {
      if (!db || !userId || !GIFT_CATALOG[giftId]) return;

      const gift = GIFT_CATALOG[giftId];
      if (userCoins < gift.cost) {
          setError(`Insufficient Sea Coins! Need ${gift.cost} coins for a ${gift.name}.`);
          return;
      }
      
      const batch = writeBatch(db);
      const userWalletRef = doc(db, `artifacts/${appId}/private/user_wallets`, userId);
      const transactionsCollectionRef = collection(db, `artifacts/${appId}/private/transactions`);
      const messagesCollectionRef = collection(db, `artifacts/${appId}/public/data/messages`);

      try {
          const walletSnap = await getDoc(userWalletRef);
          if (walletSnap.data().coins < gift.cost) {
              setError("Balance check failed. Please refresh or buy more coins.");
              return;
          }

          const newCoins = walletSnap.data().coins - gift.cost;
          batch.update(userWalletRef, { coins: newCoins, giftsSent: (walletSnap.data().giftsSent || 0) + 1 });

          batch.set(doc(transactionsCollectionRef), {
              senderId: userId,
              receiverId: HOST_USER_ID,
              giftId: giftId,
              valueCoins: gift.cost,
              timestamp: serverTimestamp(),
              userName: "Kingofseavibe",
          });

          await addDoc(messagesCollectionRef, {
              text: `${gift.icon} ${gift.name} sent! (Cost: ${gift.cost} coins)`,
              createdAt: serverTimestamp(),
              userId: userId,
              userName: "Kingofseavibe",
              profilePic: userProfilePicUrl,
              isSystem: true, 
              giftId: giftId,
          });

          await batch.commit();
          setError(null); 

      } catch (e) {
          console.error("Gift transaction failed:", e);
          setError("Failed to send gift. Please check connection and funds.");
      }
  };
  // -------------------------------------------------------------


  // 4. Handle sending a new message 
  const handleSend = async (e) => {
    e.preventDefault();
    if (newMessage.trim() === '' || !db || !userId) return;

    try {
      const messagesCollectionRef = collection(db, `artifacts/${appId}/public/data/messages`);
      const messageText = newMessage.trim();
      let finalMessage = messageText;
      let isSystemEnd = false;

      if (messageText.toLowerCase() === '/end' && userId) {
        finalMessage = `Thank thank you for watching! Water loves you all! Remember to check out Kingofseavibe's songs.`;
        isSystemEnd = true;
      }

      await addDoc(messagesCollectionRef, {
        text: finalMessage,
        createdAt: serverTimestamp(),
        userId: isSystemEnd ? 'stream_bot_end' : userId, 
        userName: 'Kingofseavibe',
        profilePic: userProfilePicUrl,
        isSystem: isSystemEnd ? true : false,
      });

      setNewMessage(''); 
    } catch (e) {
      console.error("Error sending message:", e);
    }
  };
  // -------------------------------------------------------------

  // --- Helper Component for Message Bubble ---
  const MessageBubble = ({ message }) => {
      const isSystem = message.isSystem || message.userId === 'stream_bot_id' || message.userId === 'stream_bot_end';
      const isMyMessage = message.userId === userId && !isSystem;

      let bubbleClass = isMyMessage 
          ? `${streamColor} ${streamTextColor} self-end rounded-br-none` 
          : 'bg-gray-700 text-gray-200 self-start rounded-tl-none';
      
      let nameClass = isMyMessage ? 'font-bold' : 'text-yellow-400 font-semibold';
      
      if (isSystem) {
          bubbleClass = 'bg-red-900 text-white text-center w-full my-1 rounded-lg';
          nameClass = 'hidden';
      }

      return (
          <div className={`flex w-full ${isMyMessage ? 'justify-end' : 'justify-start'} mb-2`}>
              {/* IMAGE DISPLAY CORRECTION */}
              {!isSystem && 
                <img 
                    src={message.profilePic || userProfilePicUrl} 
                    alt="Profile" 
                    className={`w-8 h-8 rounded-full object-cover mr-2 ${isMyMessage ? 'order-2 ml-2' : 'order-1'}`}
                />
              }
              
              <div className={`p-3 max-w-xs rounded-xl shadow-lg ${bubbleClass} ${!isSystem ? (isMyMessage ? 'order-1' : 'order-2') : 'order-1'}`}>
                  <span className={nameClass}>{message.userName}</span>
                  <p className="text-sm break-words">{message.text}</p>
              </div>
          </div>
      );
  };
  // -------------------------------------------


  // --- Render Loading/Error State ---
  if (isLoading) return <div className="p-4 text-white">Connecting to Kingofseavibe Stream...</div>;
  if (error) return <div className="p-4 text-red-400">Error: {error}</div>;

  // CONSOLIDATED KEY DISPLAY FOR DEBUGGING
  const CRITICAL_USER_KEYS = userId ? [
    { label: "UID", value: userId, short: userId.substring(0, 8) + '...' },
    { label: "ID Token", value: idToken, short: idToken ? idToken.substring(0, 8) + '...' : 'N/A' },
    { label: "App Check", value: appCheckToken, short: appCheckToken ? appCheckToken.substring(0, 8) + '...' : 'N/A' },
    { label: "Agora Token", value: agoraToken, short: agoraToken ? agoraToken.substring(0, 8) + '...' : 'N/A' },
  ] : [];


  // --- MAIN RENDER FUNCTION ---
  return (
    <div className={`flex flex-col h-screen max-h-screen ${streamColor}`} style={{ filter: streamFilter }}>
      
      {/* ⚠️ AGORA VIDEO/STREAM VIEW */}
      <div className="flex-none h-64 bg-black flex items-center justify-center text-white text-xl relative">
        {isCalling ? "Kingofseavibe Stream Active" : 
         isEntering ? "🏍️ Motorcycle Entrance In Progress..." : 
         "Stream Is Offline"}
        <div className="absolute top-2 right-2 p-1 bg-red-600 rounded-full text-xs">
            {userCoins} Sea Coins
        </div>
        
        {/* PROFILE PICTURE DISPLAY CORRECTION */}
        <img 
            src={userProfilePicUrl} 
            alt="Host Profile" 
            className="w-16 h-16 rounded-full object-cover absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border-4 border-yellow-500"
        />
        
        {/* CONSOLIDATED KEY DEBUG DISPLAY */}
        <div className="absolute bottom-0 left-0 right-0 p-1 bg-gray-900 bg-opacity-70 text-xs text-green-300 flex justify-around">
            {CRITICAL_USER_KEYS.map((key, index) => (
                <span key={index} title={key.value || 'Token not available'}>
                    **{key.label}**: {key.short}
                </span>
            ))}
            {CRITICAL_USER_KEYS.length === 0 && <span>User not signed in.</span>}
        </div>
        
        {/* Display Current Song */}
        <div className="absolute bottom-6 left-2 bg-gray-900 bg-opacity-70 p-1.5 rounded-md text-sm text-yellow-300 font-mono">
            🎶 Playing: {playlist.length > 0 ? playlist[currentTrackIndex] : 'Loading Playlist...'}
        </div>
      </div>
      
      {/* 4. Color Filters / Theming Control */}
      <div className="flex-none p-2 bg-gray-800 flex flex-wrap justify-center space-x-2">
          {COLOR_FILTERS.map((filter, index) => (
              <button 
                  key={index}
                  onClick={() => applyColorFilter(filter)}
                  className={`px-3 py-1 text-xs rounded-full shadow-md transition-all 
                              ${filter.class} ${filter.style} 
                              ${streamColor === filter.class && streamFilter === filter.filter ? 'ring-4 ring-yellow-400' : ''}`}
              >
                  {filter.name}
              </button>
          ))}
      </div>


      {/* 5. Message History/Chat Window */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-black bg-opacity-70">
        {messages.map(message => (
          <MessageBubble key={message.id} message={message} />
        ))}
        <div ref={messagesEndRef} />
      </div>


      {/* 6. Gift Bar */}
      <div className="flex-none p-2 bg-gray-900 flex justify-around">
          {Object.entries(GIFT_CATALOG).map(([id, gift]) => (
              <button
                  key={id}
                  onClick={() => sendGift(id)}
                  className="flex flex-col items-center justify-center p-2 rounded-lg bg-gray-700 hover:bg-yellow-600 transition-colors text-white text-xs"
                  title={`Send ${gift.name} for ${gift.cost} coins`}
                  disabled={userCoins < gift.cost}
              >
                  <span className="text-2xl">{gift.icon}</span>
                  <span className="mt-1">{gift.cost}C</span>
              </button>
          ))}
      </div>


      {/* 7. Input/Controls Bar */}
      <div className="flex-none p-2 bg-gray-800 border-t border-gray-700">
        <form onSubmit={handleSend} className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Say something nice to Kingofseavibe..."
            className="flex-1 p-2 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
          />
          <button 
            type="submit" 
            disabled={newMessage.trim() === ''}
            className="px-4 py-2 bg-yellow-500 text-gray-900 font-bold rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50"
          >
            Send
          </button>
          
          {/* Agora Call Button (Uses SCRIPT 2 logic internally) */}
          <button 
            type="button" 
            onClick={() => isCalling ? agoraCallHandler.leaveChannel() : agoraCallHandler.joinChannel(AGORA_CHANNEL_NAME)}
            className={`px-4 py-2 ${isCalling ? 'bg-red-500' : 'bg-green-500'} text-white font-bold rounded-lg transition-colors`}
          >
            {isCalling ? 'End Call' : 'Start Call'} 
          </button>
          
          {/* Manual Token Refresh Button (Uses SCRIPT 3 logic) */}
          <button 
            type="button" 
            onClick={refreshAgoraToken}
            disabled={!userId || isLoading}
            className="px-4 py-2 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            Refresh Token
          </button>
        </form>
      </div>
    </div>
  );
};

export default LiveChatApp;
