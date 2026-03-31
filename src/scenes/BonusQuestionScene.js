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
        correctAnswer: 'A',
        correctFeedback: '"Friendly" is not a Responsible AI principle.\nThe 4 principles are Fairness, Transparency, Privacy, and Accountability.',
        incorrectFeedback: 'The correct answer is A — Friendly.\n"Friendly" is not one of the 4 Responsible AI principles.'
      },
      {
        question: 'A self-driving car hits somebody\'s service animal.\nWho is to blame?',
        options: {
          A: 'The autonomous vehicle',
          B: 'The developer of the autonomous vehicle',
          C: 'The passenger of the autonomous vehicle',
          D: 'The service animal'
        },
        correctAnswer: 'B',
        correctFeedback: 'Correct! The developer is responsible.\nAI does not make its own decisions — the people who built it are accountable.',
        incorrectFeedback: 'The correct answer is B — the developer.\nWhen AI causes harm, the humans who built and deployed it are responsible.'
      },
      {
        question: 'An AI that recommends students for advanced classes is using data from only one school in one neighborhood.\nWhat is most likely to happen?',
        options: {
          A: 'The AI will figure out how to be fair on its own',
          B: 'The AI will ask for more data before making decisions',
          C: 'The AI will unfairly favor students like those in its training data',
          D: 'Nothing, AI does not make mistakes'
        },
        correctAnswer: 'C',
        correctFeedback: 'Correct! Narrow training data leads to unfair outcomes.\nAI reflects the patterns it learns — not what is actually fair.',
        incorrectFeedback: 'The correct answer is C.\nWhen training data lacks diversity, AI decisions will be biased toward the groups it knows best.'
      },
      {
        question: 'Which of the following best shows a developer\nrespecting user privacy?',
        options: {
          A: 'Collecting extra data just in case it becomes useful later',
          B: 'Sharing user data with partners without telling users',
          C: 'Only requesting permissions the app actually needs',
          D: 'Storing all user data forever to improve the AI'
        },
        correctAnswer: 'C',
        correctFeedback: 'Correct! Responsible developers only collect what is necessary.\nCollecting more than you need puts users at risk.',
        incorrectFeedback: 'The correct answer is C.\nResponsible developers only request data the app actually needs to function.'
      },
      {
        question: 'Which of the following best explains why AI transparency\nbuilds user trust?',
        options: {
          A: 'Better accuracy means users can always rely on the AI',
          B: 'Faster processing speeds allow the AI to handle more requests',
          C: 'Fewer mistakes means users never have to question the AI',
          D: 'Users can see how decisions are made and challenge outcomes'
        },
        correctAnswer: 'D',
        correctFeedback: 'Correct! Transparency lets users understand and question AI decisions.\nThat ability to challenge outcomes is what builds real trust.',
        incorrectFeedback: 'The correct answer is D.\nTransparency means users can see how decisions are made and push back when something seems wrong.'
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

    this.cameras.main.setBackgroundColor('#000814');

    const bg = this.add.image(centerX, height / 2, 'bonus_question_bg').setOrigin(0.5);
    bg.setScale(Math.min(width / bg.width, height / bg.height));

    if (!gameState.bonusUsed) gameState.bonusUsed = 0;

    // Block if all 3 bonus questions already used
    if (gameState.bonusUsed >= 3) {
      this.time.delayedCall(150, () => this.scene.start('EndPledgeScene'));
      return;
    }

    // Pick a random question, avoiding ones already used this run
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
    const boxTop = height * 0.63;

    // ── Question text ──
    this.questionText = this.add.text(boxLeft, boxTop, currentQuestion.question, {
      fontSize: '22px',
      color: '#ffffff',
      fontFamily: 'Courier, monospace',
      fontStyle: 'bold',
      wordWrap: { width: width * 0.76 }
    });

    const optionStyle = {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'Courier, monospace',
      fontStyle: 'bold'
    };

    // ── Answer options ──
    this.options = {};
    const letters = Object.keys(currentQuestion.options);

    // Calculate starting Y based on how many lines the question takes
    const questionLines = currentQuestion.question.split('\n').length;
    const optionStartY = boxTop + (questionLines * 28) + 16;

    letters.forEach((letter, i) => {
      this.options[letter] = this.add.text(
        boxLeft + 20,
        optionStartY + i * 32,
        `${letter}) ${currentQuestion.options[letter]}`,
        optionStyle
      );
    });

    // ── Hint text ──
    this.hintText = this.add.text(
      centerX, height * 0.93,
      `Press ${letters.join(', ')} to choose — then press ENTER to submit.`, {
        fontSize: '18px',
        color: '#aaaaaa',
        fontFamily: 'Courier, monospace'
      }
    ).setOrigin(0.5);

    // ── Feedback text (hidden until answer submitted) ──
    this.feedbackText = this.add.text(
      boxLeft, height * 0.80, '', {
        fontSize: '22px',
        fontFamily: 'Courier, monospace',
        fontStyle: 'bold',
        wordWrap: { width: width * 0.76 }
      }
    ).setVisible(false);

    this.selected = null;
    this.answered = false;

    const setSelected = (letter) => {
      if (this.answered) return;
      Object.values(this.options).forEach(opt => opt.setColor('#ffffff'));
      this.selected = letter;
      this.options[letter].setColor('#ffd400');
    };

    const keyString = [...letters, 'ENTER', 'SPACE'].join(',');
    this.keys = this.input.keyboard.addKeys(keyString);

    letters.forEach(letter => {
      if (this.keys[letter]) {
        this.keys[letter].on('down', () => setSelected(letter));
      }
    });

    // ── ENTER: submit answer or advance after feedback ──
    this.keys.ENTER.on('down', () => this.handleEnter(currentQuestion, letters));

    // ── Click also advances after feedback ──
    this.input.on('pointerdown', () => {
      if (this.answered) this.resolveOutcome(currentQuestion);
    });
  }

  handleEnter(currentQuestion, letters) {
    // If already answered, advance to outcome
    if (this.answered) {
      this.resolveOutcome(currentQuestion);
      return;
    }

    // No answer selected yet
    if (!this.selected) {
      this.hintText
        .setText(`Pick an answer first (${letters.join(', ')}) — then press ENTER.`)
        .setColor('#ffd400');
      return;
    }

    // Submit the answer
    const isCorrect = (this.selected === currentQuestion.correctAnswer);
    gameState.bonusUsed = (gameState.bonusUsed ?? 0) + 1;
    sessionLogger.logBonusAnswer(this.selected, isCorrect);
    this.answered = true;
    this.isCorrect = isCorrect;

    this.showFeedback(currentQuestion, isCorrect);
  }

  showFeedback(currentQuestion, isCorrect) {
    const { width, height } = this.scale;
    const boxLeft = width * 0.12;
    const boxTop = height * 0.63;

    // Hide question and all options
    this.questionText.setVisible(false);
    Object.values(this.options).forEach(opt => opt.setVisible(false));

    // CORRECT / INCORRECT header
    this.add.text(boxLeft, boxTop, isCorrect ? '✓ CORRECT!' : '✗ INCORRECT!', {
      fontSize: '28px',
      color: isCorrect ? '#00ff88' : '#ff4444',
      fontFamily: 'Courier, monospace',
      fontStyle: 'bold'
    });

    // Feedback explanation — split on \n so each sentence is its own line
    const feedbackMessage = isCorrect
      ? currentQuestion.correctFeedback
      : currentQuestion.incorrectFeedback;

    const lines = feedbackMessage.split('\n');
    lines.forEach((line, i) => {
      this.add.text(boxLeft, boxTop + 50 + i * 36, line, {
        fontSize: '22px',
        color: '#ffffff',
        fontFamily: 'Courier, monospace',
        wordWrap: { width: width * 0.76 }
      });
    });

    // Update hint
    this.hintText
      .setText('Press ENTER or click to continue.')
      .setColor('#aaaaaa');
  }

  resolveOutcome(currentQuestion) {
    if (this.isCorrect) {
      // Correct: restore a badge and resume
      const currentBadges = Number.isFinite(this.badges) ? this.badges : (gameState.badges ?? 0);
      gameState.badges = Math.min(3, currentBadges + 1);
      gameState.score  = this.score;

      this.scene.start(this.returnScene, {
      resumeRun:         true,
      fromBonusQuestion: true,
      bonusCorrect:      true,   // ← was incorrectly set to false
      timeRemaining:     this.timeRemaining,
      score:             gameState.score,
      badges:            gameState.badges
    });

    } else {
      // Wrong: badges drop to 0, check if another attempt is available
      gameState.score  = this.score;
      gameState.badges = 0;

      const stillAvailable = this.questionPool.filter(
        (_, i) => !gameState.usedBonusQuestions.includes(i)
      );

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
}