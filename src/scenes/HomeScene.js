// src/scenes/HomeScene.js

import gameState from '../gameState.js';

export default class HomeScene extends Phaser.Scene {
  constructor() {
    super('HomeScene');
  }

  preload() {
    this.load.image('home_bg', 'assets/ui/Home_Screen.png');
  }

  create() {
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;

    this.cameras.main.setBackgroundColor('#000814');

    // ----- BACKGROUND IMAGE -----
    const bg = this.add.image(centerX, centerY, 'home_bg').setOrigin(0.5);

    const scaleX = width / bg.width;
    const scaleY = height / bg.height;
    const scale = Math.min(scaleX, scaleY);
    bg.setScale(scale);

    // ----- WELCOME TEXT IN ROBOT'S DIALOG BOX -----
    const { firstName } = gameState.player || {};

    const displayName =
      firstName && firstName.trim() !== ''
        ? firstName
        : 'Developer';

    // Center and width of the speech bubble area
    const bubbleCenterX = width * 0.55;
    const bubbleWidth   = width * 0.32;

    // Left edge of the bubble (so text always starts from same place)
    const bubbleLeft = bubbleCenterX - bubbleWidth / 2;

    // Create text left-anchored inside the bubble
    this.bubbleText = this.add.text(
    bubbleLeft + 10,          // +10 = small left margin inside bubble
    height * 0.505,
    `Welcome, ${displayName}.`,
    {
        fontSize: '32px',
        color: '#ffffff',
        fontFamily: 'Courier, monospace',
        align: 'left',
        fixedWidth: bubbleWidth
    }
    ).setOrigin(0, 0.5);        // 0 = left-anchored, so it never shifts

    // Auto-shrink if text is too wide
    const maxWidth = width * 0.32;

    while (this.bubbleText.width > maxWidth) {
      const currentSize = parseInt(this.bubbleText.style.fontSize);
      this.bubbleText.setFontSize(currentSize - 2);

      if (currentSize <= 18) break; // don't shrink too much
    }

    // ----- INVISIBLE BUTTON: TUTORIAL -----
    const tutorialHitArea = this.add.rectangle(
      width * 0.705,
      height * 0.672,
      width * 0.285,
      88,
      0x000000,
      0.0 // set to 0.2 temporarily if you want to see the box
    ).setInteractive({ useHandCursor: true });

    tutorialHitArea.on('pointerdown', () => {
      this.scene.start('TutorialStoryScene');
    });

    // ----- INVISIBLE BUTTON: CHALLENGE MODE -----
    const challengeHitArea = this.add.rectangle(
      width * 0.705,
      height * 0.84,
      width * 0.355,
      85,
      0x000000,
      0.0
    ).setInteractive({ useHandCursor: true });

    challengeHitArea.on('pointerdown', () => {
      this.scene.start('ChallengeScene');
    });

    // Optional keyboard shortcuts
    this.input.keyboard.on('keyup-T', () => {
      this.scene.start('TutorialStoryScene');
    });
    this.input.keyboard.on('keyup-C', () => {
      this.scene.start('ChallengeScene');
    });

    // For debugging hitboxes, uncomment these:
    // tutorialHitArea.fillAlpha = 0.2;
    // challengeHitArea.fillAlpha = 0.2;
  }
}