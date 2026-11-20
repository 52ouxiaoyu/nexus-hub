const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');

// 1. Fix Revive State
let oldRevive = `                                this.isDowned = false;
                                this.hp = this.maxHp / 2;
                                this.reviveProgress = 0;`;

let newRevive = `                                this.isDowned = false;
                                this.hp = this.maxHp / 2;
                                this.mechHp = 0;
                                this.vehicleHp = 0;
                                this.shieldTime = 0;
                                this.buffTime = 0;
                                this.reviveProgress = 0;`;

if (code.includes(oldRevive)) {
    code = code.replace(oldRevive, newRevive);
    console.log("Patched revive logic.");
} else {
    console.log("Failed to find old revive logic.");
}

// 2. Fix Boss instant-death on collision
let oldCollision = `                }
                this.active = false;
                createParticles(this.x, this.y, '#ff0000', 10);
            }
        }
    }

    draw(ctx) {`;

let newCollision = `                }
                if(!this.isBoss && !this.isUltimateBoss) {
                    this.active = false;
                    createParticles(this.x, this.y, '#ff0000', 10);
                } else {
                    let dx = this.x - target.x;
                    let dy = this.y - target.y;
                    let len = Math.hypot(dx, dy);
                    if(len > 0) {
                        target.x -= (dx/len) * 30;
                        target.y -= (dy/len) * 30;
                    }
                }
            }
        }
    }

    draw(ctx) {`;

if (code.includes(oldCollision)) {
    code = code.replace(oldCollision, newCollision);
    console.log("Patched boss collision logic.");
} else {
    console.log("Failed to find old collision logic.");
}

fs.writeFileSync('game.js', code);
