// src/scenes/ChallengeScene.js
import gameState from '../gameState.js';

export default class ChallengeScene extends Phaser.Scene {
  constructor() {
    super('ChallengeScene');
    this.roundTimeLimit = 8000;
    this.winPoints = 100;
    this.losePoints = 25;
    this.resultAnimDurationMs = 3000;
    this.leaderboardKey = 'dwai_leaderboard_v1';
    
    this.players = [];
    this.pointsUI = []; 
  }

  init(data) {
    this.resumeRun = !!data?.resumeRun;
    this.fromBonusQuestion = !!data?.fromBonusQuestion;
    this.bonusCorrect = !!data?.bonusCorrect;
    this.bonusWrongButMore = !!data?.bonusWrongButMore;
    if (this.resumeRun) {
      this.timeRemaining = data.timeRemaining ?? this.timeRemaining ?? 120;
      gameState.score = data.score ?? gameState.score ?? 0;
      gameState.badges = data.badges ?? gameState.badges ?? 1;
    }
  }

  preload() {
    this.load.image('bb_overlay_bg', 'assets/ui/Basketball_Screen_Overlay.png');
    this.load.image('bb_challenge_bg', 'assets/ui/Basketball_Challenge_Screen.png');
    this.load.image('points_bg', 'assets/ui/Points_Screen.png');
    this.load.image('bonus_popup_bg', 'assets/ui/Bonus_Pop_Up.png');
    this.load.image('heart_full', 'assets/ui/Heart.png');
    this.load.image('heart_lost', 'assets/ui/Heart_Loss.png');
    this.load.image('player_boy', 'assets/ui/Boy_Player.png');
    this.load.image('player_girl', 'assets/ui/Girl_Player.png');
    this.load.image('player_boy_deleted', 'assets/ui/Boy_Player_Deleted.png');
    this.load.image('player_girl_deleted', 'assets/ui/Girl_Player_Deleted.png');
    const animBase = 'assets/basketball_animations';
    for (let i = 1; i <= 35; i++) this.load.image(`bb_lose_${i}`, `${animBase}/Basketball_Lose_Screen_-${i}.png`);
    for (let i = 1; i <= 13; i++) this.load.image(`bb_win_${i}`, `${animBase}/Basketball_Win_Screen_-${i}.png`);
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#000814');
    this.createResultAnimationsSafe();
    this.phase = 'overlay';
    
    if (!this.resumeRun) {
      gameState.score = 0; gameState.badges = 3; gameState.bonusUsed = 0;
      if (!gameState.failures) gameState.failures = [];
      this.timeRemaining = 120;
    }

    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.bg = this.add.image(width/2, height/2, 'bb_overlay_bg').setOrigin(0.5);
    this.scaleToFit(this.bg);
    
    this.timerPosGameplay = { x: width * 0.15, y: height * 0.08 };
    this.timerPosPoints = { x: width * 0.20, y: height * 0.30 };
    
    this.timerText = this.add.text(this.timerPosGameplay.x, this.timerPosGameplay.y, '', { 
      fontSize: '26px', color: '#ffffff', fontFamily: 'Courier, monospace', fontStyle: 'bold' 
    }).setOrigin(0.5).setDepth(10000);

    this.countText = this.add.text(width/2, height/2, '', { 
      fontSize: '26px', color: '#ffffff', fontFamily: 'Courier, monospace' 
    }).setOrigin(0.5).setVisible(false).setDepth(10);

    this.roundBarBg = this.add.rectangle(width/2, height - 18, width, 24, 0x000000, 0.35).setVisible(false);
    this.roundBarFill = this.add.rectangle(0, height - 18, width, 18, 0xffffff, 0.75).setOrigin(0, 0.5).setVisible(false);
    this.overlayText = this.add.text(width/2, height * 0.28, 'BALANCE THE DATASET\nClick players\nWhen Boys and Girls are EVEN\nHit ENTER', { 
      fontSize: '44px', color: '#ffffff', fontFamily: 'Courier, monospace', fontStyle: 'bold', align: 'center' 
    }).setOrigin(0.5).setVisible(false);

    this.startGlobalTimerIfNeeded();
    this.updateTimerText();
    
    if (this.fromBonusQuestion) { 
      this.showBonusResultScreen(this.bonusCorrect); 
      return; 
    }
    this.startChallenge();
  }

