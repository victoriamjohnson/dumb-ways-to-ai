// src/scenes/AccountabilityTutorialScene.js
import sessionLogger from '../sessionLogger.js';
import gameState from '../gameState.js';

const AUTO_ADVANCE_MS = 8000;

export default class AccountabilityTutorialScene extends Phaser.Scene {
  constructor() {
    super('AccountabilityTutorialScene');

    this.phase = 'intro';
    this.introSteps = [];
    this.resultStepsSuccess = [];
    this.resultStepsFail = [];
    this.reflectionSteps = [];
    this.currentIndex = 0;
    this.barFillGraphics = null;
    this.overrideOval = null;
    this.spaceCount = 0;
    this.spacesRequired = 20;
    this.success = false;
    this.playObjects = [];
    this._autoTimer = null;
    this._countdownEvent = null;
    this._secondsLeft = 0;
  }

  preload() {
    this.load.image('grades_training_bg',      'assets/ui/Grades_Training_Screen.png');
    this.load.image('grades_training_bg_fail', 'assets/ui/Grades_Training_Screen_Fail.png');
    this.load.image('grades_game_bg',          'assets/ui/Grades_Game_Screen.png');
    this.load.image('bar',                     'assets/ui/Bar.png');
    this.load.image('override_fail',           'assets/ui/Override_Fail.png');
    this.load.image('override_pass',           'assets/ui/Override_Pass.png');
  }

  create() {
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;

    this.cameras.main.setBackgroundColor('#000814');

    const bg = this.add.image(centerX, centerY, 'grades_training_bg').setOrigin(0.5);
    bg.setScale(Math.min(width / bg.width, height / bg.height));
    this.bg = bg;

    const textLeftX = width * 0.10;
    const speakerY  = height * 0.65;
    const bodyY     = height * 0.70;

    this.speakerText = this.add.text(textLeftX, speakerY, '', {
      fontSize: '26px', color: '#ffd166',
      fontFamily: 'Courier, monospace', fontStyle: 'bold'
    }).setOrigin(0, 0.5);

    this.bodyText = this.add.text(textLeftX, bodyY, '', {
      fontSize: '26px', color: '#ffffff',
      fontFamily: 'Courier, monospace', wordWrap: { width: width * 0.84 }
    }).setOrigin(0, 0);

    this.hintText = this.add.text(centerX, height - 55,
      '← Back   Continue →', {
        fontSize: '20px', color: '#aaaaaa',
        fontFamily: 'Courier, monospace', align: 'center'
      }
    ).setOrigin(0.5);

    // ── Countdown text (bottom-right) ──
    this.countdownText = this.add.text(width - 115, height - 55, '', {
      fontSize: '30px', color: '#ffd166', fontFamily: 'Courier, monospace'
    }).setOrigin(1, 0.5);

    const { firstName } = gameState.player;
    const dev = firstName ? `Developer ${firstName}` : 'Developer';

    this.introSteps = [
      { speaker: 'Dr. Bot', text: `${dev}, Doom built an AI grading system, launched it, and walked away.\nNow it is failing students on work they got right!` },
      { speaker: 'Dr. Bot', text: `When complaints came in, Doom said: "The AI made that decision, not me."\nPush the correction patch before report cards go out!` }
    ];

    this.resultStepsSuccess = [
      { speaker: 'Dr. Bot', text: '✓ CORRECT!', color: '#00ff88' },
      { speaker: 'Dr. Bot', text: `${dev}, patch is live and students are protected.\nDoom walked away. You stayed and fixed it. That is accountability!` }
    ];

    this.resultStepsFail = [
      { speaker: 'Dr. Bot', text: '✗ INCORRECT!', color: '#ff4444' },
      { speaker: 'Dr. Bot', text: `${dev}, the report cards went out with wrong grades.\nResponsible developers stick around to fix their mistakes. Doom never does!` }
    ];

    this.reflectionSteps = [
      { speaker: 'Dr. Bot', text: `${dev}, your responsibility does not end when you hit deploy.\nIf your AI causes harm, you fix it. That is what accountability means!` }
    ];

    this.phase = 'intro';
    this.currentIndex = 0;

    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.leftKey  = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    this.rightKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    this.input.on('pointerdown', (pointer, targets) => {
      if (targets.length > 0) return; // ignore clicks on interactive objects (back button)
      if (this.phase !== 'play') this.handleAdvance();
    });

    sessionLogger.logTutorialMiniGameStart('accountability');
    this.showIntroStep();
  }

