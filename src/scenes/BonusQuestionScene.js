// src/scenes/BonusQuestionScene.js
import gameState from '../gameState.js';

export default class BonusQuestionScene extends Phaser.Scene {
  constructor() {
    super('BonusQuestionScene');
  }

  preload() {
    this.load.image('bonus_question_bg', 'assets/ui/Bonus_Question.png');
  }

  init(data) {
    this.returnScene = data?.returnScene || 'ChallengeScene';
    this.timeRemaining = data?.timeRemaining ?? 120;
    this.score = data?.score ?? 0;
    this.badges = data?.badges ?? 0;
  }

  create() {
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;

    this.cameras.main.setBackgroundColor('#000814');

    const bg = this.add.image(centerX, centerY, 'bonus_question_bg').setOrigin(0.5);
    const scale = Math.min(width / bg.width, height / bg.height);
    bg.setScale(scale);

    if (!gameState.bonusUsed) gameState.bonusUsed = 0;
    if (gameState.bonusUsed >= 1) {
      this.time.delayedCall(150, () => this.scene.start('EndPledgeScene'));
      return;
    }

    const boxLeft = width * 0.12;  
    const boxTop = height * 0.60;  

    this.add.text(boxLeft, boxTop, 'Which of these is NOT a principle of Responsible AI?', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'Courier, monospace',
      fontStyle: 'bold',
      wordWrap: { width: width * 0.76 }
    });

    const style = { 
      fontSize: '22px', 
      color: '#ffffff', 
      fontFamily: 'Courier, monospace', 
      fontStyle: 'bold' 
    };
    
    this.options = {
      A: this.add.text(boxLeft + 30, boxTop + 50,  'A) Fairness', style),
      B: this.add.text(boxLeft + 30, boxTop + 85,  'B) Transparency', style),
      C: this.add.text(boxLeft + 30, boxTop + 120, 'C) Privacy', style),
      D: this.add.text(boxLeft + 30, boxTop + 155, 'D) Accountability', style),
      E: this.add.text(boxLeft + 30, boxTop + 190, 'E) Friendly', style)
    };

    this.hintText = this.add.text(centerX, height * 0.92, 'Press A–E to choose, then press ENTER to submit.', {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'Courier, monospace'
    }).setOrigin(0.5);

    this.selected = null;

    const setSelected = (letter) => {
      Object.values(this.options).forEach(opt => opt.setColor('#ffffff'));
      this.selected = letter;
      this.options[letter].setColor('#ffd400'); 
    };

    this.keys = this.input.keyboard.addKeys('A,B,C,D,E,ENTER');

    this.keys.A.on('down', () => setSelected('A'));
    this.keys.B.on('down', () => setSelected('B'));
    this.keys.C.on('down', () => setSelected('C'));
    this.keys.D.on('down', () => setSelected('D'));
    this.keys.E.on('down', () => setSelected('E'));

    // --- CLEANED UP SUBMIT ACTION ---
    this.keys.ENTER.on('down', () => {
      if (!this.selected) {
        this.hintText.setText('Pick an answer first (A–E), then press ENTER.').setColor('#ffd400');
        return;
      }

      const isCorrect = (this.selected === 'E');
      gameState.bonusUsed = 1;

      if (isCorrect) {
        // Correct path
        const currentBadges = Number.isFinite(this.badges) ? this.badges : (gameState.badges ?? 0);
        gameState.badges = Math.min(3, currentBadges + 1);
        gameState.score = this.score;

        this.scene.start(this.returnScene, {
          resumeRun: true,
          fromBonusQuestion: true,
          bonusCorrect: true,
          timeRemaining: this.timeRemaining,
          score: gameState.score,
          badges: gameState.badges
        });
      } else {
        // Incorrect path - now properly goes to ChallengeScene result screen
        gameState.score = this.score;
        gameState.badges = 0;

        this.scene.start(this.returnScene, {
          resumeRun: true,
          fromBonusQuestion: true,
          bonusCorrect: false, // Flag for the "All Lives Lost" message
          timeRemaining: this.timeRemaining,
          score: gameState.score,
          badges: 0
        });
      }
    });
  }
}