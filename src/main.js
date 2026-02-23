// Phaser Game Configuration
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
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
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

// Create the Phaser game
const game = new Phaser.Game(config);

// Game state
let firebaseConnected = false;

// Preload function - loads assets before game starts
function preload() {
    console.log("Preload: Loading assets...");
    // We'll add sprite loading here later
}

// Create function - sets up the game
function create() {
    console.log("Create: Setting up the game...");
    
    // Title text
    this.add.text(400, 150, 'Dumb Ways to AI', {
        fontSize: '56px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 6
    }).setOrigin(0.5);
    
    // Subtitle
    this.add.text(400, 250, 'Test Build v0.2', {
        fontSize: '24px',
        color: '#ffffff'
    }).setOrigin(0.5);
    
    // Instructions
    const instructionText = this.add.text(400, 350, 'Press SPACE to test Firebase', {
        fontSize: '20px',
        color: '#ffff00'
    }).setOrigin(0.5);
    
    // Status text (will update when Firebase connects)
    const statusText = this.add.text(400, 450, 'Waiting for Firebase test...', {
        fontSize: '18px',
        color: '#ffffff'
    }).setOrigin(0.5);
    
    // Spacebar key
    const spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    
    // When spacebar is pressed
    spaceKey.on('down', () => {
        console.log("Testing Firebase connection...");
        statusText.setText('Testing Firebase...');
        
        // Create test data
        const testData = {
            message: 'Hello from Phaser!',
            timestamp: Date.now(),
            test_number: Math.floor(Math.random() * 1000)
        };
        
        // Try to write to Firebase
        database.ref('test').push(testData)
            .then(() => {
                console.log("Firebase connected successfully!");
                statusText.setText('Firebase Connected!');
                statusText.setColor('#00ff00');
                firebaseConnected = true;
                
                // Now test leaderboard
                return database.ref('leaderboard').push({
                    name: 'TestPlayer',
                    score: 999,
                    timestamp: Date.now()
                });
            })
            .then(() => {
                console.log("Leaderboard test successful!");
                statusText.setText('All Systems Working!');
            })
            .catch((error) => {
                console.error("Firebase error:", error);
                statusText.setText('Firebase Error: ' + error.message);
                statusText.setColor('#ff0000');
            });
    });
}

// Update function - runs every frame
function update() {
    // Game loop (empty for now)
}

console.log("Game code loaded!");
