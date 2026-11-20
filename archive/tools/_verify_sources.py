#!/usr/bin/env python3
"""Batch-verify VOD CMS APIs and live m3u sources via the deployed /proxy."""
import json, urllib.parse, urllib.request, ssl, sys

PROXY = "https://nexus-hub-cmo.pages.dev/proxy?url="
CTX = ssl.create_default_context()
UA = {"User-Agent": "okhttp/4.12.0"}

def fetch(url, timeout=15):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout, context=CTX) as r:
        return r.status, r.read()

def via_proxy(target, timeout=15):
    return fetch(PROXY + urllib.parse.quote(target, safe=""), timeout)

VODS = [
    ("无尽", "https://api.wujinapi.cc/api.php/provide/vod"),
    ("光速", "https://api.guangsuapi.com/api.php/provide/vod"),
    ("卧龙1", "https://collect.wolongzyw.com/api.php/provide/vod"),
    ("卧龙2", "https://collect.vod360.net/api.php/provide/vod"),
    ("新浪", "https://api.xinlangapi.com/xinlangapi.php/provide/vod"),
    ("旺旺", "https://api.wwzy.tv/api.php/provide/vod"),
    ("最大", "https://api.zuidapi.com/api.php/provide/vod"),
    ("樱花", "https://m3u8.apiyhzy.com/api.php/provide/vod"),
    ("牛牛", "https://api.niuniuzy.me/api.php/provide/vod"),
    ("百度云", "https://api.apibdzy.com/api.php/provide/vod"),
    ("速播", "https://subocaiji.com/api.php/provide/vod"),
    ("金鹰", "https://jinyingzy.com/api.php/provide/vod"),
    ("闪电", "https://sdzyapi.com/api.php/provide/vod"),
    ("暴风", "https://bfzyapi.com/api.php/provide/vod"),
    ("红牛", "https://www.hongniuzy2.com/api.php/provide/vod"),
    ("360", "https://360zy.com/api.php/provide/vod"),
    ("天空", "https://api.tiankongapi.com/api.php/provide/vod"),
    ("茅台", "https://caiji.maotaizy.cc/api.php/provide/vod"),
    ("量子", "https://cj.lziapi.com/api.php/provide/vod"),
    ("非凡", "https://cj.ffzyapi.com/api.php/provide/vod"),
    ("索尼", "https://suoniapi.com/api.php/provide/vod"),
    ("虎牙", "https://www.huyaapi.com/api.php/provide/vod"),
    (" film", "https://caiji.dongcaiapi.com/api.php/provide/vod"),
    ("豆瓣", "https://dbapi.us/dbapi.php/provide/vod"),
    ("七夜", "https://dj.7yezy.com/api.php/provide/vod"),
]

def variants(base):
    v = []
    if base.rstrip("/").endswith(".php"):
        v.append(base + "?ac=list&at=json")
        v.append(base + "?ac=list")
    else:
        b = base.rstrip("/")
        v.append(b + "/at/json/?ac=list")
        v.append(b + "?ac=list&at=json")
        v.append(b + "?ac=list")
    return v

def check_vod(name, base):
    list_ok = False
    api_used = None
    first = None
    for cand in variants(base):
        try:
            st, body = via_proxy(cand, 15)
            d = json.loads(body)
            items = d.get("list") or []
            if items:
                list_ok = True
                api_used = cand.split("?")[0]
                first = items[0]
                break
        except Exception as e:
            err = str(e)[:60]
            continue
    if not list_ok:
        return name, "FAIL:list", api_used, None
    # stage2: detail
    try:
        vid = first.get("vod_id")
        sep = "&" if "?" in api_used else "?"
        st, body = via_proxy(f"{api_used}{sep}ac=detail&ids={vid}", 15)
        d = json.loads(body)
        v = (d.get("list") or [None])[0]
        pu = (v or {}).get("vod_play_url") or ""
        if "$" not in pu:
            return name, "FAIL:detail-no-playurl", api_used, None
        # extract first m3u8-ish url
        urls = [seg.split("$")[-1] for seg in pu.replace("###", "$$$").split("$$$")[0].split("#")]
        target = next((u for u in urls if ".m3u8" in u or ".mp4" in u), urls[0] if urls else "")
        if not target:
            return name, "FAIL:no-url", api_used, None
    except Exception as e:
        return name, f"FAIL:detail({str(e)[:40]})", api_used, None
    # stage3: manifest
    try:
        st, body = via_proxy(target, 15)
        head = body[:200].decode("utf-8", "ignore")
        if "EXTM3U" in head or "EXTINF" in head:
            return name, "PASS", api_used, target[:80]
        return name, f"FAIL:manifest({head[:40]!r})", api_used, None
    except Exception as e:
        return name, f"FAIL:manifest({str(e)[:40]})", api_used, None

print("=" * 70)
results = []
for name, base in VODS:
    try:
        r = check_vod(name.strip(), base)
    except Exception as e:
        r = (name, f"FAIL:exc({str(e)[:40]})", None, None)
    results.append(r)
    print(f"{r[0]:<6} {r[1]:<28} {r[2] or ''}")
    sys.stdout.flush()

json.dump([{"name": r[0], "status": r[1], "api": r[2]} for r in results],
          open("/tmp/vod_results.json", "w"), ensure_ascii=False, indent=1)
print("saved /tmp/vod_results.json")
