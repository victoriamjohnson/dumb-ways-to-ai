// src/scenes/LoginScene.js

import gameState from '../gameState.js';

export default class LoginScene extends Phaser.Scene {
  constructor() {
    super('LoginScene');
  }

  create() {
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    this.cameras.main.setBackgroundColor('#222831');

    // Title
    this.add.text(centerX, centerY - 220, 'Developer Login', {
        fontSize: '36px',
        color: '#ffffff'
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(centerX, centerY - 180, 'Enter your info to begin training', {
        fontSize: '20px',
        color: '#dddddd'
    }).setOrigin(0.5);

    // Common X positions for labels and inputs
    const labelX = centerX - 120;
    const inputX = centerX + 80;

    // First Name
    this.add.text(labelX, centerY - 80, 'First Name:', {
        fontSize: '20px',
        color: '#ffffff'
    }).setOrigin(1, 0.5);

    const firstNameInput = this.add.dom(inputX, centerY - 80, 'input', {
        type: 'text',
        fontSize: '18px',
        padding: '5px 10px',
        width: '220px',
        borderRadius: '8px',
        border: '2px solid #ffffff'
    });

    // Last Initial
    this.add.text(labelX, centerY - 20, 'Last Initial:', {
        fontSize: '20px',
        color: '#ffffff'
    }).setOrigin(1, 0.5);

    const lastInitialInput = this.add.dom(inputX, centerY - 20, 'input', {
        type: 'text',
        fontSize: '18px',
        padding: '5px 10px',
        width: '80px',
        borderRadius: '8px',
        border: '2px solid #ffffff',
        textTransform: 'uppercase'
    });

    // Grade
    this.add.text(labelX, centerY + 40, 'Grade Level:', {
        fontSize: '20px',
        color: '#ffffff'
    }).setOrigin(1, 0.5);

    const gradeSelect = this.add.dom(inputX, centerY + 40, 'select', {
        fontSize: '18px',
        padding: '5px 10px',
        width: '140px',
        borderRadius: '8px',
        border: '2px solid #ffffff'
    });

    const selectElement = gradeSelect.node;
    const grades = ['', '6', '7', '8', '9'];
    grades.forEach(g => {
        const option = document.createElement('option');
        option.value = g;
        option.text = g === '' ? 'Select' : `Grade ${g}`;
        selectElement.appendChild(option);
    });

    // Status text
    const statusText = this.add.text(centerX, centerY + 110, '', {
        fontSize: '18px',
        color: '#ff9999'
    }).setOrigin(0.5);

    // Continue button
    const continueButton = this.add.text(centerX, centerY + 180, 'Continue', {
        fontSize: '26px',
        backgroundColor: '#00b894',
        color: '#ffffff',
        padding: { left: 24, right: 24, top: 10, bottom: 10 }
    })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

    continueButton.on('pointerover', () => {
        continueButton.setStyle({ backgroundColor: '#019170' });
    });

    continueButton.on('pointerout', () => {
        continueButton.setStyle({ backgroundColor: '#00b894' });
    });

    continueButton.on('pointerdown', () => {
        const firstName = firstNameInput.node.value.trim();
        const lastInitial = lastInitialInput.node.value.trim().charAt(0).toUpperCase();
        const grade = gradeSelect.node.value;

        if (!firstName || !lastInitial || !grade) {
        statusText.setText('Please fill out all fields before continuing.');
        return;
        }

        // Save to global gameState (unchanged from before)
        import('../gameState.js').then(({ default: gameState }) => {
        gameState.player.firstName = firstName;
        gameState.player.lastInitial = lastInitial;
        gameState.player.grade = grade;

        firstNameInput.destroy();
        lastInitialInput.destroy();
        gradeSelect.destroy();

        this.scene.start('HomeScene');
        });
    });
  }
}