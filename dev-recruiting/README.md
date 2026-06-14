# D3 Developer Finder

Searches GitHub's **public** API for D3.js / data-visualisation developers based in India.  
Results are saved to your home directory as a CSV (for Excel) and a JSON file.

No npm install needed — uses only Node.js built-in modules.

---

## Quick Start

```bash
cd dev-recruiting
node find-d3-developers.js
```

When the script finishes you'll see:

```
  CSV  → /home/yourname/developer-candidates.csv
  JSON → /home/yourname/developer-candidates.json
```

Open the CSV in Excel or Google Sheets.  The first row is a summary comment;
skip it or delete it before sorting.

---

## Recommended: Add a GitHub Token

Without a token the GitHub API allows **60 requests/hour**, which limits a
single run to ~25 profiles.  A free personal access token raises this to
**5 000 requests/hour**, giving you 500+ profiles per run.

**Steps:**

1. Go to [github.com/settings/tokens](https://github.com/settings/tokens)
2. Click **Generate new token (classic)**
3. Give it a descriptive name (e.g. `D3 Dev Finder`)
4. **Leave all permission checkboxes unchecked** — public data needs no scopes
5. Click **Generate token** and copy the value (`ghp_…`)

**Run with the token:**

```bash
# One-off
GITHUB_TOKEN=ghp_your_token_here node find-d3-developers.js

# Or export for the session
export GITHUB_TOKEN=ghp_your_token_here
node find-d3-developers.js
```

---

## Output Files

Both files are written to `~/` (your home directory).  Change this by setting
the `OUTPUT_DIR` environment variable:

```bash
OUTPUT_DIR=/tmp node find-d3-developers.js
```

### CSV columns

| Column | Description |
|--------|-------------|
| Name | GitHub display name |
| GitHub URL | Link to profile |
| Username | GitHub login handle |
| Public Repos | Number of public repositories |
| Followers | GitHub follower count |
| Last Activity | Most recent push date across all repos |
| Top Languages | Up to 5 languages, weighted by starred repos |
| Has D3 Experience? | Yes/No — detected from repo names, descriptions, topics |
| Portfolio/Website | Website from the GitHub bio field (if set) |
| Location | Self-reported location on GitHub profile |
| Bio | GitHub profile bio |
| Notable Repos | Top 3 D3/viz repos with star counts |

The CSV is **sorted by followers (descending)** so the most prominent
developers appear first.

---

## Configuration

Edit the `CONFIG` block at the top of `find-d3-developers.js`:

```js
const CONFIG = {
  location:      'india',        // try 'bangalore' or 'mumbai' to narrow
  minStars:      10,             // raise to 50 for higher quality signal
  minFollowers:  5,              // raise to 20 to filter hobbyists
  maxCandidates: 60,             // raise to 200 when using a token
  updatedAfter:  '2024-01-01',   // change to '2023-01-01' for a wider window
};
```

---

## Running Weekly (optional)

### Mac / Linux — crontab

```bash
crontab -e
# Add this line to run every Monday at 9 am:
0 9 * * 1 GITHUB_TOKEN=ghp_xxx /usr/bin/node /full/path/to/dev-recruiting/find-d3-developers.js
```

### Windows — Task Scheduler

1. Open **Task Scheduler** → **Create Basic Task**
2. Name it `D3 Dev Finder`, trigger: **Weekly on Monday**
3. Action: **Start a program** → `node`
4. Arguments: `C:\full\path\to\dev-recruiting\find-d3-developers.js`
5. Add `GITHUB_TOKEN=ghp_xxx` to the environment variables section

Each run **overwrites** the previous files, so you always get fresh results.

---

## How D3 Detection Works

The script scans each developer's public repository **names**, **descriptions**,
and **topics** for keywords including:

`d3`, `d3js`, `data visualization`, `dataviz`, `charts`, `choropleth`,
`treemap`, `sankey`, `force directed`, `geospatial`, `topojson`, and more.

This is a **heuristic** — a developer who uses D3 without labelling their repos
clearly may show as `No`.  Always review the *Notable Repos* column manually.

---

## Data Source & Ethics

- All data comes from **GitHub's public API** (`api.github.com`)
- No scraping, no ToS violations, no private data
- No automated messaging or contact attempts
- Developers' locations come from their **self-reported** GitHub profile field

---

## Rate Limit Reference

| Mode | Requests/hour | Typical run time | Max profiles/run |
|------|:---:|:---:|:---:|
| No token | 60 | 5–10 min | ~25 |
| With token | 5 000 | 2–5 min | 500+ |

If the script hits the rate limit mid-run it saves whatever it has collected.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Rate limit hit` on first run | Add `GITHUB_TOKEN` |
| `0 candidates found` | Lower `minFollowers` or change `location` |
| CSV opens garbled | Open Excel → Data → From Text/CSV, choose UTF-8 |
| Script exits after a few profiles | Rate limit — wait an hour or add token |
