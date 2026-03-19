// src/scenes/BonusQuestionScene.js
import sessionLogger from '../sessionLogger.js';
import gameState from '../gameState.js';

export default class BonusQuestionScene extends Phaser.Scene {
  constructor() {
    super('BonusQuestionScene');

    this.questionPool = [
      {
        question: 'Which of these is NOT a principle of Responsible AI?',
        options: {
          A: 'Friendly',
          B: 'Transparency',
          C: 'Privacy',
          D: 'Accountability',
          E: 'Fairness'
        },
        correctAnswer: 'A'
      },
      {
        question: 'When an autonomous vehicle (driverless car) makes a mistake, who is to blame?',
        options: {
          A: 'The autonomous vehicle',
          B: 'The developer of the autonomous vehicle',
          C: 'The person riding in the back of the autonomous vehicle'
        },
        correctAnswer: 'B'
      }
    ];
  }

  preload() {
    this.load.image('bonus_question_bg', 'assets/ui/Bonus_Question.png');
  }

  init(data) {
    this.returnScene   = data?.returnScene   || 'ChallengeScene';
    this.timeRemaining = data?.timeRemaining ?? 120;
    this.score         = data?.score         ?? 0;
    this.badges        = data?.badges        ?? 0;
  }

  create() {
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;

    this.cameras.main.setBackgroundColor('#000814');

    const bg = this.add.image(centerX, centerY, 'bonus_question_bg').setOrigin(0.5);
    bg.setScale(Math.min(width / bg.width, height / bg.height));

    if (!gameState.bonusUsed) gameState.bonusUsed = 0;

    // Block if they've already used both bonus questions
    if (gameState.bonusUsed >= 2) {
      this.time.delayedCall(150, () => this.scene.start('EndPledgeScene'));
      return;
    }

    // Pick a random question, avoiding repeating one already used this run
    if (!gameState.usedBonusQuestions) gameState.usedBonusQuestions = [];
    const available = this.questionPool.filter(
      (_, i) => !gameState.usedBonusQuestions.includes(i)
    );
    const pool = available.length > 0 ? available : this.questionPool;
    const questionIndex = this.questionPool.indexOf(
      Phaser.Utils.Array.GetRandom(pool)
    );
    const currentQuestion = this.questionPool[questionIndex];
    gameState.usedBonusQuestions.push(questionIndex);
    sessionLogger.logBonusTriggered(questionIndex);

    const boxLeft = width * 0.12;
    const boxTop  = height * 0.60;

    this.add.text(boxLeft, boxTop, currentQuestion.question, {
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

    this.options = {};
    const letters = Object.keys(currentQuestion.options);
    letters.forEach((letter, i) => {
      this.options[letter] = this.add.text(
        boxLeft + 30,
        boxTop + 50 + i * 35,
        `${letter}) ${currentQuestion.options[letter]}`,
        style
      );
    });

    this.hintText = this.add.text(
      centerX, height * 0.92,
      `Press ${letters.join('–')} to choose, then press ENTER to submit.`, {
        fontSize: '18px',
        color: '#ffffff',
        fontFamily: 'Courier, monospace'
      }
    ).setOrigin(0.5);

    this.selected = null;

    const setSelected = (letter) => {
      Object.values(this.options).forEach(opt => opt.setColor('#ffffff'));
      this.selected = letter;
      this.options[letter].setColor('#ffd400');
    };

    const keyString = [...letters, 'ENTER'].join(',');
    this.keys = this.input.keyboard.addKeys(keyString);

    letters.forEach(letter => {
      if (this.keys[letter]) {
        this.keys[letter].on('down', () => setSelected(letter));
      }
    });

    this.keys.ENTER.on('down', () => {
      if (!this.selected) {
        this.hintText
          .setText(`Pick an answer first (${letters.join('–')}), then press ENTER.`)
          .setColor('#ffd400');
        return;
      }

      const isCorrect = (this.selected === currentQuestion.correctAnswer);
      gameState.bonusUsed = (gameState.bonusUsed ?? 0) + 1;
      sessionLogger.logBonusAnswer(this.selected, isCorrect);

      if (isCorrect) {
        // Correct — earn a life back and resume
        const currentBadges = Number.isFinite(this.badges) ? this.badges : (gameState.badges ?? 0);
        gameState.badges = Math.min(3, currentBadges + 1);
        gameState.score  = this.score;

        this.scene.start(this.returnScene, {
          resumeRun:         true,
          fromBonusQuestion: true,
          bonusCorrect:      true,
          timeRemaining:     this.timeRemaining,
          score:             gameState.score,
          badges:            gameState.badges
        });

      } else {
        // Wrong — check if there's a second unused question to offer
        gameState.score  = this.score;
        gameState.badges = 0;

        const stillAvailable = this.questionPool.filter(
          (_, i) => !gameState.usedBonusQuestions.includes(i)
        );

        if (stillAvailable.length > 0 && gameState.bonusUsed < 2) {
          // Send back to ChallengeScene's bonus popup so they can try the next question
          this.scene.start(this.returnScene, {
            resumeRun:         true,
            fromBonusQuestion: true,
            bonusCorrect:      false,
            bonusWrongButMore: true,   // ← tells ChallengeScene to re-show popup, not end
            timeRemaining:     this.timeRemaining,
            score:             gameState.score,
            badges:            0
          });
        } else {
          // No more questions left — truly all lives lost
          this.scene.start(this.returnScene, {
            resumeRun:         true,
            fromBonusQuestion: true,
            bonusCorrect:      false,
            bonusWrongButMore: false,
            timeRemaining:     this.timeRemaining,
            score:             gameState.score,
            badges:            0
          });
        }
      }
    });
  }
}