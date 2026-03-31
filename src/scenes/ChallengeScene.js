// src/scenes/ChallengeScene.js
import sessionLogger from '../sessionLogger.js';
import gameState from '../gameState.js';
import { submitScore, getTopScores } from '../leaderboard.js';

export default class ChallengeScene extends Phaser.Scene {
  constructor() {
    super('ChallengeScene');

    // ── Difficulty tiers — advance every 5 rounds ─────────────────────────────
    this.difficultyTiers = [
      {
        name: 'easy',
        labelSpeed:               550,
        acSpacesMin: 10, acSpacesMax: 15,
        basketballTimeLimit:   10000,
        transparencyTimeLimit:  8000,
        accountabilityTimeLimit:7000,
        privacyTimeLimit:      10000,
        multiplier: 1,
      },
      {
        name: 'medium',
        labelSpeed:               750,
        acSpacesMin: 15, acSpacesMax: 20,
        basketballTimeLimit:    8000,
        transparencyTimeLimit:  6000,
        accountabilityTimeLimit:5000,
        privacyTimeLimit:       8000,
        multiplier: 2,
      },
      {
        name: 'hard',
        labelSpeed:               950,
        acSpacesMin: 20, acSpacesMax: 25,
        basketballTimeLimit:    6000,
        transparencyTimeLimit:  4000,
        accountabilityTimeLimit:4000,
        privacyTimeLimit:       6000,
        multiplier: 5,
      },
      {
        name: 'extreme',
        labelSpeed:               1050,
        acSpacesMin: 25, acSpacesMax: 35,
        basketballTimeLimit:    5000,
        transparencyTimeLimit:  3000,
        accountabilityTimeLimit:3000,
        privacyTimeLimit:       5000,
        multiplier: 10,
      },
    ];
    this.currentTierIndex     = 0;
    this.roundsCompletedTotal = 0;

    // ── Points ────────────────────────────────────────────────────────────────
    this.winPoints     = 100; // kept so nothing breaks
    this.resultAnimDurationMs = 3000;
    this.leaderboardKey = 'dwai_leaderboard_v1';

    this.players = [];
    this.pointsUI = [];
    this.commentObjects = [];
    this.loseCommentObjects = [];

    this.miniGames = ['fairness', 'transparency', 'accountability', 'privacy'];
    this.currentMiniGame = null;

    // Transparency play phase
    this.labelSprite = null;
    this.targetBox = null;
    this.labelSpeed = 350; // overridden by tier at runtime
    this.transparencyRoundTimerEvent = null;

    // Accountability play phase
    this.accountabilitySpaceCount = 0;
    this.accountabilitySpacesRequired = 20;
    this.accountabilityBarFillGraphics = null;
    this.accountabilityOverrideOval = null;
    this.accountabilityRoundTimerEvent = null;
    this.accountabilityPlayObjects = [];

    // Privacy play phase
    this.privacyToggleLeft  = false;
    this.privacyToggleRight = false;
    this.privacyToggleLeftGraphics  = null;
    this.privacyToggleRightGraphics = null;
    this.privacySaveBtn = null;
    this.privacyXBtn    = null;
    this.privacyCurrentPair = null;
    this.privacyRoundTimerEvent = null;
    this.privacyPlayObjects = [];
  }

  // ── Convenience getter — always use this for current tier settings ──────────
  get tier() {
    return this.difficultyTiers[Math.min(this.currentTierIndex, this.difficultyTiers.length - 1)];
  }

  // ── Points: base × difficulty multiplier, with speed bonus for wins ─────────
  // Pass: (100 + bar% × 100) × multiplier
  // Fail: 25 × multiplier
  calculatePoints(success, roundTimeLimit) {
    const elapsed     = Date.now() - this.roundStartedAt;
    const barFraction = Math.max(0, Math.min(1, 1 - elapsed / roundTimeLimit));
    const speedBonus  = success ? Math.round(100 * barFraction) : 0;
    const base        = success ? 100 : 25;
    return (base + speedBonus) * this.tier.multiplier;
  }

  init(data) {
    this.resumeRun = !!data?.resumeRun;
    this.fromBonusQuestion = !!data?.fromBonusQuestion;
    this.bonusCorrect = !!data?.bonusCorrect;
    if (this.resumeRun) {
      this.timeRemaining        = data.timeRemaining        ?? this.timeRemaining ?? 120;
      gameState.score           = data.score                ?? gameState.score    ?? 0;
      gameState.badges          = data.badges               ?? gameState.badges   ?? 1;
      this.currentTierIndex     = data.currentTierIndex     ?? 0;
      this.roundsCompletedTotal = data.roundsCompletedTotal ?? 0;
    }
    this.globalTimerPaused = false;
  }

  preload() {
    // ── Shared ──
    this.load.image('points_bg',      'assets/ui/Points_Screen.png');
    this.load.image('bonus_popup_bg', 'assets/ui/Bonus_Pop_Up.png');
    this.load.image('heart_full',     'assets/ui/Heart.png');
    this.load.image('heart_lost',     'assets/ui/Heart_Loss.png');

    // ── Fairness ──
    this.load.image('bb_overlay_bg',         'assets/ui/Basketball_Screen_Overlay.png');
    this.load.image('bb_challenge_bg',        'assets/ui/Basketball_Challenge_Screen.png');
    this.load.image('player_boy',             'assets/ui/Boy_Player.png');
    this.load.image('player_girl',            'assets/ui/Girl_Player.png');
    this.load.image('player_boy_deleted',     'assets/ui/Boy_Player_Deleted.png');
    this.load.image('player_girl_deleted',    'assets/ui/Girl_Player_Deleted.png');
    const bbBase = 'assets/basketball_animations';
    for (let i = 1; i <= 35; i++) this.load.image(`bb_lose_${i}`, `${bbBase}/Basketball_Lose_Screen_-${i}.png`);
    for (let i = 1; i <= 29; i++) this.load.image(`bb_win_${i}`,  `${bbBase}/Basketball_Win_Screen_-${i}.png`);

    // ── Transparency ──
    this.load.image('dt_overlay_bg',      'assets/ui/DoomTube_Screen_Overlay.png');
    this.load.image('dt_challenge_bg',    'assets/ui/DoomTube_Challenge_Screen.png');
    this.load.image('dt_lose_bg',         'assets/ui/DoomTube_Lose_Screen.png');
    this.load.image('ai_feature_label',   'assets/ui/AI_Feature_Label.png');
    this.load.image('comment_bubble',     'assets/ui/Comment.png');
    const dtBase = 'assets/doomtube_animations';
    for (let i = 1; i <= 8; i++) this.load.image(`dt_win_${i}`, `${dtBase}/DoomTube_Win_Screen-${i}.png`);

    // ── Accountability ──
    this.load.image('ac_overlay_bg',    'assets/ui/Grades_Screen_Overlay.png');
    this.load.image('ac_challenge_bg',  'assets/ui/Grades_Challenge_Screen.png');
    this.load.image('ac_bar',           'assets/ui/Bar.png');
    this.load.image('ac_override_fail', 'assets/ui/Override_Fail.png');
    this.load.image('ac_override_pass', 'assets/ui/Override_Pass.png');
    const acBase = 'assets/grades_animations';
    for (let i = 1; i <= 15; i++) this.load.image(`ac_win_${i}`,  `${acBase}/Grades_Win_Screen-${i}.png`);
    for (let i = 1; i <= 14; i++) this.load.image(`ac_lose_${i}`, `${acBase}/Grades_Lose_Screen-${i}.png`);

    // ── Privacy ──
    this.load.image('pr_overlay_bg',    'assets/ui/DoomGPT_Screen_Overlay.png');
    this.load.image('pr_challenge_bg',  'assets/ui/DoomGPT_Challenge_Screen.png');
    this.load.image('pr_btn_save',      'assets/ui/Save.png');
    this.load.image('pr_btn_save_grey', 'assets/ui/Save_Grey.png');
    this.load.image('pr_btn_x',         'assets/ui/X.png');
    this.load.image('pr_btn_x_grey',    'assets/ui/X_Grey.png');
    const dgBase = 'assets/doomgpt_animations';
    for (let i = 1; i <= 38; i++) this.load.image(`pr_win_${i}`,  `${dgBase}/DoomGPT_Win_Screen-${i}.png`);
    for (let i = 1; i <= 66; i++) this.load.image(`pr_lose_${i}`, `${dgBase}/DoomGPT_Lose_Screen-${i}.png`);
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#000814');

    this.createAllAnimationsSafe();
    this.phase = 'overlay';

    if (!this.resumeRun) {
      gameState.score = 0;
      gameState.badges = 4;
      gameState.bonusUsed = 0;
      gameState.usedBonusQuestions = [];
      if (!gameState.failures) gameState.failures = [];
      this.timeRemaining        = 120;
      this.currentTierIndex     = 0;
      this.roundsCompletedTotal = 0;
      this._firstPassPool = [];
      this._firstPassDone = false;
      this._lastMiniGame = null;
      sessionLogger.logChallengeStart();
    }

    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this.bg = this.add.image(width / 2, height / 2, 'bb_overlay_bg').setOrigin(0.5);
    this.scaleToFit(this.bg);

    this.timerPosGameplay = { x: width * 0.15, y: height * 0.08 };
    this.timerPosPoints   = { x: width * 0.20, y: height * 0.30 };
    this.timerText = this.add.text(
      this.timerPosGameplay.x, this.timerPosGameplay.y, '', {
        fontSize: '26px', color: '#ffffff',
        fontFamily: 'Courier, monospace', fontStyle: 'bold'
      }
    ).setOrigin(0.5).setDepth(10000);

    this.countText = this.add.text(width / 2, height / 2, '', {
      fontSize: '36px', color: '#ffd400', fontFamily: 'Courier, monospace'
    }).setOrigin(0.5).setVisible(false).setDepth(10);

    this.roundBarBg   = this.add.rectangle(width / 2, height - 18, width, 24, 0x000000, 0.35).setVisible(false);
    this.roundBarFill = this.add.rectangle(0, height - 18, width, 18, 0xffffff, 0.75).setOrigin(0, 0.5).setVisible(false);

    this.overlayText = this.add.text(width / 2, height * 0.28, '', {
      fontSize: '44px', color: '#ffffff',
      fontFamily: 'Courier, monospace', fontStyle: 'bold', align: 'center'
    }).setOrigin(0.5).setVisible(false);

    if (this.globalTimerEvent) {
      this.globalTimerEvent.remove(false);
      this.globalTimerEvent = null;
    }
    this.startGlobalTimerIfNeeded();
    this.updateTimerText();

    if (this.fromBonusQuestion) {
      this.showBonusResultScreen(this.bonusCorrect);
    } else {
      this.showDifficultySplash(0, () => this.startNextRound());
    }
  }

