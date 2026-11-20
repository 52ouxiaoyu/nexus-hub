import re

with open("index.html", "r") as f:
    code = f.read()

# 1. Add BASE_STATS and getDisplayStats
old_load = """        function loadStats() {
            const stats = localStorage.getItem('gamePortalStats');
            return stats ? JSON.parse(stats) : {};
        }"""

new_load = """        const BASE_STATS = {
            'tank': { plays: 1245, time: 1245 * 8 * 60 },
            'calabash': { plays: 156, time: 156 * 15 * 60 },
            'snake': { plays: 2314, time: 2314 * 5 * 60 },
            'zombie': { plays: 54, time: 54 * 20 * 60 },
            'kingdom': { plays: 832, time: 832 * 25 * 60 }
        };

        function loadStats() {
            const stats = localStorage.getItem('gamePortalStats');
            return stats ? JSON.parse(stats) : {};
        }

        function getDisplayStats() {
            const realStats = loadStats();
            let displayStats = {};
            for (const game of games) {
                const id = game.id;
                const base = BASE_STATS[id] || { plays: 0, time: 0 };
                const real = realStats[id] || { plays: 0, time: 0 };
                displayStats[id] = {
                    plays: base.plays + real.plays,
                    time: base.time + real.time
                };
            }
            return displayStats;
        }"""
code = code.replace(old_load, new_load)

# 2. Modify getTotalStats and renderGames to use getDisplayStats
code = code.replace("const stats = loadStats();\n            let totalPlays", "const stats = getDisplayStats();\n            let totalPlays")
code = code.replace("const stats = loadStats();\n            const grid", "const stats = getDisplayStats();\n            const grid")

with open("index.html", "w") as f:
    f.write(code)
