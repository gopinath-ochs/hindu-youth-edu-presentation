# OCHS Hive — Notion build handoff

You are Claude, working in a session with the **Notion connector enabled**. Your
job is to build the OCHS Hive — a knowledge base on Hinduism for the Oxford
Centre for Hindu Studies (teaching 16–18 UK A-Level students; secondary
scholarly use) — inside Notion, from the data files in this folder.

## Source data (this folder)

- `Topics.csv` — 13 topic strands (11 active, 2 seed)
- `People.csv` — base people/organisations
- `Resources.csv` — base resources
- `batches/yoga-body-spirituality/Resources.csv` + `People.csv` — batch 1
- `batches/batch-02-remaining-strands/Resources.csv` + `People.csv` — batch 2
- `README.md` — schema rationale and original import notes

Merge rule: People = base + batch 1 + batch 2 (no duplicate names exist).
Resources = base + batch 1 + batch 2. Creator and Topic values exact-match
People and Topic names — preserve them verbatim, including IAST diacritics.

## What to build (in this order)

Work under a parent page the user has shared with the integration (ask them
which page if unclear; suggest a page called "OCHS Hive"). Do NOT delete or
overwrite anything that already exists — if databases with these names exist,
stop and ask.

### 1. Topics database
Properties: `Topic` (title), `Description` (rich text), `Key Subtopics`
(multi-select), `Status` (select: Active, Seed).

### 2. People database
Properties: `Name` (title), `Category` (select: Scholar / Academic, Author,
Commentator, Organisation, Educator, Media / Film), `Perspective` (select:
Academic / Critical, Traditional / Practitioner, Reform / Neo-Hindu,
Popular / Accessible, Public / Accessible), `Specialism` (rich text),
`Institution / Affiliation` (rich text), `Notable Works` (rich text),
`X/Twitter Handle` (rich text), `Website` (url), `Credibility Notes`
(rich text), `Added By` (rich text).

### 3. Resources database
Properties: `Title` (title), `Creator` (relation → People, two-way, show on
People as "Resources"), `Resource Type` (select: Book, Primary Text, Journal
Article, Video, Podcast, Website, Film Clip, Museum/Archive, Course/Lesson),
`Source Category` (select: Academic / Peer-Reviewed, Practitioner / Devotional,
Public / General Audience, Student / Educational), `Topic` (relation → Topics,
two-way, show on Topics as "Resources"), `Key Themes` (multi-select),
`External Link` (url), `Google Drive Link` (url), `Status` (select: 📥 Saved,
🔍 To Review, 🔄 In Progress, ✅ Done, ⭐ Key Source), `Quality / Depth`
(select: Reference-Grade, Deep, Solid, Surface), `Audience Level` (select:
Introductory, Intermediate, Advanced, Academic), `Access` (select: Free, Paid,
Open Archive, Unknown), `Rights / Licensing` (select: Unknown,
⚠️ Check copyright, Educational use permitted), `Language` (select),
`Duration` (rich text), `Year Produced` (number), `Date Added` (date),
`Date Accessed` (date), `Added By` (rich text), `Suggested By` (relation →
People), `Notes` (rich text).

### 4. Populate
Insert all Topics, then all People, then all Resources. For multi-creator rows
("James Mallinson, Mark Singleton") link BOTH people. Report row counts per
database when done and reconcile against the CSVs (expect ~13 topics,
~68 people, ~72 resources).

### 5. Lessons database (empty, schema only)
`Lesson` (title), `Topic` (relation → Topics), `Uses Resources` (relation →
Resources, two-way, show on Resources as "Used In"), `Audience` (select:
A-Level, GCSE, Adult education, Outreach), `Spec Points` (multi-select, leave
options empty), `Status` (select: Idea, Drafting, Ready, Taught, Retired),
`Owner` (rich text), `Materials Link` (url), `Notes` (rich text).

### 6. Glossary database (empty, schema only)
`Term (IAST)` (title), `Devanāgarī` (rich text), `Plain definition`
(rich text), `Common misconception` (rich text), `Topic` (relation → Topics),
`Related Terms` (relation → itself).

### 7. Questions & Debates database (empty, schema only)
`Question` (title), `Type` (select: Essay question, Debate, Discussion
starter), `Topic` (relation → Topics), `Resources — Side A` (relation →
Resources), `Resources — Side B` (relation → Resources), `Notes` (rich text).
Seed it with these five, linking the named resources:
1. "Who owns yoga?" — Side A: Yoga Body; Selling Yoga / Side B: Hindu Roots of Yoga
2. "Was there a unified bhakti movement?" — Side A: A Storm of Songs / Side B: Speaking of Śiva
3. "Can caste be reformed from within Hinduism?" — Side A: An Autobiography (Gandhi) / Side B: Annihilation of Caste
4. "Is modern postural yoga 'Hindu'?" — Side A: Roots of Yoga / Side B: Yoga Body
5. "Whose history of Hinduism?" — Side A: The Penguin History of Early India / Side B: The Hindus: An Alternative History

### 8. Pages
- **Editorial Standards**: write a one-page house-rules doc — every resource
  gets a perspective label and candid credibility note; contested sources are
  included and flagged, never silently omitted; URLs point to the specific
  resource; practitioner and academic voices both belong; statuses are the
  review pipeline (everything enters as 🔍 To Review; only a human awards ⭐).
- **Topic Page Template**: a page containing the agreed skeleton to duplicate
  into each topic: Overview → Key debates → Common misconceptions → Primary
  sources to read first → Classroom angles → Open questions.
- **Dashboard**: a homepage linking to all six databases, the two pages above,
  and a short "how to use the Hive" intro.

### 9. Write back the database IDs
Update `ochs-hive-notion/notion-databases.json` in this repo with the real
database IDs (keys: topics, people, resources, lessons, glossary, questions),
commit and push — the GitHub Actions in `.github/workflows/` need them.
If you have no repo access, output the JSON for the user to commit.

## Known API limits — leave these for the human (tell the user at the end)
The Notion API cannot create database *views*, *forms*, or *database
templates*. Finish your run by giving the user this 10-minute checklist:
1. Resources: add a Board view grouped by Status; a Table view grouped by
   Topic; a "⭐ Key Sources" filtered view; a "🔍 To Review" view sorted by
   Date Added.
2. People: Gallery or Table view grouped by Perspective.
3. Lessons: Board by Status.
4. Resources: create a Notion **form** (Form view) with Title, External Link,
   Resource Type, Topic, Notes → share the link with scholars/board; set the
   form to default Status = 📥 Saved.
5. Set the Topic Page Template as a database template on Topics, then apply
   it to each Active topic page.
6. Everyone installs the Notion Web Clipper and clips into Resources.

## Conduct
Verify each step's API response before moving on; report progress briefly as
you go; if a write fails twice, continue with the rest and list failures at
the end rather than aborting the whole build.
