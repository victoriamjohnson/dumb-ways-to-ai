// src/scenes/PrivacyTutorialScene.js
import sessionLogger from '../sessionLogger.js';
import gameState from '../gameState.js';

const AUTO_ADVANCE_MS = 8000;

export default class PrivacyTutorialScene extends Phaser.Scene {
  constructor() {
    super('PrivacyTutorialScene');

    this.phase = 'intro';
    this.introSteps = [];
    this.resultStepsSuccess = [];
    this.resultStepsFail = [];
    this.reflectionSteps = [];
    this.currentIndex = 0;
    this.success = false;
    this.toggleLeft  = false;
    this.toggleRight = false;
    this.toggleLeftGraphics  = null;
    this.toggleRightGraphics = null;
    this.saveBtn = null;
    this.xBtn    = null;
    this.playObjects = [];
    this._autoTimer = null;
    this._countdownEvent = null;
    this._secondsLeft = 0;
  }

  preload() {
    this.load.image('doomgpt_training_bg',      'assets/ui/DoomGPT_Training_Screen.png');
    this.load.image('doomgpt_training_bg_fail', 'assets/ui/DoomGPT_Training_Screen_Fail.png');
    this.load.image('doomgpt_game_bg',          'assets/ui/DoomGPT_Game_Screen.png');
    this.load.image('pr_btn_save',              'assets/ui/Save.png');
    this.load.image('pr_btn_save_grey',         'assets/ui/Save_Grey.png');
    this.load.image('pr_btn_x',                 'assets/ui/X.png');
    this.load.image('pr_btn_x_grey',            'assets/ui/X_Grey.png');
  }

  create() {
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;

    this.cameras.main.setBackgroundColor('#FFF4A3');

    const bg = this.add.image(centerX, centerY, 'doomgpt_training_bg').setOrigin(0.5);
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
      { speaker: 'Dr. Bot', text: `${dev}, Doom is launching DoomGPT, an AI assistant that connects directly to users' devices.` },
      { speaker: 'Dr. Bot', text: `Before it launches, you have to approve what data it collects.` },
      { speaker: 'Dr. Bot', text: `Responsible developers only collect what the AI actually needs.\nToggle ON what is safe. If neither option belongs, press X!` }
    ];

    this.resultStepsSuccess = [
      { speaker: 'Dr. Bot', text: '✓ CORRECT!', color: '#00ff88' },
      { speaker: 'Dr. Bot', text: `${dev}, email address is safe, it is the minimum needed to create an account.\nBanking info is never needed for a free AI assistant. Good call!` }
    ];

    this.resultStepsFail = [
      { speaker: 'Dr. Bot', text: '✗ INCORRECT!', color: '#ff4444' },
      { speaker: 'Dr. Bot', text: `${dev}, email address is safe, it is the minimum needed to create an account.\nBanking info should never be collected by a free AI assistant. Never!` }
    ];

    this.reflectionSteps = [
      { speaker: 'Dr. Bot', text: `${dev}, privacy is not about what you can collect.\nIt is about what you should. Only take what you need!` }
    ];

