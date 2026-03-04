// src/scenes/LoadingScene.js
import gameState from '../gameState.js';

export default class LoadingScene extends Phaser.Scene {
  constructor() {
    super('LoadingScene');
  }

  preload() {
    this.load.image('collecting_bg', 'assets/ui/Collecting_Data.png');
  }

  create() {
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;

    this.cameras.main.setBackgroundColor('#000814');

    const bg = this.add.image(centerX, centerY, 'collecting_bg').setOrigin(0.5);
    const s = Math.min(width / bg.width, height / bg.height);
    bg.setScale(s);

    const { firstName } = gameState.player || {};

    // Dialog text (placed around lower-mid)
    this.add.text(
    width * 0.74, // Moves text to the right into the black box
    height * 0.55, // Moves text up slightly to fit the box height
    `Great work Developer ${firstName || ''}.\nResponsibleCity is safer because of you.`,
    {
        fontSize: '26px', // Slightly smaller to ensure it fits the box padding
        color: '#ffffff',
        fontFamily: 'Courier, monospace',
        align: 'center',
        lineSpacing: 10, // Adds a little breathing room between lines
        wordWrap: { width: width * 0.35 } // Narrower wrap so it doesn't bleed out of the black box
    }
    ).setOrigin(0.5);

    // Loading bar (not super top; above center-ish)
    const barWidth = 500; // Fixed width for a consistent look under the title
    const barHeight = 26;

    // Adjusting barY to 0.25 puts it in the upper blue area
    const barY = height * 0.25;

    const barBg = this.add.rectangle(centerX, barY, barWidth, barHeight, 0x000000, 0.45)
      .setStrokeStyle(2, 0xffffff, 0.85);

    const fill = this.add.rectangle(centerX - barWidth / 2 + 6, barY, 0, barHeight - 8, 0xffffff, 0.9)
      .setOrigin(0, 0.5);

    let progress = 0;

    this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => {
        progress += 0.04;
        if (progress > 1) progress = 1;

        fill.width = (barWidth - 12) * progress;

        if (progress >= 1) {
          this.time.delayedCall(250, () => {
            this.scene.start('ThankYouScene');
          });
        }
      }
    });
  }
}