  // ─── DIFFICULTY SPLASH ───────────────────────────────────────────────────────

  showDifficultySplash(tierIndex, onComplete) {
    this.pauseGlobalTimer();
    this.phase = 'difficulty_splash';

    const { width, height } = this.scale;
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 1).setDepth(8000);

    const configs = [
      { white: "Let's start ", colored: 'SLOW...',              color: '#00ff88', pulseScale: null,  pulseDuration: null },
      { white: 'Now ',         colored: 'FASTER!',              color: '#ffd400', pulseScale: 1.04,  pulseDuration: 600  },
      { white: 'Now ',         colored: 'EVEN FASTER!!',        color: '#ff8800', pulseScale: 1.08,  pulseDuration: 350  },
      { white: '',             colored: 'EXTREMELY FAST!!!',     color: '#ff2222', pulseScale: 1.12,  pulseDuration: 150  },
    ];

    const whiteConfigs = [
      "Let's start ",
      'Now ',
      'Now ',
      'NOW ',
    ];

    const cfg      = configs[Math.min(tierIndex, configs.length - 1)];
    const whiteTxt = whiteConfigs[Math.min(tierIndex, whiteConfigs.length - 1)];
    const fontSize = 52;
    const fontStyle = { fontSize: `${fontSize}px`, fontFamily: 'Courier, monospace', fontStyle: 'bold' };

    const whiteDummy = this.add.text(0, -9999, whiteTxt, { ...fontStyle, color: '#ffffff' }).setOrigin(0, 0.5);
    const whiteWidth = whiteDummy.width;
    whiteDummy.destroy();

    const totalDummy = this.add.text(0, -9999, whiteTxt + cfg.colored, { ...fontStyle, color: '#ffffff' }).setOrigin(0, 0.5);
    const totalWidth = totalDummy.width;
    totalDummy.destroy();

    const startX = width / 2 - totalWidth / 2;

    const whitePart = whiteTxt
      ? this.add.text(startX, height / 2, whiteTxt, { ...fontStyle, color: '#ffffff' })
          .setOrigin(0, 0.5).setDepth(8001)
      : null;

    const colorPart = this.add.text(startX + whiteWidth, height / 2, cfg.colored, { ...fontStyle, color: cfg.color })
      .setOrigin(0, 0.5).setDepth(8001);

    if (cfg.pulseScale !== null) {
      this.tweens.add({
        targets: colorPart,
        scaleX: cfg.pulseScale, scaleY: cfg.pulseScale,
        duration: cfg.pulseDuration,
        yoyo: true, repeat: -1, ease: 'Sine.InOut'
      });
    }

