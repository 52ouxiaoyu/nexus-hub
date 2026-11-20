# v4.0.108b：出生在场外后的配套
#  ① 开局 45 秒内 AI 不抢「玩家出生点对应的那间空房」（否则玩家走到门口发现已被占，白跑）
#  ② 开场提示按「人是否已进屋」动态给文案
import io

P = 'js/HauntedDorm.js'
s = io.open(P, encoding='utf-8').read()

def rep(old, new, n=1, tag=''):
    global s
    c = s.count(old)
    assert c == n, f'[{tag}] 期望 {n} 处，实际 {c} 处'
    s = s.replace(old, new)

# ---------------------------------------------------------------- 1. _claimRoom 拦截
rep("""    _claimRoom(p, rm) {
        if (!rm || this._ownsRoom(p, rm)) return true;""",
    """    // v4.0.108：开局房屋预约——玩家出生在屋外，落点对应的空房是他要走进的那间。
    // 开局 45 秒内 AI 不得抢先认领（否则玩家刚走到门口就发现房被别人占了，出生点「场外」直接变成无房可进）。
    _roomReservedForHuman(rm, self) {
        if (!rm) return false;
        if (this.gameTime > (this._homeReservedUntil || 0)) return false;
        for (const p of this.allPlayers) {
            if (!p || p.isAi || p.dead || p._afkHost) continue;
            if (p === self) continue;
            if (p._homeRoom === rm && !p.room && !p.room2) return true;
        }
        return false;
    }

    _claimRoom(p, rm) {
        if (!rm || this._ownsRoom(p, rm)) return true;
        if ((p.isAi || p._afkHost) && this._roomReservedForHuman(rm, p)) return false;""",
    1, 'claimRoom 拦截')

# ---------------------------------------------------------------- 2. AI 选房候选过滤（4 处）
rep("""                        const cand = this.rooms.filter(r => (r.owners || []).length < (r.capacity || 1) &&
                            !(r.owners || []).some(o => (o === this.player || o === this.player2) && o !== p));""",
    """                        const cand = this.rooms.filter(r => (r.owners || []).length < (r.capacity || 1) &&
                            !this._roomReservedForHuman(r, p) &&
                            !(r.owners || []).some(o => (o === this.player || o === this.player2) && o !== p));""",
    1, '托管选房过滤')

rep("""                            const cands = this.rooms.filter(r => r !== oldRm && (!r.owners || r.owners.length < (r.capacity || 1)));""",
    """                            const cands = this.rooms.filter(r => r !== oldRm && (!r.owners || r.owners.length < (r.capacity || 1)) &&
                                !this._roomReservedForHuman(r, ai));""",
    1, 'AI 逃亡选房过滤')

rep("""                const cand = this.rooms.filter(r => (r.owners || []).length < (r.capacity || 1) &&
                    !(r.owners || []).some(o => (o === this.player || o === this.player2) && o !== ai));""",
    """                const cand = this.rooms.filter(r => (r.owners || []).length < (r.capacity || 1) &&
                    !this._roomReservedForHuman(r, ai) &&
                    !(r.owners || []).some(o => (o === this.player || o === this.player2) && o !== ai));""",
    1, 'AI 兜底选房过滤')

rep("""                        } else if (ai.targetRoom.owners.length < ai.targetRoom.capacity && !rmBlockedByPlayer &&""",
    """                        } else if (ai.targetRoom.owners.length < ai.targetRoom.capacity && !rmBlockedByPlayer &&
                            !this._roomReservedForHuman(ai.targetRoom, ai) &&""",
    1, 'AI 抵达床位认领前判定')

# ---------------------------------------------------------------- 3. _placeHomeSpawn 末尾设预约截止
rep("""            p._homeDoor = { x: best.frontX, y: best.frontY };           // 房门坐标（引导文案/镜头朝向备用）
        }
    }""",
    """            p._homeDoor = { x: best.frontX, y: best.frontY };           // 房门坐标（引导文案/镜头朝向备用）
        }
        // v4.0.108：玩家还没进门之前，这几间房先给玩家留着（AI 45 秒内不认领）
        this._homeReservedUntil = 45000;
    }""",
    1, '预约截止时间')

# ---------------------------------------------------------------- 4. 开场提示按是否已进屋动态给文案
rep("""                tip.innerText = '🏠 你在屋外 → 走进最近的空房，点地板种植物才有阳光';""",
    """                // v4.0.108：按「人此刻在哪」给文案——出生点在屋外，但也可能提示时才刚跑进屋
                const outside = !this._insideRoom(Math.floor(this.player.x / 80), Math.floor(this.player.y / 80));
                tip.innerText = outside
                    ? '🏠 你在屋外 → 走进最近的空房，点地板种植物才有阳光'
                    : '🏠 点脚下地板种一株植物 → 开始产阳光';""",
    1, '动态引导文案')

io.open(P, 'w', encoding='utf-8').write(s)
print('ok')
