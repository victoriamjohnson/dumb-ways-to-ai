// src/scenes/TutorialStoryScene.js

import sessionLogger from '../sessionLogger.js';
import gameState from '../gameState.js';

const AUTO_ADVANCE_MS = 8000;

export default class TutorialStoryScene extends Phaser.Scene {
  constructor() {
    super('TutorialStoryScene');
  }

  preload() {
    this.load.image('tutorial_bg', 'assets/ui/Tutorial_Screen.png');
  }

  init(data) {
    this.outroMode = data === true || (data && data.outroMode === true);
  }

  create() {
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;

    this.cameras.main.setBackgroundColor('#000814');

    const bg = this.add.image(centerX, centerY, 'tutorial_bg').setOrigin(0.5);
    bg.setScale(Math.min(width / bg.width, height / bg.height));

    const { firstName } = gameState.player;
    const dev = firstName ? `Developer ${firstName}` : 'Developer';

    const textLeftX = width * 0.12;
    const speakerY  = height * 0.65;
    const bodyY     = height * 0.70;

    this.dialogueBox = bg;

    this.speakerText = this.add.text(textLeftX, speakerY, '', {
      fontSize: '26px', color: '#ffd166',
      fontFamily: 'Courier, monospace', fontStyle: 'bold'
    }).setOrigin(0, 0.5);

    this.bodyText = this.add.text(textLeftX, bodyY, '', {
      fontSize: '26px', color: '#ffffff',
      fontFamily: 'Courier, monospace', wordWrap: { width: width * 0.76 }
    }).setOrigin(0, 0);

    this.hintText = this.add.text(centerX, height - 55,
      '← Back   Continue →', {
        fontSize: '20px', color: '#aaaaaa', fontFamily: 'Courier, monospace'
      }
    ).setOrigin(0.5);

    // ── Countdown text (bottom-right) ──
    this.countdownText = this.add.text(width - 115, height - 55, '', {
      fontSize: '30px', color: '#ffd166', fontFamily: 'Courier, monospace'
    }).setOrigin(1, 0.5);

    this.mode = 'dialogue';
    this._autoTimer = null;
    this._countdownEvent = null;
    this._secondsLeft = 0;

    if (this.outroMode) {
      this.dialogue = [
        { speaker: 'Dr. Bot', text: `${dev}, tutorial complete!\nNow let's see how you do under pressure.` },
        { speaker: 'Dr. Bot', text: `The city's AI systems go live in 2 minutes.\nNo explanations. Just you and the clock.` },
        { speaker: 'Dr. Bot', text: `Head to Challenge Mode when you are ready.\nGood luck!` }
      ];
    } else {
      this.dialogue = [
        { speaker: 'Dr. Bot', text: `${dev}, welcome to ResponsibleCity AI Labs!` },
        { speaker: 'Dr. Bot', text: `Developer Doom keeps shipping reckless AI, and the city is paying for it.` },
        { speaker: 'Dr. Bot', text: `Your job: Counter Doom's bad designs and earn the title Certified Responsible Developer.` },
        { type: 'principles' },
        { speaker: 'Dr. Bot', text: `${dev}, use these well.\nThe city thrives when you do. Let's begin!` }
      ];
    }

    this.currentIndex = 0;

    this.leftKey  = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    this.rightKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    this.input.on('pointerdown', (pointer, targets) => {
      if (targets.length > 0) return; // ignore clicks on interactive objects (back button)
      if (this.phase !== 'play') this.handleAdvance();
    });

    sessionLogger.logTutorialStart();
    this.showCurrentStep();

  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.rightKey)) this.advanceDialogue();
    if (Phaser.Input.Keyboard.JustDown(this.leftKey))  this.handleBack();
  }

  // ─── AUTO-ADVANCE TIMER ───────────────────────────────────────────────────────

  startAutoAdvanceTimer() {
    this.clearAutoAdvanceTimer();
    this._secondsLeft = Math.ceil(AUTO_ADVANCE_MS / 1000);
    this.updateCountdown();

    this._countdownEvent = this.time.addEvent({
      delay: 1000, loop: true,
      callback: () => {
        this._secondsLeft--;
        this.updateCountdown();
      }
    });

    this._autoTimer = this.time.delayedCall(AUTO_ADVANCE_MS, () => {
      this.advanceDialogue();
    });
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
    this.showCurrentStep();
  }

  // ─── DIALOGUE ─────────────────────────────────────────────────────────────────

  showCurrentStep() {
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;

    if (this.currentIndex >= this.dialogue.length) {
      this.clearAutoAdvanceTimer();
      this.endDialogue();
      return;
    }

    const step = this.dialogue[this.currentIndex];

    if (step.type === 'principles') {
      this.mode = 'principles';
      this.speakerText.setVisible(false);
      this.bodyText.setVisible(false);

      if (this.principlesTitle) this.principlesTitle.destroy();
      if (this.principlesList)  this.principlesList.destroy();

      this.principlesTitle = this.add.text(centerX, centerY + 120,
        'The 4 Responsible AI Principles', {
          fontSize: '32px', color: '#ffffff',
          fontFamily: 'Courier, monospace', fontStyle: 'bold', align: 'center'
        }
      ).setOrigin(0.5);

      this.principlesList = this.add.text(centerX, centerY + 210,
        '• Be Fair\n• Be Transparent\n• Protect Privacy\n• Take Accountability', {
          fontSize: '26px', color: '#ffd166',
          fontFamily: 'Courier, monospace', align: 'center'
        }
      ).setOrigin(0.5);

      this.hintText.setText('← Back   Continue →');
      this.startAutoAdvanceTimer();
      return;
    }

    this.mode = 'dialogue';
    if (this.principlesTitle) { this.principlesTitle.destroy(); this.principlesTitle = null; }
    if (this.principlesList)  { this.principlesList.destroy();  this.principlesList  = null; }

    this.speakerText.setVisible(true).setText(step.speaker || '');
    this.bodyText.setVisible(true).setText(step.text || '');
    this.startAutoAdvanceTimer();
  }

  advanceDialogue() {
    this.clearAutoAdvanceTimer();
    this.currentIndex += 1;
    this.showCurrentStep();
  }

  endDialogue() {
    if (this.outroMode) {
      this.scene.start('HomeScene');
    } else {
      this.scene.start('FairnessTutorialScene');
    }
  }
}