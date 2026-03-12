// src/scenes/LoginScene.js

import sessionLogger from '../sessionLogger.js';
import gameState from '../gameState.js';

export default class LoginScene extends Phaser.Scene {
  constructor() {
    super('LoginScene');
  }

  preload() {
    this.load.image('login_bg_ok',   'assets/ui/Login_Screen.png');
    this.load.image('login_bg_warn', 'assets/ui/Login_Screen_w_Warning.png');
  }

  create() {
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;

    this.cameras.main.setBackgroundColor('#000814');

    const bg = this.add.image(centerX, centerY, 'login_bg_ok').setOrigin(0.5);
    bg.setScale(Math.min(width / bg.width, height / bg.height));
    this.loginBg = bg;

    this.bubbleText = this.add.text(
      width * 0.83, height * 0.40,
      'Welcome! Enter your info to begin training.',
      {
        fontSize: '35px', color: '#ffffff',
        fontFamily: 'Courier, monospace',
        wordWrap: { width: width * 0.28 }, align: 'left'
      }
    ).setOrigin(0.5);

    const firstNameY   = height * 0.385;
    const lastInitialY = height * 0.484;
    const gradeY       = height * 0.592;

    const firstNameX   = width * 0.4675;
    const lastInitialX = width * 0.392;
    const gradeX       = width * 0.453;

    // ── First Name — 20 char max, auto-capitalize first letter ──
    const firstNameInput = this.add.dom(firstNameX, firstNameY, 'input', {
      type: 'text', fontSize: '18px', padding: '3px 9px',
      width: '292px', borderRadius: '8px',
      border: '2px solid #ffffff', outline: 'none'
    });
    firstNameInput.node.maxLength = 20;
    firstNameInput.node.addEventListener('input', () => {
      const el = firstNameInput.node;
      if (el.value.length > 0) {
        el.value = el.value.charAt(0).toUpperCase() + el.value.slice(1);
      }
    });

    // ── Last Initial — 1 char max, auto-capitalize ──
    const lastInitialInput = this.add.dom(lastInitialX, lastInitialY, 'input', {
      type: 'text', fontSize: '18px', padding: '3px 9px',
      width: '98px', borderRadius: '8px',
      border: '2px solid #ffffff', outline: 'none'
    });
    lastInitialInput.node.maxLength = 1;
    lastInitialInput.node.addEventListener('input', () => {
      lastInitialInput.node.value = lastInitialInput.node.value.toUpperCase();
    });

    // ── Grade select — 8th Grade and Not Applicable only ──
    const gradeSelect = this.add.dom(gradeX, gradeY, 'select', {
      fontSize: '18px', padding: '3px 9px',
      width: '272px', borderRadius: '8px',
      border: '2px solid #ffffff', outline: 'none'
    });
    const selectEl = gradeSelect.node;
    [
      { value: '',   label: 'Select Grade'   },
      { value: '8',  label: '8th Grade'      },
      { value: 'NA', label: 'Not Applicable' },
    ].forEach(({ value, label }) => {
      const opt = document.createElement('option');
      opt.value = value;
      opt.text  = label;
      selectEl.appendChild(opt);
    });

    // ── Continue button ──
    const continueHitArea = this.add.rectangle(
      centerX, height * 0.73, width * 0.22, 80, 0x000000, 0.0
    ).setInteractive({ useHandCursor: true });

    continueHitArea.on('pointerdown', () => {
      this.handleLoginSubmit(firstNameInput, lastInitialInput, gradeSelect);
    });
    this.input.keyboard.on('keyup-ENTER', () => {
      this.handleLoginSubmit(firstNameInput, lastInitialInput, gradeSelect);
    });
  }

  // ── Duplicate-name resolution ─────────────────────────────────────────────
  // Checks Firebase leaderboard for existing names.
  // If "Victoria J" exists, returns "Victoria J2", then "Victoria J3", etc.
  async resolveUniqueName(baseName) {
    try {
      const snapshot = await firebase.database().ref('leaderboard').once('value');
      const existingNames = new Set();
      snapshot.forEach(child => {
        const val = child.val();
        if (val?.name) existingNames.add(val.name);
      });

      if (!existingNames.has(baseName)) return baseName;

      let counter = 2;
      while (existingNames.has(`${baseName}(${counter})`)) counter++;
      return `${baseName}(${counter})`;
    } catch {
      // Firebase unavailable — use base name as-is
      return baseName;
    }
  }

  // ── Form submission ───────────────────────────────────────────────────────
  async handleLoginSubmit(firstNameInput, lastInitialInput, gradeSelect) {
    let firstName     = firstNameInput.node.value.trim();
    const lastInitial = lastInitialInput.node.value.trim().toUpperCase();
    const grade       = gradeSelect.node.value;

    if (!firstName || !lastInitial || !grade) {
      this.showLoginWarning('Please fill out all fields before continuing.');
      return;
    }

    // Belt-and-suspenders 20-char cap
    if (firstName.length > 20) firstName = firstName.substring(0, 20);

    this.loginBg.setTexture('login_bg_ok');
    this.bubbleText.setText('...');

    firstNameInput.destroy();
    lastInitialInput.destroy();
    gradeSelect.destroy();

    const baseName   = `${firstName} ${lastInitial}`;
    const uniqueName = await this.resolveUniqueName(baseName);

    gameState.player.firstName   = uniqueName;
    gameState.player.lastInitial = lastInitial;
    gameState.player.grade       = grade;

    sessionLogger.init(gameState.player.firstName, gameState.player.grade);
    this.scene.start('HomeScene');
  }

  showLoginWarning(message) {
    this.loginBg.setTexture('login_bg_warn');
    this.bubbleText.setText(message);
  }
}