    this.phase = 'intro';
    this.currentIndex = 0;

    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.leftKey  = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    this.rightKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);

    sessionLogger.logTutorialMiniGameStart('privacy');
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
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.refreshCurrentPhaseStep();
      return;
    }

    if (this.phase === 'reflection') {
      this.phase = 'result';
      const steps = this.success ? this.resultStepsSuccess : this.resultStepsFail;
      this.currentIndex = steps.length - 1;
      this.refreshCurrentPhaseStep();
    } else if (this.phase === 'instructions') {
      // Go back to the last intro step
      this.phase = 'intro';
      this.currentIndex = this.introSteps.length - 1;
      this.showIntroStep();
    } else if (this.phase === 'result' && this.currentIndex === 0) {
      return;
    } else if (this.phase === 'intro' && this.currentIndex === 0) {
      return;
    }
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
    this.currentIndex = 0;  // ← add this
    this.bodyText.setColor('#ffffff');
    this.speakerText.setText('Dr. Bot');
    this.bodyText.setText(
      'PROTECT USER PRIVACY!\n\n' +
      'Two data types are shown. Toggle ON data that is safe to collect,\n' +
      'then press SAVE to submit.\n' +
      'If neither is safe, toggle nothing and press the X button.'
    );
    this.hintText.setText('← Back   Begin →');
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
        this.scene.start('TutorialStoryScene', { outroMode: true });
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
    this.bg.setTexture('doomgpt_game_bg');
    this.speakerText.setVisible(false);
    this.bodyText.setVisible(false);
    this.hintText.setVisible(false);
    this.countdownText.setText('');

    this.toggleLeft  = false;
    this.toggleRight = false;

    const leftBoxCX  = width  * 0.445;
    const rightBoxCX = width  * 0.713;
    const boxCY      = height * 0.432;
    const toggleY    = height * 0.62;
    const toggleW    = 90;
    const toggleH    = 42;

    const leftLabel = this.add.text(leftBoxCX, boxCY, 'Email\nAddress', {
      fontSize: '32px', color: '#5a3e00',
      fontFamily: 'Courier, monospace', fontStyle: 'bold', align: 'center'
    }).setOrigin(0.5).setDepth(5);
    this.playObjects.push(leftLabel);

    const rightLabel = this.add.text(rightBoxCX, boxCY, 'Banking\nInformation', {
      fontSize: '32px', color: '#5a3e00',
      fontFamily: 'Courier, monospace', fontStyle: 'bold', align: 'center'
    }).setOrigin(0.5).setDepth(5);
    this.playObjects.push(rightLabel);

    this.toggleLeftGraphics = this.add.graphics().setDepth(6);
    this.playObjects.push(this.toggleLeftGraphics);
    this.drawToggle(this.toggleLeftGraphics, leftBoxCX, toggleY, toggleW, toggleH, false);

    const leftZone = this.add.zone(leftBoxCX, toggleY, toggleW + 20, toggleH + 20)
      .setOrigin(0.5).setDepth(7).setInteractive({ useHandCursor: true });
    leftZone.on('pointerdown', () => this.handleToggleLeft());
    this.playObjects.push(leftZone);

    this.toggleRightGraphics = this.add.graphics().setDepth(6);
    this.playObjects.push(this.toggleRightGraphics);
    this.drawToggle(this.toggleRightGraphics, rightBoxCX, toggleY, toggleW, toggleH, false);

    const rightZone = this.add.zone(rightBoxCX, toggleY, toggleW + 20, toggleH + 20)
      .setOrigin(0.5).setDepth(7).setInteractive({ useHandCursor: true });
    rightZone.on('pointerdown', () => this.handleToggleRight());
    this.playObjects.push(rightZone);

    this.saveBtn = this.add.image(width * 0.579, height * 0.760, 'pr_btn_save_grey')
      .setOrigin(0.5).setDisplaySize(200, 150).setDepth(8);
    this.playObjects.push(this.saveBtn);

    this.xBtn = this.add.image(width * 0.858, height * 0.192, 'pr_btn_x')
      .setOrigin(0.5).setDisplaySize(100, 100).setDepth(8)
      .setInteractive({ useHandCursor: true });
    this.xBtn.on('pointerdown', () => this.handleSubmitX());
    this.playObjects.push(this.xBtn);

    this.refreshButtonState();
  }

  // ─── TOGGLE HELPERS ──────────────────────────────────────────────────────────

  drawToggle(graphics, cx, cy, w, h, isOn) {
    graphics.clear();
    const r = h / 2;
    graphics.fillStyle(isOn ? 0x4caf50 : 0xaaaaaa, 1);
    graphics.fillRoundedRect(cx - w / 2, cy - r, w, h, r);
    const knobX = isOn ? cx + w / 2 - r : cx - w / 2 + r;
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(knobX, cy, r - 4);
  }

  handleToggleLeft() {
    if (this.phase !== 'play') return;
    this.toggleLeft = !this.toggleLeft;
    this.drawToggle(this.toggleLeftGraphics, this.scale.width * 0.445, this.scale.height * 0.62, 90, 42, this.toggleLeft);
    this.refreshButtonState();
  }

  handleToggleRight() {
    if (this.phase !== 'play') return;
    this.toggleRight = !this.toggleRight;
    this.drawToggle(this.toggleRightGraphics, this.scale.width * 0.713, this.scale.height * 0.62, 90, 42, this.toggleRight);
    this.refreshButtonState();
  }

  refreshButtonState() {
    const anyToggled = this.toggleLeft || this.toggleRight;
    if (anyToggled) {
      this.saveBtn.setTexture('pr_btn_save');
      this.saveBtn.setInteractive({ useHandCursor: true });
      this.saveBtn.off('pointerdown');
      this.saveBtn.on('pointerdown', () => this.handleSubmitSave());
      this.xBtn.setTexture('pr_btn_x_grey');
      this.xBtn.removeInteractive();
    } else {
      this.saveBtn.setTexture('pr_btn_save_grey');
      this.saveBtn.removeInteractive();
      this.xBtn.setTexture('pr_btn_x');
      this.xBtn.setInteractive({ useHandCursor: true });
      this.xBtn.off('pointerdown');
      this.xBtn.on('pointerdown', () => this.handleSubmitX());
    }
  }

  // ─── SUBMIT HANDLERS ─────────────────────────────────────────────────────────

  handleSubmitSave() {
    if (this.phase !== 'play') return;
    this.endRound(this.toggleLeft === true && this.toggleRight === false);
  }

  handleSubmitX() {
    if (this.phase !== 'play') return;
    this.endRound(false);
  }

  // ─── ROUND END ───────────────────────────────────────────────────────────────

  endRound(success) {
    if (this.phase !== 'play') return;
    this.phase = 'ended_round';
    this.success = success;
    sessionLogger.logTutorialMiniGameEnd('privacy', this.success);
    this.cleanupPlayVisuals();
    this.showResultPhase();
  }

  cleanupPlayVisuals() {
    this.playObjects.forEach(obj => { if (obj && obj.active) obj.destroy(); });
    this.playObjects = [];
    this.toggleLeftGraphics  = null;
    this.toggleRightGraphics = null;
    this.saveBtn = null;
    this.xBtn    = null;
  }

  showResultPhase() {
    this.phase = 'result';
    this.currentIndex = 0;
    this.bg.setTexture(this.success ? 'doomgpt_training_bg' : 'doomgpt_training_bg_fail');
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
    this.bg.setTexture('doomgpt_training_bg');
    const step = this.reflectionSteps[0];
    this.speakerText.setText(step.speaker);
    this.bodyText.setText(step.text);
    this.hintText.setText('← Back   Continue →');
    this.startAutoAdvanceTimer();
  }

  // ─── UPDATE ──────────────────────────────────────────────────────────────────

  update() {
    if (this.phase !== 'play') {
      if (Phaser.Input.Keyboard.JustDown(this.rightKey)) this.handleAdvance();
      if (Phaser.Input.Keyboard.JustDown(this.leftKey))  this.handleBack();
    }
  }
}