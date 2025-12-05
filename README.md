import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, query, addDoc, serverTimestamp, onSnapshot, limit, doc, getDoc, setDoc } from 'firebase/firestore'; 
// Necessary for security:
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check'; 

// Define global variables provided by your environment/build system
// IMPORTANT: You must set __firebase_config and __app_id in your hosting environment.
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// --- CRITICAL SECURITY VARIABLE ---
// You must replace this placeholder with your actual key from the Google reCAPTCHA Admin Console.
const RECAPTCHA_SITE_KEY = 'YOUR_PUBLIC_RECAPTCHA_V3_SITE_KEY'; 
// ------------------------------------

// --- User Profile Picture URL ---
const userProfilePicUrl = 'https://i.ibb.co/L5Q2j85/image.png'; 

// --- WELCOME MESSAGE DETAILS ---
const WELCOME_MESSAGE_ID = 'stream-welcome-banner'; 
const WELCOME_MESSAGE_TEXT = "Welcome to King of sea water Stream!"; 
const WELCOME_USER_NAME = 'Stream Bot'; 
// -------------------------------

const LiveChatApp = () => { // Renamed component to LiveChatApp for clarity
  const [db, setDb] = useState(null);
  const [userId, setUserId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const MAX_MESSAGES = 100;

  // 1. Initialize Firebase, App Check, and Handle Authentication
  useEffect(() => {
    if (!firebaseConfig) {
      setError("Firebase configuration is missing. Cannot initialize the app.");
      setIsLoading(false);
      return;
    }

    try {
      const app = initializeApp(firebaseConfig);
      const firestore = getFirestore(app);
      const userAuth = getAuth(app);
      
      setDb(firestore);

      // --- Initialize App Check for security ---
      if (app && RECAPTCHA_SITE_KEY && RECAPTCHA_SITE_KEY.includes('YOUR_PUBLIC_RECAPTCHA_V3_SITE_KEY') === false) {
        initializeAppCheck(app, {
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
            // Uses new Date(0) to ensure it appears as the first message
            createdAt: new Date(0), 
            userId: 'stream_bot_id',
            userName: WELCOME_USER_NAME,
            profilePic: userProfilePicUrl,
            isSystem: true 
          });
        }
      };
      // ----------------------------------------------------

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
    // Limits the number of messages fetched for performance
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
        finalMessage = `Thank you for watching the King of sea water Stream! Follow and subscribe for the next broadcast!`;
        isSystemEnd = true;
      }
      // --------------------------------

      await addDoc(messagesCollectionRef, {
        text: finalMessage,
        createdAt: serverTimestamp(),
        // If system message, use stream_bot_end ID, otherwise use host's UID
        userId: isSystemEnd ? 'stream_bot_end' : userId, 
        // Use Stream Bot name for end message, otherwise use host's stream name
        userName: isSystemEnd ? 'Stream Bot' : "King of sea water", 
        profilePic: userProfilePicUrl,
        isSystem: isSystemEnd 
      });

      setNewMessage(''); 
    } catch (e) {
      console.error("Error sending message:", e);
      setError("Failed to send message. Please check your connection.");
    }
  };

  // --- Utility Component for Message Bubble (Tailwind CSS) ---
  const MessageBubble = ({ msg, isCurrentUser }) => {
    const timeString = msg.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'Sending...';
    const isSystemMessage = msg.isSystem; 

    return (
        <div className={`flex ${isCurrentUser ? 'justify-end' : isSystemMessage ? 'justify-center' : 'justify-start'}`}>
            <div className={`flex flex-col p-3 max-w-full lg:max-w-xl shadow-lg rounded-xl transition duration-300 ${
                isCurrentUser 
                    ? 'bg-purple-600 text-white rounded-br-sm' 
                    : isSystemMessage 
                        ? 'bg-yellow-800 text-white rounded-lg text-center' 
                        : 'bg-gray-100 text-gray-800 rounded-tl-sm' 
            }`}>
                <div className="flex items-center space-x-2 mb-1">
                    {!isSystemMessage && (
                      <img 
                          src={msg.profilePic || userProfilePicUrl} 
                          alt="Profile" 
                          className={`w-6 h-6 rounded-full object-cover border-2 ${
                              isCurrentUser ? 'border-purple-800' : 'border-gray-300'
                          }`}
                      />
                    )}
                    <span className={`font-semibold text-sm ${isCurrentUser ? 'text-purple-200' : isSystemMessage ? 'text-yellow-200' : 'text-purple-600'}`}>
                        {isCurrentUser ? 'You' : msg.userName}
                    </span>
                </div>
                <p className={`break-words text-base ${isCurrentUser ? 'text-white' : isSystemMessage ? 'text-white font-bold' : 'text-gray-900'}`}>{msg.text}</p>
                <span className={`text-xs mt-1 block text-right ${isCurrentUser ? 'text-purple-300' : isSystemMessage ? 'text-yellow-600' : 'text-gray-500'}`}>
                    {!isSystemMessage && timeString}
                </span>
            </div>
        </div>
    );
  };

  // --- Rendering Logic ---

  if (error) {
    return <div className="p-4 bg-red-100 text-red-700 font-mono rounded-lg shadow-xl max-w-lg mx-auto mt-10">Error: {error}</div>;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 p-2 font-inter text-white">
      <header className="bg-gray-800 p-4 rounded-t-xl shadow-2xl border-b-4 border-purple-600">
        <div className="flex justify-between items-center">
            <h1 className="text-3xl font-extrabold text-white flex items-center">
                <span className="h-3 w-3 mr-2 rounded-full bg-red-500 animate-pulse shadow-md"></span>
                Global Live Stream Chat
            </h1>
            <span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase shadow-lg">
                LIVE
            </span>
        </div>
        <p className="text-xs mt-2 text-gray-400">
            {userId 
                ? <span className="font-mono">Your Viewer ID: {userId}</span>
                : <span className="font-mono">Connecting to stream...</span>
            }
        </p>
      </header>

      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center text-purple-400">
            <svg className="animate-spin h-10 w-10 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="text-xl">Loading Stream Chat...</span>
        </div>
      ) : (
        <>
          <main className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-900">
            {messages.length === 0 ? (
                <div className="text-center text-gray-600 mt-10">
                    The chat is empty. Send the first message to start the stream!
                </div>
            ) : (
                messages.map((msg) => (
                    <MessageBubble 
                        key={msg.id} 
                        msg={msg} 
                        isCurrentUser={msg.userId === userId}
                    />
                ))
            )}
            <div ref={messagesEndRef} />
          </main>

          <footer className="p-4 bg-gray-800 rounded-b-xl shadow-2xl border-t-4 border-purple-600">
            <form onSubmit={handleSend} className="flex space-x-3">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Send a message to the stream... (Type /end to finish stream)"
                className="flex-1 p-3 border border-gray-600 bg-gray-700 text-white rounded-full focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition duration-150 placeholder-gray-400"
                disabled={!userId}
              />
              <button
                type="submit"
                className="bg-purple-600 text-white p-3 rounded-full shadow-lg hover:bg-purple-700 disabled:opacity-50 transition duration-150 transform hover:scale-105 flex items-center justify-center"
                disabled={!userId || newMessage.trim() === ''}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </form>
          </footer>
        </>
      )}
    </div>
  );
};

export default LiveChatApp;
