// src/scenes/ChallengeScene.js
import gameState from '../gameState.js';

export default class ChallengeScene extends Phaser.Scene {
  constructor() {
    super('ChallengeScene');
    this.basketballRoundTimeLimit = 8000;
    this.transparencyRoundTimeLimit = 6000;
    this.accountabilityRoundTimeLimit = 5000;
    this.winPoints = 100;
    this.losePoints = 25;
    this.resultAnimDurationMs = 3000;
    this.leaderboardKey = 'dwai_leaderboard_v1';

    this.players = [];
    this.pointsUI = [];
    this.commentObjects = [];
    this.loseCommentObjects = [];

    // Available mini-games — add 'security' here later
    this.miniGames = ['fairness', 'transparency', 'accountability'];
    this.currentMiniGame = null;

    // Transparency play phase
    this.labelSprite = null;
    this.targetBox = null;
    this.labelSpeed = 350;
    this.transparencyRoundTimerEvent = null;

    // Accountability play phase
    this.accountabilitySpaceCount = 0;
    this.accountabilitySpacesRequired = 20;
    this.accountabilityBarFillGraphics = null;
    this.accountabilityOverrideOval = null;
    this.accountabilityRoundTimerEvent = null;
    this.accountabilityPlayObjects = [];
  }

  init(data) {
    this.resumeRun = !!data?.resumeRun;
    this.fromBonusQuestion = !!data?.fromBonusQuestion;
    this.bonusCorrect = !!data?.bonusCorrect;
    if (this.resumeRun) {
      this.timeRemaining = data.timeRemaining ?? this.timeRemaining ?? 120;
      gameState.score = data.score ?? gameState.score ?? 0;
      gameState.badges = data.badges ?? gameState.badges ?? 1;
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
    for (let i = 1; i <= 13; i++) this.load.image(`bb_win_${i}`,  `${bbBase}/Basketball_Win_Screen_-${i}.png`);

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
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#000814');

    this.createAllAnimationsSafe();
    this.phase = 'overlay';

    if (!this.resumeRun) {
      gameState.score = 0;
      gameState.badges = 3;
      gameState.bonusUsed = 0;
      if (!gameState.failures) gameState.failures = [];
      this.timeRemaining = 120;
    }

    // Keys
    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // Background
    this.bg = this.add.image(width / 2, height / 2, 'bb_overlay_bg').setOrigin(0.5);
    this.scaleToFit(this.bg);

    // Timer text
    this.timerPosGameplay = { x: width * 0.15, y: height * 0.08 };
    this.timerPosPoints   = { x: width * 0.20, y: height * 0.30 };
    this.timerText = this.add.text(
      this.timerPosGameplay.x, this.timerPosGameplay.y, '', {
        fontSize: '26px', color: '#ffffff',
        fontFamily: 'Courier, monospace', fontStyle: 'bold'
      }
    ).setOrigin(0.5).setDepth(10000);

    // Fairness count text
    this.countText = this.add.text(width / 2, height / 2, '', {
      fontSize: '26px', color: '#ffffff', fontFamily: 'Courier, monospace'
    }).setOrigin(0.5).setVisible(false).setDepth(10);

    // Round bar
    this.roundBarBg   = this.add.rectangle(width / 2, height - 18, width, 24, 0x000000, 0.35).setVisible(false);
    this.roundBarFill = this.add.rectangle(0, height - 18, width, 18, 0xffffff, 0.75).setOrigin(0, 0.5).setVisible(false);

    // Overlay instruction text
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
      this.startNextRound();
    }
  }

  // ─── ROUND PICKER ────────────────────────────────────────────────────────────

  pickNextMiniGame() {
    return Phaser.Utils.Array.GetRandom(this.miniGames);
  }

  startNextRound() {
    if (this.timeRemaining <= 0 || this.phase === 'ended') return;
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
      instructionText = 'LABEL THE AI FEATURE!\nPress SPACE when the label\nlines up with the Target Box!';
    } else if (this.currentMiniGame === 'accountability') {
      overlayKey      = 'ac_overlay_bg';
      challengeKey    = 'ac_challenge_bg';
      instructionText = 'OVERRIDE THE MISTAKE!\nMash SPACE to fill the bar!';
    } else {
      overlayKey      = 'bb_overlay_bg';
      challengeKey    = 'bb_challenge_bg';
      instructionText = 'BALANCE THE DATASET\nClick players\nHit ENTER when EVEN';
    }

    this.bg.setTexture(overlayKey);
    this.scaleToFit(this.bg);

