#!/usr/bin/env python3
"""
Bump PVZ game version (asset cache buster + version.json + UI display).

Usage:
    python3 bump_version.py              # auto bump (timestamp-based)
    python3 bump_version.py "v3.2.1-melon-fix"  # explicit version label

What it does:
    1. Generate a new numeric asset version (Unix timestamp).
    2. Update pvz-web/version.json (version + build + assetVersion).
    3. Replace all `?v=<digits>` in *.js and index.html with the new number.
    4. Print a summary so you can verify the change.

Run this whenever you change game assets/code that needs cache-busting.
"""
import os
import re
import sys
import json
import time

ROOT = os.path.dirname(os.path.abspath(__file__))
VERSION_FILE = os.path.join(ROOT, "pvz-web", "version.json")
SCAN_GLOBS = [
    os.path.join(ROOT, "pvz-web", "index.html"),
    os.path.join(ROOT, "pvz-web", "js"),
]
SKIP_DIRS = {"node_modules", "_orig"}


def bump(label=None):
    new_asset_version = int(time.time())
    new_version_label = label or f"v3.2.{new_asset_version % 1000}"
    new_build_date = time.strftime("%Y-%m-%d")

    # 1. Update version.json
    try:
        with open(VERSION_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        data = {}

    data["version"] = new_version_label
    data["build"] = new_build_date
    data["assetVersion"] = new_asset_version

    with open(VERSION_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    # 2. Replace ?v=NUMBER in JS/HTML files
    pattern = re.compile(r"\?v=\d+")
    replaced = 0
    files_changed = []

    targets = []
    for p in SCAN_GLOBS:
        if os.path.isfile(p):
            targets.append(p)
        elif os.path.isdir(p):
            for root, dirs, files in os.walk(p):
                dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
                for fn in files:
                    if fn.endswith((".js", ".html")):
                        targets.append(os.path.join(root, fn))

    for path in targets:
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        new_content, n = pattern.subn(f"?v={new_asset_version}", content)
        if n > 0:
            with open(path, "w", encoding="utf-8") as f:
                f.write(new_content)
            replaced += n
            files_changed.append((path, n))

    print(f"✓ version.json  ->  {new_version_label}  build={new_build_date}  asset={new_asset_version}")
    print(f"✓ cache-buster  ->  replaced {replaced} occurrence(s) in {len(files_changed)} file(s):")
    for p, n in files_changed:
        rel = os.path.relpath(p, ROOT)
        print(f"    {rel}  ({n}x)")
    print("\nRefresh the game (Cmd+Shift+R) to load the new version.")


if __name__ == "__main__":
    label = sys.argv[1] if len(sys.argv) > 1 else None
    bump(label)