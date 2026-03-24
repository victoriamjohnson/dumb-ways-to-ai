// src/scenes/FairnessTutorialScene.js

import sessionLogger from '../sessionLogger.js';
import gameState from '../gameState.js';

export default class FairnessTutorialScene extends Phaser.Scene {
  constructor() {
    super('FairnessTutorialScene');

    this.phase = 'intro'; // intro, instructions, play, result, reflection

    this.introSteps = [];
    this.resultStepsSuccess = [];
    this.resultStepsFail = [];
    this.reflectionSteps = [];

    this.currentIndex = 0;

    // { sprite, type: 'boy' | 'girl', alive, row, col, textureKey, deletedTextureKey }
    this.players = [];
    this.boyCount = 0;
    this.girlCount = 0;
  }

  preload() {
    this.load.image('fairness_intro_bg',       'assets/ui/Basketball_Training_Screen.png');
    this.load.image('fairness_intro_bg_fail',  'assets/ui/Basketball_Training_Screen_Fail.png');
    this.load.image('fairness_play_bg',        'assets/ui/Basketball_Game_Screen.png');
    this.load.image('player_boy',              'assets/ui/Boy_Player.png');
    this.load.image('player_girl',             'assets/ui/Girl_Player.png');
    this.load.image('player_boy_deleted',      'assets/ui/Boy_Player_Deleted.png');
    this.load.image('player_girl_deleted',     'assets/ui/Girl_Player_Deleted.png');
  }

  create() {
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;

    this.cameras.main.setBackgroundColor('#000814');

    const bg = this.add.image(centerX, centerY, 'fairness_intro_bg').setOrigin(0.5);
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

    const { firstName } = gameState.player;

    // ---------- DIALOGUE ----------

    this.introSteps = [
      {
        speaker: 'Dr. Bot',
        text: `Time to fix one of Doom's dumbest moves, Developer${firstName ? ` ${firstName}` : ''}.`
      },
      {
        speaker: 'Dr. Bot',
        text: 'He trained a co-ed recruiting AI using mostly boy players. Now it thinks boys deserve more spots on the team.'
      },
      {
        speaker: 'Dr. Bot',
        text: 'AI learns from data — not from what\'s fair. Unbalanced data means unfair decisions.'
      },
      {
        speaker: 'Dr. Bot',
        text: 'Balance the dataset so everyone gets a fair shot.'
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
        text: 'Your AI learned from a balanced set of boys and girls.'
      },
      {
        speaker: 'Dr. Bot',
        text: 'When the data is fair, the decisions can be fair too.'
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
        text: 'The AI is still seeing one group more than the other.'
      },
      {
        speaker: 'Dr. Bot',
        text: 'When one group shows up more in the data, they get picked more too — and that\'s not fair.'
      }
    ];

    this.reflectionSteps = [
      {
        speaker: 'Dr. Bot',
        text: 'Responsible AI means asking: who might be getting less of a chance?'
      },
      {
        speaker: 'Dr. Bot',
        text: 'Before launching any system, check if your data represents everyone fairly.'
      }
    ];

    this.phase = 'intro';
    this.currentIndex = 0;

    this.input.keyboard.on('keyup-SPACE', () => this.handleAdvance());
    this.input.on('pointerdown', () => this.handleAdvance());

    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);

    this.countText = this.add.text(centerX, centerY, '', {
      fontSize: '22px',
      color: '#ffffff',
      fontFamily: 'Courier, monospace'
    }).setOrigin(0.5);
    this.countText.setVisible(false);

    this.statusText = this.add.text(centerX, height - 120, '', {
      fontSize: '20px',
      color: '#ffd166',
      fontFamily: 'Courier, monospace',
      align: 'center',
      wordWrap: { width: width * 0.9 }
    }).setOrigin(0.5);
    this.statusText.setVisible(false);

