// src/scenes/TutorialStoryScene.js

import sessionLogger from '../sessionLogger.js';
import gameState from '../gameState.js';

export default class TutorialStoryScene extends Phaser.Scene {
  constructor() {
    super('TutorialStoryScene');
  }

  preload() {
    this.load.image('tutorial_bg', 'assets/ui/Tutorial_Screen.png');
  }

  init(data) {
    // Only treat as outro if explicitly passed — fixes the replay bug
    this.outroMode = data === true || (data && data.outroMode === true);
  }

  create() {
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;

    this.cameras.main.setBackgroundColor('#000814');

    // ----- BACKGROUND -----
    const bg = this.add.image(centerX, centerY, 'tutorial_bg').setOrigin(0.5);
    bg.setScale(Math.min(width / bg.width, height / bg.height));

    const { firstName } = gameState.player;
    const dev = firstName ? `Developer ${firstName}` : 'Developer';

    // ----- DIALOG BOX TEXT -----
    const textLeftX = width * 0.12;
    const speakerY  = height * 0.65;
    const bodyY     = height * 0.70;

    this.dialogueBox = bg;

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

    // ----- INTRO VS OUTRO -----
    if (this.outroMode) {
      this.dialogue = [
        {
          speaker: 'Dr. Bot',
          text: `${dev}, you did it!\nTutorial complete!`
        },
        {
          speaker: 'Dr. Bot',
          text: `${dev}, you have seen what Developer Doom's bad decisions look like.\nAnd more importantly, you know how to fix them.`
        },
        {
          speaker: 'Dr. Bot',
          text: `Now it is time for the REAL test!\nThe city's AI systems are going live in 2 minutes.`
        },
        {
          speaker: 'Dr. Bot',
          text: `No explanations. No hand-holding. Just you and the clock.\nNo pressure... okay, a little pressure.`
        },
        {
          speaker: 'Dr. Bot',
          text: `${dev}, head to Challenge Mode when you are ready.\nThe city is counting on you. Good luck!`
        }
      ];
    } else {
      this.dialogue = [
        {
          speaker: 'Dr. Bot',
          text: `${dev}, welcome to ResponsibleCity AI Labs!\nWe are very glad you are here.`
        },
        {
          speaker: 'Dr. Bot',
          text: `${dev}, I will be honest with you.\nOne coder named Developer Doom keeps shipping reckless AI and the city is paying for it.`
        },
        {
          speaker: 'Dr. Bot',
          text: `${dev}, that is where YOU come in!\nYour job: counter Doom's bad designs and earn the title Certified Responsible Developer.`
        },
        {
          speaker: 'Dr. Bot',
          text: `${dev}, to do that you will need to master 4 Principles of Responsible AI.\nThink of them as your superpowers.`
        },
        { type: 'principles' },
        {
          speaker: 'Dr. Bot',
          text: `${dev}, learn these well!\nThe city thrives when you use them. It glitches when you don't.`
        },
        {
          speaker: 'Dr. Bot',
          text: `${dev}, let's begin your training.\nTry to keep up!`
        }
      ];
    }

    this.currentIndex = 0;

    this.input.keyboard.on('keyup-SPACE', () => this.advanceDialogue());
    this.input.on('pointerdown', () => this.advanceDialogue());

    sessionLogger.logTutorialStart();

    this.showCurrentStep();
  }

  showCurrentStep() {
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;

    if (this.currentIndex >= this.dialogue.length) {
      this.endDialogue();
      return;
    }

    const step = this.dialogue[this.currentIndex];

    if (step.type === 'principles') {
      this.mode = 'principles';

      this.speakerText.setVisible(false);
      this.bodyText.setVisible(false);

      if (this.principlesTitle) this.principlesTitle.destroy();
      if (this.principlesList)  this.principlesList.destroy();

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

    this.mode = 'dialogue';

    if (this.principlesTitle) { this.principlesTitle.destroy(); this.principlesTitle = null; }
    if (this.principlesList)  { this.principlesList.destroy();  this.principlesList  = null; }

    this.speakerText.setVisible(true);
    this.bodyText.setVisible(true);

    this.speakerText.setText(step.speaker || '');
    this.bodyText.setText(step.text || '');
  }

  advanceDialogue() {
    this.currentIndex += 1;
    this.showCurrentStep();
  }

  endDialogue() {
    if (this.outroMode) {
      this.scene.start('HomeScene');
    } else {
      this.scene.start('FairnessTutorialScene');
    }
  }
}