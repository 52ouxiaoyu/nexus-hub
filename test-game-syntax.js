const fs = require('fs');
const jsFiles = [
    'js/entities/Entity.js', 'js/entities/Plant.js', 'js/entities/Zombie.js', 'js/entities/Projectile.js', 'js/entities/Sun.js',
    'js/managers/WaveManager.js', 'js/managers/CollisionManager.js', 'js/InputManager.js', 'js/Board.js', 'js/GameLoop.js'
];
jsFiles.forEach(f => {
    try {
        const code = fs.readFileSync('pvz-web/' + f, 'utf8');
        new Function(code);
        console.log(f + " OK");
    } catch (e) {
        console.error(f + " ERROR: " + e.message);
    }
});
