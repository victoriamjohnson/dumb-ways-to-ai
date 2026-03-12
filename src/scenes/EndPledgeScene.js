// src/scenes/EndPledgeScene.js

import sessionLogger from '../sessionLogger.js';
import gameState from '../gameState.js';

export default class EndPledgeScene extends Phaser.Scene {
  constructor() {
    super('EndPledgeScene');
  }

  preload() {
    this.load.image('pledge_bg', 'assets/ui/Responsible_AI_Pledge.png');
  }

  create() {
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;

    this.cameras.main.setBackgroundColor('#000814');

    const bg = this.add.image(centerX, centerY, 'pledge_bg').setOrigin(0.5);
    const s = Math.min(width / bg.width, height / bg.height);
    bg.setScale(s);

    // Two invisible zones over the buttons
    // Adjust these if your button positions differ
    const btnY = centerY + bg.displayHeight * 0.35;
    const btnW = bg.displayWidth * 0.25;
    const btnH = bg.displayHeight * 0.18;

    const promiseZone = this.add.zone(centerX - bg.displayWidth * 0.008, btnY, btnW, btnH)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const cancelZone = this.add.zone(centerX + bg.displayWidth * 0.32, btnY, btnW, btnH)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    promiseZone.on('pointerdown', () => {
      sessionLogger.logResult('promised', gameState.score);
      this.scene.start('LoadingScene');
    });

    cancelZone.on('pointerdown', () => {
      sessionLogger.logResult('cancelled', gameState.score);
      this.scene.start('LoadingScene');
    });
  }
}