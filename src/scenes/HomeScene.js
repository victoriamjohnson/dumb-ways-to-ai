// src/scenes/HomeScene.js

import gameState from '../gameState.js';

export default class HomeScene extends Phaser.Scene {
  constructor() {
    super('HomeScene');
  }

  create() {
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    this.cameras.main.setBackgroundColor('#34495e');

    const { firstName, lastInitial, grade } = gameState.player;

    this.add.text(centerX, centerY - 220, 'ResponsibleCity AI Labs', {
        fontSize: '32px',
        color: '#ffffff'
    }).setOrigin(0.5);

    this.add.text(
        centerX,
        centerY - 170,
        `Welcome, ${firstName} ${lastInitial}. (Grade ${grade})`,
        {
        fontSize: '22px',
        color: '#ecf0f1'
        }
    ).setOrigin(0.5);

    // Tutorial button
    const tutorialButton = this.add.text(centerX, centerY - 40, 'Tutorial', {
        fontSize: '28px',
        backgroundColor: '#2980b9',
        color: '#ffffff',
        padding: { left: 40, right: 40, top: 14, bottom: 14 }
    })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

    tutorialButton.on('pointerover', () => {
        tutorialButton.setStyle({ backgroundColor: '#1c5f87' });
    });
    tutorialButton.on('pointerout', () => {
        tutorialButton.setStyle({ backgroundColor: '#2980b9' });
    });
    tutorialButton.on('pointerdown', () => {
        this.scene.start('TutorialStoryScene');
    });

    // Challenge button
    const challengeButton = this.add.text(centerX, centerY + 60, 'Challenge Mode', {
        fontSize: '28px',
        backgroundColor: '#c0392b',
        color: '#ffffff',
        padding: { left: 40, right: 40, top: 14, bottom: 14 }
    })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

    challengeButton.on('pointerover', () => {
        challengeButton.setStyle({ backgroundColor: '#8e281d' });
    });
    challengeButton.on('pointerout', () => {
        challengeButton.setStyle({ backgroundColor: '#c0392b' });
    });
    challengeButton.on('pointerdown', () => {
        this.scene.start('ChallengeScene');
    });
  }
}