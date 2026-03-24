// src/scenes/TransparencyTutorialScene.js
import sessionLogger from '../sessionLogger.js';
import gameState from '../gameState.js';

export default class TransparencyTutorialScene extends Phaser.Scene {
  constructor() {
    super('TransparencyTutorialScene');

    this.phase = 'intro'; // intro, instructions, play, result, reflection

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
      fontSize: '26px',
      color: '#ffd166',
      fontFamily: 'Courier, monospace',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);

    this.bodyText = this.add.text(textLeftX, bodyY, '', {
      fontSize: '26px',
      color: '#ffffff',
      fontFamily: 'Courier, monospace',
      wordWrap: { width: width * 0.84 }
    }).setOrigin(0, 0);

    this.hintText = this.add.text(centerX, height - 55,
      'Press SPACE or click to continue', {
        fontSize: '20px',
        color: '#aaaaaa',
        fontFamily: 'Courier, monospace',
        align: 'center'
      }
    ).setOrigin(0.5);

    // ---------- DIALOGUE ----------

    const { firstName } = gameState.player;

    this.introSteps = [
      {
        speaker: 'Dr. Bot',
        text: `Doom built DevDoomTube — a platform where AI posts comments using real users' names, Developer${firstName ? ` ${firstName}` : ''}.`
      },
      {
        speaker: 'Dr. Bot',
        text: 'No labels. No warnings. Users have no idea AI is acting on their behalf.'
      },
      {
        speaker: 'Dr. Bot',
        text: 'Responsible developers always make it clear when AI is involved. Stamp the label before it slides past.'
      }
    ];

    this.resultStepsSuccess = [
      {
        speaker: 'Dr. Bot',
        text: '✓ CORRECT!',
        color: '#00ff88'
      },
      {
        speaker: 'Dr. Bot',
        text: 'The AI feature is clearly labeled now.'
      },
      {
        speaker: 'Dr. Bot',
        text: 'Users deserve to know when AI is involved — no exceptions.'
      }
    ];

    this.resultStepsFail = [
      {
        speaker: 'Dr. Bot',
        text: '✗ INCORRECT!',
        color: '#ff4444'
      },
      {
        speaker: 'Dr. Bot',
        text: 'The AI feature went unlabeled — just like Doom planned.'
      },
      {
        speaker: 'Dr. Bot',
        text: 'When AI isn\'t labeled, users lose the ability to make informed choices.'
      }
    ];

    this.reflectionSteps = [
      {
        speaker: 'Dr. Bot',
        text: 'Transparency means users should always know when AI is involved.'
      },
      {
        speaker: 'Dr. Bot',
        text: 'If users can\'t tell what\'s AI and what\'s real — that\'s a Dumb Way to AI.'
      }
    ];

    this.phase = 'intro';
    this.currentIndex = 0;

    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this.input.on('pointerdown', () => {
      if (this.phase !== 'play') this.handleAdvance();
    });

    sessionLogger.logTutorialMiniGameStart('transparency');
    this.showIntroStep();
  }

  // ─── INTRO & INSTRUCTIONS ────────────────────────────────────────────────────

  showIntroStep() {
    const step = this.introSteps[this.currentIndex];
    if (!step) { this.showInstructions(); return; }
    this.bodyText.setColor('#ffffff');
    this.speakerText.setText(step.speaker);
    this.bodyText.setText(step.text);
    this.hintText.setText('Press SPACE or click to continue');
  }

  showInstructions() {
    this.phase = 'instructions';
    this.bodyText.setColor('#ffffff');
    this.speakerText.setText('Dr. Bot');
    this.bodyText.setText(
      'LABEL THE AI FEATURE!\n\n' +
      'The "AI Feature" label will slide across the screen.\n' +
      'Press SPACE when it lines up with the target box.'
    );
    this.hintText.setText('Press SPACE or click to begin');
  }

  handleAdvance() {
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

    this.drawSidebarComments();

    const targetX = width * 0.815;
    const targetY = height * 0.78;

    this.targetBox = this.add.rectangle(targetX, targetY, 260, 100, 0xffffff, 0)
      .setStrokeStyle(4, 0xff00ff, 1)
      .setDepth(5);

    this.labelSprite = this.add.image(-140, targetY, 'ai_feature_label')
      .setOrigin(0.5)
      .setDisplaySize(200, 100)
      .setDepth(10);

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
        fontSize: '25px',
        color: '#000000',
        fontFamily: 'Courier, monospace',
        fontStyle: 'bold'
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
    if (this.targetBox)   { this.targetBox.destroy();   this.targetBox = null;   }
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
    this.hintText.setText('Press SPACE or click to continue');

    const steps = this.success ? this.resultStepsSuccess : this.resultStepsFail;
    this.speakerText.setText(steps[0].speaker);
    this.bodyText.setText(steps[0].text);
    this.bodyText.setColor(steps[0].color || '#ffffff');
  }

  startReflectionPhase() {
    this.phase = 'reflection';
    this.currentIndex = 0;
    this.bodyText.setColor('#ffffff');
    this.bg.setTexture('dt_training_bg');
    const step = this.reflectionSteps[0];
    this.speakerText.setText(step.speaker);
    this.bodyText.setText(step.text);
    this.hintText.setText('Press SPACE or click to continue');
  }

  // ─── UPDATE ──────────────────────────────────────────────────────────────────

  update(time, delta) {
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      if (this.phase === 'play') {
        this.attemptStamp();
      } else {
        this.handleAdvance();
      }
    }

    if (this.phase !== 'play' || !this.labelSprite) return;

    this.labelSprite.x += this.labelSpeed * (delta / 1000) * this.labelDirection;

    if (this.labelSprite.x > this.scale.width + 140) {
      this.labelSprite.x = -140;
    }
  }
}