  // ─── AUTO-ADVANCE TIMER ───────────────────────────────────────────────────────

  startAutoAdvanceTimer() {
    this.clearAutoAdvanceTimer();
    this._secondsLeft = Math.ceil(AUTO_ADVANCE_MS / 1000);
    this.updateCountdown();

    this._countdownEvent = this.time.addEvent({
      delay: 1000, loop: true,
      callback: () => { this._secondsLeft--; this.updateCountdown(); }
    });

    this._autoTimer = this.time.delayedCall(AUTO_ADVANCE_MS, () => this.handleAdvance());
  }

  clearAutoAdvanceTimer() {
    if (this._autoTimer)      { this._autoTimer.remove(false);      this._autoTimer = null; }
    if (this._countdownEvent) { this._countdownEvent.remove(false); this._countdownEvent = null; }
    if (this.countdownText)   { this.countdownText.setText(''); }
  }

  updateCountdown() {
    if (this.countdownText) {
      this.countdownText.setText(this._secondsLeft > 0 ? `${this._secondsLeft}` : '');
    }
  }

  // ─── BACK ─────────────────────────────────────────────────────────────────────

  handleBack() {
    if (this.currentIndex <= 0) return;
    this.currentIndex--;
    this.refreshCurrentPhaseStep();
  }

  refreshCurrentPhaseStep() {
    if (this.phase === 'intro') {
      this.showIntroStep();
    } else if (this.phase === 'result') {
      const steps = this.success ? this.resultStepsSuccess : this.resultStepsFail;
      const step = steps[this.currentIndex];
      this.speakerText.setText(step.speaker);
      this.bodyText.setText(step.text);
      this.bodyText.setColor(step.color || '#ffffff');
      this.startAutoAdvanceTimer();
    } else if (this.phase === 'reflection') {
      const step = this.reflectionSteps[this.currentIndex];
      this.speakerText.setText(step.speaker);
      this.bodyText.setText(step.text);
      this.bodyText.setColor('#ffffff');
      this.startAutoAdvanceTimer();
    }
  }

  // ─── INTRO & INSTRUCTIONS ────────────────────────────────────────────────────

  showIntroStep() {
    const step = this.introSteps[this.currentIndex];
    if (!step) { this.showInstructions(); return; }
    this.bodyText.setColor('#ffffff');
    this.speakerText.setText(step.speaker);
    this.bodyText.setText(step.text);
    this.hintText.setText('← Back   Continue →');
    this.startAutoAdvanceTimer();
  }

  showInstructions() {
    this.clearAutoAdvanceTimer();
    this.phase = 'instructions';
    this.bodyText.setColor('#ffffff');
    this.speakerText.setText('Dr. Bot');
    this.bodyText.setText(
      'OVERRIDE THE MISTAKE!\n\n' +
      'Mash SPACE as fast as you can to fill the override bar.\n' +
      'Fill it completely to push the correction patch!'
    );
    this.hintText.setText('Begin →');
  }

  handleAdvance() {
    if (this.phase === 'play') return;

    this.clearAutoAdvanceTimer();

    if (this.phase === 'intro') {
      this.currentIndex++;
      if (this.currentIndex >= this.introSteps.length) {
        this.showInstructions();
      } else {
        this.showIntroStep();
      }

    } else if (this.phase === 'instructions') {
      this.startPlayPhase();

    } else if (this.phase === 'result') {
      this.currentIndex++;
      const steps = this.success ? this.resultStepsSuccess : this.resultStepsFail;
      if (this.currentIndex >= steps.length) {
        this.startReflectionPhase();
      } else {
        const step = steps[this.currentIndex];
        this.speakerText.setText(step.speaker);
        this.bodyText.setText(step.text);
        this.bodyText.setColor(step.color || '#ffffff');
        this.startAutoAdvanceTimer();
      }

    } else if (this.phase === 'reflection') {
      this.currentIndex++;
      if (this.currentIndex >= this.reflectionSteps.length) {
        this.scene.start('PrivacyTutorialScene');
      } else {
        const step = this.reflectionSteps[this.currentIndex];
        this.speakerText.setText(step.speaker);
        this.bodyText.setText(step.text);
        this.bodyText.setColor('#ffffff');
        this.startAutoAdvanceTimer();
      }
    }
  }

