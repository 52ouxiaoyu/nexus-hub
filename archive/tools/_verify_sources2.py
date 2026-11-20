#!/usr/bin/env python3
"""Refined manifest verification: sample 3 videos (first/mid/last), any-pass counts."""
import json, urllib.parse, urllib.request, ssl, sys

PROXY = "https://nexus-hub-cmo.pages.dev/proxy?url="
CTX = ssl.create_default_context()
UA = {"User-Agent": "okhttp/4.12.0"}

def via_proxy(target, timeout=15):
    req = urllib.request.Request(PROXY + urllib.parse.quote(target, safe=""), headers=UA)
    with urllib.request.urlopen(req, timeout=timeout, context=CTX) as r:
        return r.read()

def pick_m3u8(play_url):
    groups = play_url.replace("###", "$$$").split("$$$")
    for g in groups:
        for seg in g.split("#"):
            u = seg.split("$")[-1]
            if ".m3u8" in u or ".mp4" in u:
                return u
    return None

def check(name, api_base):
    try:
        d = json.loads(via_proxy(api_base + "?ac=list"))
        items = d.get("list") or []
        if not items:
            return name, "FAIL:list-empty"
        n = len(items)
        samples = [items[0], items[n // 2], items[-1]]
        ok_detail = False
        for it in samples:
            vid = it.get("vod_id")
            try:
                dd = json.loads(via_proxy(f"{api_base}?ac=detail&ids={vid}"))
                v = (dd.get("list") or [None])[0]
                pu = (v or {}).get("vod_play_url") or ""
                m3u8 = pick_m3u8(pu)
                if not m3u8:
                    continue
                ok_detail = True
                try:
                    head = via_proxy(m3u8, 12)[:300].decode("utf-8", "ignore")
                    if "EXTM3U" in head or "EXT-X" in head:
                        return name, "PASS"
                except Exception:
                    pass
            except Exception:
                continue
        if ok_detail:
            return name, "FAIL:manifest-all-3-dead"
        return name, "FAIL:detail-no-playurl"
    except Exception as e:
        return name, f"FAIL:{str(e)[:50]}"

CANDS = [
    ("量子", "https://cj.lziapi.com/api.php/provide/vod/at/json/"),
    ("非凡", "https://cj.ffzyapi.com/api.php/provide/vod/at/json/"),
    ("索尼", "https://suoniapi.com/api.php/provide/vod/at/json/"),
    ("百度云", "https://api.apibdzy.com/api.php/provide/vod/at/json/"),
    ("卧龙", "https://collect.vod360.net/api.php/provide/vod/at/json/"),
    ("无尽", "https://api.wujinapi.cc/api.php/provide/vod/at/json/"),
    ("光速", "https://api.guangsuapi.com/api.php/provide/vod/at/json/"),
    ("新浪", "https://api.xinlangapi.com/xinlangapi.php/provide/vod/at/json/"),
    ("最大", "https://api.zuidapi.com/api.php/provide/vod/at/json/"),
    ("牛牛", "https://api.niuniuzy.me/api.php/provide/vod/at/json/"),
    ("速播", "https://subocaiji.com/api.php/provide/vod/at/json/"),
    ("金鹰", "https://jinyingzy.com/api.php/provide/vod/at/json/"),
    ("闪电", "https://sdzyapi.com/api.php/provide/vod/at/json/"),
    ("红牛", "https://www.hongniuzy2.com/api.php/provide/vod/at/json/"),
    ("虎牙", "https://www.huyaapi.com/api.php/provide/vod/at/json/"),
    ("暴风", "https://bfzyapi.com/api.php/provide/vod/at/json/"),
    ("360", "https://360zy.com/api.php/provide/vod/at/json/"),
    ("茅台", "https://caiji.maotaizy.cc/api.php/provide/vod/at/json/"),
]

out = []
for name, base in CANDS:
    r = check(name, base)
    out.append({"name": name, "status": r[1], "api": base})
    print(f"{name:<6} {r[1]}")
    sys.stdout.flush()
json.dump(out, open("/tmp/vod_final.json", "w"), ensure_ascii=False, indent=1)
