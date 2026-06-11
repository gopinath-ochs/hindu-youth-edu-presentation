"""Check every External Link in the OCHS Hive CSVs for link rot.

Scans all CSVs under ochs-hive-notion/ (source batches and Notion backups),
fetches each unique http(s) URL, and writes a markdown report. Sites that
block bots (403/405/429) are listed as warnings, not failures.
"""
import csv
import glob
import os
import re
import urllib.request

URL_RE = re.compile(r"https?://[^\s\"',>]+")
REPORT = "ochs-hive-notion/link-report.md"
UA = {"User-Agent": "Mozilla/5.0 (OCHS-Hive link checker; contact gopinath@ochs.org.uk)"}
BLOCKY = {403, 405, 406, 429, 503}


def collect_urls():
    sources = {}
    for path in glob.glob("ochs-hive-notion/**/*.csv", recursive=True):
        with open(path, encoding="utf-8") as f:
            for row in csv.reader(f):
                for cell in row:
                    for url in URL_RE.findall(cell):
                        sources.setdefault(url.rstrip(".,)"), path)
    return sources


def check(url):
    req = urllib.request.Request(url, headers=UA)
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return resp.status, ""
    except urllib.error.HTTPError as e:
        return e.code, ""
    except Exception as exc:
        return None, str(exc)


def main():
    sources = collect_urls()
    ok, warn, broken = [], [], []
    for url, origin in sorted(sources.items()):
        status, err = check(url)
        if status and status < 400:
            ok.append(url)
        elif status in BLOCKY:
            warn.append((url, status, origin))
        else:
            broken.append((url, status or err, origin))

    lines = [f"# Hive link report", "",
             f"Checked {len(sources)} unique URLs: "
             f"{len(ok)} OK, {len(warn)} bot-blocked (probably fine), {len(broken)} broken.", ""]
    if broken:
        lines += ["## ❌ Broken — fix or replace", ""]
        lines += [f"- {u} (`{s}`) — in `{o}`" for u, s, o in broken]
        lines += [""]
    if warn:
        lines += ["## ⚠️ Blocked the checker (verify by hand occasionally)", ""]
        lines += [f"- {u} (HTTP {s})" for u, s, _ in warn]
    report = "\n".join(lines) + "\n"
    with open(REPORT, "w", encoding="utf-8") as f:
        f.write(report)
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a", encoding="utf-8") as f:
            f.write(report)
    print(report)
    # Signal broken links to the workflow without failing the whole job.
    output = os.environ.get("GITHUB_OUTPUT")
    if output:
        with open(output, "a", encoding="utf-8") as f:
            f.write(f"broken={len(broken)}\n")


if __name__ == "__main__":
    main()
