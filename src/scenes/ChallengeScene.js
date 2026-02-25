// src/scenes/ChallengeScene.js

import gameState from '../gameState.js';

export default class ChallengeScene extends Phaser.Scene {
  constructor() {
    super('ChallengeScene');
  }

  create() {
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    // 🔁 Reset all state every time we enter ChallengeScene
    this.phase = 'intro';              // 'intro', 'play', 'result_win', 'result_fail', 'ended'

    this.players = [];
    this.cursorIndex = 0;
    this.tallCount = 0;
    this.shortCount = 0;

    this.timeRemaining = 120;          // 2 minutes total
    this.globalTimerEvent = null;
    this.roundTimerEvent = null;
    this.roundTimeLimit = 8000;        // 8 seconds per microgame

    this.cameras.main.setBackgroundColor('#182c47');

    // reset HUD
    gameState.score = 0;
    gameState.badges = 3;
    gameState.bonusUsed = 0;

    const { firstName } = gameState.player;

    // Header
    this.add.text(centerX, 60, 'Challenge Mode', {
        fontSize: '32px',
        color: '#ffffff'
    }).setOrigin(0.5);

    this.add.text(centerX, 105, `Developer${firstName ? `: ${firstName}` : ''}`, {
        fontSize: '20px',
        color: '#d1e8ff'
    }).setOrigin(0.5);

    // Timer / score / badges anchored near top, spread out
    this.timerText = this.add.text(this.scale.width * 0.15, 150, 'Time: 2:00', {
        fontSize: '22px',
        color: '#ffe066'
    }).setOrigin(0.5);

    this.scoreText = this.add.text(centerX, 150, 'Score: 0', {
        fontSize: '22px',
        color: '#ffffff'
    }).setOrigin(0.5);

    this.badgesText = this.add.text(this.scale.width * 0.85, 150, 'Badges: 3', {
        fontSize: '22px',
        color: '#7bed9f'
    }).setOrigin(0.5);

    // Center instructions / prompts
    this.promptText = this.add.text(centerX, centerY - 120,
        'Balance the dataset as fast as you can!\n' +
        'Use ← → ↑ ↓ to move.\n' +
        'Use DELETE/BACKSPACE to remove players.\n' +
        'Press ENTER when you are ready.\n\n' +
        'Press SPACE to start.',
        {
        fontSize: '20px',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: 700 }
        }
    ).setOrigin(0.5);

    // Microgame counts just above grid
    this.countText = this.add.text(centerX, centerY - 40, '', {
        fontSize: '20px',
        color: '#d1e8ff'
    }).setOrigin(0.5);
    this.countText.setVisible(false);

    // Bottom status
    this.statusText = this.add.text(centerX, this.scale.height - 40, '', {
        fontSize: '18px',
        color: '#ffe066'
    }).setOrigin(0.5);

    // Cursor highlight for grid
    this.cursorRect = null;

