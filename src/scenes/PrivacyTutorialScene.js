// src/scenes/PrivacyTutorialScene.js
import sessionLogger from '../sessionLogger.js';
import gameState from '../gameState.js';

export default class PrivacyTutorialScene extends Phaser.Scene {
  constructor() {
    super('PrivacyTutorialScene');

    this.phase = 'intro'; // intro, instructions, play, result, reflection
    this.introSteps = [];
    this.resultStepsSuccess = [];
    this.resultStepsFail = [];
    this.reflectionSteps = [];
    this.currentIndex = 0;
    this.success = false;

    // Play phase state
    this.toggleLeft  = false; // Email Address
    this.toggleRight = false; // Banking Information
    this.toggleLeftGraphics  = null;
    this.toggleRightGraphics = null;
    this.saveBtn = null;
    this.xBtn    = null;
    this.playObjects = [];
  }

  preload() {
    this.load.image('doomgpt_training_bg',      'assets/ui/DoomGPT_Training_Screen.png');
    this.load.image('doomgpt_training_bg_fail',  'assets/ui/DoomGPT_Training_Screen_Fail.png');
    this.load.image('doomgpt_game_bg',           'assets/ui/DoomGPT_Game_Screen.png');
    this.load.image('pr_btn_save',               'assets/ui/Save.png');
    this.load.image('pr_btn_save_grey',          'assets/ui/Save_Grey.png');
    this.load.image('pr_btn_x',                  'assets/ui/X.png');
    this.load.image('pr_btn_x_grey',             'assets/ui/X_Grey.png');
  }

  create() {
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;

    this.cameras.main.setBackgroundColor('#FFF4A3');

    const bg = this.add.image(centerX, centerY, 'doomgpt_training_bg').setOrigin(0.5);
    bg.setScale(Math.min(width / bg.width, height / bg.height));
    this.bg = bg;

    // ── Dialogue UI ──
    const textLeftX = width * 0.10;
    const speakerY  = height * 0.65;
    const bodyY     = height * 0.70;

    this.speakerText = this.add.text(textLeftX, speakerY, '', {
      fontSize: '26px', color: '#ffd166',
      fontFamily: 'Courier, monospace', fontStyle: 'bold'
    }).setOrigin(0, 0.5);

    this.bodyText = this.add.text(textLeftX, bodyY, '', {
      fontSize: '26px', color: '#ffffff',
      fontFamily: 'Courier, monospace',
      wordWrap: { width: width * 0.84 }
    }).setOrigin(0, 0);

    this.hintText = this.add.text(centerX, height - 55,
      'Press SPACE or click to continue', {
        fontSize: '20px', color: '#aaaaaa',
        fontFamily: 'Courier, monospace', align: 'center'
      }
    ).setOrigin(0.5);

    // ── Dialogue content ──
    const { firstName } = gameState.player;

    this.introSteps = [
      {
        speaker: 'Dr. Bot',
        text: `Bad news, Developer${firstName ? ` ${firstName}` : ''}. Developer Doom is launching his own AI assistant — DoomGPT.`
      },
      {
        speaker: 'Dr. Bot',
        text: `It connects directly to your device. Your files, your folders, your messages — DoomGPT wants access to all of it.`
      },
      {
        speaker: 'Dr. Bot',
        text: `Before it launches, someone has to review what data DoomGPT is actually allowed to collect from its users.`
      },
      {
        speaker: 'Dr. Bot',
        text: `Responsible developers only collect data that is absolutely necessary for the AI to do its job.`
      },
      {
        speaker: 'Dr. Bot',
        text: `Anything beyond that? It's not our data to take.`
      },
      {
        speaker: 'Dr. Bot',
        text: `You'll see two data options DoomGPT wants to collect. Toggle ON the one that is safe and necessary — then press SAVE to submit.`
      },
      {
        speaker: 'Dr. Bot',
        text: `If neither option is safe to collect, do NOT toggle either one — just press the X button to reject them both.`
      }
    ];

    this.resultStepsSuccess = [
      {
        speaker: 'Dr. Bot',
        text: `Exactly right. That's the kind of decision that protects real people.`
      },
      {
        speaker: 'Dr. Bot',
        text: `Responsible developers ask: does this AI actually need this data to work? If the answer is no — it doesn't get collected.`
      },
      {
        speaker: 'Dr. Bot',
        text: `User privacy isn't a feature. It's a responsibility.`
      }
    ];

    this.resultStepsFail = [
      {
        speaker: 'Dr. Bot',
        text: `That data is now being collected from every user who installs DoomGPT.`
      },
      {
        speaker: 'Dr. Bot',
        text: `Even if it seemed like the safer option — if the AI doesn't need it, collecting it puts users at risk.`
      },
      {
        speaker: 'Dr. Bot',
        text: `Doom counts on developers making quick decisions without thinking about who gets hurt.`
      }
    ];

    this.reflectionSteps = [
      {
        speaker: 'Dr. Bot',
        text: `When an AI connects to someone's device, it is entering their personal space.`
      },
      {
        speaker: 'Dr. Bot',
        text: `Responsible developers treat that seriously. Only collect what you need. Protect the rest.`
      },
      {
        speaker: 'Dr. Bot',
        text: `Privacy isn't about what you can collect. It's about what you should.`
      }
    ];

    this.phase = 'intro';
    this.currentIndex = 0;

    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.input.on('pointerdown', () => {
      if (this.phase !== 'play') this.handleAdvance();
    });

    sessionLogger.logTutorialMiniGameStart('privacy');
    this.showIntroStep();
  }

