# OCHS Hive — Notion import pack

Three CSVs that become three linked Notion databases:

- `Topics.csv` — the knowledge strands (each topic page is where synthesis, maps and thinking live)
- `People.csv` — scholars, authors, organisations and media sources, with perspective and credibility notes
- `Resources.csv` — the source library, linked to both of the above

Creator and Topic names in `Resources.csv` exactly match page names in `People.csv`
and `Topics.csv`, so Notion's text → Relation conversion auto-links every row.

## Import order

1. Import `Topics.csv`, then `People.csv`, then `Resources.csv`
   (Notion: **Settings → Import → CSV**, or drag the file onto a page).
2. In **Resources**, convert property types:
   - `Creator` → Relation → People (auto-matches by name)
   - `Topic` → Relation → Topics (auto-matches by name)
   - `Key Themes` → Multi-select
   - `Resource Type`, `Source Category`, `Status`, `Quality / Depth`,
     `Audience Level`, `Access`, `Rights / Licensing`, `Language` → Select
   - `External Link`, `Google Drive Link` → URL
   - `Date Added`, `Date Accessed` → Date
   - `Added By`, `Suggested By` → Person (re-pick from workspace members)
3. When converting the relations, enable **"Show on People/Topics"** so each
   person page lists their resources and each topic page aggregates its sources.
4. In **People**: `Category`, `Perspective` → Select; `Website` → URL.
5. In **Topics**: `Key Subtopics` → Multi-select; `Status` → Select.

## Changes from the original spreadsheet

- Merged the duplicate `Subtopic / Key Themes` + `Key Themes` columns into one `Key Themes`.
- Merged `Suggested By Scholar` + `Suggested by Board` (both empty) into one `Suggested By`.
- Standardised `Status` (📥 Saved / 🔍 To Review / 🔄 In Progress / ✅ Done / ⭐ Key Source) and filled blanks with 📥 Saved.
- Added `Rights / Licensing`, `Language`, `Duration`, `Date Accessed` columns.
- Added People entries for every creator (BBC, ISKCON ES, Jayaram V, Jessica Whittemore, Hillary Rodrigues, Gandhi film) so the Creator relation has no gaps.
- Reclassified *Introducing Hinduism* → Cross-Topic / General (survey textbook) and *Heart of Hinduism* → Practitioner / Devotional (ISKCON).
- Filled known publication years (Doniger 2009, Rig Veda 1981, Gandhi 1982).
- Seeded three placeholder topics (Sacred Geography, Philosophy & Darśanas, Epics & Purāṇas) marked `Seed`.