    // Input setup
    // Input setup
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.cursors = this.input.keyboard.createCursorKeys();
    this.deleteKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DELETE);
    this.backspaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.BACKSPACE);
    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);

    this.cursorRect = null;

    // SPACE now only does 2 things:
    //  - from intro -> start first round
    //  - (we'll auto-advance between rounds, so no SPACE there)
    this.spaceKey.on('up', () => {
        if (this.phase === 'intro') {
        this.startChallenge();
        }
    });
  }

  // ---------- CHALLENGE FLOW ----------

  // Start global timer and immediately begin the first playable round
  startChallenge() {
    if (this.phase !== 'intro') return;

    this.phase = 'play';
    this.statusText.setText('');
    this.promptText.setText('');  // hide big instructions once play starts

    // Start global 2-minute timer
    this.timeRemaining = 120;
    this.updateTimerText();

    this.globalTimerEvent = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        this.timeRemaining--;
        this.updateTimerText();
        if (this.timeRemaining <= 0) {
          this.timeRemaining = 0;
          this.updateTimerText();
          this.endChallenge();
        }
      }
    });

    // Start first microgame round immediately
    this.startRound();
  }

  updateTimerText() {
    const minutes = Math.floor(this.timeRemaining / 60);
    const seconds = this.timeRemaining % 60;
    const padded = seconds.toString().padStart(2, '0');
    this.timerText.setText(`Time: ${minutes}:${padded}`);
  }

  endChallenge() {
    if (this.phase === 'ended') return; // guard

    this.phase = 'ended';

    if (this.globalTimerEvent) {
      this.globalTimerEvent.remove(false);
      this.globalTimerEvent = null;
    }
    if (this.roundTimerEvent) {
      this.roundTimerEvent.remove(false);
      this.roundTimerEvent = null;
    }

    this.clearRoundVisuals();

    this.promptText.setText('Challenge complete!');
    this.statusText.setText('');

    this.time.delayedCall(800, () => {
      this.scene.start('EndPledgeScene');
    });
  }

  loseBadge() {
    gameState.badges--;
    if (gameState.badges < 0) gameState.badges = 0;
    this.badgesText.setText(`Badges: ${gameState.badges}`);

    if (gameState.badges === 0) {
      this.statusText.setText('You ran out of badges!');

      // Stop timers & end the active round
      if (this.globalTimerEvent) {
        this.globalTimerEvent.remove(false);
        this.globalTimerEvent = null;
      }
      if (this.roundTimerEvent) {
        this.roundTimerEvent.remove(false);
        this.roundTimerEvent = null;
      }

      this.clearRoundVisuals();
      this.phase = 'ended';

      this.time.delayedCall(500, () => {
        this.scene.start('BonusPromptScene');
      });
    }
  }

  addScore(points) {
    gameState.score += points;
    this.scoreText.setText(`Score: ${gameState.score}`);
  }

  // ---------- ROUND FLOW (DWTD-style) ----------

  startRound() {
    if (this.phase !== 'play') return;
    if (this.timeRemaining <= 0 || gameState.badges <= 0) return;

    // Clean up any leftover visuals
    this.clearRoundVisuals();

    this.countText.setVisible(true);
    this.statusText.setText('Balance quickly!');

    this.createDatasetGrid();
    this.updateCounts();
    this.createCursorHighlight();

    // Per-round timer
    if (this.roundTimerEvent) {
        this.roundTimerEvent.remove(false);
    }
    this.roundTimerEvent = this.time.delayedCall(this.roundTimeLimit, () => {
        this.handleRoundTimeout();
    });
  }

  // After win/lose screen, decide next round or end
  afterResult() {
    if (this.phase !== 'result_win' && this.phase !== 'result_fail') return;

    // If the challenge has been ended elsewhere (e.g., badges hit 0)
    if (this.timeRemaining <= 0 || gameState.badges <= 0 || this.phase === 'ended') {
      return;
    }

    // Go to instructions for next round
    this.phase = 'instructions';
    this.promptText.setText(
      'Balance the dataset!\nUse arrows + DELETE/BACKSPACE.\nPress SPACE to begin.'
    );
    this.statusText.setText('');

    this.startRound();
  }

  // ---------- ROUND OUTCOMES ----------

  handleRoundTimeout() {
    if (this.phase !== 'play') return;

    // Stop this round's timer
    if (this.roundTimerEvent) {
        this.roundTimerEvent.remove(false);
        this.roundTimerEvent = null;
    }

    this.clearRoundVisuals();
    this.countText.setVisible(false);

    // Log failure
    gameState.failures.push({
        microgame: 'fairness_challenge',
        success: false,
        tallRemaining: this.tallCount,
        shortRemaining: this.shortCount,
        timestamp: Date.now()
    });

    // Lose a badge (may end challenge)
    this.loseBadge();

    if (gameState.badges <= 0 || this.timeRemaining <= 0 || this.phase === 'ended') {
        return; // BonusPromptScene or endChallenge handles next steps
    }

    // Show lose screen briefly
    this.phase = 'result_fail';
    this.promptText.setText('Too slow!\nThe AI trained on unbalanced data.');
    this.statusText.setText('You lost a badge.');

    this.time.delayedCall(1800, () => {
        if (this.timeRemaining > 0 && gameState.badges > 0 && this.phase === 'result_fail') {
        this.phase = 'play';
        this.promptText.setText('');
        this.startRound();
        }
    });
  }

  handleRoundTrain() {
    if (this.phase !== 'play') return;

    // Stop round timer
    if (this.roundTimerEvent) {
        this.roundTimerEvent.remove(false);
        this.roundTimerEvent = null;
    }

    // Determine if balanced similar to tutorial
    const nonEmpty = this.tallCount + this.shortCount > 0;
    const fairlyBalanced =
        Math.abs(this.tallCount - this.shortCount) <= 1 &&
        this.tallCount > 0 &&
        this.shortCount > 0;

    const success = nonEmpty && fairlyBalanced;

    // Log attempt
    gameState.failures.push({
        microgame: 'fairness_challenge',
        success,
        tallRemaining: this.tallCount,
        shortRemaining: this.shortCount,
        timestamp: Date.now()
    });

    this.clearRoundVisuals();
    this.countText.setVisible(false);

    if (success) {
        this.addScore(100);
        this.phase = 'result_win';
        this.promptText.setText('Nice!\nYou trained a fairer AI.');
        this.statusText.setText('+100 points.');

        this.time.delayedCall(1500, () => {
        if (this.timeRemaining > 0 && gameState.badges > 0 && this.phase === 'result_win') {
            this.phase = 'play';
            this.promptText.setText('');
            this.startRound();
        }
        });
    } else {
        // treat as fail: lose a badge
        this.loseBadge();

        if (gameState.badges <= 0 || this.timeRemaining <= 0 || this.phase === 'ended') {
        return;
        }

        this.phase = 'result_fail';
        this.promptText.setText('Unbalanced data = unfair team.');
        this.statusText.setText('You lost a badge.');

        this.time.delayedCall(1500, () => {
        if (this.timeRemaining > 0 && gameState.badges > 0 && this.phase === 'result_fail') {
            this.phase = 'play';
            this.promptText.setText('');
            this.startRound();
        }
        });
    }
  }

  // ---------- GRID / MICROGAME LOGIC ----------

  createDatasetGrid() {
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

    // 🔹 Perfect center of grid
    const startX = centerX - gridWidth / 2;
    const startY = centerY - gridHeight / 2 + 40; // small nudge down

    // 🔹 Move count 100px above top row (like tutorial)
    this.countText.setY(startY - 100);

    const total = 12;
    const minEach = 2;

    let numShort = Phaser.Math.Between(minEach, total - minEach);
    let numTall = total - numShort;

    if (numTall === numShort) {
        if (numShort > minEach) {
        numShort -= 1;
        numTall += 1;
        } else {
        numShort += 1;
        numTall -= 1;
        }
    }

    const types = [];
    for (let i = 0; i < numTall; i++) types.push('tall');
    for (let i = 0; i < numShort; i++) types.push('short');
    Phaser.Utils.Array.Shuffle(types);

    for (let i = 0; i < total; i++) {
        const row = Math.floor(i / cols);
        const col = i % cols;
        const x = startX + col * colSpacing;
        const y = startY + row * rowSpacing;

        const type = types[i];
        const color = type === 'tall' ? 0xffc857 : 0x6fffe9;

        const rect = this.add.rectangle(x, y, 80, 80, color, 1)
        .setStrokeStyle(2, 0x000000);

        const label = this.add.text(x, y,
        type === 'tall' ? 'Tall' : 'Short',
        { fontSize: '16px', color: '#000000' }
        ).setOrigin(0.5);

        const sprite = this.add.container(0, 0, [rect, label]);
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

  createCursorHighlight() {
    if (this.cursorRect) {
      this.cursorRect.destroy();
    }
    if (!this.players.length) return;

    const current = this.players[this.cursorIndex];
    const x = current.sprite.getData('x');
    const y = current.sprite.getData('y');

    this.cursorRect = this.add.rectangle(x, y, 92, 92)
      .setStrokeStyle(3, 0xffffff)
      .setFillStyle(0xffffff, 0);
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

    this.countText.setText(`Tall: ${this.tallCount}    Short: ${this.shortCount}`);
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
  }

  clearRoundVisuals() {
    this.players.forEach(p => p.sprite.destroy());
    this.players = [];
    if (this.cursorRect) {
      this.cursorRect.destroy();
      this.cursorRect = null;
    }
  }

  // ---------- UPDATE LOOP ----------

  update() {
    if (this.phase !== 'play') return;

    if (Phaser.Input.Keyboard.JustDown(this.cursors.left)) {
        this.moveCursor(-1, 0);
    } else if (Phaser.Input.Keyboard.JustDown(this.cursors.right)) {
        this.moveCursor(1, 0);
    } else if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
        this.moveCursor(0, -1);
    } else if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
        this.moveCursor(0, 1);
    }

    if (Phaser.Input.Keyboard.JustDown(this.deleteKey) ||
        Phaser.Input.Keyboard.JustDown(this.backspaceKey)) {
        this.removeCurrentPlayer();
    }

    if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
        this.handleRoundTrain();
    }
  }
}