    this.overlayText.setText(instructionText).setVisible(true).setX(-width);

    this.tweens.add({
      targets: this.overlayText, x: this.scale.width / 2,
      duration: 450, ease: 'Cubic.Out',
      onComplete: () => {
        this.time.delayedCall(2100, () => {
          this.tweens.add({
            targets: this.overlayText, x: this.scale.width * 2,
            duration: 450, ease: 'Cubic.In',
            onComplete: () => {
              this.overlayText.setVisible(false);
              this.bg.setTexture(challengeKey);
              this.scaleToFit(this.bg);
              this.resetTimerToGameplayPosition();
              this.phase = 'play';

              if (this.currentMiniGame === 'transparency') {
                this.startTransparencyRoundCore();
              } else if (this.currentMiniGame === 'accountability') {
                this.startAccountabilityRoundCore();
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
    this.clearRoundVisuals();
    this.createDatasetGrid_AlwaysMoreBoys();
    this.countText.setVisible(true);
    this.updateCounts();
    this.startRoundBar(this.basketballRoundTimeLimit);
    this.resumeGlobalTimer();
    if (this.roundTimerEvent) this.roundTimerEvent.remove(false);
    this.roundTimerEvent = this.time.delayedCall(
      this.basketballRoundTimeLimit, () => this.handleBasketballTimeout()
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
    this.pauseGlobalTimer();
    this.stopRoundBar();
    const earned = success ? this.winPoints : this.losePoints;
    gameState.score += earned;
    if (!success) gameState.badges = Math.max(0, (gameState.badges ?? 0) - 1);
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

    this.startRoundBar(this.transparencyRoundTimeLimit);
    this.resumeGlobalTimer();

    if (this.transparencyRoundTimerEvent) this.transparencyRoundTimerEvent.remove(false);
    this.transparencyRoundTimerEvent = this.time.delayedCall(
      this.transparencyRoundTimeLimit, () => this.finishTransparencyRound(false)
    );
  }

  drawTransparencyComments() {
    const { width, height } = this.scale;

    this.commentObjects.forEach(obj => obj.destroy());
    this.commentObjects = [];

    const { firstName } = gameState.player;
    const name = firstName ? firstName : 'Developer';

    const usernamePositions = [
      { x: width * 0.655, y: height * 0.3 },
      { x: width * 0.655, y: height * 0.49 },
      { x: width * 0.655, y: height * 0.68 },
    ];

    usernamePositions.forEach((pos) => {
      const userText = this.add.text(pos.x, pos.y, `Dev ${name}`, {
        fontSize: '30px',
        color: '#000000',
        fontFamily: 'Courier, monospace',
        fontStyle: 'bold'
      }).setOrigin(0, 0).setDepth(10);
      this.commentObjects.push(userText);
    });
  }

  attemptTransparencyStamp() {
    if (this.phase !== 'play' || !this.labelSprite || !this.targetBox) return;

    const lx = this.labelSprite.x;
    const ly = this.labelSprite.y;
    const tx = this.targetBox.x;
    const ty = this.targetBox.y;

    const overlapX = Math.abs(lx - tx) < (100 + 130) * 0.55;
    const overlapY = Math.abs(ly - ty) < (50  + 50)  * 0.55;

    this.finishTransparencyRound(overlapX && overlapY);
  }

  finishTransparencyRound(success) {
    if (this.phase !== 'play') return;

    if (this.transparencyRoundTimerEvent) this.transparencyRoundTimerEvent.remove(false);
    this.pauseGlobalTimer();
    this.stopRoundBar();

    const earned = success ? this.winPoints : this.losePoints;
    gameState.score += earned;
    if (!success) gameState.badges = Math.max(0, (gameState.badges ?? 0) - 1);

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
      this.time.delayedCall(i * 2000, () => {
        const bubble = this.add.image(pos.x, pos.y, 'comment_bubble')
          .setOrigin(0, 0)
          .setDisplaySize(300, 150)
          .setDepth(100 + i);

        const text = this.add.text(pos.x + 15, pos.y + 20, commentTexts[i], {
          fontSize: '20px',
          color: '#ffffff',
          fontFamily: 'Courier, monospace',
          wordWrap: { width: 270 }
        }).setOrigin(0, 0).setDepth(101 + i);

        this.loseCommentObjects.push(bubble, text);
      });
    });

    this.time.delayedCall(6500, () => {
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

    this.clearAccountabilityVisuals();

    // Random presses required each round — range 15–30
    this.accountabilitySpacesRequired = Phaser.Math.Between(15, 30);
    this.accountabilitySpaceCount = 0;

    // ── Bar position — adjust these to reposition ──
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
      .setOrigin(0.5)
      .setDisplaySize(300, 450)
      .setAlpha(1)
      .setDepth(5);
    this.accountabilityPlayObjects.push(barBg);

    this.accountabilityBarFillGraphics = this.add.graphics().setDepth(6);
    this.accountabilityPlayObjects.push(this.accountabilityBarFillGraphics);

    // Override oval — adjust ovalY independently from bar
    const ovalX = barX;
    const ovalY = height * 0.34; // ← adjust this to reposition oval independently
    const ovalW = width  * 0.13;
    const ovalH = height * 0.15;

    this.accountabilityOverrideOval = this.add.image(ovalX, ovalY, 'ac_override_fail')
      .setOrigin(0.5)
      .setDisplaySize(ovalW, ovalH)
      .setDepth(7);
    this.accountabilityPlayObjects.push(this.accountabilityOverrideOval);

    this.drawAccountabilityBarFill();

    this.startRoundBar(this.accountabilityRoundTimeLimit);
    this.resumeGlobalTimer();

    if (this.accountabilityRoundTimerEvent) this.accountabilityRoundTimerEvent.remove(false);
    this.accountabilityRoundTimerEvent = this.time.delayedCall(
      this.accountabilityRoundTimeLimit, () => this.finishAccountabilityRound(false)
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
        this.acBarW,
        fillH
      );
    }
  }

  handleAccountabilityMash() {
    if (this.phase !== 'play' || this.currentMiniGame !== 'accountability') return;

    this.accountabilitySpaceCount++;
    this.drawAccountabilityBarFill();

    if (this.accountabilitySpaceCount >= this.accountabilitySpacesRequired) {
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
    this.pauseGlobalTimer();
    this.stopRoundBar();

    const earned = success ? this.winPoints : this.losePoints;
    gameState.score += earned;
    if (!success) gameState.badges = Math.max(0, (gameState.badges ?? 0) - 1);

    this.clearAccountabilityVisuals();
    this.showAccountabilityResultAnimation({ success, earned });
  }

  showAccountabilityResultAnimation({ success, earned }) {
    this.phase = 'result_anim';

    const animKey    = success ? 'ac_win_anim'  : 'ac_lose_anim';
    const firstFrame = success ? 'ac_win_1'     : 'ac_lose_1';
    const totalDuration = 3000;

    const animSprite = this.add.sprite(
      this.scale.width / 2, this.scale.height / 2, firstFrame
    ).setOrigin(0.5).setDepth(9999);
    animSprite.setScale(
      Math.min(this.scale.width / animSprite.width, this.scale.height / animSprite.height)
    );

    if (success) {
      // Win — loop for exactly 2.5 seconds then stop
      animSprite.play('ac_win_anim'); // ac_win_anim already has repeat: -1... 
    } else {
      // Lose — slow it down to stretch 14 frames across 2.5 seconds (~5.4fps)
      const slowFps = (14 / totalDuration) * 1000;
      animSprite.play({ key: 'ac_lose_anim', frameRate: slowFps });
    }

    this.time.delayedCall(totalDuration, () => {
      animSprite.destroy();
      this.showPointsScreen(earned, success);
    });
  }

  clearAccountabilityVisuals() {
    this.accountabilityPlayObjects.forEach(obj => {
      if (obj && obj.active) obj.destroy();
    });
    this.accountabilityPlayObjects = [];
    if (this.accountabilityBarFillGraphics) {
      this.accountabilityBarFillGraphics.destroy();
      this.accountabilityBarFillGraphics = null;
    }
    this.accountabilityOverrideOval = null;
  }

  // ─── SHARED POINTS / RESULTS ─────────────────────────────────────────────────

  renderScoreboardUI() {
    const { width, height } = this.scale;
    this.updateLocalLeaderboard();
    const lb = this.getLocalLeaderboardTop3();

    this.pointsUI.push(this.add.text(width * 0.2, height * 0.12, `${gameState.score}`, {
      fontSize: '90px', color: '#ffffff', fontFamily: 'Courier, monospace', fontStyle: 'bold'
    }).setOrigin(0.5));

    this.pointsUI.push(this.add.text(width * 0.78, height * 0.14,
      `Top Players\n1) ${lb[0] ?? '---'}\n2) ${lb[1] ?? '---'}\n3) ${lb[2] ?? '---'}`,
      { fontSize: '22px', color: '#ffffff', fontFamily: 'Courier, monospace', align: 'left' }
    ).setOrigin(0, 0.5));

    const heartY = height * 0.45;
    for (let i = 0; i < 3; i++) {
      this.pointsUI.push(
        this.add.image(
          width / 2 + (i - 1) * 180, heartY,
          i < (gameState.badges ?? 0) ? 'heart_full' : 'heart_lost'
        ).setOrigin(0.5).setScale(0.45)
      );
    }
  }

  showPointsScreen(pointsEarned, success) {
    const { width, height } = this.scale;
    this.phase = 'points';
    this.bg.setTexture('points_bg');
    this.scaleToFit(this.bg);

    this.renderScoreboardUI();
    this.resetTimerToPointsPosition();

    this.pointsUI.push(this.add.text(width / 2, height * 0.45 + 130, 'Points Earned', {
      fontSize: '32px', color: '#ffffff', fontFamily: 'Courier, monospace'
    }).setOrigin(0.5));

    this.pointsUI.push(this.add.text(width / 2, height * 0.45 + 190, `${pointsEarned}`, {
      fontSize: '64px', color: success ? '#228B22' : '#DC143C',
      fontFamily: 'Courier, monospace', fontStyle: 'bold'
    }).setOrigin(0.5));

    this.time.delayedCall(3000, () => {
      if (this.timeRemaining <= 0) { this.showFinalResults("TIMES UP!"); return; }
      if ((gameState.badges ?? 0) <= 0) {
        if ((gameState.bonusUsed ?? 0) < 1) { this.showBonusPopupOverlay(); }
        else { this.showFinalResults("ALL LIVES LOST!"); }
        return;
      }
      this.resetTimerToGameplayPosition();
      this.startNextRound();
    });
  }

  showFinalResults(reasonText) {
    this.phase = 'ended';
    this.pauseGlobalTimer();
    this.stopRoundBar();
    this.clearRoundVisuals();
    this.clearTransparencyVisuals();
    this.clearAccountabilityVisuals();

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
    if (!success) { this.showFinalResults("ALL LIVES LOST!"); return; }

    this.phase = 'points';
    this.pauseGlobalTimer();
    this.bg.setTexture('points_bg');
    this.scaleToFit(this.bg);
    this.clearRoundVisuals();

    this.renderScoreboardUI();
    this.resetTimerToPointsPosition();

    this.pointsUI.push(this.add.text(
      this.scale.width / 2, this.scale.height * 0.45 + 150, 'Bonus Life Earned!', {
        fontSize: '44px', color: '#ffd400',
        fontFamily: 'Courier, monospace', fontStyle: 'bold'
      }
    ).setOrigin(0.5));

    this.time.delayedCall(3000, () => {
      this.resetTimerToGameplayPosition();
      this.resumeGlobalTimer();
      this.startNextRound();
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
        badges: gameState.badges
      });
    });

    eZ.on('pointerdown', () => {
      dim.destroy(); popup.destroy();
      this.showFinalResults("ALL LIVES LOST!");
    });
  }

  // ─── LEADERBOARD ─────────────────────────────────────────────────────────────

  updateLocalLeaderboard() {
    const name = `${(gameState.player?.firstName || 'Developer').trim()} ${(gameState.player?.lastInitial || '').trim()}`.trim();
    const entries = this.loadLeaderboard();
    const idx = entries.findIndex(e => e.name === name);
    if (idx >= 0) entries[idx].score = Math.max(entries[idx].score, gameState.score);
    else entries.push({ name, score: gameState.score });
    entries.sort((a, b) => b.score - a.score);
    this.saveLeaderboard(entries.slice(0, 25));
  }

  loadLeaderboard()          { try { return JSON.parse(localStorage.getItem(this.leaderboardKey)) || []; } catch { return []; } }
  saveLeaderboard(entries)   { localStorage.setItem(this.leaderboardKey, JSON.stringify(entries)); }
  getLocalLeaderboardTop3()  { return this.loadLeaderboard().slice(0, 3).map(e => `${e.name} (${e.score})`); }

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

  resetTimerToPointsPosition()   { this.timerText.setPosition(this.timerPosPoints.x,   this.timerPosPoints.y); }
  resetTimerToGameplayPosition()  { this.timerText.setPosition(this.timerPosGameplay.x, this.timerPosGameplay.y); }
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
          const speed = this.labelSpeed * (this.game.loop.delta / 1000);
          this.labelSprite.x += speed;
          if (this.labelSprite.x > this.scale.width + 140) this.labelSprite.x = -140;
        }
      } else if (this.currentMiniGame === 'accountability') {
        if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) this.handleAccountabilityMash();
      }
    }
  }
}