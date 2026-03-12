// src/scenes/ThankYouScene.js
import sessionLogger from '../sessionLogger.js';
import gameState from '../gameState.js';

export default class ThankYouScene extends Phaser.Scene {
  constructor() {
    super('ThankYouScene');
    this.leaderboardKey = 'dwai_leaderboard_v1';
  }

  preload() {
    const base = 'assets/thank_you_animations';
    for (let i = 1; i <= 6; i++) {
      this.load.image(`ty_${i}`, `${base}/Thank_You_Screen-${i}.png`);
    }
  }

  async create() {
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;

    this.cameras.main.setBackgroundColor('#77B8FF');

    if (!this.anims.exists('ty_anim')) {
      const frames = [];
      for (let i = 1; i <= 6; i++) frames.push({ key: `ty_${i}` });
      this.anims.create({ key: 'ty_anim', frames, frameRate: 6, repeat: -1 });
    }

    const sprite = this.add.sprite(centerX, centerY, 'ty_1').setOrigin(0.5);
    sprite.setScale(Math.min(width / sprite.width, height / sprite.height));
    sprite.play('ty_anim');

    // Rank text — starts as placeholder while Firebase is queried
    const rankText = this.add.text(
      width * 0.55,
      height * 0.40,
      `Great job!\nCalculating your rank...`,
      {
        fontSize: '26px',
        color: '#ffffff',
        fontFamily: 'Courier, monospace',
        align: 'center',
        fontStyle: 'bold',
        wordWrap: { width: width * 0.4 }
      }
    ).setOrigin(0.5);

    // Fetch rank, record it, write full session to Firebase, then update UI
    const rank = await this.getFinalRankAsync();
    sessionLogger.setFinalRank(rank);
    await sessionLogger.writeToFirebase();

    if (rankText.active) {
      rankText.setText(
        `Great job! You ranked #${rank}\non the Leaderboard with\n${gameState.score} points.`
      );
    }

    const btnZone = this.add.zone(width * 0.66, height * 0.75, width * 0.50, height * 0.14)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    btnZone.on('pointerdown', () => {
      window.location.reload();
    });
  }

  // Fetches all scores from Firebase and finds the player's rank.
  // Falls back to localStorage if Firebase is unavailable.
  async getFinalRankAsync() {
    const name = (gameState.player?.firstName || 'Developer').trim();

    try {
      const db       = firebase.database();
      const snapshot = await db.ref('leaderboard').orderByChild('score').once('value');

      const entries = [];
      snapshot.forEach(child => {
        const val = child.val();
        if (val?.name && typeof val.score === 'number') {
          entries.push({ name: val.name, score: val.score });
        }
      });

      // Firebase returns ascending — reverse for descending rank
      entries.sort((a, b) => b.score - a.score);

      const rank = entries.findIndex(e => e.name === name) + 1;
      return rank > 0 ? rank : entries.length + 1;

    } catch (err) {
      console.warn('Firebase rank lookup failed, falling back to localStorage.', err);
      return this.getFinalRankLocal(name);
    }
  }

  // localStorage fallback
  getFinalRankLocal(name) {
    try {
      const entries = JSON.parse(localStorage.getItem(this.leaderboardKey)) || [];
      entries.sort((a, b) => b.score - a.score);
      const rank = entries.findIndex(e => e.name === name) + 1;
      return rank > 0 ? rank : 1;
    } catch {
      return 1;
    }
  }
}