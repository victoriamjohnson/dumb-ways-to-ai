// src/scenes/TitleScene.js

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene'); // this is the scene key
  }

  create() {
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    this.cameras.main.setBackgroundColor('#87CEEB');

    // Title
    this.add.text(centerX, centerY - 120, 'Dumb Ways to AI', {
      fontSize: '64px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 6
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(centerX, centerY - 40, 'Prototype Demo', {
      fontSize: '28px',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Start button
    const startButton = this.add.text(centerX, centerY + 80, 'Start', {
      fontSize: '32px',
      backgroundColor: '#000000',
      color: '#ffffff',
      padding: { left: 24, right: 24, top: 12, bottom: 12 }
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    startButton.on('pointerover', () => {
      startButton.setStyle({ backgroundColor: '#333333' });
    });

    startButton.on('pointerout', () => {
      startButton.setStyle({ backgroundColor: '#000000' });
    });

    startButton.on('pointerdown', () => {
      this.scene.start('LoginScene');
    });
  }
}