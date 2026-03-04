// src/scenes/ThankYouScene.js
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

  create() {
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

    // Calculate Final Rank accurately
    const finalRank = this.getFinalRank();

    this.add.text(
      width * 0.55,
      height * 0.40,
      `Great job! You ranked #${finalRank}\non the Leaderboard with\n${gameState.score} points.`,
      {
        fontSize: '26px',
        color: '#ffffff',
        fontFamily: 'Courier, monospace',
        align: 'center',
        fontStyle: 'bold',
        wordWrap: { width: width * 0.4 }
      }
    ).setOrigin(0.5);

    const btnZone = this.add.zone(width * 0.66, height * 0.75, width * 0.50, height * 0.14)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    btnZone.on('pointerdown', () => {
      window.location.reload();
    });
  }

  getFinalRank() {
    const name = `${(gameState.player?.firstName || 'Developer').trim()} ${(gameState.player?.lastInitial || '').trim()}`.trim();
    let entries = [];
    try {
      entries = JSON.parse(localStorage.getItem(this.leaderboardKey)) || [];
    } catch (e) {
      entries = [];
    }
    
    // Sort all entries strictly by score descending
    entries.sort((a, b) => b.score - a.score);

    // Find the current player's highest rank
    const rank = entries.findIndex(e => e.name === name) + 1;
    
    // Fallback if list is empty or name is missing
    return rank > 0 ? rank : 1;
  }
}