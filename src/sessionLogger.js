// src/sessionLogger.js
//
// Central session data collector for Dumb Ways to AI.
// Import this anywhere with:  import sessionLogger from '../sessionLogger.js';
//
// Call sessionLogger.init(playerName, grade) at login.
// Call the appropriate log* methods throughout the game.
// Call sessionLogger.writeToFirebase() at the very end (ThankYouScene).


// ─── Internal state ───────────────────────────────────────────────────────────

const _session = {
  player:      null,   // { name, grade, loginAt, tutorialStartAt }
  tutorials:   {},     // keyed by principle name
  challenge:   null,   // set when challenge starts
  bonuses:     [],     // array — one entry per bonus question shown
  result:      null,   // set at pledge screen
};

// ─── Init ─────────────────────────────────────────────────────────────────────

/**
 * Call immediately after the player logs in (LoginScene).
 * @param {string} name  - player's display name (e.g. "Victoria J")
 * @param {string} grade - player's grade level
 */
function init(name, grade) {
  _session.player = {
    name,
    grade,
    loginAt:        Date.now(),
    tutorialStartAt: null,
  };
  _session.tutorials  = {};
  _session.challenge  = null;
  _session.bonuses    = [];
  _session.result     = null;
}

// ─── Tutorial tracking ────────────────────────────────────────────────────────

/**
 * Call at the start of TutorialStoryScene (the intro).
 */
function logTutorialStart() {
  if (!_session.player) {
    // init() hasn't been called yet — create a minimal player record
    _session.player = { name: null, grade: null, loginAt: null, tutorialStartAt: Date.now() };
  } else {
    _session.player.tutorialStartAt = Date.now();
  }
}

/**
 * Call at the very start of each tutorial mini-game scene (create()).
 * @param {'fairness'|'transparency'|'accountability'|'privacy'} principle
 */
function logTutorialMiniGameStart(principle) {
  _session.tutorials[principle] = {
    startAt:  Date.now(),
    endAt:    null,
    passed:   null,
    durationMs: null,
  };
}

/**
 * Call when a tutorial mini-game ends (pass or fail).
 * @param {'fairness'|'transparency'|'accountability'|'privacy'} principle
 * @param {boolean} passed
 */
function logTutorialMiniGameEnd(principle, passed) {
  const t = _session.tutorials[principle];
  if (!t) return;
  t.endAt     = Date.now();
  t.passed    = passed;
  t.durationMs = t.endAt - t.startAt;
}

// ─── Challenge tracking ───────────────────────────────────────────────────────

/**
 * Call when ChallengeScene starts (create(), not resumeRun).
 */
function logChallengeStart() {
  _session.challenge = {
    startAt:        Date.now(),
    endAt:          null,
    endReason:      null,
    roundsCompleted: 0,
    rounds:         [],
    highestDifficultyReached: 'easy',
    livesLostPerType: {
      fairness:       0,
      transparency:   0,
      accountability: 0,
      privacy:        0,
    },
  };
}

/**
 * Call after every round result (win or loss), before the points screen.
 * @param {object} opts
 * @param {string}  opts.miniGame            - 'fairness' | 'transparency' | 'accountability' | 'privacy'
 * @param {boolean} opts.win                 - true = win, false = loss
 * @param {number}  opts.roundStartedAt      - timestamp from when the round core started
 * @param {number}  opts.globalTimeRemaining - seconds left on the global timer
 * @param {string}  opts.difficulty          - 'easy' | 'medium' | 'hard' | 'extreme'
 * @param {number}  opts.pointsEarned        - points awarded this round
 * @param {number}  opts.cumulativeScore     - total score after this round
 */
function logRound({ miniGame, win, roundStartedAt, globalTimeRemaining, difficulty, pointsEarned, cumulativeScore }) {
  if (!_session.challenge) return;

  _session.challenge.roundsCompleted += 1;
  const roundNumber = _session.challenge.roundsCompleted;
  const durationMs  = Date.now() - roundStartedAt;

  // Track the highest difficulty tier reached this session
  const tierOrder = ['easy', 'medium', 'hard', 'extreme'];
  const currentHighest = _session.challenge.highestDifficultyReached ?? 'easy';
  if (tierOrder.indexOf(difficulty) > tierOrder.indexOf(currentHighest)) {
    _session.challenge.highestDifficultyReached = difficulty;
  }

  _session.challenge.rounds.push({
    roundNumber,
    miniGame,
    difficulty,
    win,
    pointsEarned,
    cumulativeScore,
    durationMs,
    globalTimeRemainingSeconds: globalTimeRemaining,
  });

  if (!win) {
    _session.challenge.livesLostPerType[miniGame] =
      (_session.challenge.livesLostPerType[miniGame] ?? 0) + 1;
  }
}

