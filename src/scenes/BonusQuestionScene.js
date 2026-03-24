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
        question: 'A self-driving car hits somebody\'s service animal. Who is to blame?',
        options: {
          A: 'The autonomous vehicle',
          B: 'The developer of the autonomous vehicle',
          C: 'The passenger of the autonomous vehicle',
          D: 'The service animal'
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

    // Block if both bonus questions already used
    if (gameState.bonusUsed >= 2) {
      this.time.delayedCall(150, () => this.scene.start('EndPledgeScene'));
      return;
    }

    // Pick a random question, avoiding one already used this run
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
    const boxTop  = height * 0.62;

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
        // ── Correct: restore a life and resume ──
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
        // ── Wrong: check if there's still an unused question left ──
        gameState.score  = this.score;
        gameState.badges = 0;

        const stillAvailable = this.questionPool.filter(
          (_, i) => !gameState.usedBonusQuestions.includes(i)
        );

        if (stillAvailable.length > 0 && gameState.bonusUsed < 2) {
          // Another question exists — send them back to ChallengeScene which
          // will see badges === 0 and re-show the bonus popup for the next question
          this.scene.start(this.returnScene, {
            resumeRun:         true,
            fromBonusQuestion: true,
            bonusCorrect:      false,
            timeRemaining:     this.timeRemaining,
            score:             gameState.score,
            badges:            0
          });
        } else {
          // Both questions used or none left — truly game over
          this.scene.start(this.returnScene, {
            resumeRun:         true,
            fromBonusQuestion: true,
            bonusCorrect:      false,
            timeRemaining:     this.timeRemaining,
            score:             gameState.score,
            badges:            0
          });
        }
      }
    });
  }
}