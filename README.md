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
