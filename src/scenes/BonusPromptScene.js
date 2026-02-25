// src/scenes/BonusPromptScene.js

import gameState from '../gameState.js';

export default class BonusPromptScene extends Phaser.Scene {
  constructor() {
    super('BonusPromptScene');
  }

  create() {
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    this.cameras.main.setBackgroundColor('#1f2833');

    this.add.text(centerX, centerY - 120, 'Want to keep playing?', {
        fontSize: '32px',
        color: '#ffffff'
    }).setOrigin(0.5);

    this.add.text(
        centerX,
        centerY - 70,
        'You used all 3 Responsible Badges.\n\nChoose what to do next:',
        {
        fontSize: '20px',
        color: '#d1e8ff',
        align: 'center',
        wordWrap: { width: 700 }
        }
    ).setOrigin(0.5);

    // Buttons side by side under the text
    const bonusButton = this.add.text(centerX - 140, centerY + 40, 'Bonus Badge', {
        fontSize: '24px',
        backgroundColor: '#2980b9',
        color: '#ffffff',
        padding: { left: 24, right: 24, top: 10, bottom: 10 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const endButton = this.add.text(centerX + 140, centerY + 40, 'End Game', {
        fontSize: '24px',
        backgroundColor: '#c0392b',
        color: '#ffffff',
        padding: { left: 24, right: 24, top: 10, bottom: 10 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    bonusButton.on('pointerdown', () => {
        console.log('Bonus Badge clicked (not wired up yet).');
    });

    endButton.on('pointerdown', () => {
        this.scene.start('EndPledgeScene');
    });
  }
}