  showFinalResults(reasonText) {
    this.phase = 'ended';
    this.pauseGlobalTimer();
    this.stopRoundBar();
    this.clearRoundVisuals(); 
    
    const { width, height } = this.scale;
    this.bg.setTexture('points_bg');
    this.scaleToFit(this.bg);
    
    this.timerText.setPosition(this.timerPosPoints.x, this.timerPosPoints.y);

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
        this.pointsUI.push(this.add.image(width/2 + (i - 1) * 180, heartY, 'heart_lost').setOrigin(0.5).setScale(0.45));
    }

    this.pointsUI.push(this.add.text(width/2, height * 0.65, reasonText, {
      fontSize: '70px', color: '#DC143C', fontFamily: 'Courier, monospace', fontStyle: 'bold'
    }).setOrigin(0.5));

    this.time.delayedCall(4000, () => {
      this.scene.start('EndPledgeScene');
    });
  }

  showBonusResultScreen(success) {
    if (!success) {
      if (this.bonusWrongButMore) {
        // Got it wrong but there's another question — re-show the bonus popup
        this.clearRoundVisuals();
        this.showBonusPopupOverlay();
      } else {
        this.showFinalResults("ALL LIVES LOST!");
      }
      return;
    }

    const { width, height } = this.scale;
    this.phase = 'points';
    this.pauseGlobalTimer();
    this.bg.setTexture('points_bg');
    this.scaleToFit(this.bg);
    this.clearRoundVisuals(); 
    
    this.pointsUI.push(this.add.text(width * 0.2, height * 0.12, `${gameState.score}`, { 
      fontSize: '90px', color: '#ffffff', fontFamily: 'Courier, monospace', fontStyle: 'bold' 
    }).setOrigin(0.5));

    this.updateLocalLeaderboard(); 
    const lb = this.getLocalLeaderboardTop3();
    this.pointsUI.push(this.add.text(width * 0.78, height * 0.14, 
      `Top Players\n1) ${lb[0] ?? '---'}\n2) ${lb[1] ?? '---'}\n3) ${lb[2] ?? '---'}`, 
      { fontSize: '22px', color: '#ffffff', fontFamily: 'Courier, monospace', align: 'left' }
    ).setOrigin(0, 0.5));

    const heartY = height * 0.45;
    for (let i = 0; i < 3; i++) {
      this.pointsUI.push(this.add.image(width/2 + (i - 1) * 180, heartY, i < (gameState.badges ?? 0) ? 'heart_full' : 'heart_lost').setOrigin(0.5).setScale(0.45));
    }
    
    this.pointsUI.push(this.add.text(width/2, heartY + 150, 'Bonus Life Earned!', { 
      fontSize: '44px', color: '#ffd400', fontFamily: 'Courier, monospace', fontStyle: 'bold' 
    }).setOrigin(0.5));

    this.time.delayedCall(3000, () => { 
        this.resetTimerToGameplayPosition(); 
        this.startBasketballRound(); 
    });
  }

  showPointsScreen(pointsEarned, success) {
    const { width, height } = this.scale;
    this.phase = 'points';
    this.bg.setTexture('points_bg');
    this.scaleToFit(this.bg);
    this.timerText.setPosition(this.timerPosPoints.x, this.timerPosPoints.y);

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
        this.pointsUI.push(this.add.image(width/2 + (i - 1) * 180, heartY, i < (gameState.badges ?? 0) ? 'heart_full' : 'heart_lost').setOrigin(0.5).setScale(0.45));
    }
    
    this.pointsUI.push(this.add.text(width/2, heartY + 130, 'Points Earned', { fontSize: '32px', color: '#ffffff', fontFamily: 'Courier, monospace' }).setOrigin(0.5));
    this.pointsUI.push(this.add.text(width/2, heartY + 190, `${pointsEarned}`, { fontSize: '64px', color: success ? '#228B22' : '#DC143C', fontFamily: 'Courier, monospace', fontStyle: 'bold' }).setOrigin(0.5));

    this.time.delayedCall(3000, () => {
      if (this.timeRemaining <= 0) { 
          this.showFinalResults("TIMES UP!"); 
          return; 
      }
      if ((gameState.badges ?? 0) <= 0) { 
        if ((gameState.bonusUsed ?? 0) < 1) {
            this.showBonusPopupOverlay(); 
        } else { 
            this.showFinalResults("ALL LIVES LOST!");
        } 
        return; 
      }
      this.resetTimerToGameplayPosition(); 
      this.startBasketballRound();
    });
  }

  showBonusPopupOverlay() {
    this.phase = 'bonus_popup';
    const { width, height } = this.scale;
    const dim = this.add.rectangle(width/2, height/2, width, height, 0x000000, 0.45).setDepth(5000);
    const popup = this.add.image(width/2, height/2, 'bonus_popup_bg').setOrigin(0.5).setDepth(5001);
    popup.setScale(Math.min(width / popup.width, height / popup.height) * 0.95);
    
    this.timerText.setPosition(width/2, height/2).setDepth(10000);

    const bZ = this.add.zone(width/2 - popup.displayWidth * 0.22, height/2 + popup.displayHeight * 0.25, popup.displayWidth * 0.32, popup.displayHeight * 0.18).setOrigin(0.5).setDepth(5003).setInteractive({ useHandCursor: true });
    const eZ = this.add.zone(width/2 + popup.displayWidth * 0.22, height/2 + popup.displayHeight * 0.25, popup.displayWidth * 0.32, popup.displayHeight * 0.18).setOrigin(0.5).setDepth(5003).setInteractive({ useHandCursor: true });
    
    bZ.on('pointerdown', () => { 
        dim.destroy(); popup.destroy(); 
        this.scene.start('BonusQuestionScene', { returnScene: 'ChallengeScene', timeRemaining: this.timeRemaining, score: gameState.score, badges: gameState.badges }); 
    });
    eZ.on('pointerdown', () => { 
        dim.destroy(); popup.destroy();
        this.showFinalResults("ALL LIVES LOST!"); 
    });
  }

  updateLocalLeaderboard() {
    const name = `${(gameState.player?.firstName || 'Developer').trim()} ${(gameState.player?.lastInitial || '').trim()}`.trim();
    const entries = this.loadLeaderboard();
    const idx = entries.findIndex(e => e.name === name);
    if (idx >= 0) entries[idx].score = Math.max(entries[idx].score, gameState.score);
    else entries.push({ name, score: gameState.score });
    entries.sort((a, b) => b.score - a.score);
    this.saveLeaderboard(entries.slice(0, 25));
  }

  loadLeaderboard() { try { return JSON.parse(localStorage.getItem(this.leaderboardKey)) || []; } catch { return []; } }
  saveLeaderboard(entries) { localStorage.setItem(this.leaderboardKey, JSON.stringify(entries)); }
  getLocalLeaderboardTop3() { return this.loadLeaderboard().slice(0, 3).map(e => `${e.name} (${e.score})`); }
  
  createResultAnimationsSafe() {
    if (!this.anims.exists('bb_win_anim')) {
      const frames = []; for (let i = 1; i <= 13; i++) frames.push({ key: `bb_win_${i}` });
      this.anims.create({ key: 'bb_win_anim', frames, frameRate: 15, repeat: -1 });
    }
    if (!this.anims.exists('bb_lose_anim')) {
      const frames = []; for (let i = 1; i <= 35; i++) frames.push({ key: `bb_lose_${i}` });
      this.anims.create({ key: 'bb_lose_anim', frames, frameRate: 15, repeat: 0 });
    }
  }

  startGlobalTimerIfNeeded() { 
    if (!this.globalTimerEvent) {
        this.globalTimerEvent = this.time.addEvent({ 
            delay: 1000, loop: true, callback: () => { 
                if (!this.globalTimerPaused) { 
                    this.timeRemaining--; 
                    this.updateTimerText(); 
                    if (this.timeRemaining <= 0) this.showFinalResults("TIMES UP!"); 
                } 
            } 
        }); 
    }
  }

  pauseGlobalTimer() { this.globalTimerPaused = true; }
  resumeGlobalTimer() { this.globalTimerPaused = false; }
  updateTimerText() { const mins = Math.floor(this.timeRemaining / 60); const secs = this.timeRemaining % 60; this.timerText.setText(`Time Remaining: ${mins}:${secs.toString().padStart(2, '0')}`); }

  playInstructionsThenStartRound() {
    const { width } = this.scale; 
    this.pauseGlobalTimer(); 
    this.bg.setTexture('bb_overlay_bg'); 
    this.scaleToFit(this.bg); 
    this.clearRoundVisuals(); 
    
    this.overlayText.setVisible(true).setX(-width);
    this.tweens.add({ targets: this.overlayText, x: width/2, duration: 450, ease: 'Cubic.Out', onComplete: () => { 
        this.time.delayedCall(2100, () => { 
            this.tweens.add({ targets: this.overlayText, x: width * 2, duration: 450, ease: 'Cubic.In', onComplete: () => { 
                this.overlayText.setVisible(false); 
                this.bg.setTexture('bb_challenge_bg'); 
                this.scaleToFit(this.bg); 
                this.resetTimerToGameplayPosition(); 
                this.phase = 'play'; 
                this.startBasketballRoundCore(); 
            } }); 
        }); 
    } });
  }

  startChallenge() { if (this.timeRemaining > 0) this.playInstructionsThenStartRound(); }
  startBasketballRound() { if (this.timeRemaining > 0 && this.phase !== 'ended') this.playInstructionsThenStartRound(); }
  
  startBasketballRoundCore() { 
    this.clearRoundVisuals(); 
    this.createDatasetGrid_AlwaysMoreBoys(); 
    this.countText.setVisible(true); 
    this.updateCounts(); 
    this.startRoundBar(this.roundTimeLimit); 
    this.resumeGlobalTimer(); 
    if (this.roundTimerEvent) this.roundTimerEvent.remove(false); 
    this.roundTimerEvent = this.time.delayedCall(this.roundTimeLimit, () => this.handleRoundTimeout()); 
  }

  createDatasetGrid_AlwaysMoreBoys() {
    const { width, height } = this.scale; const centerX = width / 2; const centerY = height / 2; const cols = 4; const rows = 3; const playerScale = 0.55; const spriteSize = 256; const displaySize = spriteSize * playerScale; const colSpacing = displaySize + 55; const rowSpacing = displaySize + 45; const gridWidth = (cols - 1) * colSpacing; const gridHeight = (rows - 1) * rowSpacing; const startX = centerX - gridWidth / 2; const startY = centerY - gridHeight / 2 + height * 0.06;
    this.countText.setPosition(centerX, startY - 100); const total = 12; const numGirls = Phaser.Math.Between(1, 5); const numBoys = total - numGirls; const types = []; for (let i = 0; i < numBoys; i++) types.push('boy'); for (let i = 0; i < numGirls; i++) types.push('girl'); Phaser.Utils.Array.Shuffle(types);
    for (let i = 0; i < total; i++) { const row = Math.floor(i / cols); const col = i % cols; const x = startX + col * colSpacing; const y = startY + row * rowSpacing; const type = types[i]; const textureKey = type === 'boy' ? 'player_boy' : 'player_girl'; const deletedTextureKey = type === 'boy' ? 'player_boy_deleted' : 'player_girl_deleted'; const sprite = this.add.image(x, y, textureKey).setOrigin(0.5).setScale(playerScale).setInteractive({ useHandCursor: true }); const player = { sprite, type, alive: true, textureKey, deletedTextureKey }; sprite.on('pointerdown', () => this.togglePlayer(player)); this.players.push(player); }
  }

  togglePlayer(player) { if (this.phase === 'play') { player.alive = !player.alive; player.sprite.setTexture(player.alive ? player.textureKey : player.deletedTextureKey); this.updateCounts(); } }
  updateCounts() { this.boyCount = this.players.filter(p => p.alive && p.type === 'boy').length; this.girlCount = this.players.filter(p => p.alive && p.type === 'girl').length; this.countText.setText(`Boys: ${this.boyCount}    Girls: ${this.girlCount}`); }
  
  // FIX: Force failure when time runs out
  handleRoundTimeout() { this.finishRound({ success: false }); }
  
  handleRoundTrain() { 
    const success = this.boyCount === this.girlCount && this.boyCount > 0; 
    this.finishRound({ success }); 
  }
  
  finishRound({ success }) { 
    if (this.phase !== 'play') return; 
    
    // Clear the timer so it doesn't fire a timeout after manual train
    if (this.roundTimerEvent) this.roundTimerEvent.remove(false);

    this.pauseGlobalTimer(); 
    this.stopRoundBar(); 
    const earned = success ? this.winPoints : this.losePoints; 
    gameState.score += earned; 
    if (!success) gameState.badges = Math.max(0, (gameState.badges ?? 0) - 1); 
    this.showResultAnimationThenPoints({ success, earned }); 
  }

  showResultAnimationThenPoints({ success, earned }) { 
    this.phase = 'result_anim'; 
    this.clearRoundVisuals(); 
    
    // Select animation key based on success
    const animKey = success ? 'bb_win_anim' : 'bb_lose_anim';
    const firstFrame = success ? 'bb_win_1' : 'bb_lose_1';

    const animSprite = this.add.sprite(this.scale.width / 2, this.scale.height / 2, firstFrame).setOrigin(0.5).setDepth(9999); 
    animSprite.setScale(Math.min(this.scale.width / animSprite.width, this.scale.height / animSprite.height)); 
    animSprite.play(animKey); 
    
    this.time.delayedCall(this.resultAnimDurationMs, () => { 
        animSprite.destroy(); 
        this.showPointsScreen(earned, success); 
    }); 
  }

  startRoundBar(dur) { this.roundBarBg.setVisible(true); this.roundBarFill.setVisible(true).width = this.scale.width; this.roundBarTween = this.tweens.add({ targets: this.roundBarFill, width: 0, duration: dur, ease: 'Linear' }); }
  stopRoundBar() { if (this.roundBarTween) this.roundBarTween.stop(); this.roundBarBg.setVisible(false); this.roundBarFill.setVisible(false); }

  clearRoundVisuals() { 
    this.players.forEach(p => p.sprite.destroy()); 
    this.players = []; 
    this.pointsUI.forEach(obj => obj.destroy());
    this.pointsUI = [];
    if (this.countText) this.countText.setVisible(false);
  }

  scaleToFit(img) { img.setScale(Math.min(this.scale.width / img.width, this.scale.height / img.height)); }
  resetTimerToGameplayPosition() { this.timerText.setPosition(this.timerPosGameplay.x, this.timerPosGameplay.y); }
  update() { if (this.phase === 'play' && Phaser.Input.Keyboard.JustDown(this.enterKey)) this.handleRoundTrain(); }
}