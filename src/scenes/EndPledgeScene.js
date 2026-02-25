// src/scenes/EndPledgeScene.js

import gameState from '../gameState.js';

export default class EndPledgeScene extends Phaser.Scene {
  constructor() {
    super('EndPledgeScene');
  }

  create() {
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    this.cameras.main.setBackgroundColor('#1f2833');

    this.add.text(centerX, centerY - 160, 'Responsible AI Pledge', {
        fontSize: '32px',
        color: '#ffffff'
    }).setOrigin(0.5);

    const pledgeText =
        '“I understand that AI affects real people.”\n\n' +
        '“I will design systems that are fair, transparent, accountable,\n' +
        'and respectful of privacy.”\n\n' +
        '“I will remember that technology is powerful —\n' +
        'and responsibility comes with it.”';

    this.add.text(centerX, centerY, pledgeText, {
        fontSize: '20px',
        color: '#d1e8ff',
        align: 'center',
        wordWrap: { width: 900 }
    }).setOrigin(0.5);

    const promiseButton = this.add.text(centerX - 120, centerY + 170, 'I Promise', {
        fontSize: '24px',
        backgroundColor: '#00b894',
        color: '#ffffff',
        padding: { left: 26, right: 26, top: 10, bottom: 10 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const cancelButton = this.add.text(centerX + 120, centerY + 170, 'Cancel', {
        fontSize: '24px',
        backgroundColor: '#c0392b',
        color: '#ffffff',
        padding: { left: 26, right: 26, top: 10, bottom: 10 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const goToLoading = () => {
        this.scene.start('LoadingScene');
    };

    promiseButton.on('pointerdown', goToLoading);
    cancelButton.on('pointerdown', goToLoading);
  }
}