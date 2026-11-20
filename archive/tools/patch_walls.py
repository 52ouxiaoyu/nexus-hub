import re

with open('pvz-web/js/HauntedDorm.js', 'r') as f:
    content = f.read()

old_wall_code = """                        const key = `${rm.x + c},${rm.y + r}`;
                        this.walls.add(key);

                        const wall1 = document.createElement('div');
                        wall1.className = 'tile wall';
                        wall1.style.left = ((rm.x + c) * this.gridSize) + 'px';
                        wall1.style.top = ((rm.y + r) * this.gridSize) + 'px';
                        this.world1.appendChild(wall1);
                    }
                }
            }


            // 生成床(阳光菇)
            this.spawnPlant(rm.x + rm.tpl.bed.c, rm.y + rm.tpl.bed.r, 'sunshroom');
        }"""

new_wall_code = """                        const key = `${rm.x + c},${rm.y + r}`;
                        this.walls.add(key);
                    }
                }
            }


            // 生成床(阳光菇)
            this.spawnPlant(rm.x + rm.tpl.bed.c, rm.y + rm.tpl.bed.r, 'sunshroom');
        }

        // 第二遍遍历：根据相邻关系渲染墙面，只让外侧角圆润
        for (const key of this.walls) {
            const [cStr, rStr] = key.split(',');
            const c = parseInt(cStr);
            const r = parseInt(rStr);

            const hasTop = this.walls.has(`${c},${r-1}`);
            const hasBottom = this.walls.has(`${c},${r+1}`);
            const hasLeft = this.walls.has(`${c-1},${r}`);
            const hasRight = this.walls.has(`${c+1},${r}`);

            let tl = (!hasTop && !hasLeft) ? 24 : 0;
            let tr = (!hasTop && !hasRight) ? 24 : 0;
            let bl = (!hasBottom && !hasLeft) ? 24 : 0;
            let br = (!hasBottom && !hasRight) ? 24 : 0;

            const wall1 = document.createElement('div');
            wall1.className = 'tile wall';
            wall1.style.left = (c * this.gridSize) + 'px';
            wall1.style.top = (r * this.gridSize) + 'px';
            wall1.style.borderRadius = `${tl}px ${tr}px ${br}px ${bl}px`;
            
            // 为了消除子像素间隙，让它们轻微放大
            wall1.style.transform = 'scale(1.02)';
            
            this.world1.appendChild(wall1);
        }"""

content = content.replace(old_wall_code, new_wall_code)

with open('pvz-web/js/HauntedDorm.js', 'w') as f:
    f.write(content)
