// src/scenes/TitleScene.js

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene'); // this is the scene key
  }

  preload() {
    // Background image drawn in Procreate (1920x1080)
    this.load.image('title_bg', 'assets/ui/Start_Screen.png');
  }

  create() {
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;

    // Optional fallback color behind the image
    this.cameras.main.setBackgroundColor('#000814');

    // ----- BACKGROUND IMAGE -----
    const bg = this.add.image(centerX, centerY, 'title_bg').setOrigin(0.5);

    // Scale proportionally to fill the game area (your art is 1920x1080, game is 16:9 too)
    const scaleX = width / bg.width;
    const scaleY = height / bg.height;
    const scale = Math.min(scaleX, scaleY);
    bg.setScale(scale);

    // ----- INVISIBLE "START" BUTTON HIT AREA -----
    // This rectangle sits over the white START box you painted.
    // You can tweak the Y and size values if it feels slightly off.
    const startButtonHitArea = this.add.rectangle(
      centerX,           // horizontally centered
      height * 0.81,     // ~80% down the screen; adjust if needed
      width * 0.458,      // width of clickable area
      141,               // height of clickable area
      0x000000,
      0.0                  // alpha 0 = fully invisible
    )
      .setInteractive({ useHandCursor: true });

    startButtonHitArea.on('pointerdown', () => {
      this.scene.start('LoginScene');
    });

    // OPTIONAL: keyboard shortcut (SPACE or ENTER to start)
    this.input.keyboard.on('keyup-SPACE', () => {
      this.scene.start('LoginScene');
    });
    this.input.keyboard.on('keyup-ENTER', () => {
      this.scene.start('LoginScene');
    });

    // If you want to debug the hitbox alignment, temporarily make it visible:
    // startButtonHitArea.fillAlpha = 0.2;
  }
}