// src/scenes/TutorialStoryScene.js

import gameState from '../gameState.js';

export default class TutorialStoryScene extends Phaser.Scene {
  constructor() {
    super('TutorialStoryScene');
  }

  create() {
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    this.cameras.main.setBackgroundColor('#0b1f33');

    const { firstName } = gameState.player;

    // Title at top center
    this.add.text(centerX, 60, 'ResponsibleCity AI Labs', {
        fontSize: '28px',
        color: '#ffffff'
    }).setOrigin(0.5);

    // Dialogue box near bottom center
    this.dialogueBox = this.add.rectangle(
        centerX,
        centerY + 150,
        900,
        230,
        0x000000,
        0.6
    ).setStrokeStyle(2, 0xffffff);

    this.speakerText = this.add.text(centerX - 420, centerY + 70, '', {
        fontSize: '20px',
        color: '#ffd166',
        fontStyle: 'bold'
    }).setOrigin(0, 0.5);

    this.bodyText = this.add.text(centerX - 420, centerY + 105, '', {
        fontSize: '22px',
        color: '#ffffff',
        wordWrap: { width: 840 }
    });

    this.hintText = this.add.text(
        centerX,
        this.scale.height - 40,
        'Press SPACE or click to continue',
        {
        fontSize: '18px',
        color: '#aaaaaa'
        }
    ).setOrigin(0.5);

    this.mode = 'dialogue';

    this.dialogue = [
        { speaker: 'Narrator', text: 'You are a new intern at ResponsibleCity AI Labs.' },
        { speaker: 'Narrator', text: 'Tagline: "Building AI that puts people first."' },
        { speaker: 'Narrator', text: 'The city runs on AI systems.\nBut not all developers build responsibly.' },
        { speaker: 'Narrator', text: 'Your job: Earn the title of Certified Responsible Developer.' },
        { speaker: 'Dr. Bot', text: `Welcome, Developer${firstName ? ` ${firstName}` : ''}.` },
        { speaker: 'Dr. Bot', text: 'ResponsibleCity runs on AI systems that impact schools, sports, media, and daily life.' },
        { speaker: 'Dr. Bot', text: 'But AI doesn’t make ethical choices.\nDevelopers do.' },
        { speaker: 'Dr. Bot', text: 'Today, you’ll learn the 4 Principles of Responsible AI.' },
        { speaker: 'Dr. Bot', text: 'Follow them… and the city thrives.\nIgnore them… and trust collapses.' },
        { type: 'principles' },
        { speaker: 'Dr. Bot', text: 'Let’s begin your training.' }
    ];

    this.currentIndex = 0;

    this.input.keyboard.on('keyup-SPACE', () => this.advanceDialogue());
    this.input.on('pointerdown', () => this.advanceDialogue());

    this.showCurrentStep(centerX, centerY);
  }

  showCurrentStep() {
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    if (this.currentIndex >= this.dialogue.length) {
        this.startFairnessTutorial();
        return;
    }

    const step = this.dialogue[this.currentIndex];

    if (step.type === 'principles') {
        this.mode = 'principles';

        // Hide dialogue box during principles slide
        this.dialogueBox.setVisible(false);
        this.speakerText.setVisible(false);
        this.bodyText.setVisible(false);

        if (this.principlesTitle) this.principlesTitle.destroy();
        if (this.principlesList) this.principlesList.destroy();

        this.principlesTitle = this.add.text(
        centerX,
        centerY - 40,
        'The 4 Responsible AI Principles',
        {
            fontSize: '30px',
            color: '#ffffff',
            fontStyle: 'bold'
        }
        ).setOrigin(0.5);

        this.principlesList = this.add.text(
        centerX,
        centerY + 40,
        '• Be Fair\n• Be Transparent\n• Protect Privacy\n• Take Accountability',
        {
            fontSize: '24px',
            color: '#ffd166',
            align: 'center'
        }
        ).setOrigin(0.5);

        this.hintText.setText('Press SPACE or click to continue');
        return;
    }

    // Back to normal dialogue
    this.mode = 'dialogue';

    if (this.principlesTitle) {
        this.principlesTitle.destroy();
        this.principlesTitle = null;
    }
    if (this.principlesList) {
        this.principlesList.destroy();
        this.principlesList = null;
    }

    this.dialogueBox.setVisible(true);
    this.speakerText.setVisible(true);
    this.bodyText.setVisible(true);

    this.speakerText.setText(step.speaker || '');
    this.bodyText.setText(step.text || '');
  }

  advanceDialogue() {
    this.currentIndex += 1;
    this.showCurrentStep();
  }

  startFairnessTutorial() {
    // Later this will go to the full fairness tutorial microgame
    this.scene.start('FairnessTutorialScene');
  }
}