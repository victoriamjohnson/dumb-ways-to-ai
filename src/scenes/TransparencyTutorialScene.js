// src/scenes/TransparencyTutorialScene.js
import sessionLogger from '../sessionLogger.js';
import gameState from '../gameState.js';

const AUTO_ADVANCE_MS = 8000;

export default class TransparencyTutorialScene extends Phaser.Scene {
  constructor() {
    super('TransparencyTutorialScene');

    this.phase = 'intro';
    this.introSteps = [];
    this.resultStepsSuccess = [];
    this.resultStepsFail = [];
    this.reflectionSteps = [];
    this.currentIndex = 0;
    this.labelSprite = null;
    this.targetBox = null;
    this.labelSpeed = 350;
    this.labelDirection = 1;
    this.success = false;
    this.commentObjects = [];
    this._autoTimer = null;
    this._countdownEvent = null;
    this._secondsLeft = 0;
  }

  preload() {
    this.load.image('dt_training_bg',      'assets/ui/DoomTube_Training_Screen.png');
    this.load.image('dt_training_bg_fail', 'assets/ui/DoomTube_Training_Screen_Fail.png');
    this.load.image('dt_game_bg',          'assets/ui/DoomTube_Game_Screen.png');
    this.load.image('ai_feature_label',    'assets/ui/AI_Feature_Label.png');
  }

  create() {
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;

    this.cameras.main.setBackgroundColor('#000814');

    const bg = this.add.image(centerX, centerY, 'dt_training_bg').setOrigin(0.5);
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
      { speaker: 'Dr. Bot', text: `${dev}, Doom built DevDoomTube, an AI that posts comments using real users' names.` },
      { speaker: 'Dr. Bot', text: `No labels. No warnings. Classic Dumb Ways to AI!` },
      { speaker: 'Dr. Bot', text: `Responsible developers always make it clear when AI is involved.\nStamp the label before it slides past!` }
    ];

    this.resultStepsSuccess = [
      { speaker: 'Dr. Bot', text: '✓ CORRECT!', color: '#00ff88' },
      { speaker: 'Dr. Bot', text: `${dev}, the AI feature is labeled and users are informed.\nThat is transparency in action!` }
    ];

    this.resultStepsFail = [
      { speaker: 'Dr. Bot', text: '✗ INCORRECT!', color: '#ff4444' },
      { speaker: 'Dr. Bot', text: `${dev}, the AI went unlabeled, just like Doom planned.\nWhen AI is hidden, users cannot make informed choices.` }
    ];

    this.reflectionSteps = [
      { speaker: 'Dr. Bot', text: `${dev}, if users cannot tell what is AI and what is real, that is a Dumb Way to AI.` },
      { speaker: 'Dr. Bot', text: `Always label it. No exceptions!` }
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

    sessionLogger.logTutorialMiniGameStart('transparency');
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
      'LABEL THE AI FEATURE!\n\n' +
      'The "AI Feature" label will slide across the screen.\n' +
      'Press SPACE when it lines up with the target box.'
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
        this.scene.start('AccountabilityTutorialScene');
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
    this.bg.setTexture('dt_game_bg');
    this.speakerText.setVisible(false);
    this.bodyText.setVisible(false);
    this.hintText.setVisible(false);
    this.countdownText.setText('');

    this.drawSidebarComments();

    const targetX = width * 0.815;
    const targetY = height * 0.78;

    this.targetBox = this.add.rectangle(targetX, targetY, 260, 100, 0xffffff, 0)
      .setStrokeStyle(4, 0xff00ff, 1).setDepth(5);

    this.labelSprite = this.add.image(-140, targetY, 'ai_feature_label')
      .setOrigin(0.5).setDisplaySize(200, 100).setDepth(10);

    this.labelDirection = 1;
  }

  drawSidebarComments() {
    const { width, height } = this.scale;
    this.commentObjects.forEach(obj => obj.destroy());
    this.commentObjects = [];

    const { firstName } = gameState.player;
    const name = firstName || 'Developer';

    const positions = [
      { x: width * 0.635, y: height * 0.375 },
      { x: width * 0.635, y: height * 0.54  },
      { x: width * 0.635, y: height * 0.7   },
    ];

    positions.forEach(pos => {
      const userText = this.add.text(pos.x, pos.y, `Dev ${name}`, {
        fontSize: '25px', color: '#000000',
        fontFamily: 'Courier, monospace', fontStyle: 'bold'
      }).setOrigin(0, 0).setDepth(10);

      const maxW = width * 0.18;
      while (userText.width > maxW && parseInt(userText.style.fontSize) > 10) {
        userText.setFontSize(parseInt(userText.style.fontSize) - 1);
      }

      this.commentObjects.push(userText);
    });
  }

  attemptStamp() {
    if (this.phase !== 'play') return;
    const overlapX = Math.abs(this.labelSprite.x - this.targetBox.x) < (125 + 130) * 0.55;
    const overlapY = Math.abs(this.labelSprite.y - this.targetBox.y) < (75  + 50 ) * 0.55;
    this.endRound(overlapX && overlapY);
  }

  endRound(success) {
    if (this.phase !== 'play') return;
    this.phase = 'ended_round';
    this.success = success;
    sessionLogger.logTutorialMiniGameEnd('transparency', this.success);
    this.cleanupPlayVisuals();
    this.showResultPhase();
  }

  cleanupPlayVisuals() {
    if (this.labelSprite) { this.labelSprite.destroy(); this.labelSprite = null; }
    if (this.targetBox)   { this.targetBox.destroy();   this.targetBox = null; }
    this.commentObjects.forEach(obj => obj.destroy());
    this.commentObjects = [];
  }

  showResultPhase() {
    this.phase = 'result';
    this.currentIndex = 0;
    this.bg.setTexture(this.success ? 'dt_training_bg' : 'dt_training_bg_fail');
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
    this.bg.setTexture('dt_training_bg');
    const step = this.reflectionSteps[0];
    this.speakerText.setText(step.speaker);
    this.bodyText.setText(step.text);
    this.hintText.setText('← Back   Continue →');
    this.startAutoAdvanceTimer();
  }

  // ─── UPDATE ──────────────────────────────────────────────────────────────────

  update(time, delta) {
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      if (this.phase === 'play') this.attemptStamp();
      else this.handleAdvance();
    }
    if (this.phase !== 'play') {
      if (Phaser.Input.Keyboard.JustDown(this.rightKey)) this.handleAdvance();
      if (Phaser.Input.Keyboard.JustDown(this.leftKey))  this.handleBack();
    }

    if (this.phase !== 'play' || !this.labelSprite) return;
    this.labelSprite.x += this.labelSpeed * (delta / 1000) * this.labelDirection;
    if (this.labelSprite.x > this.scale.width + 140) this.labelSprite.x = -140;
  }
}