  // ─── INTRO & INSTRUCTIONS ────────────────────────────────────────────────────

  showIntroStep() {
    const step = this.introSteps[this.currentIndex];
    if (!step) { this.showInstructions(); return; }
    this.speakerText.setText(step.speaker);
    this.bodyText.setText(step.text);
    this.hintText.setText('Press SPACE or click to continue');
  }

  showInstructions() {
    this.phase = 'instructions';
    this.speakerText.setText('Dr. Bot');
    this.bodyText.setText(
      'PROTECT USER PRIVACY!\n\n' +
      'Two data types are shown. Toggle ON the one that is safe to collect,\n' +
      'then press SAVE to submit.\n\n' +
      'If neither is safe, toggle nothing and press the X button.'
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
        this.scene.start('HomeScene');
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

    this.bg.setTexture('doomgpt_game_bg');

    this.speakerText.setVisible(false);
    this.bodyText.setVisible(false);
    this.hintText.setVisible(false);

    this.toggleLeft  = false;
    this.toggleRight = false;

    // ── Box centers measured from the art (1456×816) ──
    // Left box center  ≈ (648, 353)  →  x*0.445, y*0.432
    // Right box center ≈ (1038, 353) →  x*0.713, y*0.432
    const leftBoxCX  = width  * 0.445;
    const rightBoxCX = width  * 0.713;
    const boxCY      = height * 0.432;

    // ── Data labels inside the boxes ──
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

    // ── Toggles — sit below the boxes ──
    const toggleY = height * 0.62;
    const toggleW = 90;
    const toggleH = 42;

    // Left toggle
    this.toggleLeftGraphics = this.add.graphics().setDepth(6);
    this.playObjects.push(this.toggleLeftGraphics);
    this.drawToggle(this.toggleLeftGraphics, leftBoxCX, toggleY, toggleW, toggleH, false);

    const leftZone = this.add.zone(leftBoxCX, toggleY, toggleW + 20, toggleH + 20)
      .setOrigin(0.5).setDepth(7).setInteractive({ useHandCursor: true });
    leftZone.on('pointerdown', () => this.handleToggleLeft());
    this.playObjects.push(leftZone);

    // Right toggle
    this.toggleRightGraphics = this.add.graphics().setDepth(6);
    this.playObjects.push(this.toggleRightGraphics);
    this.drawToggle(this.toggleRightGraphics, rightBoxCX, toggleY, toggleW, toggleH, false);

    const rightZone = this.add.zone(rightBoxCX, toggleY, toggleW + 20, toggleH + 20)
      .setOrigin(0.5).setDepth(7).setInteractive({ useHandCursor: true });
    rightZone.on('pointerdown', () => this.handleToggleRight());
    this.playObjects.push(rightZone);

    // ── SAVE button — grey on start, green when a toggle is ON ──
    // SAVE center ≈ (843, 622) → x*0.579, y*0.762
    const saveCX = width  * 0.579;
    const saveCY = height * 0.762;

    this.saveBtn = this.add.image(saveCX, saveCY, 'pr_btn_save_grey')
      .setOrigin(0.5)
      .setDisplaySize(220, 75)
      .setDepth(8);
    this.playObjects.push(this.saveBtn);

    // ── X button — red on start, grey when a toggle is ON ──
    // X center ≈ (1249, 157) → x*0.858, y*0.192
    const xCX = width  * 0.858;
    const xCY = height * 0.192;

    this.xBtn = this.add.image(xCX, xCY, 'pr_btn_x')
      .setOrigin(0.5)
      .setDisplaySize(80, 80)
      .setDepth(8)
      .setInteractive({ useHandCursor: true });
    this.xBtn.on('pointerdown', () => this.handleSubmitX());
    this.playObjects.push(this.xBtn);

    // Init button states
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
    this.drawToggle(
      this.toggleLeftGraphics,
      this.scale.width  * 0.445,
      this.scale.height * 0.62,
      90, 42, this.toggleLeft
    );
    this.refreshButtonState();
  }

  handleToggleRight() {
    if (this.phase !== 'play') return;
    this.toggleRight = !this.toggleRight;
    this.drawToggle(
      this.toggleRightGraphics,
      this.scale.width  * 0.713,
      this.scale.height * 0.62,
      90, 42, this.toggleRight
    );
    this.refreshButtonState();
  }

  // ── Button state logic ────────────────────────────────────────────────────────
  // No toggles ON  → SAVE grey (disabled) + X red (enabled)
  // Any toggle ON  → SAVE green (enabled) + X grey (disabled)
  refreshButtonState() {
    const anyToggled = this.toggleLeft || this.toggleRight;

    if (anyToggled) {
      // SAVE → green, clickable
      this.saveBtn.setTexture('pr_btn_save');
      this.saveBtn.setInteractive({ useHandCursor: true });
      this.saveBtn.off('pointerdown');
      this.saveBtn.on('pointerdown', () => this.handleSubmitSave());

      // X → grey, not clickable
      this.xBtn.setTexture('pr_btn_x_grey');
      this.xBtn.removeInteractive();
    } else {
      // SAVE → grey, not clickable
      this.saveBtn.setTexture('pr_btn_save_grey');
      this.saveBtn.removeInteractive();

      // X → red, clickable
      this.xBtn.setTexture('pr_btn_x');
      this.xBtn.setInteractive({ useHandCursor: true });
      this.xBtn.off('pointerdown');
      this.xBtn.on('pointerdown', () => this.handleSubmitX());
    }
  }

  // ─── SUBMIT HANDLERS ─────────────────────────────────────────────────────────

  // SAVE — only reachable when at least one toggle is ON
  // ✅ Pass: Email Address (left) ON only
  // ❌ Fail: Banking Information (right) ON only
  // ❌ Fail: Both ON
  handleSubmitSave() {
    if (this.phase !== 'play') return;
    const success = this.toggleLeft === true && this.toggleRight === false;
    this.endRound(success);
  }

  // X — only reachable when NO toggles are ON
  // ❌ Always fails in tutorial (one option IS safe, so rejecting both is wrong)
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
    this.hintText.setText('Press SPACE or click to continue');

    const steps = this.success ? this.resultStepsSuccess : this.resultStepsFail;
    this.speakerText.setText(steps[0].speaker);
    this.bodyText.setText(steps[0].text);
  }

  startReflectionPhase() {
    this.phase = 'reflection';
    this.currentIndex = 0;
    this.bg.setTexture('doomgpt_training_bg');
    const step = this.reflectionSteps[0];
    this.speakerText.setText(step.speaker);
    this.bodyText.setText(step.text);
    this.hintText.setText('Press SPACE or click to continue');
  }

  // ─── UPDATE ──────────────────────────────────────────────────────────────────

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      if (this.phase !== 'play') this.handleAdvance();
      // SPACE intentionally does nothing during play —
      // student must use toggles + SAVE or X button
    }
  }
}