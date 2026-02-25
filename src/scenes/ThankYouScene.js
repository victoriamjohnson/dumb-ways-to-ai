import gameState from '../gameState.js';

export default class ThankYouScene extends Phaser.Scene {
  constructor() {
    super('ThankYouScene');
  }

  create() {
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    this.cameras.main.setBackgroundColor('#1b262c');

    this.add.text(centerX, centerY - 80, 'Thank you for playing!', {
      fontSize: '32px',
      color: '#ffffff'
    }).setOrigin(0.5);

    const { firstName } = gameState.player;

    this.add.text(
      centerX,
      centerY - 20,
      `Great work, ${firstName || 'Developer'}.\nResponsibleCity is safer because of you.`,
      {
        fontSize: '20px',
        color: '#d1e8ff',
        align: 'center'
      }
    ).setOrigin(0.5);

    const restartButton = this.add.text(centerX, centerY + 80, 'Restart for New Student', {
      fontSize: '24px',
      backgroundColor: '#16a085',
      color: '#ffffff',
      padding: { left: 32, right: 32, top: 10, bottom: 10 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    restartButton.on('pointerdown', () => {
      gameState.player.firstName = '';
      gameState.player.lastInitial = '';
      gameState.player.grade = '';

      gameState.score = 0;
      gameState.badges = 3;
      gameState.bonusUsed = 0;

      this.scene.start('TitleScene');
    });
  }
}