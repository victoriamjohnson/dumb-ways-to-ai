// src/scenes/TransparencyTutorialScene.js

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

    // Play phase objects
    this.labelSprite = null;
    this.targetBox = null;
    this.labelSpeed = 350; // px per second
    this.labelDirection = 1; // 1 = right, -1 = left
    this.success = false;

    // Comment text objects to clean up
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

    // ----- BACKGROUND -----
    const bg = this.add.image(centerX, centerY, 'dt_training_bg').setOrigin(0.5);
    const scaleX = width / bg.width;
    const scaleY = height / bg.height;
    const scale = Math.min(scaleX, scaleY);
    bg.setScale(scale);
    this.bg = bg;

    // ----- DIALOGUE TEXT -----
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

    // ----- DIALOGUE CONTENT -----
    const { firstName } = gameState.player;

    this.introSteps = [
      {
        speaker: 'Dr. Bot',
        text: `Developer Doom is at it again, Developer${firstName ? ` ${firstName}` : ''}.`
      },
      {
        speaker: 'Dr. Bot',
        text: `He built DevDoomTube — a video platform with AI features that post using real users' names.`
      },
      {
        speaker: 'Dr. Bot',
        text: `No warnings. No labels. Users have no idea AI is even involved.`
      },
      {
        speaker: 'Dr. Bot',
        text: `Responsible developers label AI features so users always know what's AI and what's not.`
      },
      {
        speaker: 'Dr. Bot',
        text: `Your job: stamp the "AI Feature" label onto the target box before it slides past!`
      }
    ];

    this.resultStepsSuccess = [
      {
        speaker: 'Dr. Bot',
        text: `That's how it's done. The AI feature is clearly labeled now.`
      },
      {
        speaker: 'Dr. Bot',
        text: `Users deserve to know when AI is involved — no exceptions.`
      }
    ];

    this.resultStepsFail = [
      {
        speaker: 'Dr. Bot',
        text: `Missed it. The AI feature went unlabeled — just like Doom planned.`
      },
      {
        speaker: 'Dr. Bot',
        text: `When AI isn't labeled, users lose the ability to make informed choices.`
      }
    ];

    this.reflectionSteps = [
      {
        speaker: 'Dr. Bot',
        text: `Transparency means users should always know when AI is involved.`
      },
      {
        speaker: 'Dr. Bot',
        text: `If users can't tell what's AI and what's real — that's a dumb way to AI.`
      }
    ];

    this.phase = 'intro';
    this.currentIndex = 0;

    // Space key handled in update() so it works during play phase too
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // Click advances dialogue (but not during play — clicking during play does nothing)
    this.input.on('pointerdown', () => {
      if (this.phase !== 'play') this.handleAdvance();
    });

    this.showIntroStep();
  }

  // ─── INTRO & INSTRUCTIONS ────────────────────────────────────────────────────

  showIntroStep() {
    const step = this.introSteps[this.currentIndex];
    if (!step) {
      this.showInstructions();
      return;
    }
    this.speakerText.setText(step.speaker);
    this.bodyText.setText(step.text);
    this.hintText.setText('Press SPACE or click to continue');
  }

  showInstructions() {
    this.phase = 'instructions';
    this.speakerText.setText('Dr. Bot');
    this.bodyText.setText(
      'LABEL THE AI FEATURE!\n\n' +
      'The "AI Feature" label will slide across the screen.\n' +
      'Press SPACE when it lines up with the target box.\n' +
      'Take your shot when it lines up!'
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
      }

    } else if (this.phase === 'reflection') {
      this.currentIndex++;
      if (this.currentIndex >= this.reflectionSteps.length) {
        // Tutorial complete — move to next tutorial
        // Change this to 'AccountabilityTutorialScene' once it's built
        this.scene.start('AccountabilityTutorialScene');
      } else {
        const step = this.reflectionSteps[this.currentIndex];
        this.speakerText.setText(step.speaker);
        this.bodyText.setText(step.text);
      }
    }
  }

  // ─── PLAY PHASE ──────────────────────────────────────────────────────────────

  startPlayPhase() {
    const { width, height } = this.scale;

    this.phase = 'play';

    // Swap to game background
    this.bg.setTexture('dt_game_bg');

    // Hide dialogue UI during gameplay
    this.speakerText.setVisible(false);
    this.bodyText.setVisible(false);
    this.hintText.setVisible(false);

    // Draw comments in the grey sidebar
    this.drawSidebarComments();

    // ── Target box ──
    // Fixed position: below the sidebar comment area
    const targetX = width * 0.815;
    const targetY = height * 0.78;
    const targetW = 260;
    const targetH = 100;

    this.targetBox = this.add.rectangle(targetX, targetY, targetW, targetH, 0xffffff, 0)
      .setStrokeStyle(4, 0xff00ff, 1)
      .setDepth(5);

    // ── AI Feature Label ──
    // Starts off the left edge, moves right at same Y as target box
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
    const name = firstName ? firstName : 'Developer';

    // Y positions for each username — adjust these to line up with your comment boxes
    const usernamePositions = [
      { x: width * 0.635, y: height * 0.375 },
      { x: width * 0.635, y: height * 0.54 },
      { x: width * 0.635, y: height * 0.7 },
    ];

    usernamePositions.forEach((pos) => {
      const userText = this.add.text(pos.x, pos.y, `Dev ${name}`, {
        fontSize: '25px',
        color: '#000000',
        fontFamily: 'Courier, monospace',
        fontStyle: 'bold'
      }).setOrigin(0, 0).setDepth(10);

      this.commentObjects.push(userText);
    });
  }

  attemptStamp() {
    if (this.phase !== 'play') return;

    const lx = this.labelSprite.x;
    const ly = this.labelSprite.y;
    const lw = 250 / 2;
    const lh = 150 / 2;

    const tx = this.targetBox.x;
    const ty = this.targetBox.y;
    const tw = this.targetBox.width / 2;
    const th = this.targetBox.height / 2;

    const overlapX = Math.abs(lx - tx) < (lw + tw) * 0.55;
    const overlapY = Math.abs(ly - ty) < (lh + th) * 0.55;

    this.endRound(overlapX && overlapY);
  }

  endRound(success) {
    if (this.phase !== 'play') return;
    this.phase = 'ended_round';

    this.success = success;

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
    this.hintText.setText('Press SPACE or click to continue');

    const steps = this.success ? this.resultStepsSuccess : this.resultStepsFail;
    this.speakerText.setText(steps[0].speaker);
    this.bodyText.setText(steps[0].text);
  }

  startReflectionPhase() {
    this.phase = 'reflection';
    this.currentIndex = 0;

    this.bg.setTexture('dt_training_bg');

    const step = this.reflectionSteps[0];
    this.speakerText.setText(step.speaker);
    this.bodyText.setText(step.text);
    this.hintText.setText('Press SPACE or click to continue');
  }

  // ─── UPDATE LOOP ─────────────────────────────────────────────────────────────

  update(time, delta) {
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      if (this.phase === 'play') {
        this.attemptStamp();
      } else {
        this.handleAdvance();
      }
    }

    // Move label only during play phase
    if (this.phase !== 'play' || !this.labelSprite) return;

    const { width } = this.scale;
    const speed = this.labelSpeed * (delta / 1000);

    this.labelSprite.x += speed * this.labelDirection;

    // Wrap back to left when it exits the right edge
    if (this.labelSprite.x > width + 140) {
      this.labelSprite.x = -140;
    }
  }
}