    this.time.delayedCall(2000, () => {
      overlay.destroy();
      if (whitePart) whitePart.destroy();
      colorPart.destroy();
      this.resumeGlobalTimer();
      onComplete();
    });
  }

  // ─── ROUND PICKER ────────────────────────────────────────────────────────────

  pickNextMiniGame() {
    if (!this._firstPassPool || this._firstPassPool.length === 0) {
      if (this._firstPassDone) {
        const choices = this.miniGames.filter(g => g !== this._lastMiniGame);
        const next = Phaser.Utils.Array.GetRandom(choices);
        this._lastMiniGame = next;
        return next;
      }
      this._firstPassPool = Phaser.Utils.Array.Shuffle([...this.miniGames]);

      // Prevent the first game of the new pass from matching the last game played
      if (this._firstPassPool[0] === this._lastMiniGame) {
        this._firstPassPool.push(this._firstPassPool.shift());
      }

      this._firstPassDone = false;
    }

    const next = this._firstPassPool.shift();
    if (this._firstPassPool.length === 0) this._firstPassDone = true;
    this._lastMiniGame = next;
    return next;
  }

  startNextRound() {
    if (this.timeRemaining <= 0 || this.phase === 'ended') return;

    // Check if a full pass of 5 rounds just completed and difficulty should increase
    const newTierIndex = Math.min(
      Math.floor(this.roundsCompletedTotal / 5),
      this.difficultyTiers.length - 1
    );

    if (newTierIndex > this.currentTierIndex) {
      this.currentTierIndex = newTierIndex;
      // Fresh shuffle for the new tier
      this._firstPassPool = [];
      this._firstPassDone = false;
      this.showDifficultySplash(this.currentTierIndex, () => {
        this.currentMiniGame = this.pickNextMiniGame();
        this.playInstructionsThenStartRound();
      });
      return;
    }

    this.currentMiniGame = this.pickNextMiniGame();
    this.playInstructionsThenStartRound();
  }

  // ─── OVERLAY / INSTRUCTIONS SLIDE ────────────────────────────────────────────

  playInstructionsThenStartRound() {
    const { width } = this.scale;
    this.pauseGlobalTimer();
    this.clearRoundVisuals();

    let overlayKey, challengeKey, instructionText;

    if (this.currentMiniGame === 'transparency') {
      overlayKey      = 'dt_overlay_bg';
      challengeKey    = 'dt_challenge_bg';
      instructionText = 'LABEL THE AI FEATURE!\nPress SPACE when the label\nLINES UP with the Target Box!';
    } else if (this.currentMiniGame === 'accountability') {
      overlayKey      = 'ac_overlay_bg';
      challengeKey    = 'ac_challenge_bg';
      instructionText = 'OVERRIDE THE MISTAKE!\nMash SPACE to fill the bar!';
    } else if (this.currentMiniGame === 'privacy') {
      overlayKey      = 'pr_overlay_bg';
      challengeKey    = 'pr_challenge_bg';
      instructionText = 'PROTECT USER PRIVACY!\nToggle ON safe data & SAVE.\nIf NONE are safe, Press X.';
    } else {
      overlayKey      = 'bb_overlay_bg';
      challengeKey    = 'bb_challenge_bg';
      instructionText = 'BALANCE THE DATASET\nClick players\nHit ENTER when \nBoys and Girls are EVEN';
    }

    this.bg.setTexture(overlayKey);
    this.scaleToFit(this.bg);

    this.overlayText.setText(instructionText).setVisible(true).setX(-width);

    this.tweens.add({
      targets: this.overlayText, x: this.scale.width / 2,
      duration: 450, ease: 'Cubic.Out',
      onComplete: () => {
        this.time.delayedCall(2200, () => {
          this.tweens.add({
            targets: this.overlayText, x: this.scale.width * 2,
            duration: 450, ease: 'Cubic.In',
            onComplete: () => {
              this.overlayText.setVisible(false);
              this.bg.setTexture(challengeKey);
              this.scaleToFit(this.bg);
              this.resetTimerToGameplayPosition();
              this.phase = 'play';
              this.resumeGlobalTimer();

              if (this.currentMiniGame === 'transparency') {
                this.startTransparencyRoundCore();
              } else if (this.currentMiniGame === 'accountability') {
                this.startAccountabilityRoundCore();
              } else if (this.currentMiniGame === 'privacy') {
                this.startPrivacyRoundCore();
              } else {
                this.startBasketballRoundCore();
              }
            }
          });
        });
      }
    });
  }

  // ─── FAIRNESS ROUND ──────────────────────────────────────────────────────────

  startBasketballRoundCore() {
    this.roundStartedAt = Date.now();
    this.clearRoundVisuals();
    this.createDatasetGrid_AlwaysMoreBoys();
    this.countText.setVisible(true);
    this.updateCounts();
    this.startRoundBar(this.tier.basketballTimeLimit);
    if (this.roundTimerEvent) this.roundTimerEvent.remove(false);
    this.roundTimerEvent = this.time.delayedCall(
      this.tier.basketballTimeLimit, () => this.handleBasketballTimeout()
    );
  }

  createDatasetGrid_AlwaysMoreBoys() {
    const { width, height } = this.scale;
    const centerX = width / 2; const centerY = height / 2;
    const cols = 4; const rows = 3; const playerScale = 0.55;
    const spriteSize = 256; const displaySize = spriteSize * playerScale;
    const colSpacing = displaySize + 55; const rowSpacing = displaySize + 45;
    const gridWidth = (cols - 1) * colSpacing; const gridHeight = (rows - 1) * rowSpacing;
    const startX = centerX - gridWidth / 2; const startY = centerY - gridHeight / 2 + height * 0.06;

    this.countText.setPosition(centerX, startY - 100);

    const total = 12;
    const numGirls = Phaser.Math.Between(1, 5);
    const numBoys = total - numGirls;
    const types = [];
    for (let i = 0; i < numBoys; i++) types.push('boy');
    for (let i = 0; i < numGirls; i++) types.push('girl');
    Phaser.Utils.Array.Shuffle(types);

    for (let i = 0; i < total; i++) {
      const row = Math.floor(i / cols); const col = i % cols;
      const x = startX + col * colSpacing; const y = startY + row * rowSpacing;
      const type = types[i];
      const textureKey        = type === 'boy' ? 'player_boy'         : 'player_girl';
      const deletedTextureKey = type === 'boy' ? 'player_boy_deleted' : 'player_girl_deleted';
      const sprite = this.add.image(x, y, textureKey)
        .setOrigin(0.5).setScale(playerScale).setInteractive({ useHandCursor: true });
      const player = { sprite, type, alive: true, textureKey, deletedTextureKey };
      sprite.on('pointerdown', () => this.togglePlayer(player));
      this.players.push(player);
    }
  }

  togglePlayer(player) {
    if (this.phase === 'play') {
      player.alive = !player.alive;
      player.sprite.setTexture(player.alive ? player.textureKey : player.deletedTextureKey);
      this.updateCounts();
    }
  }

  updateCounts() {
    this.boyCount  = this.players.filter(p => p.alive && p.type === 'boy').length;
    this.girlCount = this.players.filter(p => p.alive && p.type === 'girl').length;
    this.countText.setText(`Boys: ${this.boyCount}    Girls: ${this.girlCount}`);
  }

  handleBasketballTimeout() { this.finishBasketballRound({ success: false }); }

  handleBasketballTrain() {
    const success = this.boyCount === this.girlCount && this.boyCount > 0;
    this.finishBasketballRound({ success });
  }

  finishBasketballRound({ success }) {
    if (this.phase !== 'play') return;
    if (this.roundTimerEvent) this.roundTimerEvent.remove(false);
    this.stopRoundBar();
    this.pauseGlobalTimer();
    const earned = this.calculatePoints(success, this.tier.basketballTimeLimit);
    gameState.score += earned;
    if (!success) gameState.badges = Math.max(0, (gameState.badges ?? 0) - 1);
    this.roundsCompletedTotal++;
    sessionLogger.logRound({
      miniGame: 'fairness',
      win: success,
      roundStartedAt: this.roundStartedAt,
      globalTimeRemaining: this.timeRemaining,
      difficulty: this.tier.name,
      pointsEarned: earned,
      cumulativeScore: gameState.score,
    });
    this.showBasketballResultAnimation({ success, earned });
  }

  showBasketballResultAnimation({ success, earned }) {
    this.phase = 'result_anim';
    this.clearRoundVisuals();

    const animKey    = success ? 'bb_win_anim'  : 'bb_lose_anim';
    const firstFrame = success ? 'bb_win_1'     : 'bb_lose_1';

    const animSprite = this.add.sprite(
      this.scale.width / 2, this.scale.height / 2, firstFrame
    ).setOrigin(0.5).setDepth(9999);
    animSprite.setScale(
      Math.min(this.scale.width / animSprite.width, this.scale.height / animSprite.height)
    );
    animSprite.play(animKey);

    this.time.delayedCall(this.resultAnimDurationMs, () => {
      animSprite.destroy();
      this.showPointsScreen(earned, success);
    });
  }

  // ─── TRANSPARENCY ROUND ───────────────────────────────────────────────────────

  startTransparencyRoundCore() {
    const { width, height } = this.scale;
    this.roundStartedAt = Date.now();

    this.clearTransparencyVisuals();
    this.drawTransparencyComments();

    const minX = width  * 0.20;
    const maxX = width  * 0.78;
    const minY = height * 0.20;
    const maxY = height * 0.78;

    const targetX = Phaser.Math.Between(minX, maxX);
    const targetY = Phaser.Math.Between(minY, maxY);

    this.targetBox = this.add.rectangle(targetX, targetY, 260, 100, 0xffffff, 0)
      .setStrokeStyle(4, 0xff00ff, 1)
      .setDepth(5);

    this.labelSprite = this.add.image(-140, targetY, 'ai_feature_label')
      .setOrigin(0.5)
      .setDisplaySize(200, 100)
      .setDepth(10);

    this.startRoundBar(this.tier.transparencyTimeLimit);

    if (this.transparencyRoundTimerEvent) this.transparencyRoundTimerEvent.remove(false);
    this.transparencyRoundTimerEvent = this.time.delayedCall(
      this.tier.transparencyTimeLimit, () => this.finishTransparencyRound(false)
    );
  }

  drawTransparencyComments() {
    const { width, height } = this.scale;

    this.commentObjects.forEach(obj => obj.destroy());
    this.commentObjects = [];

    const { firstName } = gameState.player;
    const name = firstName ? firstName : 'Developer';

    const usernamePositions = [
      { x: width * 0.655, y: height * 0.3  },
      { x: width * 0.655, y: height * 0.49 },
      { x: width * 0.655, y: height * 0.68 },
    ];

    usernamePositions.forEach((pos) => {
      const userText = this.add.text(pos.x, pos.y, `Dev ${name}`, {
        fontSize: '30px', color: '#000000',
        fontFamily: 'Courier, monospace', fontStyle: 'bold'
      }).setOrigin(0, 0).setDepth(10);

      const maxW = width * 0.18;
      while (userText.width > maxW && parseInt(userText.style.fontSize) > 10) {
        userText.setFontSize(parseInt(userText.style.fontSize) - 1);
      }

      this.commentObjects.push(userText);
    });
  }

  attemptTransparencyStamp() {
    if (this.phase !== 'play' || !this.labelSprite || !this.targetBox) return;

    const lx = this.labelSprite.x; const ly = this.labelSprite.y;
    const tx = this.targetBox.x;   const ty = this.targetBox.y;

    const overlapX = Math.abs(lx - tx) < (100 + 130) * 0.55;
    const overlapY = Math.abs(ly - ty) < (50  + 50)  * 0.55;

    this.finishTransparencyRound(overlapX && overlapY);
  }

  finishTransparencyRound(success) {
    if (this.phase !== 'play') return;

    if (this.transparencyRoundTimerEvent) this.transparencyRoundTimerEvent.remove(false);
    this.stopRoundBar();
    this.pauseGlobalTimer();

    const earned = this.calculatePoints(success, this.tier.transparencyTimeLimit);
    gameState.score += earned;
    if (!success) gameState.badges = Math.max(0, (gameState.badges ?? 0) - 1);
    this.roundsCompletedTotal++;

    sessionLogger.logRound({
      miniGame: 'transparency',
      win: success,
      roundStartedAt: this.roundStartedAt,
      globalTimeRemaining: this.timeRemaining,
      difficulty: this.tier.name,
      pointsEarned: earned,
      cumulativeScore: gameState.score,
    });

    this.clearTransparencyVisuals();

    if (success) {
      this.showTransparencyWinAnimation(earned);
    } else {
      this.showTransparencyLoseScreen(earned);
    }
  }

  showTransparencyWinAnimation(earned) {
    this.phase = 'result_anim';

    const { width, height } = this.scale;
    const sprite = this.add.sprite(width / 2, height / 2, 'dt_win_1')
      .setOrigin(0.5).setDepth(9999);
    sprite.setScale(Math.min(width / sprite.width, height / sprite.height));

    const totalDuration = 4000;
    const weights = [8, 5, 15, 20, 20, 20, 15, 10];
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const msPerUnit = totalDuration / totalWeight;
    const frameDurations = weights.map(w => w * msPerUnit);

    let elapsed = 0;
    for (let i = 0; i < 8; i++) {
      const frameIndex = i + 1;
      this.time.delayedCall(elapsed, () => {
        if (sprite.active) sprite.setTexture(`dt_win_${frameIndex}`);
      });
      elapsed += frameDurations[i];
    }

    this.time.delayedCall(totalDuration, () => {
      sprite.destroy();
      this.showPointsScreen(earned, true);
    });
  }

  showTransparencyLoseScreen(earned) {
    this.phase = 'result_anim';

    const { width, height } = this.scale;

    this.bg.setTexture('dt_lose_bg');
    this.scaleToFit(this.bg);

    const { firstName } = gameState.player;
    const name = firstName ? firstName : 'Developer';

    const commentTexts = [
      `Dev ${name}\n"I LOVE Developer Doom's videos!!!!"`,
      `Dev ${name}\n"I'm going to STOP being a\nResponsible AI developer."`,
      `Dev ${name}\n"Developer Doom is the best,\nI'll follow all his advice!"`,
    ];

    const positions = [
      { x: width * 0.14, y: height * 0.20 },
      { x: width * 0.38, y: height * 0.35 },
      { x: width * 0.62, y: height * 0.55 },
    ];

    positions.forEach((pos, i) => {
      this.time.delayedCall(i * 1000, () => {
        const bubble = this.add.image(pos.x, pos.y, 'comment_bubble')
          .setOrigin(0, 0).setDisplaySize(350, 200).setDepth(100 + i);
        const text = this.add.text(pos.x + 15, pos.y + 20, commentTexts[i], {
          fontSize: '20px', color: '#ffffff',
          fontFamily: 'Courier, monospace', wordWrap: { width: 270 }
        }).setOrigin(0, 0).setDepth(101 + i);
        this.loseCommentObjects.push(bubble, text);
      });
    });

    this.time.delayedCall(4000, () => {
      this.loseCommentObjects.forEach(obj => obj.destroy());
      this.loseCommentObjects = [];
      this.showPointsScreen(earned, false);
    });
  }

  clearTransparencyVisuals() {
    if (this.labelSprite) { this.labelSprite.destroy(); this.labelSprite = null; }
    if (this.targetBox)   { this.targetBox.destroy();   this.targetBox = null; }
    this.commentObjects.forEach(obj => obj.destroy());
    this.commentObjects = [];
  }

  // ─── ACCOUNTABILITY ROUND ─────────────────────────────────────────────────────

  startAccountabilityRoundCore() {
    const { width, height } = this.scale;
    this.roundStartedAt = Date.now();

    this.clearAccountabilityVisuals();

    this.accountabilitySpacesRequired = Phaser.Math.Between(
      this.tier.acSpacesMin, this.tier.acSpacesMax
    );
    this.accountabilitySpaceCount = 0;

    const barX       = width  * 0.925;
    const barTopY    = height * 0.32;
    const barBottomY = height * 0.88;
    const barH       = barBottomY - barTopY;
    const barW       = width  * 0.045;

    this.acBarX       = barX;
    this.acBarTopY    = barTopY;
    this.acBarBottomY = barBottomY;
    this.acBarW       = barW;
    this.acBarH       = barH;

    const barBg = this.add.image(barX, barTopY + barH / 2, 'ac_bar')
      .setOrigin(0.5).setDisplaySize(300, 450).setAlpha(1).setDepth(5);
    this.accountabilityPlayObjects.push(barBg);

    this.accountabilityBarFillGraphics = this.add.graphics().setDepth(6);
    this.accountabilityPlayObjects.push(this.accountabilityBarFillGraphics);

    const ovalX = barX;
    const ovalY = height * 0.34;
    const ovalW = width  * 0.13;
    const ovalH = height * 0.15;

    this.accountabilityOverrideOval = this.add.image(ovalX, ovalY, 'ac_override_fail')
      .setOrigin(0.5).setDisplaySize(ovalW, ovalH).setDepth(7);
    this.accountabilityPlayObjects.push(this.accountabilityOverrideOval);

    this.drawAccountabilityBarFill();

    this.startRoundBar(this.tier.accountabilityTimeLimit);

    if (this.accountabilityRoundTimerEvent) this.accountabilityRoundTimerEvent.remove(false);
    this.accountabilityRoundTimerEvent = this.time.delayedCall(
      this.tier.accountabilityTimeLimit, () => this.finishAccountabilityRound(false)
    );
  }

  drawAccountabilityBarFill() {
    if (!this.accountabilityBarFillGraphics) return;
    const fillFraction = Math.min(this.accountabilitySpaceCount / this.accountabilitySpacesRequired, 1);
    const fillH = this.acBarH * fillFraction;
    this.accountabilityBarFillGraphics.clear();
    if (fillH > 0) {
      this.accountabilityBarFillGraphics.fillStyle(0x00ff88, 0.85);
      this.accountabilityBarFillGraphics.fillRect(
        this.acBarX - this.acBarW / 2,
        this.acBarBottomY - fillH,
        this.acBarW, fillH
      );
    }
  }

  handleAccountabilityMash() {
    if (this.phase !== 'play' || this.currentMiniGame !== 'accountability') return;
    this.accountabilitySpaceCount++;
    this.drawAccountabilityBarFill();
    if (this.accountabilitySpaceCount >= this.accountabilitySpacesRequired) {
      // Cancel the timeout immediately so it can't fire during the 400ms delay
      if (this.accountabilityRoundTimerEvent) {
        this.accountabilityRoundTimerEvent.remove(false);
        this.accountabilityRoundTimerEvent = null;
      }
      if (this.accountabilityOverrideOval) {
        this.accountabilityOverrideOval.setTexture('ac_override_pass');
      }
      this.time.delayedCall(400, () => {
        this.finishAccountabilityRound(true);
      });
    }
  }

  finishAccountabilityRound(success) {
    if (this.phase !== 'play') return;
    if (this.accountabilityRoundTimerEvent) this.accountabilityRoundTimerEvent.remove(false);
    this.stopRoundBar();
    this.pauseGlobalTimer();
    const earned = this.calculatePoints(success, this.tier.accountabilityTimeLimit);
    gameState.score += earned;
    if (!success) gameState.badges = Math.max(0, (gameState.badges ?? 0) - 1);
    this.roundsCompletedTotal++;
    sessionLogger.logRound({
      miniGame: 'accountability',
      win: success,
      roundStartedAt: this.roundStartedAt,
      globalTimeRemaining: this.timeRemaining,
      difficulty: this.tier.name,
      pointsEarned: earned,
      cumulativeScore: gameState.score,
    });
    this.clearAccountabilityVisuals();
    this.showAccountabilityResultAnimation({ success, earned });
  }

  showAccountabilityResultAnimation({ success, earned }) {
    this.phase = 'result_anim';
    const firstFrame    = success ? 'ac_win_1' : 'ac_lose_1';
    const totalDuration = 2500;
    const animSprite = this.add.sprite(
      this.scale.width / 2, this.scale.height / 2, firstFrame
    ).setOrigin(0.5).setDepth(9999);
    animSprite.setScale(
      Math.min(this.scale.width / animSprite.width, this.scale.height / animSprite.height)
    );
    if (success) {
      animSprite.play('ac_win_anim');
    } else {
      const slowFps = (14 / totalDuration) * 1000;
      animSprite.play({ key: 'ac_lose_anim', frameRate: slowFps });
    }
    this.time.delayedCall(totalDuration, () => {
      animSprite.destroy();
      this.showPointsScreen(earned, success);
    });
  }

  clearAccountabilityVisuals() {
    this.accountabilityPlayObjects.forEach(obj => { if (obj && obj.active) obj.destroy(); });
    this.accountabilityPlayObjects = [];
    if (this.accountabilityBarFillGraphics) {
      this.accountabilityBarFillGraphics.destroy();
      this.accountabilityBarFillGraphics = null;
    }
    this.accountabilityOverrideOval = null;
  }

  // ─── PRIVACY ROUND ────────────────────────────────────────────────────────────

  // correctSide: 'left' | 'right' | 'none' | 'both'
  // 'left'  = only left is safe to collect
  // 'right' = only right is safe to collect
  // 'none'  = both are violations — press X with nothing toggled
  // 'both'  = both are safe — toggle both ON and press SAVE
  getPrivacyDataPairs() {
    return [

      // ── One safe, one violation — correct = LEFT (easy) ──────────────────
      { left: 'Username',               right: 'Home Address',             correctSide: 'left'  },
      { left: 'Profile\nPicture',       right: 'Phone Number',             correctSide: 'left'  },
      { left: 'Display\nName',          right: 'Social Security\nNumber',  correctSide: 'left'  },
      { left: 'Favorite\nColor',        right: 'Credit Card\nNumber',      correctSide: 'left'  },
      { left: 'App Language\nSetting',  right: 'Text Messages',            correctSide: 'left'  },

      // ── One safe, one violation — correct = LEFT (harder) ────────────────
      { left: 'Device Type\n(e.g. iPhone)', right: 'GPS Location\nAlways On', correctSide: 'left'  },
      { left: 'Account\nCreation Date', right: 'Browsing History',         correctSide: 'left'  },
      { left: 'Feedback\n& Star Ratings', right: 'Medical Records',        correctSide: 'left'  },
      { left: 'Questions\nAsked to AI', right: 'Full Contact\nList',       correctSide: 'left'  },
      { left: 'Notification\nSettings', right: 'Bank Account\nNumber',     correctSide: 'left'  },

      // ── One safe, one violation — correct = RIGHT (easy) ─────────────────
      { left: 'Home Address',           right: 'Username',                 correctSide: 'right' },
      { left: 'Password',               right: 'Display\nName',            correctSide: 'right' },
      { left: 'Phone Number',           right: 'Favorite\nColor',          correctSide: 'right' },
      { left: 'Social Security\nNumber', right: 'Profile\nPicture',        correctSide: 'right' },

      // ── One safe, one violation — correct = RIGHT (harder) ───────────────
      { left: 'Microphone\nAlways On',  right: 'App Language\nSetting',    correctSide: 'right' },
      { left: 'Sleep Schedule',         right: 'Questions\nAsked to AI',   correctSide: 'right' },
      { left: 'Browsing History',       right: 'Account\nCreation Date',   correctSide: 'right' },
      { left: 'GPS Location\nAlways On', right: 'Device Type\n(e.g. iPhone)', correctSide: 'right' },

      // ── Both are violations — press X (easy) ─────────────────────────────
      { left: 'Home Address',           right: 'Phone Number',             correctSide: 'none'  },
      { left: 'Password',               right: 'Social Security\nNumber',  correctSide: 'none'  },
      { left: 'Credit Card\nNumber',    right: 'Bank Account\nNumber',     correctSide: 'none'  },

      // ── Both are violations — press X (harder) ───────────────────────────
      { left: 'Microphone\nAlways On',  right: 'Camera\nAlways On',        correctSide: 'none'  },
      { left: 'Browsing History',       right: 'GPS Location\nAlways On',  correctSide: 'none'  },
      { left: 'Sleep Schedule',         right: 'Full Contact\nList',       correctSide: 'none'  },

      // ── Both are safe — toggle both ON and press SAVE (easy) ─────────────
      { left: 'Username',               right: 'Display\nName',            correctSide: 'both'  },
      { left: 'Favorite\nColor',        right: 'Profile\nPicture',         correctSide: 'both'  },
      { left: 'App Language\nSetting',  right: 'Notification\nSettings',   correctSide: 'both'  },

      // ── Both are safe — toggle both ON and press SAVE (harder) ───────────
      { left: 'Device Type\n(e.g. iPhone)', right: 'Account\nCreation Date', correctSide: 'both' },
      { left: 'Feedback\n& Star Ratings', right: 'Questions\nAsked to AI', correctSide: 'both'  },
      { left: 'Notification\nSettings', right: 'Device Type\n(e.g. iPhone)', correctSide: 'both' },
    ];
  }

  startPrivacyRoundCore() {
    const { width, height } = this.scale;
    this.roundStartedAt = Date.now();

    this.clearPrivacyVisuals();

    this.privacyToggleLeft  = false;
    this.privacyToggleRight = false;

    this.privacyCurrentPair = Phaser.Utils.Array.GetRandom(this.getPrivacyDataPairs());

    const leftBoxCX  = width  * 0.445;
    const rightBoxCX = width  * 0.713;
    const boxCY      = height * 0.432;

    const leftLabel = this.add.text(leftBoxCX, boxCY, this.privacyCurrentPair.left, {
      fontSize: '28px', color: '#5a3e00',
      fontFamily: 'Courier, monospace', fontStyle: 'bold', align: 'center'
    }).setOrigin(0.5).setDepth(5);
    this.privacyPlayObjects.push(leftLabel);

    const rightLabel = this.add.text(rightBoxCX, boxCY, this.privacyCurrentPair.right, {
      fontSize: '28px', color: '#5a3e00',
      fontFamily: 'Courier, monospace', fontStyle: 'bold', align: 'center'
    }).setOrigin(0.5).setDepth(5);
    this.privacyPlayObjects.push(rightLabel);

    const toggleY = height * 0.58;
    const toggleW = 90;
    const toggleH = 42;

    this.privacyToggleLeftGraphics = this.add.graphics().setDepth(6);
    this.privacyPlayObjects.push(this.privacyToggleLeftGraphics);
    this._drawPrivacyToggle(this.privacyToggleLeftGraphics, leftBoxCX, toggleY, toggleW, toggleH, false);

    const leftZone = this.add.zone(leftBoxCX, toggleY, toggleW + 20, toggleH + 20)
      .setOrigin(0.5).setDepth(7).setInteractive({ useHandCursor: true });
    leftZone.on('pointerdown', () => this._handlePrivacyToggleLeft());
    this.privacyPlayObjects.push(leftZone);

    this.privacyToggleRightGraphics = this.add.graphics().setDepth(6);
    this.privacyPlayObjects.push(this.privacyToggleRightGraphics);
    this._drawPrivacyToggle(this.privacyToggleRightGraphics, rightBoxCX, toggleY, toggleW, toggleH, false);

    const rightZone = this.add.zone(rightBoxCX, toggleY, toggleW + 20, toggleH + 20)
      .setOrigin(0.5).setDepth(7).setInteractive({ useHandCursor: true });
    rightZone.on('pointerdown', () => this._handlePrivacyToggleRight());
    this.privacyPlayObjects.push(rightZone);

    const saveCX = width  * 0.579;
    const saveCY = height * 0.760;

    this.privacySaveBtn = this.add.image(saveCX, saveCY, 'pr_btn_save_grey')
      .setOrigin(0.5).setDisplaySize(200, 150).setDepth(8);
    this.privacyPlayObjects.push(this.privacySaveBtn);

    const xCX = width  * 0.858;
    const xCY = height * 0.192;

    this.privacyXBtn = this.add.image(xCX, xCY, 'pr_btn_x')
      .setOrigin(0.5).setDisplaySize(120, 120).setDepth(8)
      .setInteractive({ useHandCursor: true });
    this.privacyXBtn.on('pointerdown', () => this._handlePrivacySubmitX());
    this.privacyPlayObjects.push(this.privacyXBtn);

    this._refreshPrivacyButtonState();

    this.startRoundBar(this.tier.privacyTimeLimit);

    if (this.privacyRoundTimerEvent) this.privacyRoundTimerEvent.remove(false);
    this.privacyRoundTimerEvent = this.time.delayedCall(
      this.tier.privacyTimeLimit, () => this.finishPrivacyRound(false)
    );
  }

  _drawPrivacyToggle(graphics, cx, cy, w, h, isOn) {
    graphics.clear();
    const r = h / 2;
    graphics.fillStyle(isOn ? 0x4caf50 : 0xaaaaaa, 1);
    graphics.fillRoundedRect(cx - w / 2, cy - r, w, h, r);
    const knobX = isOn ? cx + w / 2 - r : cx - w / 2 + r;
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(knobX, cy, r - 4);
  }

  _handlePrivacyToggleLeft() {
    if (this.phase !== 'play' || this.currentMiniGame !== 'privacy') return;
    this.privacyToggleLeft = !this.privacyToggleLeft;
    this._drawPrivacyToggle(
      this.privacyToggleLeftGraphics,
      this.scale.width * 0.445, this.scale.height * 0.58,
      90, 42, this.privacyToggleLeft
    );
    this._refreshPrivacyButtonState();
  }

  _handlePrivacyToggleRight() {
    if (this.phase !== 'play' || this.currentMiniGame !== 'privacy') return;
    this.privacyToggleRight = !this.privacyToggleRight;
    this._drawPrivacyToggle(
      this.privacyToggleRightGraphics,
      this.scale.width * 0.713, this.scale.height * 0.58,
      90, 42, this.privacyToggleRight
    );
    this._refreshPrivacyButtonState();
  }

  // No toggles ON      → SAVE grey (disabled)  + X red (enabled)
  // One or both ON     → SAVE green (enabled)   + X grey (disabled)
  _refreshPrivacyButtonState() {
    const anyToggled = this.privacyToggleLeft || this.privacyToggleRight;

    if (anyToggled) {
      this.privacySaveBtn.setTexture('pr_btn_save');
      this.privacySaveBtn.setInteractive({ useHandCursor: true });
      this.privacySaveBtn.off('pointerdown');
      this.privacySaveBtn.on('pointerdown', () => this._handlePrivacySubmitSave());

      this.privacyXBtn.setTexture('pr_btn_x_grey');
      this.privacyXBtn.removeInteractive();
    } else {
      this.privacySaveBtn.setTexture('pr_btn_save_grey');
      this.privacySaveBtn.removeInteractive();

      this.privacyXBtn.setTexture('pr_btn_x');
      this.privacyXBtn.setInteractive({ useHandCursor: true });
      this.privacyXBtn.off('pointerdown');
      this.privacyXBtn.on('pointerdown', () => this._handlePrivacySubmitX());
    }
  }

  // SAVE pressed — at least one toggle is ON
  _handlePrivacySubmitSave() {
    if (this.phase !== 'play' || this.currentMiniGame !== 'privacy') return;
    const { correctSide } = this.privacyCurrentPair;
    let success = false;
    if (correctSide === 'left')  success = this.privacyToggleLeft  && !this.privacyToggleRight;
    if (correctSide === 'right') success = this.privacyToggleRight && !this.privacyToggleLeft;
    if (correctSide === 'both')  success = this.privacyToggleLeft  && this.privacyToggleRight;
    // correctSide === 'none': any SAVE press is wrong (should have pressed X)
    this.finishPrivacyRound(success);
  }

  // X pressed — only reachable when NO toggles are ON
  // Pass only if the correct answer is 'none' (both options are violations)
  _handlePrivacySubmitX() {
    if (this.phase !== 'play' || this.currentMiniGame !== 'privacy') return;
    const success = this.privacyCurrentPair.correctSide === 'none';
    this.finishPrivacyRound(success);
  }

  finishPrivacyRound(success) {
    if (this.phase !== 'play') return;
    if (this.privacyRoundTimerEvent) this.privacyRoundTimerEvent.remove(false);
    this.stopRoundBar();
    this.pauseGlobalTimer();
    const earned = this.calculatePoints(success, this.tier.privacyTimeLimit);
    gameState.score += earned;
    if (!success) gameState.badges = Math.max(0, (gameState.badges ?? 0) - 1);
    this.roundsCompletedTotal++;
    sessionLogger.logRound({
      miniGame: 'privacy',
      win: success,
      roundStartedAt: this.roundStartedAt,
      globalTimeRemaining: this.timeRemaining,
      difficulty: this.tier.name,
      pointsEarned: earned,
      cumulativeScore: gameState.score,
    });
    this.clearPrivacyVisuals();
    this.showPrivacyResultAnimation({ success, earned });
  }

  showPrivacyResultAnimation({ success, earned }) {
    this.phase = 'result_anim';
    const totalDuration = 2500;
    const firstFrame = success ? 'pr_win_1' : 'pr_lose_1';
    const animSprite = this.add.sprite(
      this.scale.width / 2, this.scale.height / 2, firstFrame
    ).setOrigin(0.5).setDepth(9999);
    animSprite.setScale(
      Math.min(this.scale.width / animSprite.width, this.scale.height / animSprite.height)
    );
    if (success) {
      animSprite.play('pr_win_anim');
    } else {
      const slowFps = (66 / totalDuration) * 1000;
      animSprite.play({ key: 'pr_lose_anim', frameRate: slowFps });
    }
    this.time.delayedCall(totalDuration, () => {
      animSprite.destroy();
      this.showPointsScreen(earned, success);
    });
  }

  clearPrivacyVisuals() {
    this.privacyPlayObjects.forEach(obj => { if (obj && obj.active) obj.destroy(); });
    this.privacyPlayObjects = [];
    this.privacyToggleLeftGraphics  = null;
    this.privacyToggleRightGraphics = null;
    this.privacySaveBtn = null;
    this.privacyXBtn    = null;
    this.privacyCurrentPair = null;
  }

  // ─── SHARED POINTS / RESULTS ─────────────────────────────────────────────────

  async renderScoreboardUI() {
    const { width, height } = this.scale;
    const name = (gameState.player?.firstName || 'Developer').trim();

    submitScore(name, gameState.score);

    const scoreStr = `${gameState.score}`;
    const scoreFontSize = scoreStr.length <= 4 ? 90 : scoreStr.length <= 5 ? 72 : 58;
    this.pointsUI.push(this.add.text(width * 0.2, height * 0.12, scoreStr, {
      fontSize: `${scoreFontSize}px`, color: '#ffffff', fontFamily: 'Courier, monospace', fontStyle: 'bold'
    }).setOrigin(0.5));

    const lbText = this.add.text(width * 0.77, height * 0.20, 'Loading...', {
      fontSize: '25px', color: '#ffffff',
      fontFamily: 'Courier, monospace', fontStyle: 'bold',
      align: 'left', lineSpacing: 8
    }).setOrigin(0.5).setDepth(10);
    this.pointsUI.push(lbText);

    try {
      const top3 = await getTopScores(3);
      if (lbText.active) {
        const lines = top3.map((e, i) => `${i + 1})  ${e.name}  ${e.score}`);
        while (lines.length < 3) lines.push(`${lines.length + 1})  ---`);
        lbText.setText(lines.join('\n'));
        const maxW = width * 0.27;
        while (lbText.width > maxW && parseInt(lbText.style.fontSize) > 12) {
          lbText.setFontSize(parseInt(lbText.style.fontSize) - 1);
        }
      }
    } catch (err) {
      if (lbText.active) lbText.setText('1)  ---\n2)  ---\n3)  ---');
    }

    const heartY = height * 0.45;
    for (let i = 0; i < 4; i++) {
      this.pointsUI.push(
        this.add.image(
          width / 2 + (i - 1.5) * 140, heartY,
          i < (gameState.badges ?? 0) ? 'heart_full' : 'heart_lost'
        ).setOrigin(0.5).setScale(0.45)
      );
    }
  }

  // ── Counting animation for points earned this round ───────────────────────
  animatePointsCount(textObj, targetValue, success) {
    const duration  = 800;
    const steps     = 30;
    const stepDelay = duration / steps;
    let step = 0;

    const interval = setInterval(() => {
      step++;
      const current = Math.round((step / steps) * targetValue);
      if (textObj.active) textObj.setText(`${current}`);
      if (step >= steps) {
        clearInterval(interval);
        if (textObj.active) {
          textObj.setText(`${targetValue}`);
          // Small pop at the end
          this.tweens.add({
            targets: textObj, scaleX: 1.2, scaleY: 1.2,
            duration: 120, yoyo: true, ease: 'Sine.Out'
          });
        }
      }
    }, stepDelay);
  }

  showPointsScreen(pointsEarned, success) {
    const { width, height } = this.scale;
    this.phase = 'points';
    //this.pauseGlobalTimer();
    this.bg.setTexture('points_bg');
    this.scaleToFit(this.bg);

    this.renderScoreboardUI();
    this.resetTimerToPointsPosition();

    this.pointsUI.push(this.add.text(width / 2, height * 0.45 + 130, 'Points Earned', {
      fontSize: '32px', color: '#ffffff', fontFamily: 'Courier, monospace'
    }).setOrigin(0.5));

    // ── Principle banner ──
    const principles = [
      { label: 'Be Fair',             game: 'fairness'       },
      { label: 'Be Transparent',      game: 'transparency'   },
      { label: 'Take Accountability', game: 'accountability' },
      { label: 'Protect Privacy',     game: 'privacy'        },
    ];

    const bannerY = height * 0.92;
    const fontSize = 28;
    const separator = '  •  ';
    const sepWidth = separator.length * fontSize * 0.6;
    const labelWidths = principles.map(p => p.label.length * fontSize * 0.6);
    const totalWidth  = labelWidths.reduce((a, b) => a + b, 0) + sepWidth * (principles.length - 1);
    let currentX = width / 2 - totalWidth / 2;

    principles.forEach((p, i) => {
      if (i > 0) {
        this.pointsUI.push(
          this.add.text(currentX, bannerY, separator, {
            fontSize: `${fontSize}px`, color: '#ffffff',
            fontFamily: 'Courier, monospace', fontStyle: 'bold'
          }).setOrigin(0, 0.5)
        );
        currentX += sepWidth;
      }

      this.pointsUI.push(
        this.add.text(currentX, bannerY, p.label, {
          fontSize: `${fontSize}px`,
          color: p.game === this.currentMiniGame ? '#ffd400' : '#ffffff',
          fontFamily: 'Courier, monospace', fontStyle: 'bold'
        }).setOrigin(0, 0.5)
      );
      currentX += labelWidths[i];
    });

    // ── Counting points number ──
    const pointsText = this.add.text(width / 2, height * 0.45 + 190, '0', {
      fontSize: '64px',
      color: success ? '#228B22' : '#DC143C',
      fontFamily: 'Courier, monospace', fontStyle: 'bold'
    }).setOrigin(0.5);
    this.pointsUI.push(pointsText);
    this.animatePointsCount(pointsText, pointsEarned, success);

    // Small delay before accepting input so animation can play
    this.time.delayedCall(900, () => {
      const continueHint = this.add.text(width / 2, height * 0.80, 'Press SPACE or click to continue', {
        fontSize: '30px', color: '#ff0000',
        fontFamily: 'Courier, monospace', align: 'center'
      }).setOrigin(0.5).setDepth(10);
      this.pointsUI.push(continueHint);

      // Check for game-over conditions immediately, before waiting for input
      if ((gameState.badges ?? 0) <= 0) {
        this.time.delayedCall(1500, () => {
          if ((gameState.bonusUsed ?? 0) < 2) { this.showBonusPopupOverlay(); }
          else { this.showFinalResults("ALL LIVES LOST!"); }
        });
        return;
      }

      const advance = () => {
        this.input.keyboard.off('keyup-SPACE', advance);
        this.input.off('pointerdown', advance);
        if (this.timeRemaining <= 0) { this.showFinalResults("TIMES UP!"); return; }
        this.resumeGlobalTimer();
        this.resetTimerToGameplayPosition();
        this.startNextRound();
      };

      this.input.keyboard.on('keyup-SPACE', advance);
      this.input.on('pointerdown', advance);
    });
  }

  showFinalResults(reasonText) {
    this.phase = 'ended';
    this.pauseGlobalTimer();
    this.stopRoundBar();
    this.clearRoundVisuals();
    this.clearTransparencyVisuals();
    this.clearAccountabilityVisuals();
    this.clearPrivacyVisuals();

    sessionLogger.logChallengeEnd(reasonText);

    const { width, height } = this.scale;
    this.bg.setTexture('points_bg');
    this.scaleToFit(this.bg);
    this.resetTimerToPointsPosition();

    this.renderScoreboardUI();
    this.pointsUI.push(this.add.text(width / 2, height * 0.65, reasonText, {
      fontSize: '70px', color: '#DC143C', fontFamily: 'Courier, monospace', fontStyle: 'bold'
    }).setOrigin(0.5));

    this.time.delayedCall(4000, () => { this.scene.start('EndPledgeScene'); });
  }

  showBonusResultScreen(success) {
    if (!success) {
      const used = gameState.usedBonusQuestions?.length ?? 0;
      const bonusUsed = gameState.bonusUsed ?? 0;

      if (bonusUsed < 2 && used < 2) {
        this.phase = 'bonus_popup';
        this.pauseGlobalTimer();
        this.clearRoundVisuals();
        this.bg.setTexture('points_bg');
        this.scaleToFit(this.bg);
        this.showBonusPopupOverlay();
      } else {
        this.showFinalResults("ALL LIVES LOST!");
      }
      return;
    }

    this.phase = 'points';
    this.pauseGlobalTimer();
    this.bg.setTexture('points_bg');
    this.scaleToFit(this.bg);
    this.clearRoundVisuals();

    this.renderScoreboardUI();
    this.resetTimerToPointsPosition();

    this.pointsUI.push(this.add.text(
      this.scale.width / 2, this.scale.height * 0.45 + 150, 'Bonus Life Earned!', {
        fontSize: '64px', color: '#ffd400',
        fontFamily: 'Courier, monospace', fontStyle: 'bold'
      }
    ).setOrigin(0.5));

    this.time.delayedCall(900, () => {
      const continueHint = this.add.text(
        this.scale.width / 2, this.scale.height * 0.80, 'Press SPACE or click to continue', {
          fontSize: '30px', color: '#ff0000',
          fontFamily: 'Courier, monospace', align: 'center'
        }
      ).setOrigin(0.5).setDepth(10);
      this.pointsUI.push(continueHint);

      const advance = () => {
        this.input.keyboard.off('keyup-SPACE', advance);
        this.input.off('pointerdown', advance);
        this.resetTimerToGameplayPosition();
        this.resumeGlobalTimer();
        if (this.currentTierIndex === 0) {
          this.showDifficultySplash(0, () => this.startNextRound());
        } else {
          this.startNextRound();
        }
      };

      this.input.keyboard.on('keyup-SPACE', advance);
      this.input.on('pointerdown', advance);
    });
  }

  showBonusPopupOverlay() {
    this.phase = 'bonus_popup';
    const { width, height } = this.scale;

    const dim = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.45).setDepth(5000);
    const popup = this.add.image(width / 2, height / 2, 'bonus_popup_bg').setOrigin(0.5).setDepth(5001);
    popup.setScale(Math.min(width / popup.width, height / popup.height) * 0.95);

    this.timerText.setPosition(width / 2, height / 2).setDepth(10000);

    const bZ = this.add.zone(
      width / 2 - popup.displayWidth * 0.22,
      height / 2 + popup.displayHeight * 0.25,
      popup.displayWidth * 0.32, popup.displayHeight * 0.18
    ).setOrigin(0.5).setDepth(5003).setInteractive({ useHandCursor: true });

    const eZ = this.add.zone(
      width / 2 + popup.displayWidth * 0.22,
      height / 2 + popup.displayHeight * 0.25,
      popup.displayWidth * 0.32, popup.displayHeight * 0.18
    ).setOrigin(0.5).setDepth(5003).setInteractive({ useHandCursor: true });

    bZ.on('pointerdown', () => {
      dim.destroy(); popup.destroy();
      this.scene.start('BonusQuestionScene', {
        returnScene: 'ChallengeScene',
        timeRemaining: this.timeRemaining,
        score: gameState.score,
        badges: gameState.badges,
        currentTierIndex: this.currentTierIndex,
        roundsCompletedTotal: this.roundsCompletedTotal,
      });
    });

    eZ.on('pointerdown', () => {
      dim.destroy(); popup.destroy();
      this.showFinalResults("ALL LIVES LOST!");
    });
  }

  // ─── ANIMATIONS ──────────────────────────────────────────────────────────────

  createAllAnimationsSafe() {
    if (!this.anims.exists('bb_win_anim')) {
      const frames = [];
      for (let i = 1; i <= 13; i++) frames.push({ key: `bb_win_${i}` });
      this.anims.create({ key: 'bb_win_anim', frames, frameRate: 15, repeat: -1 });
    }
    if (!this.anims.exists('bb_lose_anim')) {
      const frames = [];
      for (let i = 1; i <= 35; i++) frames.push({ key: `bb_lose_${i}` });
      this.anims.create({ key: 'bb_lose_anim', frames, frameRate: 15, repeat: 0 });
    }
    if (!this.anims.exists('ac_win_anim')) {
      const frames = [];
      for (let i = 1; i <= 15; i++) frames.push({ key: `ac_win_${i}` });
      this.anims.create({ key: 'ac_win_anim', frames, frameRate: 15, repeat: -1 });
    }
    if (!this.anims.exists('ac_lose_anim')) {
      const frames = [];
      for (let i = 1; i <= 14; i++) frames.push({ key: `ac_lose_${i}` });
      this.anims.create({ key: 'ac_lose_anim', frames, frameRate: 15, repeat: 0 });
    }
    if (!this.anims.exists('pr_win_anim')) {
      const frames = [];
      for (let i = 1; i <= 42; i++) frames.push({ key: `pr_win_${i}` });
      this.anims.create({ key: 'pr_win_anim', frames, frameRate: 15, repeat: -1 });
    }
    if (!this.anims.exists('pr_lose_anim')) {
      const frames = [];
      for (let i = 1; i <= 66; i++) frames.push({ key: `pr_lose_${i}` });
      this.anims.create({ key: 'pr_lose_anim', frames, frameRate: 15, repeat: 0 });
    }
  }

  // ─── TIMER & BAR ─────────────────────────────────────────────────────────────

  startGlobalTimerIfNeeded() {
    if (!this.globalTimerEvent) {
      this.globalTimerEvent = this.time.addEvent({
        delay: 1000, loop: true,
        callback: () => {
          if (!this.globalTimerPaused) {
            this.timeRemaining--;
            this.updateTimerText();
            if (this.timeRemaining <= 0) this.showFinalResults("TIMES UP!");
          }
        }
      });
    }
  }

  pauseGlobalTimer()  { this.globalTimerPaused = true; }
  resumeGlobalTimer() { this.globalTimerPaused = false; }

  updateTimerText() {
    const mins = Math.floor(this.timeRemaining / 60);
    const secs = this.timeRemaining % 60;
    this.timerText.setText(`Time Remaining: ${mins}:${secs.toString().padStart(2, '0')}`);
  }

  startRoundBar(dur) {
    this.roundBarBg.setVisible(true);
    this.roundBarFill.setVisible(true).width = this.scale.width;
    this.roundBarTween = this.tweens.add({ targets: this.roundBarFill, width: 0, duration: dur, ease: 'Linear' });
  }

  stopRoundBar() {
    if (this.roundBarTween) this.roundBarTween.stop();
    this.roundBarBg.setVisible(false);
    this.roundBarFill.setVisible(false);
  }

  resetTimerToPointsPosition()  { this.timerText.setPosition(this.timerPosPoints.x,   this.timerPosPoints.y); }
  resetTimerToGameplayPosition() { this.timerText.setPosition(this.timerPosGameplay.x, this.timerPosGameplay.y); }
  scaleToFit(img) { img.setScale(Math.min(this.scale.width / img.width, this.scale.height / img.height)); }

  // ─── CLEAR VISUALS ───────────────────────────────────────────────────────────

  clearRoundVisuals() {
    this.players.forEach(p => p.sprite.destroy());
    this.players = [];
    this.pointsUI.forEach(obj => obj.destroy());
    this.pointsUI = [];
    if (this.countText) this.countText.setVisible(false);
  }

  // ─── UPDATE LOOP ─────────────────────────────────────────────────────────────

  update() {
    if (this.phase === 'play') {
      if (this.currentMiniGame === 'fairness') {
        if (Phaser.Input.Keyboard.JustDown(this.enterKey)) this.handleBasketballTrain();
      } else if (this.currentMiniGame === 'transparency') {
        if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) this.attemptTransparencyStamp();
        if (this.labelSprite) {
          const speed = this.tier.labelSpeed * (this.game.loop.delta / 1000);
          this.labelSprite.x += speed;
          if (this.labelSprite.x > this.scale.width + 140) this.labelSprite.x = -140;
        }
      } else if (this.currentMiniGame === 'accountability') {
        if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) this.handleAccountabilityMash();
      }
      // Privacy is click-only — no keyboard handling needed
    }
  }
}