    sessionLogger.logTutorialMiniGameStart('fairness');
    this.showIntroStep();
  }

  // ---------- INTRO & INSTRUCTIONS ----------

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
      'BALANCE THE DATASET!\n\n' +
      'Click players to remove them from the data.\n' +
      'Click again to put them back.\n' +
      'When you think it\'s fair, press ENTER to train the AI.'
    );
    this.hintText.setText('Press SPACE or click to begin the microgame');
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
        this.scene.start('TransparencyTutorialScene');
      } else {
        const step = this.reflectionSteps[this.currentIndex];
        this.speakerText.setText(step.speaker);
        this.bodyText.setText(step.text);
        this.bodyText.setColor('#ffffff');
      }
    }
  }

  // ---------- PLAY PHASE ----------

  startPlayPhase() {
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;

    this.phase = 'play';

    this.bg.setTexture('fairness_play_bg');

    this.speakerText.setVisible(false);
    this.bodyText.setVisible(false);
    this.hintText.setText('');

    this.countText.setVisible(true);
    this.statusText.setVisible(true);

    this.createDatasetGrid();
    this.updateCounts();

    const cols = 4;
    const rows = 3;
    const colSpacing = 180;
    const rowSpacing = 140;
    const gridHeight = (rows - 1) * rowSpacing;
    const startY = centerY - gridHeight / 2 + 10;
    this.countText.setY(startY - 100);
  }

  createDatasetGrid() {
    this.players.forEach(p => p.sprite.destroy());
    this.players = [];

    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;

    const cols = 4;
    const rows = 3;
    const colSpacing = 180;
    const rowSpacing = 140;
    const startX = centerX - ((cols - 1) * colSpacing) / 2;
    const startY = centerY - ((rows - 1) * rowSpacing) / 2 + 10;

    const types = [
      'boy', 'boy', 'boy', 'girl',
      'boy', 'boy', 'girl', 'boy',
      'boy', 'girl', 'boy', 'boy'
    ];

    for (let i = 0; i < types.length; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const x = startX + col * colSpacing;
      const y = startY + row * rowSpacing;
      const type = types[i];
      const textureKey        = type === 'boy' ? 'player_boy'         : 'player_girl';
      const deletedTextureKey = type === 'boy' ? 'player_boy_deleted' : 'player_girl_deleted';

      const sprite = this.add.image(x, y, textureKey)
        .setOrigin(0.5)
        .setScale(0.5)
        .setInteractive({ useHandCursor: true });

      const player = { sprite, type, alive: true, row, col, textureKey, deletedTextureKey };
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
    this.boyCount  = this.players.filter(p => p.alive && p.type === 'boy').length;
    this.girlCount = this.players.filter(p => p.alive && p.type === 'girl').length;
    this.countText.setText(`Boys: ${this.boyCount}    Girls: ${this.girlCount}`);
  }

  trainAI() {
    if (this.phase !== 'play') return;

    const fairlyBalanced =
      this.boyCount === this.girlCount &&
      this.boyCount > 0;

    this.success = fairlyBalanced;

    if (!gameState.failures) gameState.failures = [];
    sessionLogger.logTutorialMiniGameEnd('fairness', this.success);
    gameState.failures.push({
      microgame: 'fairness_tutorial_coed',
      success: this.success,
      boysRemaining: this.boyCount,
      girlsRemaining: this.girlCount,
      timestamp: Date.now()
    });

    this.players.forEach(p => p.sprite.destroy());
    this.players = [];
    this.countText.setVisible(false);
    this.statusText.setVisible(false);

    this.bg.setTexture(this.success ? 'fairness_intro_bg' : 'fairness_intro_bg_fail');

    this.speakerText.setVisible(true);
    this.bodyText.setVisible(true);
    this.hintText.setVisible(true);

    this.phase = 'result';
    this.currentIndex = 0;

    const firstStep = this.success ? this.resultStepsSuccess[0] : this.resultStepsFail[0];
    this.speakerText.setText(firstStep.speaker);
    this.bodyText.setText(firstStep.text);
    this.bodyText.setColor(firstStep.color || '#ffffff');
    this.hintText.setText('Press SPACE or click to continue');
  }

  startReflectionPhase() {
    this.phase = 'reflection';
    this.currentIndex = 0;
    this.bodyText.setColor('#ffffff');
    const firstStep = this.reflectionSteps[0];
    this.speakerText.setText(firstStep.speaker);
    this.bodyText.setText(firstStep.text);
    this.hintText.setText('Press SPACE or click to continue');
  }

  // ---------- UPDATE ----------

  update() {
    if (this.phase !== 'play') return;
    if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
      this.trainAI();
    }
  }
}