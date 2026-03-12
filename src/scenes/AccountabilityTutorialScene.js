// src/scenes/AccountabilityTutorialScene.js
import sessionLogger from '../sessionLogger.js';
import gameState from '../gameState.js';

export default class AccountabilityTutorialScene extends Phaser.Scene {
  constructor() {
    super('AccountabilityTutorialScene');

    this.phase = 'intro'; // intro, instructions, play, result, reflection

    this.introSteps = [];
    this.resultStepsSuccess = [];
    this.resultStepsFail = [];
    this.reflectionSteps = [];

    this.currentIndex = 0;

    // Play phase
    this.barFillGraphics = null;
    this.overrideOval = null;
    this.spaceCount = 0;
    this.spacesRequired = 20;
    this.success = false;
    this.playObjects = [];
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

    // ----- BACKGROUND -----
    const bg = this.add.image(centerX, centerY, 'grades_training_bg').setOrigin(0.5);
    const scale = Math.min(width / bg.width, height / bg.height);
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
        text: `We've got a big problem, Developer${firstName ? ` ${firstName}` : ''}.`
      },
      {
        speaker: 'Dr. Bot',
        text: `Developer Doom built an AI grading system for ResponsibleCity Middle School.`
      },
      {
        speaker: 'Dr. Bot',
        text: `Then he walked away from it. No monitoring. No way to fix mistakes.`
      },
      {
        speaker: 'Dr. Bot',
        text: `Now the AI is failing students on assignments they got right — and report cards go out in seconds.`
      },
      {
        speaker: 'Dr. Bot',
        text: `When students complained, Doom said: "Don't blame me, the AI made that decision."`
      },
      {
        speaker: 'Dr. Bot',
        text: `That's not how responsible developers think. When your AI causes harm, that's on you.`
      },
      {
        speaker: 'Dr. Bot',
        text: `You're being called in to do what Doom refused to do — push a correction patch before it's too late.`
      }
    ];

    this.resultStepsSuccess = [
      {
        speaker: 'Dr. Bot',
        text: `You did it. The bad grades are overridden and the patch is live.`
      },
      {
        speaker: 'Dr. Bot',
        text: `That's what accountability looks like — staying responsible for your AI even after it launches.`
      },
      {
        speaker: 'Dr. Bot',
        text: `Doom built it and walked away. You stayed and fixed it. That's the difference.`
      }
    ];

    this.resultStepsFail = [
      {
        speaker: 'Dr. Bot',
        text: `The report cards went out. Students got grades they didn't deserve.`
      },
      {
        speaker: 'Dr. Bot',
        text: `This is exactly what happens when developers abandon their AI after deployment.`
      },
      {
        speaker: 'Dr. Bot',
        text: `Responsible developers build systems that can be corrected — and they stick around to correct them.`
      }
    ];

    this.reflectionSteps = [
      {
        speaker: 'Dr. Bot',
        text: `Accountability means your responsibility doesn't end when you hit deploy.`
      },
      {
        speaker: 'Dr. Bot',
        text: `Ask yourself: if my AI causes harm, can it be corrected? And am I willing to fix it?`
      },
      {
        speaker: 'Dr. Bot',
        text: `If the answer is no — that's a dumb way to AI.`
      }
    ];

    this.phase = 'intro';
    this.currentIndex = 0;

    // Space key handled in update()
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // Click only advances dialogue, not during play
    this.input.on('pointerdown', () => {
      if (this.phase !== 'play') this.handleAdvance();
    });

    sessionLogger.logTutorialMiniGameStart('accountability');
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
      'OVERRIDE THE MISTAKE!\n\n' +
      'Doom\'s AI gave a wrong grade. Mash SPACE as fast as you can\n' +
      'to fill the override bar all the way to the top.\n' +
      'Fill it completely to push the correction patch!'
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
        this.scene.start('PrivacyTutorialScene');
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
    this.spaceCount = 0;

    // Swap to game background
    this.bg.setTexture('grades_game_bg');

    // Hide dialogue UI
    this.speakerText.setVisible(false);
    this.bodyText.setVisible(false);
    this.hintText.setVisible(false);

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
        .setOrigin(0.5)
        .setDisplaySize(300, 450)
        .setAlpha(1)
        .setDepth(5);
    this.playObjects.push(barBg);

    this.barFillGraphics = this.add.graphics().setDepth(6);
    this.playObjects.push(this.barFillGraphics);

    const ovalX = barX;
    const ovalY = height * 0.34;
    const ovalW = width * 0.13;
    const ovalH = height * 0.15;

    this.overrideOval = this.add.image(ovalX, ovalY, 'override_fail')
      .setOrigin(0.5)
      .setDisplaySize(ovalW, ovalH)
      .setDepth(7);
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
        this.barX - this.barW / 2,
        this.barBottomY - fillH,
        this.barW,
        fillH
      );
    }
  }

  handleSpaceMash() {
    if (this.phase !== 'play') return;

    this.spaceCount++;
    this.drawBarFill();

    if (this.spaceCount >= this.spacesRequired) {
      if (this.overrideOval) this.overrideOval.setTexture('override_pass');

      this.time.delayedCall(600, () => {
        this.endRound(true);
      });
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
    this.playObjects.forEach(obj => {
      if (obj && obj.active) obj.destroy();
    });
    this.playObjects = [];
    if (this.barFillGraphics) {
      this.barFillGraphics.destroy();
      this.barFillGraphics = null;
    }
    this.overrideOval = null;
  }

  showResultPhase() {
    this.phase = 'result';
    this.currentIndex = 0;

    this.bg.setTexture(this.success ? 'grades_training_bg' : 'grades_training_bg_fail');

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

    this.bg.setTexture('grades_training_bg');

    const step = this.reflectionSteps[0];
    this.speakerText.setText(step.speaker);
    this.bodyText.setText(step.text);
    this.hintText.setText('Press SPACE or click to continue');
  }

  // ─── UPDATE LOOP ─────────────────────────────────────────────────────────────

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      if (this.phase === 'play') {
        this.handleSpaceMash();
      } else {
        this.handleAdvance();
      }
    }
  }
}