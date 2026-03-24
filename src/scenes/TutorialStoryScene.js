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

  create() {
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;

    this.cameras.main.setBackgroundColor('#000814');

    // ----- BACKGROUND -----
    const bg = this.add.image(centerX, centerY, 'tutorial_bg').setOrigin(0.5);
    bg.setScale(Math.min(width / bg.width, height / bg.height));

    const { firstName } = gameState.player;

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

    // ----- CHECK FOR OUTRO MODE -----
    const data = this.scene.settings.data;
    const isOutro = data && data.outroMode;

    if (isOutro) {
      // Outro dialogue shown after all 4 tutorial microgames are complete
      this.dialogue = [
        {
          speaker: 'Dr. Bot',
          text: `Great work, Developer${firstName ? ` ${firstName}` : ''}. You finished the tutorial!`
        },
        {
          speaker: 'Dr. Bot',
          text: 'You\'ve seen what Developer Doom\'s bad decisions look like — and how to fix them.'
        },
        {
          speaker: 'Dr. Bot',
          text: 'Now it\'s time for the real test. The city\'s AI systems are going live in 2 minutes.'
        },
        {
          speaker: 'Dr. Bot',
          text: 'No explanations. No second chances. Just you and the clock.'
        },
        {
          speaker: 'Dr. Bot',
          text: 'Head to Challenge Mode when you\'re ready. Good luck, Developer.'
        }
      ];
    } else {
      // Intro dialogue shown at the start of the tutorial
      this.dialogue = [
        { speaker: 'Dr. Bot', text: 'Welcome to ResponsibleCity AI Labs.' },
        { speaker: 'Dr. Bot', text: 'One coder, Developer Doom, keeps shipping reckless AI — and the city is paying for it.' },
        { speaker: 'Dr. Bot', text: `That's where you come in, Developer${firstName ? ` ${firstName}` : ''}.` },
        { speaker: 'Dr. Bot', text: 'Your job: counter Doom\'s bad designs and earn the title Certified Responsible Developer.' },
        { type: 'principles' },
        { speaker: 'Dr. Bot', text: 'Let\'s begin your training.' }
      ];
    }

    this.currentIndex = 0;

    this.input.keyboard.on('keyup-SPACE', () => this.advanceDialogue());
    this.input.on('pointerdown', () => this.advanceDialogue());

    // log differently depending on intro vs outro
    if (isOutro) {
      sessionLogger.logTutorialComplete();
    } else {
      sessionLogger.logTutorialStart();
    }

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

    // Back to normal dialogue
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
    const data = this.scene.settings.data;
    const isOutro = data && data.outroMode;

    if (isOutro) {
      // After outro, send student back to HomeScene to choose Challenge Mode
      this.scene.start('HomeScene');
    } else {
      // After intro, start the first tutorial microgame
      this.scene.start('FairnessTutorialScene');
    }
  }
}