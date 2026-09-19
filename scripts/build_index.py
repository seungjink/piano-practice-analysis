#!/usr/bin/env python3
import json
import re
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).resolve().parents[1]
REPORTS = ROOT / "reports"
OUT = REPORTS / "index.json"

def scalar(value: str):
    v = value.strip()
    if len(v) >= 2 and v[0] == v[-1] and v[0] in {"'", '"'}:
        v = v[1:-1]
    if v.lower() == "true":
        return True
    if v.lower() == "false":
        return False
    if re.fullmatch(r"-?\d+(\.\d+)?", v):
        try:
            return float(v) if "." in v else int(v)
        except ValueError:
            pass
    return v

def frontmatter(text: str):
    if not text.startswith("---\n"):
        return {}
    end = text.find("\n---", 4)
    if end < 0:
        return {}
    data = {}
    for line in text[4:end].splitlines():
        m = re.match(r"^([A-Za-z0-9_-]+):\s*(.*)$", line)
        if m:
            data[m.group(1)] = scalar(m.group(2))
    return data

items = []
for path in sorted(REPORTS.glob("*.md")):
    if path.name == "template.md":
        continue
    meta = frontmatter(path.read_text(encoding="utf-8"))
    if meta.get("template") is True:
        continue
    items.append({
        "slug": path.stem,
        "file": path.name,
        "title": meta.get("title", path.stem),
        "date": meta.get("date", ""),
        "summary": meta.get("summary", ""),
        "hidden": bool(meta.get("hidden", False)),
        "order": meta.get("order", 9999),
    })

def date_key(v):
    try:
        return datetime.fromisoformat(str(v)).timestamp()
    except Exception:
        return 0

items.sort(key=lambda x: (x.get("order", 9999), -date_key(x.get("date", "")), x["title"]))
OUT.write_text(json.dumps(items, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"generated {OUT} with {len(items)} report(s)")
