// src/scenes/ChallengeScene.js

import gameState from '../gameState.js';

export default class ChallengeScene extends Phaser.Scene {
  constructor() {
    super('ChallengeScene');

    // round config (easy to reuse across future microgames)
    this.roundTimeLimit = 8000;   // 8 seconds for basketball
    this.winPoints = 100;
    this.losePoints = 25;

    // animation config
    this.winFps = 15;
    this.loseFps = 15;
    this.resultAnimDurationMs = 3000; // show win/lose for 3 seconds
  }

  // ✅ NEW: runs BEFORE preload/create; gives a friendly loading screen instantly
  init() {
    const { width, height } = this.scale;

    // Pick a friendly color (you can tweak)
    // Try something closer to your overlay orange instead of black.
    this.cameras.main.setBackgroundColor('#b45309'); // warm orange-brown

    // Full-screen solid fill (instant)
    this.loadingBg = this.add.graphics();
    this.loadingBg.fillStyle(0x0b0f1a, 1); // deep navy (less scary than pure black)
    this.loadingBg.fillRect(0, 0, width, height);

    // Big loading emoji
    this.loadingEmoji = this.add.text(width / 2, height / 2 - 10, '⏳', {
      fontSize: '84px',
    }).setOrigin(0.5);

    // Optional “Loading…” text
    this.loadingText = this.add.text(width / 2, height / 2 + 70, 'Loading…', {
      fontSize: '28px',
      color: '#ffffff',
      fontFamily: 'Courier, monospace',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Animate: spin + subtle pulse so it feels alive
    this.loadingTween = this.tweens.add({
      targets: this.loadingEmoji,
      angle: 360,
      duration: 900,
      repeat: -1
    });

    this.loadingPulse = this.tweens.add({
      targets: [this.loadingEmoji, this.loadingText],
      scale: 1.06,
      duration: 450,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut'
    });
  }

  preload() {
    // Background screens
    this.load.image('bb_overlay_bg', 'assets/ui/Basketball_Screen_Overlay.png');
    this.load.image('bb_challenge_bg', 'assets/ui/Basketball_Challenge_Screen.png');
    this.load.image('points_bg', 'assets/ui/Points_Screen.png');

    // Lives UI
    this.load.image('heart_full', 'assets/ui/Heart.png');
    this.load.image('heart_lost', 'assets/ui/Heart_Loss.png');

    // Player sprites
    this.load.image('player_boy', 'assets/ui/Boy_Player.png');
    this.load.image('player_girl', 'assets/ui/Girl_Player.png');
    this.load.image('player_boy_deleted', 'assets/ui/Boy_Player_Deleted.png');
    this.load.image('player_girl_deleted', 'assets/ui/Girl_Player_Deleted.png');

    // Basketball result animations (PNG sequences)
    const animBasePath = 'assets/basketball_animations';

    for (let i = 1; i <= 35; i++) {
      this.load.image(`bb_lose_${i}`, `${animBasePath}/Basketball_Lose_Screen_-${i}.png`);
    }

    for (let i = 1; i <= 13; i++) {
      this.load.image(`bb_win_${i}`, `${animBasePath}/Basketball_Win_Screen_-${i}.png`);
    }
  }

  create() {
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;

    // Keep consistent background
    this.cameras.main.setBackgroundColor('#000814');

    // Create animations ONCE (SAFE)
    this.createResultAnimationsSafe();

    // Reset state
    this.phase = 'overlay'; // overlay -> play -> result_anim -> points -> ended
    this.pendingBonusLifePrompt = false;
    this.players = [];
    this.boyCount = 0;
    this.girlCount = 0;

    // Reset “run” state
    gameState.score = 0;
    gameState.badges = 3;
    gameState.bonusUsed = 0;
    if (!gameState.failures) gameState.failures = [];

    // Global 2-minute timer (ticks only during play)
    this.timeRemaining = 120;
    this.globalTimerEvent = null;
    this.globalTimerPaused = true;

    // Per-round timer + bar
    this.roundTimerEvent = null;
    this.roundBarTween = null;

    // Inputs
    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);

    // Background image (we swap textures between overlay/game/points)
    this.bg = this.add.image(centerX, centerY, 'bb_overlay_bg').setOrigin(0.5);
    this.scaleToFit(this.bg);

    // ✅ remove loading UI immediately
    if (this.loadingTween) this.loadingTween.stop();
    if (this.loadingPulse) this.loadingPulse.stop();
    if (this.loadingBg) this.loadingBg.destroy();
    if (this.loadingEmoji) this.loadingEmoji.destroy();
    if (this.loadingText) this.loadingText.destroy();

    this.loadingTween = null;
    this.loadingPulse = null;
    this.loadingBg = null;
    this.loadingEmoji = null;
    this.loadingText = null;

    // ✅ NEW: once real overlay bg is visible, remove the instant fill
    if (this.instantOverlayFill) {
      this.instantOverlayFill.destroy();
      this.instantOverlayFill = null;
    }

    // Timer positioning knobs
    this.timerPosGameplay = { x: width * 0.15, y: height * 0.08 };
    this.timerPosPoints = { x: width * 0.20, y: height * 0.30 };

    // TOP HUD: Timer
    this.timerText = this.add.text(
      this.timerPosGameplay.x,
      this.timerPosGameplay.y,
      'Time Remaining: 2:00',
      {
        fontSize: '26px',
        color: '#ffffff',
        fontFamily: 'Courier, monospace',
        fontStyle: 'bold',
      }
    ).setOrigin(0.5);

    // counts
    this.countText = this.add.text(centerX, centerY, '', {
      fontSize: '26px',
      color: '#ffffff',
      fontFamily: 'Courier, monospace'
    }).setOrigin(0.5);
    this.countText.setVisible(false);

    // Bottom round timer bar
    this.roundBarBg = this.add.rectangle(centerX, height - 18, width, 24, 0x000000, 0.35);
    this.roundBarFill = this.add.rectangle(0, height - 18, width, 18, 0xffffff, 0.75).setOrigin(0, 0.5);
    this.roundBarBg.setVisible(false);
    this.roundBarFill.setVisible(false);

    // Overlay swipe text (CENTER)
    this.overlayText = this.add.text(
      centerX,
      height * 0.28,
      'BALANCE THE DATASET\nClick players\nHit ENTER when EVEN',
      {
        fontSize: '44px',
        color: '#ffffff',
        fontFamily: 'Courier, monospace',
        fontStyle: 'bold',
        align: 'center'
      }
    ).setOrigin(0.5);

    this.overlayText.x = -width;

    // start overlay
    this.playOverlayThenStart();
  }

  createResultAnimationsSafe() {
    // WIN
    if (!this.anims.exists('bb_win_anim')) {
      const winFrames = [];
      for (let i = 1; i <= 13; i++) {
        const k = `bb_win_${i}`;
        if (this.textures.exists(k)) winFrames.push({ key: k });
      }
      if (winFrames.length > 0) {
        this.anims.create({
          key: 'bb_win_anim',
          frames: winFrames,
          frameRate: this.winFps,
          repeat: -1
        });
      }
    }

    // LOSE
    if (!this.anims.exists('bb_lose_anim')) {
      const loseFrames = [];
      for (let i = 1; i <= 35; i++) {
        const k = `bb_lose_${i}`;
        if (this.textures.exists(k)) loseFrames.push({ key: k });
      }
      if (loseFrames.length > 0) {
        this.anims.create({
          key: 'bb_lose_anim',
          frames: loseFrames,
          frameRate: this.loseFps,
          repeat: 0
        });
      }
    }
  }

  startGlobalTimerIfNeeded() {
    if (this.globalTimerEvent) return;

    this.updateTimerText();
    this.globalTimerEvent = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (this.globalTimerPaused) return;

        this.timeRemaining--;
        if (this.timeRemaining < 0) this.timeRemaining = 0;
        this.updateTimerText();

        if (this.timeRemaining <= 0) {
          this.endChallenge();
        }
      }
    });
  }

  pauseGlobalTimer() {
    this.globalTimerPaused = true;
  }

  resumeGlobalTimer() {
    this.globalTimerPaused = false;
  }

  playOverlayThenStart() {
    const { width } = this.scale;
    const centerX = this.scale.width / 2;

    this.tweens.add({
      targets: this.overlayText,
      x: centerX,
      duration: 450,
      ease: 'Cubic.Out',
      onComplete: () => {
        this.time.delayedCall(5000 - 900, () => {
          this.tweens.add({
            targets: this.overlayText,
            x: width + width,
            duration: 450,
            ease: 'Cubic.In',
            onComplete: () => {
              this.overlayText.setVisible(false);
              this.startChallenge();
            }
          });
        });
      }
    });
  }

  startChallenge() {
    if (this.phase !== 'overlay') return;
    this.phase = 'play';

    this.bg.setTexture('bb_challenge_bg');
    this.scaleToFit(this.bg);

    this.resetTimerToGameplayPosition();

    this.startGlobalTimerIfNeeded();

    this.startBasketballRound();
  }

  startBasketballRound() {
    if (this.phase !== 'play') return;
    if (this.timeRemaining <= 0 || gameState.badges <= 0) return;

    this.clearRoundVisuals();

    this.createDatasetGrid_AlwaysMoreBoys();

    this.countText.setVisible(true);
    this.updateCounts();

    this.startRoundBar(this.roundTimeLimit);

    this.resumeGlobalTimer();

    if (this.roundTimerEvent) this.roundTimerEvent.remove(false);
    this.roundTimerEvent = this.time.delayedCall(this.roundTimeLimit, () => {
      this.handleRoundTimeout();
    });
  }

  createDatasetGrid_AlwaysMoreBoys() {
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;

    const cols = 4;
    const rows = 3;

    const playerScale = 0.55;
    const spriteSize = 256;
    const displaySize = spriteSize * playerScale;

    const colSpacing = displaySize + 55;
    const rowSpacing = displaySize + 45;

    const gridWidth = (cols - 1) * colSpacing;
    const gridHeight = (rows - 1) * rowSpacing;

    const startX = centerX - gridWidth / 2;
    const startY = centerY - gridHeight / 2 + height * 0.06;

    this.countText.setPosition(centerX, startY - 100);

    const total = 12;

    const numGirls = Phaser.Math.Between(1, 5);
    const numBoys = total - numGirls;

    const types = [];
    for (let i = 0; i < numBoys; i++) types.push('boy');
    for (let i = 0; i < numGirls; i++) types.push('girl');
    Phaser.Utils.Array.Shuffle(types);

    for (let i = 0; i < total; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;

      const x = startX + col * colSpacing;
      const y = startY + row * rowSpacing;

      const type = types[i];
      const textureKey = type === 'boy' ? 'player_boy' : 'player_girl';
      const deletedTextureKey = type === 'boy' ? 'player_boy_deleted' : 'player_girl_deleted';

      const sprite = this.add.image(x, y, textureKey)
        .setOrigin(0.5)
        .setScale(playerScale)
        .setInteractive({ useHandCursor: true });

      const player = { sprite, type, alive: true, textureKey, deletedTextureKey };
      sprite.on('pointerdown', () => this.togglePlayer(player));

      this.players.push(player);
    }
  }

  togglePlayer(player) {
    if (this.phase !== 'play') return;

    player.alive = !player.alive;
    player.sprite.setTexture(player.alive ? player.textureKey : player.deletedTextureKey);

    this.updateCounts();
  }

  updateCounts() {
    this.boyCount = this.players.filter(p => p.alive && p.type === 'boy').length;
    this.girlCount = this.players.filter(p => p.alive && p.type === 'girl').length;
    this.countText.setText(`Boys: ${this.boyCount}    Girls: ${this.girlCount}`);
  }

  handleRoundTimeout() {
    if (this.phase !== 'play') return;
    this.finishRound({ success: false, reason: 'timeout' });
  }

  handleRoundTrain() {
    if (this.phase !== 'play') return;
    const success = this.boyCount === this.girlCount && this.boyCount > 0;
    this.finishRound({ success, reason: 'trained' });
  }

  finishRound({ success, reason }) {
    if (this.phase !== 'play') return;

    this.pauseGlobalTimer();

    if (this.roundTimerEvent) {
      this.roundTimerEvent.remove(false);
      this.roundTimerEvent = null;
    }
    this.stopRoundBar();

    gameState.failures.push({
      microgame: 'fairness_challenge_coed',
      success,
      boysRemaining: this.boyCount,
      girlsRemaining: this.girlCount,
      reason,
      timestamp: Date.now()
    });

    const earned = success ? this.winPoints : this.losePoints;
    gameState.score += earned;

    if (!success) {
      this.loseBadge();
    }

    this.showResultAnimationThenPoints({ success, earned });
  }

  showResultAnimationThenPoints({ success, earned }) {
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;

    this.phase = 'result_anim';
    this.pauseGlobalTimer();

    this.clearRoundVisuals();
    this.countText.setVisible(false);
    this.stopRoundBar();

    const firstFrameKey = success ? 'bb_win_1' : 'bb_lose_1';
    const animKey = success ? 'bb_win_anim' : 'bb_lose_anim';

    if (!this.textures.exists(firstFrameKey) || !this.anims.exists(animKey)) {
      this.showPointsScreen(earned, success);
      return;
    }

    const animSprite = this.add.sprite(centerX, centerY, firstFrameKey)
      .setOrigin(0.5)
      .setDepth(9999);

    const scaleX = width / animSprite.width;
    const scaleY = height / animSprite.height;
    animSprite.setScale(Math.min(scaleX, scaleY));

    animSprite.play(animKey);

    this.time.delayedCall(this.resultAnimDurationMs, () => {
      animSprite.destroy();
      this.showPointsScreen(earned, success);
    });
  }

  loseBadge() {
    gameState.badges--;
    if (gameState.badges < 0) gameState.badges = 0;

    if (gameState.badges === 0) {
      this.pendingBonusLifePrompt = true;
    }
  }

  showPointsScreen(pointsEarned, success) {
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;

    this.phase = 'points';
    this.pauseGlobalTimer();

    this.clearRoundVisuals();
    this.countText.setVisible(false);

    this.bg.setTexture('points_bg');
    this.scaleToFit(this.bg);

    this.timerText.setPosition(this.timerPosPoints.x, this.timerPosPoints.y).setOrigin(0.5);

    const heartY = centerY - height * 0.05;
    const heartScale = 0.45;
    const heartSpacing = 180;

    const hearts = [];
    for (let i = 0; i < 3; i++) {
      const isFull = i < gameState.badges;
      const key = isFull ? 'heart_full' : 'heart_lost';

      const heart = this.add.image(centerX + (i - 1) * heartSpacing, heartY, key)
        .setOrigin(0.5)
        .setScale(heartScale);

      hearts.push(heart);
    }

    const label = this.add.text(centerX, heartY + 150, 'Points Earned', {
      fontSize: '36px',
      color: '#ffffff',
      fontFamily: 'Courier, monospace'
    }).setOrigin(0.5);

    const pointsText = this.add.text(centerX, heartY + 220, `${pointsEarned}`, {
      fontSize: '64px',
      color: success ? '#228B22' : '#DC143C',
      fontFamily: 'Courier, monospace',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const totalText = this.add.text(width * 0.2, height * 0.12, `${gameState.score}`, {
      fontSize: '90px',
      color: '#ffffff',
      fontFamily: 'Courier, monospace',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.time.delayedCall(3000, () => {
      hearts.forEach(h => h.destroy());
      label.destroy();
      pointsText.destroy();
      totalText.destroy();

      if (this.timeRemaining <= 0) {
        this.resetTimerToGameplayPosition();
        this.endChallenge();
        return;
      }

      if (this.pendingBonusLifePrompt) {
        this.pendingBonusLifePrompt = false;

        if (this.globalTimerEvent) {
          this.globalTimerEvent.remove(false);
          this.globalTimerEvent = null;
        }

        this.time.delayedCall(200, () => {
          this.scene.start('BonusPromptScene');
        });
        return;
      }

      this.bg.setTexture('bb_challenge_bg');
      this.scaleToFit(this.bg);

      this.resetTimerToGameplayPosition();

      this.phase = 'play';
      this.startBasketballRound();
    });
  }

  startRoundBar(durationMs) {
    const { width, height } = this.scale;

    this.roundBarBg.setVisible(true);
    this.roundBarFill.setVisible(true);

    this.roundBarBg.setPosition(width / 2, height - 18);
    this.roundBarBg.width = width;

    this.roundBarFill.setPosition(0, height - 18);
    this.roundBarFill.width = width;

    if (this.roundBarTween) this.roundBarTween.stop();

    this.roundBarTween = this.tweens.add({
      targets: this.roundBarFill,
      width: 0,
      duration: durationMs,
      ease: 'Linear'
    });
  }

  stopRoundBar() {
    if (this.roundBarTween) {
      this.roundBarTween.stop();
      this.roundBarTween = null;
    }
    this.roundBarBg.setVisible(false);
    this.roundBarFill.setVisible(false);
  }

  updateTimerText() {
    const minutes = Math.floor(this.timeRemaining / 60);
    const seconds = this.timeRemaining % 60;
    const padded = seconds.toString().padStart(2, '0');
    this.timerText.setText(`Time Remaining: ${minutes}:${padded}`);
  }

  endChallenge() {
    if (this.phase === 'ended') return;
    this.phase = 'ended';

    if (this.globalTimerEvent) {
      this.globalTimerEvent.remove(false);
      this.globalTimerEvent = null;
    }
    if (this.roundTimerEvent) {
      this.roundTimerEvent.remove(false);
      this.roundTimerEvent = null;
    }

    this.pauseGlobalTimer();
    this.stopRoundBar();
    this.clearRoundVisuals();

    this.time.delayedCall(400, () => {
      this.scene.start('EndPledgeScene');
    });
  }

  clearRoundVisuals() {
    this.players.forEach(p => p.sprite.destroy());
    this.players = [];
  }

  scaleToFit(image) {
    const { width, height } = this.scale;
    const scaleX = width / image.width;
    const scaleY = height / image.height;
    image.setScale(Math.min(scaleX, scaleY));
  }

  resetTimerToGameplayPosition() {
    this.timerText.setPosition(this.timerPosGameplay.x, this.timerPosGameplay.y).setOrigin(0.5);
  }

  update() {
    if (this.phase === 'play' && Phaser.Input.Keyboard.JustDown(this.enterKey)) {
      this.handleRoundTrain();
    }
  }
}