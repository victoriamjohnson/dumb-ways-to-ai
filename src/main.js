import TitleScene from './scenes/TitleScene.js';
import LoginScene from './scenes/LoginScene.js';
import HomeScene from './scenes/HomeScene.js';
import TutorialStoryScene from './scenes/TutorialStoryScene.js';
import FairnessTutorialScene from './scenes/FairnessTutorialScene.js';
import ChallengeScene from './scenes/ChallengeScene.js';
import EndPledgeScene from './scenes/EndPledgeScene.js';
import LoadingScene from './scenes/LoadingScene.js';
import ThankYouScene from './scenes/ThankYouScene.js';
import BonusPromptScene from './scenes/BonusPromptScene.js';

const config = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  parent: 'game-container',
  backgroundColor: '#87CEEB',
  scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  dom: {
    createContainer: true
  },
  scene: [
    TitleScene,
    LoginScene,
    HomeScene,
    TutorialStoryScene,
    FairnessTutorialScene,
    ChallengeScene,
    EndPledgeScene,
    LoadingScene,
    ThankYouScene,
    BonusPromptScene
  ]
};

new Phaser.Game(config);