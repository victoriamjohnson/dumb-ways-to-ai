// src/leaderboard.js
// Handles all leaderboard read/write — Firebase Realtime DB with localStorage fallback

const LEADERBOARD_KEY = 'dwai_leaderboard_v1';
const FIREBASE_PATH   = 'leaderboard';

// ─── WRITE ────────────────────────────────────────────────────────────────────

// Save or update a player's score (keeps their best score only)
export async function submitScore(name, score) {
  // Always write to localStorage first as backup
  _updateLocalLeaderboard(name, score);

  // Then try Firebase
  try {
    const db  = firebase.database();
    const ref = db.ref(`${FIREBASE_PATH}/${_sanitizeKey(name)}`);
    const snapshot = await ref.once('value');
    const existing = snapshot.val();

    // Only update if this score is better than what's stored
    if (!existing || score > existing.score) {
      await ref.set({ name, score, updatedAt: Date.now() });
    }
  } catch (err) {
    console.warn('Firebase write failed, localStorage used as fallback.', err);
  }
}

// ─── READ ─────────────────────────────────────────────────────────────────────

// Returns top N entries as array of { name, score }, sorted descending
// Tries Firebase first, falls back to localStorage
export async function getTopScores(limit = 3) {
  try {
    const db  = firebase.database();
    const ref = db.ref(FIREBASE_PATH);
    const snapshot = await ref.orderByChild('score').limitToLast(limit * 2).once('value');

    const entries = [];
    snapshot.forEach(child => {
      const val = child.val();
      if (val && val.name && typeof val.score === 'number') {
        entries.push({ name: val.name, score: val.score });
      }
    });

    entries.sort((a, b) => b.score - a.score);
    return entries.slice(0, limit);

  } catch (err) {
    console.warn('Firebase read failed, falling back to localStorage.', err);
    return _getLocalTopScores(limit);
  }
}

// ─── LOCAL STORAGE HELPERS ────────────────────────────────────────────────────

function _updateLocalLeaderboard(name, score) {
  try {
    const entries = _loadLocal();
    const idx = entries.findIndex(e => e.name === name);
    if (idx >= 0) {
      entries[idx].score = Math.max(entries[idx].score, score);
    } else {
      entries.push({ name, score });
    }
    entries.sort((a, b) => b.score - a.score);
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries.slice(0, 25)));
  } catch (err) {
    console.warn('localStorage write failed.', err);
  }
}

function _getLocalTopScores(limit) {
  return _loadLocal().slice(0, limit);
}

function _loadLocal() {
  try {
    return JSON.parse(localStorage.getItem(LEADERBOARD_KEY)) || [];
  } catch {
    return [];
  }
}

// Firebase keys can't have . # $ [ ] — replace with _
function _sanitizeKey(name) {
  return name.replace(/[.#$[\]\s]/g, '_');
}