  // ─── PLAY PHASE ──────────────────────────────────────────────────────────────

  startPlayPhase() {
    const { width, height } = this.scale;

    this.phase = 'play';
    this.spaceCount = 0;
    this.bg.setTexture('grades_game_bg');
    this.speakerText.setVisible(false);
    this.bodyText.setVisible(false);
    this.hintText.setVisible(false);
    this.countdownText.setText('');

    const barX       = width  * 0.925;
    const barTopY    = height * 0.32;
    const barBottomY = height * 0.88;
    const barW       = width  * 0.045;
    const barH       = barBottomY - barTopY;

    this.barX       = barX;
    this.barTopY    = barTopY;
    this.barBottomY = barBottomY;
    this.barW       = barW;
    this.barH       = barH;

    const barBg = this.add.image(barX, barTopY + barH / 2, 'bar')
      .setOrigin(0.5).setDisplaySize(300, 450).setDepth(5);
    this.playObjects.push(barBg);

    this.barFillGraphics = this.add.graphics().setDepth(6);
    this.playObjects.push(this.barFillGraphics);

    this.overrideOval = this.add.image(barX, height * 0.34, 'override_fail')
      .setOrigin(0.5).setDisplaySize(width * 0.13, height * 0.15).setDepth(7);
    this.playObjects.push(this.overrideOval);

    this.drawBarFill();
  }

  drawBarFill() {
    if (!this.barFillGraphics) return;
    const fillFraction = Math.min(this.spaceCount / this.spacesRequired, 1);
    const fillH = this.barH * fillFraction;
    this.barFillGraphics.clear();
    if (fillH > 0) {
      this.barFillGraphics.fillStyle(0x00ff88, 0.85);
      this.barFillGraphics.fillRect(
        this.barX - this.barW / 2, this.barBottomY - fillH, this.barW, fillH
      );
    }
  }

  handleSpaceMash() {
    if (this.phase !== 'play') return;
    this.spaceCount++;
    this.drawBarFill();
    if (this.spaceCount >= this.spacesRequired) {
      if (this.overrideOval) this.overrideOval.setTexture('override_pass');
      this.time.delayedCall(600, () => this.endRound(true));
    }
  }

  endRound(success) {
    if (this.phase !== 'play' && this.phase !== 'ended_round') return;
    this.phase = 'ended_round';
    this.success = success;
    sessionLogger.logTutorialMiniGameEnd('accountability', this.success);
    this.cleanupPlayVisuals();
    this.showResultPhase();
  }

  cleanupPlayVisuals() {
    this.playObjects.forEach(obj => { if (obj && obj.active) obj.destroy(); });
    this.playObjects = [];
    if (this.barFillGraphics) { this.barFillGraphics.destroy(); this.barFillGraphics = null; }
    this.overrideOval = null;
  }

  showResultPhase() {
    this.phase = 'result';
    this.currentIndex = 0;
    this.bg.setTexture(this.success ? 'grades_training_bg' : 'grades_training_bg_fail');
    this.speakerText.setVisible(true);
    this.bodyText.setVisible(true);
    this.hintText.setVisible(true);
    this.hintText.setText('← Back   Continue →');

    const steps = this.success ? this.resultStepsSuccess : this.resultStepsFail;
    this.speakerText.setText(steps[0].speaker);
    this.bodyText.setText(steps[0].text);
    this.bodyText.setColor(steps[0].color || '#ffffff');
    this.startAutoAdvanceTimer();
  }

  startReflectionPhase() {
    this.phase = 'reflection';
    this.currentIndex = 0;
    this.bodyText.setColor('#ffffff');
    this.bg.setTexture('grades_training_bg');
    const step = this.reflectionSteps[0];
    this.speakerText.setText(step.speaker);
    this.bodyText.setText(step.text);
    this.hintText.setText('← Back   Continue →');
    this.startAutoAdvanceTimer();
  }

  // ─── UPDATE ──────────────────────────────────────────────────────────────────

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      if (this.phase === 'play') this.handleSpaceMash();
      else this.handleAdvance();
    }
    if (this.phase !== 'play') {
      if (Phaser.Input.Keyboard.JustDown(this.rightKey)) this.handleAdvance();
      if (Phaser.Input.Keyboard.JustDown(this.leftKey))  this.handleBack();
    }
  }
}