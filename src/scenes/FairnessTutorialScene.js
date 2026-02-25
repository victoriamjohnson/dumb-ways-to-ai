// src/scenes/FairnessTutorialScene.js

import gameState from '../gameState.js';

export default class FairnessTutorialScene extends Phaser.Scene {
  constructor() {
    super('FairnessTutorialScene');

    this.phase = 'intro'; // intro, instructions, play, result, reflection

    this.introSteps = [];
    this.resultSteps = [];
    this.reflectionSteps = [];

    this.currentIndex = 0;

    this.players = [];       // { sprite, type: 'tall' | 'short', alive, row, col }
    this.cursorIndex = 0;
    this.tallCount = 0;
    this.shortCount = 0;

    this.cursorRect = null;
  }

  create() {
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    this.cameras.main.setBackgroundColor('#0b1f33');

    // 🔹 SINGLE centered title (make sure this is the ONLY place this text appears)
    this.titleText = this.add.text(
      centerX,
      60,
      'Fairness Training: Basketball Team AI',
      {
        fontSize: '28px',
        color: '#ffffff'
      }
    ).setOrigin(0.5);

    // Dialogue box centered in bottom half
    this.dialogueBox = this.add.rectangle(
      centerX,
      centerY + 150,
      900,
      230,
      0x000000,
      0.6
    ).setStrokeStyle(2, 0xffffff);

    this.speakerText = this.add.text(centerX - 420, centerY + 70, '', {
      fontSize: '20px',
      color: '#ffd166',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);

    this.bodyText = this.add.text(centerX - 420, centerY + 105, '', {
      fontSize: '22px',
      color: '#ffffff',
      wordWrap: { width: 840 }
    });

    // Grey hint line at very bottom, centered
    this.hintText = this.add.text(
      centerX,
      this.scale.height - 40,
      'Press SPACE or click to continue',
      {
        fontSize: '18px',
        color: '#aaaaaa',
        align: 'center'
      }
    ).setOrigin(0.5);

    const { firstName } = gameState.player;

    // Intro dialogue from Dr. Bot
    this.introSteps = [
      {
        speaker: 'Dr. Bot',
        text: `Welcome to AI Training Day, Developer${firstName ? ` ${firstName}` : ''}.`
      },
      {
        speaker: 'Dr. Bot',
        text: `Today, you're building a recruiting AI for the ResponsibleCity Youth Basketball League.`
      },
      {
        speaker: 'Dr. Bot',
        text: `This AI will choose which players make the team.`
      },
      {
        speaker: 'Dr. Bot',
        text: `But remember… AI learns from the data you give it.`
      },
      {
        speaker: 'Dr. Bot',
        text: `If your dataset is unbalanced… your team will be too.`
      },
      {
        speaker: 'Dr. Bot',
        text: `Let’s see how you handle this training data.`
      }
    ];

    // Result dialogue (chosen later based on success/fail)
    this.resultStepsSuccess = [
      {
        speaker: 'Dr. Byte',
        text: `Excellent work. Your AI learned from a balanced dataset.`
      },
      {
        speaker: 'Dr. Byte',
        text: `That means it evaluated players more fairly.`
      },
      {
        speaker: 'Dr. Byte',
        text: `AI systems reflect the patterns in their data. When developers design responsibly, more people get a fair chance.`
      }
    ];

    this.resultStepsFail = [
      {
        speaker: 'Dr. Byte',
        text: `Uh oh. Your dataset was unbalanced.`
      },
      {
        speaker: 'Dr. Byte',
        text: `The AI focused too heavily on one type of player.`
      },
      {
        speaker: 'Dr. Byte',
        text: `When training data lacks diversity, AI decisions can exclude others unfairly. Design choices affect who gets opportunities.`
      }
    ];

    this.reflectionSteps = [
      {
        speaker: 'Dr. Bot',
        text: `Responsible AI means thinking about who might be left out.`
      },
      {
        speaker: 'Dr. Bot',
        text: `Before launching any system, ask yourself: "Does this data represent everyone fairly?"`
      },
      {
        speaker: 'Dr. Bot',
        text: `Now you’re one step closer to becoming a Responsible Developer.`
      }
    ];

    this.phase = 'intro';
    this.currentIndex = 0;

    // Input for advancing dialogue / instructions / result / reflection
    this.input.keyboard.on('keyup-SPACE', () => this.handleAdvance());
    this.input.on('pointerdown', () => this.handleAdvance());

    // Keys for gameplay (used only in play phase)
    this.cursors = this.input.keyboard.createCursorKeys();
    this.deleteKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DELETE);
    this.backspaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.BACKSPACE);
    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);

    // 🔹 Dataset counts (centered above grid, hidden until play)
    this.countText = this.add.text(centerX, centerY, '', {
      fontSize: '20px',
      color: '#d1e8ff'
    }).setOrigin(0.5);
    this.countText.setVisible(false);

    // 🔹 Yellow status line (centered, above controls line)
    this.statusText = this.add.text(centerX, this.scale.height - 140, '', {
      fontSize: '18px',
      color: '#ffd166',
      align: 'center',
      wordWrap: { width: 1000 }
    }).setOrigin(0.5);
    this.statusText.setVisible(false);

    this.showIntroStep();
  }

  // ---------- INTRO & INSTRUCTIONS FLOW ----------

  showIntroStep() {
    const step = this.introSteps[this.currentIndex];
    if (!step) {
      // Done with intro → instructions screen
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
      'Now it’s your turn.\n\nBALANCE THE DATASET!\n\n' +
      'Use ← → ↑ ↓ to move.\n' +
      'Press DELETE to remove extra players.\n' +
      'When you think it’s fair, press ENTER to train the AI.'
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
      // Start the actual microgame
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
        this.scene.start('HomeScene');
      } else {
        const step = this.reflectionSteps[this.currentIndex];
        this.speakerText.setText(step.speaker);
        this.bodyText.setText(step.text);
      }
    }
  }

  // ---------- PLAY PHASE (MICROGAME) ----------

  startPlayPhase() {
    this.phase = 'play';

    // Hide dialogue UI during gameplay
    this.dialogueBox.setVisible(false);
    this.speakerText.setVisible(false);
    this.bodyText.setVisible(false);

    // Grey controls line centered at very bottom
    this.hintText.setText(
      'Use arrows to move, DELETE/BACKSPACE to remove. Press ENTER to train the AI.'
    );
    this.hintText.setVisible(true); // keep visible, it’s the controls line

    // Show counts + yellow tip
    this.countText.setVisible(true);
    this.statusText.setVisible(true);
    this.statusText.setText('Make sure your training data represents different types of players.');

    // Create players grid
    this.createDatasetGrid();
    this.updateCounts();
    this.createCursor();
  }

  createDatasetGrid() {
    // Clear old players
    this.players.forEach(p => p.sprite.destroy());
    this.players = [];

    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    const cols = 4;
    const rows = 3;
    const colSpacing = 140;
    const rowSpacing = 110;

    const gridWidth = (cols - 1) * colSpacing;
    const gridHeight = (rows - 1) * rowSpacing;

    const startX = centerX - gridWidth / 2;
    const startY = centerY - gridHeight / 2 + 10; // nudged the grid *down* a bit

    // 🔹 NEW: move the counts to sit just above the grid
    if (this.countText) {
        this.countText.setY(startY - 100);  // 100px above the top row of rectangles
    }

    const types = [
        'tall', 'tall', 'tall', 'short',
        'tall', 'tall', 'short', 'tall',
        'tall', 'short', 'tall', 'tall'
    ];

    for (let i = 0; i < types.length; i++) {
        const row = Math.floor(i / cols);
        const col = i % cols;
        const x = startX + col * colSpacing;
        const y = startY + row * rowSpacing;

        const type = types[i];
        const color = type === 'tall' ? 0xffc857 : 0x6fffe9;

        const rect = this.add.rectangle(x, y, 80, 80, color, 1)
        .setStrokeStyle(2, 0x000000);

        const label = this.add.text(x, y, type === 'tall' ? 'Tall' : 'Short', {
        fontSize: '16px',
        color: '#000000'
        }).setOrigin(0.5);

        const sprite = this.add.container(0, 0, [rect, label]);
        sprite.x = 0;
        sprite.y = 0;
        sprite.setData('x', x);
        sprite.setData('y', y);

        this.players.push({
        sprite,
        rect,
        label,
        type,
        alive: true,
        row,
        col
        });
    }

    this.cursorIndex = 0;
  }

  createCursor() {
    // Visually highlight the selected player
    if (this.cursorRect) {
      this.cursorRect.destroy();
    }

    const current = this.players[this.cursorIndex];
    const x = current.sprite.getData('x');
    const y = current.sprite.getData('y');

    this.cursorRect = this.add.rectangle(x, y, 92, 92)
      .setStrokeStyle(3, 0xffffff)
      .setFillStyle(0xffffff, 0); // outline only
  }

  moveCursor(dx, dy) {
    if (this.phase !== 'play') return;

    const current = this.players[this.cursorIndex];
    let row = current.row;
    let col = current.col;

    row += dy;
    col += dx;

    if (row < 0) row = 0;
    if (row > 2) row = 2;
    if (col < 0) col = 0;
    if (col > 3) col = 3;

    // Find player at new row/col
    const newIndex = this.players.findIndex(p => p.row === row && p.col === col);
    if (newIndex !== -1) {
      this.cursorIndex = newIndex;
      const p = this.players[this.cursorIndex];
      const x = p.sprite.getData('x');
      const y = p.sprite.getData('y');
      this.cursorRect.setPosition(x, y);
    }
  }

  updateCounts() {
    this.tallCount = this.players.filter(p => p.alive && p.type === 'tall').length;
    this.shortCount = this.players.filter(p => p.alive && p.type === 'short').length;

    this.countText.setText(`Tall players: ${this.tallCount}    Short players: ${this.shortCount}`);
  }

  removeCurrentPlayer() {
    if (this.phase !== 'play') return;

    const p = this.players[this.cursorIndex];
    if (!p.alive) {
      this.statusText.setText('That spot is already removed.');
      return;
    }

    p.alive = false;
    p.rect.setAlpha(0.2);
    p.label.setAlpha(0.2);

    this.updateCounts();

    this.statusText.setText('Good developers check if their data is overrepresenting one group.');
  }

  trainAI() {
    if (this.phase !== 'play') return;

    // Simple fairness check: dataset roughly balanced & not empty
    const nonEmpty = this.tallCount + this.shortCount > 0;
    const fairlyBalanced =
      Math.abs(this.tallCount - this.shortCount) <= 1 &&
      this.tallCount > 0 &&
      this.shortCount > 0;

    this.success = nonEmpty && fairlyBalanced;

    // Log for future research if you want
    gameState.failures.push({
      microgame: 'fairness_tutorial',
      success: this.success,
      tallRemaining: this.tallCount,
      shortRemaining: this.shortCount,
      timestamp: Date.now()
    });

    // Clean up play UI
    this.players.forEach(p => p.sprite.destroy());
    this.players = [];
    if (this.cursorRect) {
      this.cursorRect.destroy();
      this.cursorRect = null;
    }
    this.countText.setVisible(false);
    this.statusText.setVisible(false);

    // Show dialogue UI again for results
    this.dialogueBox.setVisible(true);
    this.speakerText.setVisible(true);
    this.bodyText.setVisible(true);
    this.hintText.setVisible(true);

    // Show result dialogue
    this.phase = 'result';
    this.currentIndex = 0;

    const firstStep = this.success ? this.resultStepsSuccess[0] : this.resultStepsFail[0];
    this.speakerText.setText(firstStep.speaker);
    this.bodyText.setText(firstStep.text);
    this.hintText.setText('Press SPACE or click to continue');
  }

  startReflectionPhase() {
    this.phase = 'reflection';
    this.currentIndex = 0;

    const firstStep = this.reflectionSteps[0];
    this.speakerText.setText(firstStep.speaker);
    this.bodyText.setText(firstStep.text);
    this.hintText.setText('Press SPACE or click to continue');
  }

  // ---------- UPDATE LOOP ----------

  update() {
    if (this.phase !== 'play') return;

    // Movement
    if (Phaser.Input.Keyboard.JustDown(this.cursors.left)) {
      this.moveCursor(-1, 0);
    } else if (Phaser.Input.Keyboard.JustDown(this.cursors.right)) {
      this.moveCursor(1, 0);
    } else if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
      this.moveCursor(0, -1);
    } else if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
      this.moveCursor(0, 1);
    }

    // Remove current player (DELETE or BACKSPACE)
    if (
      Phaser.Input.Keyboard.JustDown(this.deleteKey) ||
      Phaser.Input.Keyboard.JustDown(this.backspaceKey)
    ) {
      this.removeCurrentPlayer();
    }

    // Train AI (ENTER)
    if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
      this.trainAI();
    }
  }
}