/**
 * Call when the challenge ends (time up, all lives lost, or natural end).
 * @param {'timesUp'|'allLivesLost'|'completed'} reason
 */
function logChallengeEnd(reason) {
  if (!_session.challenge) return;
  _session.challenge.endAt     = Date.now();
  _session.challenge.endReason = reason;
}

// ─── Bonus question tracking ──────────────────────────────────────────────────

/**
 * Call when the bonus question popup appears.
 * @param {number} questionIndex - index in the question pool (0 or 1)
 */
function logBonusTriggered(questionIndex) {
  _session.bonuses.push({
    triggered:      true,
    questionIndex,
    shownAt:        Date.now(),
    answer:         null,
    correct:        null,
    responseTimeMs: null,
  });
}

/**
 * Call when the student submits their bonus answer.
 * @param {string}  answer  - the letter they chose (e.g. 'A')
 * @param {boolean} correct
 */
function logBonusAnswer(answer, correct) {
  // Find the most recent bonus entry that hasn't been answered yet
  const entry = [..._session.bonuses].reverse().find(b => b.answer === null);
  if (!entry) return;
  entry.answer         = answer;
  entry.correct        = correct;
  entry.responseTimeMs = Date.now() - entry.shownAt;
}

// ─── Result tracking ──────────────────────────────────────────────────────────

/**
 * Call from EndPledgeScene when the student makes their pledge choice.
 * @param {'promised'|'cancelled'} pledgeResponse
 * @param {number} finalScore
 */
function logResult(pledgeResponse, finalScore) {
  _session.result = {
    finalScore,
    finalRank:      null,   // filled in by writeToFirebase after leaderboard fetch
    pledgeResponse,
    recordedAt:     Date.now(),
  };
}

/**
 * Convenience getter so ThankYouScene can set the rank after fetching leaderboard.
 */
function setFinalRank(rank) {
  if (_session.result) _session.result.finalRank = rank;
}

// ─── Firebase write ───────────────────────────────────────────────────────────

/**
 * Writes the complete session to Firebase.
 * Call once from ThankYouScene after the leaderboard rank is known.
 * Returns a promise that resolves when the write completes.
 */
async function writeToFirebase() {
  if (!_session.player) {
    console.warn('[sessionLogger] writeToFirebase called before init()');
    return;
  }

  const safeName = (_session.player.name || 'unknown')
    .replace(/[.#$/\[\]]/g, '_')   // Firebase key-safe
    .replace(/\s+/g, '_');

  const key = `${safeName}_${_session.player.loginAt}`;

  const payload = {
    player:    _session.player,
    tutorials: _session.tutorials,
    challenge: _session.challenge,
    bonuses:   _session.bonuses.length > 0 ? _session.bonuses : [{ triggered: false }],
    result:    _session.result,
  };

  try {
    await firebase.database().ref(`sessions/${key}`).set(payload);
    console.log('[sessionLogger] Session written to Firebase:', key);
  } catch (err) {
    console.error('[sessionLogger] Firebase write failed, saving to localStorage:', err);
    // localStorage fallback
    try {
      const existing = JSON.parse(localStorage.getItem('dwai_sessions') || '[]');
      existing.push({ key, ...payload });
      localStorage.setItem('dwai_sessions', JSON.stringify(existing));
    } catch (lsErr) {
      console.error('[sessionLogger] localStorage fallback also failed:', lsErr);
    }
  }
}

// ─── Export ───────────────────────────────────────────────────────────────────

const sessionLogger = {
  init,
  logTutorialStart,
  logTutorialMiniGameStart,
  logTutorialMiniGameEnd,
  logChallengeStart,
  logRound,
  logChallengeEnd,
  logBonusTriggered,
  logBonusAnswer,
  logResult,
  setFinalRank,
  writeToFirebase,
};

export default sessionLogger;