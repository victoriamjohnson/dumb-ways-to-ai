// src/scenes/TutorialStoryScene.js

import sessionLogger from '../sessionLogger.js';
import gameState from '../gameState.js';

export default class TutorialStoryScene extends Phaser.Scene {
  constructor() {
    super('TutorialStoryScene');
  }

  preload() {
    // Background art for the main tutorial dialog screen
    this.load.image('tutorial_bg', 'assets/ui/Tutorial_Screen.png');
  }

  create() {
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;

    this.cameras.main.setBackgroundColor('#000814');

    // ----- BACKGROUND -----
    const bg = this.add.image(centerX, centerY, 'tutorial_bg').setOrigin(0.5);
    const scaleX = width / bg.width;
    const scaleY = height / bg.height;
    const scale = Math.min(scaleX, scaleY);
    bg.setScale(scale);

    const { firstName } = gameState.player;

    // ----- DIALOG BOX TEXT (inside big black box at bottom) -----
    const textLeftX = width * 0.12;      // left margin inside the box
    const speakerY  = height * 0.65;     // speaker name
    const bodyY     = height * 0.70;    // main text

    this.dialogueBox = bg; // reuse bg as a reference

    this.speakerText = this.add.text(textLeftX, speakerY, '', {
      fontSize: '26px',
      color: '#ffd166',
      fontFamily: 'Courier, monospace',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);

    this.bodyText = this.add.text(textLeftX, bodyY, '', {
      fontSize: '26px',
      color: '#ffffff',
      fontFamily: 'Courier, monospace',
      wordWrap: { width: width * 0.76 }
    }).setOrigin(0, 0);

    this.hintText = this.add.text(
      centerX,
      height - 55,
      'Press SPACE or click to continue',
      {
        fontSize: '20px',
        color: '#aaaaaa',
        fontFamily: 'Courier, monospace'
      }
    ).setOrigin(0.5);

    this.mode = 'dialogue';

    // 🎯 SHORT, FUN INTRO WITH DEVELOPER DOOM
    this.dialogue = [
      { speaker: 'Dr. Bot', text: 'Welcome to ResponsibleCity AI Labs.' },
      { speaker: 'Dr. Bot', text: 'Around here we say: "Building AI that puts people first."' },
      { speaker: 'Dr. Bot', text: 'But not everyone here follows the rules…' },
      { speaker: 'Dr. Bot', text: 'One coder, Developer Doom, keeps shipping reckless AI.' },
      { speaker: 'Dr. Bot', text: 'Now the city’s AI for school, sports, and media is glitching everywhere.' },
      { speaker: 'Dr. Bot', text: `That’s where you come in, Developer${firstName ? ` ${firstName}` : ''}.` },
      { speaker: 'Dr. Bot', text: 'Your job: Counter Developer Doom’s bad designs and earn the title Certified Responsible Developer.' },
      { speaker: 'Dr. Bot', text: 'To do that, you’ll use 4 Principles of Responsible AI.' },
      { type: 'principles' },
      { speaker: 'Dr. Bot', text: 'Use them well, and the city thrives. \nIgnore them… and you’re no better than Developer Doom.' },
      { speaker: 'Dr. Bot', text: 'Let’s begin your training.' }
    ];

    this.currentIndex = 0;

    this.input.keyboard.on('keyup-SPACE', () => this.advanceDialogue());
    this.input.on('pointerdown', () => this.advanceDialogue());

    this.showCurrentStep();
  }

  showCurrentStep() {
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;

    if (this.currentIndex >= this.dialogue.length) {
      this.startFairnessTutorial();
      return;
    }

    const step = this.dialogue[this.currentIndex];

    if (step.type === 'principles') {
      this.mode = 'principles';

      // Hide normal dialogue while showing the principles slide
      this.speakerText.setVisible(false);
      this.bodyText.setVisible(false);

      if (this.principlesTitle) this.principlesTitle.destroy();
      if (this.principlesList) this.principlesList.destroy();

      this.principlesTitle = this.add.text(
        centerX,
        centerY + 120,
        'The 4 Responsible AI Principles',
        {
          fontSize: '32px',
          color: '#ffffff',
          fontFamily: 'Courier, monospace',
          fontStyle: 'bold',
          align: 'center'
        }
      ).setOrigin(0.5);

      this.principlesList = this.add.text(
        centerX,
        centerY + 210,
        '• Be Fair\n• Be Transparent\n• Protect Privacy\n• Take Accountability',
        {
          fontSize: '26px',
          color: '#ffd166',
          fontFamily: 'Courier, monospace',
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
    this.scene.start('FairnessTutorialScene');
  }
}