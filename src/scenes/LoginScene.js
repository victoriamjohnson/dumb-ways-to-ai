// src/scenes/LoginScene.js

import gameState from '../gameState.js';

export default class LoginScene extends Phaser.Scene {
  constructor() {
    super('LoginScene');
  }

  preload() {
    this.load.image('login_bg_ok', 'assets/ui/Login_Screen.png');
    this.load.image('login_bg_warn', 'assets/ui/Login_Screen_w_Warning.png');
  }

  create() {
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;

    // ----- BACKGROUND -----
    this.cameras.main.setBackgroundColor('#000814');

    // Start with the "happy" login background
    const bg = this.add.image(centerX, centerY, 'login_bg_ok').setOrigin(0.5);

    // Scale proportionally to fit the game area (art is 1920x1080, game is 16:9)
    const scaleX = width / bg.width;
    const scaleY = height / bg.height;
    const scale = Math.min(scaleX, scaleY);
    bg.setScale(scale);

    this.loginBg = bg;

    // ----- SPEECH BUBBLE TEXT (above robot) -----
    // Positioned inside the black bubble in your art. Adjust the 0.72 / 0.34 if needed.
    this.bubbleText = this.add.text(
      width * 0.83,
      height * 0.40,
      'Welcome! Enter your info to begin training.',
      {
        fontSize: '35px',
        color: '#ffffff',
        fontFamily: 'Courier, monospace',
        wordWrap: { width: width * 0.28 },
        align: 'left'
      }
    ).setOrigin(0.5);

    // ----- FORM INPUTS (DOM elements on top of blue bars) -----
    // Approximate Y positions for the three blue rectangles in your art
    const firstNameY = height * 0.385;
    const lastInitialY = height * 0.484;
    const gradeY = height * 0.592;

    // X position roughly where the blue bars are centered
    const firstNameX = width * 0.4675;
    const lastInitialX = width * 0.392;
    const gradeX = width * 0.453;

    // First Name field
    const firstNameInput = this.add.dom(firstNameX, firstNameY, 'input', {
      type: 'text',
      fontSize: '18px',
      padding: '3px 9px',
      width: '292px',
      borderRadius: '8px',
      border: '2px solid #ffffff',
      outline: 'none'
    });

    // Last Initial field
    const lastInitialInput = this.add.dom(lastInitialX, lastInitialY, 'input', {
      type: 'text',
      fontSize: '18px',
      padding: '3px 9px',
      width: '98px',
      borderRadius: '8px',
      border: '2px solid #ffffff',
      outline: 'none',
      textTransform: 'uppercase'
    });

    // Grade select field
    const gradeSelect = this.add.dom(gradeX, gradeY, 'select', {
      fontSize: '18px',
      padding: '3px 9px',
      width: '272px',
      borderRadius: '8px',
      border: '2px solid #ffffff',
      outline: 'none'
    });

    const selectElement = gradeSelect.node;
    const grades = ['', '6', '7', '8', '9'];
    grades.forEach(g => {
      const option = document.createElement('option');
      option.value = g;
      option.text = g === '' ? 'Select Grade' : `Grade ${g}`;
      selectElement.appendChild(option);
    });

    // ----- INVISIBLE CONTINUE BUTTON HIT AREA -----
    // This sits over the blue "CONTINUE" button in your art.
    const continueHitArea = this.add.rectangle(
      centerX,            // the button is centered on the card
      height * 0.73,      // tweak this up/down to line up with the button
      width * 0.22,       // width of clickable region
      80,                 // height of clickable region
      0x000000,
      0.0                   // 0 = fully invisible; use 0.2 to debug alignment
    ).setInteractive({ useHandCursor: true });

    continueHitArea.on('pointerdown', () => {
      this.handleLoginSubmit(firstNameInput, lastInitialInput, gradeSelect);
    });

    // Also allow ENTER key to submit
    this.input.keyboard.on('keyup-ENTER', () => {
      this.handleLoginSubmit(firstNameInput, lastInitialInput, gradeSelect);
    });
  }

  // ----- FORM HANDLING -----

  handleLoginSubmit(firstNameInput, lastInitialInput, gradeSelect) {
    let firstName = firstNameInput.node.value.trim();

    // Limit to 12 characters max
    if (firstName.length > 12) {
        firstName = firstName.substring(0, 12);
    }
    
    const lastInitialRaw = lastInitialInput.node.value.trim();
    const lastInitial = lastInitialRaw ? lastInitialRaw.charAt(0).toUpperCase() : '';
    const grade = gradeSelect.node.value;

    const isValid = firstName && lastInitial && grade;

    if (!isValid) {
      this.showLoginWarning('Please fill out all fields before continuing.');
      return;
    }

    // Valid → reset background + message
    this.loginBg.setTexture('login_bg_ok');
    this.bubbleText.setText('Great! Let’s begin your training.');

    // Save to global game state
    gameState.player.firstName = firstName;
    gameState.player.lastInitial = lastInitial;
    gameState.player.grade = grade;

    // Clean up DOM elements before changing scenes
    firstNameInput.destroy();
    lastInitialInput.destroy();
    gradeSelect.destroy();

    this.scene.start('HomeScene');
  }

  showLoginWarning(message) {
    // Swap to the warning background art
    this.loginBg.setTexture('login_bg_warn');

    // Update the speech bubble text
    this.bubbleText.setText(message);
  }
}