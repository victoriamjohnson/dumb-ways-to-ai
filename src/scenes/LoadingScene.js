// src/scenes/LoadingScene.js

import gameState from '../gameState.js';

export default class LoadingScene extends Phaser.Scene {
  constructor() {
    super('LoadingScene');
  }

  create() {
    this.cameras.main.setBackgroundColor('#000814');

    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    const { firstName } = gameState.player;

    this.add.text(centerX, centerY - 100, 'Collecting performance data…', {
        fontSize: '24px',
        color: '#ffffff'
    }).setOrigin(0.5);

    this.loadingText = this.add.text(centerX, centerY - 50,
        `Collecting ${firstName || 'student'}'s performance data…`,
        {
        fontSize: '18px',
        color: '#d1e8ff'
        }
    ).setOrigin(0.5);

    // Progress bar background
    const barWidth = 400;
    const barHeight = 30;

    const barBg = this.add.rectangle(centerX, centerY + 20, barWidth, barHeight, 0x111111)
        .setStrokeStyle(2, 0xffffff);

    // Fill (left-aligned inside bar)
    this.barFill = this.add.rectangle(
        centerX - barWidth / 2 + 10,
        centerY + 20,
        0,
        barHeight - 6,
        0x00b894
    ).setOrigin(0, 0.5);

    this.progress = 0;

    this.time.addEvent({
        delay: 100,
        loop: true,
        callback: () => {
        this.progress += 0.05;
        if (this.progress >= 1) this.progress = 1;

        this.barFill.width = (barWidth - 20) * this.progress;

        if (this.progress >= 1) {
            this.time.delayedCall(300, () => {
            this.scene.start('ThankYouScene');
            });
        }
        }
    });
  }
}