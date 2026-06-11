"""Export the OCHS Hive Notion databases to CSV (weekly backup / lock-in insurance).

Requires: NOTION_API_KEY env var (internal integration token with access to the
Hive pages) and real database IDs in ochs-hive-notion/notion-databases.json.
"""
import csv
import json
import os
import sys
import time
import urllib.request

API = "https://api.notion.com/v1/"
HEADERS = {
    "Authorization": f"Bearer {os.environ['NOTION_API_KEY']}",
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json",
}
CONFIG = "ochs-hive-notion/notion-databases.json"
OUTDIR = "ochs-hive-notion/backups"


def api(path, payload=None):
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(API + path, headers=HEADERS, data=data,
                                 method="POST" if data else "GET")
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.load(resp)
        except urllib.error.HTTPError as e:
            if e.code == 429:  # rate limited — honour Retry-After
                time.sleep(float(e.headers.get("Retry-After", 2)))
                continue
            raise
    raise RuntimeError(f"Giving up on {path} after rate-limit retries")


_title_cache = {}


def page_title(page_id):
    """Resolve a related page's title so relation columns export as names."""
    if page_id not in _title_cache:
        try:
            page = api(f"pages/{page_id}")
            title = ""
            for prop in page["properties"].values():
                if prop["type"] == "title":
                    title = "".join(t["plain_text"] for t in prop["title"])
            _title_cache[page_id] = title or page_id
        except Exception:
            _title_cache[page_id] = page_id
    return _title_cache[page_id]


def flatten(prop):
    kind = prop["type"]
    value = prop.get(kind)
    if kind in ("title", "rich_text"):
        return "".join(t["plain_text"] for t in value)
    if kind in ("select", "status"):
        return value["name"] if value else ""
    if kind == "multi_select":
        return ", ".join(v["name"] for v in value)
    if kind in ("url", "email", "phone_number", "created_time", "last_edited_time"):
        return value or ""
    if kind == "number":
        return "" if value is None else value
    if kind == "checkbox":
        return value
    if kind == "date":
        return (value.get("start") or "") if value else ""
    if kind == "people":
        return ", ".join(p.get("name", "") for p in value)
    if kind == "relation":
        return ", ".join(page_title(r["id"]) for r in value)
    return ""


def export(name, db_id):
    rows, cursor = [], None
    while True:
        payload = {"page_size": 100}
        if cursor:
            payload["start_cursor"] = cursor
        data = api(f"databases/{db_id}/query", payload)
        rows.extend(data["results"])
        if not data.get("has_more"):
            break
        cursor = data["next_cursor"]
        time.sleep(0.4)  # stay under Notion's ~3 req/s limit
    if not rows:
        print(f"{name}: empty, skipped")
        return
    cols = sorted(rows[0]["properties"],
                  key=lambda c: 0 if rows[0]["properties"][c]["type"] == "title" else 1)
    path = os.path.join(OUTDIR, f"{name}.csv")
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(cols)
        for row in rows:
            writer.writerow([flatten(row["properties"][c]) for c in cols])
    print(f"{name}: {len(rows)} rows -> {path}")


def main():
    with open(CONFIG, encoding="utf-8") as f:
        databases = json.load(f)
    os.makedirs(OUTDIR, exist_ok=True)
    pending = {n: i for n, i in databases.items() if not i.startswith("REPLACE")}
    if not pending:
        print("No database IDs configured yet — fill in", CONFIG)
        sys.exit(0)
    failures = []
    for name, db_id in pending.items():
        try:
            export(name, db_id)
        except Exception as exc:  # keep exporting the rest
            failures.append(f"{name}: {exc}")
    if failures:
        print("FAILURES:\n" + "\n".join(failures))
        sys.exit(1)


if __name__ == "__main__":
    main()
