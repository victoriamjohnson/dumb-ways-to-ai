// Firebase Configuration for Dumb Ways to AI
// Using Firebase v10 compat SDK (works with <script> tags in HTML)

const firebaseConfig = {
  apiKey: "AIzaSyB6Zx6P8IoBkJESM-4vDXwwR6CdGBolE5A",
  authDomain: "dumb-ways-to-ai.firebaseapp.com",
  databaseURL: "https://dumb-ways-to-ai-default-rtdb.firebaseio.com",
  projectId: "dumb-ways-to-ai",
  storageBucket: "dumb-ways-to-ai.firebasestorage.app",
  messagingSenderId: "753554088889",
  appId: "1:753554088889:web:9d51a7557b0203bb6b0c68"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Get a reference to the database service
const database = firebase.database();

console.log("Firebase initialized successfully!");
