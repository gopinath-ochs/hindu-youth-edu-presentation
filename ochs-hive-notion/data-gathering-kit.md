# OCHS Hive — AI data-gathering kit

A reusable prompt system for filling the Hive's Resources and People databases
across all 11 topic strands, producing CSV output that imports straight into
the Notion databases (see `README.md` in this folder for the schema).

---

## Which model to use

**First choice: Claude — Research mode, running Opus (claude.ai, Pro/Max plan).**
Toggle on "Research" in the chat input. It runs multi-step web searches, reads
the actual pages, and cites sources — which is exactly what kills the
fabricated-bibliography problem. Best used as one Research run per topic.

**Set it up as a Claude Project:** create a project called "OCHS Hive
Gathering", paste the Master Prompt below into the project's custom
instructions, and then each new chat in that project is just:
`TOPIC: Ritual & Practice — batch 1`. The schema travels with every chat for
free, and all three of you can use the same project.

**Equivalent alternative: ChatGPT's Deep Research mode** (on its top model, Plus/Pro
plan). Comparable quality for this task. Use one or the other consistently so
output formatting stays uniform — don't mix unless comparing.

**For cheap bulk batches:** Claude Sonnet with web search enabled (not Research
mode) is fine for the easier strands and costs less quota. Quality of judgement
about *which* sources merit inclusion is slightly lower; review accordingly.

**Do NOT use:**
- Any model **without web search enabled** — it will confidently invent books,
  ISBNs, and URLs. This is the one hard rule.
- Small/fast models (Haiku, GPT mini-class) for gathering — they cut corners
  on verification.

**Batch size: 20–25 resources per run, one topic per run.** Asking for 100
degrades quality sharply — the model front-loads its best knowledge and pads
the rest. Two batches per topic (~45 resources each) across 11 topics gives
you ~500 reviewed candidates, which is a serious library.

---

## The Master Prompt

Paste everything below into the Claude Project instructions (or at the top of
a ChatGPT Deep Research run). Then start each run with just the topic line.

```
You are a research librarian for the Oxford Centre for Hindu Studies, building
the "OCHS Hive" — a curated knowledge base on Hinduism. Its primary use is
teaching 16–18-year-old students (UK A-Level Religious Studies), with a
secondary scholarly research function. Curators will manually review
everything you suggest, but your job is to make every suggestion worth
reviewing.

TASK
Find 20–25 high-quality resources for the topic strand given at the start of
the conversation. Use web search to confirm that every resource exists and
that every URL resolves to the actual resource (not a homepage or a search
page). Anything you cannot verify, exclude — a shorter verified list beats a
longer padded one.

BALANCE REQUIREMENTS (per batch)
- Source categories: roughly 40% Academic / Peer-Reviewed, 20% Practitioner /
  Devotional, 20% Public / General Audience, 20% Student / Educational.
- Perspectives: include critical academic scholarship AND voices from within
  the tradition AND, where relevant, reform/critical voices (e.g. Dalit,
  feminist perspectives). Where a source is contested, say so in Notes rather
  than omitting it.
- Formats: mix books, primary texts in translation, peer-reviewed articles,
  videos, podcasts, websites, and museum/archive collections (British Museum,
  V&A, Sackler, archive.org are rich for this).
- Levels: spread across Introductory / Intermediate / Advanced / Academic.
- At least 3 primary sources in translation (name the translator).
- At least 3 free resources usable directly in a UK classroom with 16–18s.
- Prefer resources accessible from the UK; note region-locks.

OUTPUT FORMAT
Output a CSV code block with EXACTLY these columns:

Title,Creator,Resource Type,Source Category,Topic,Key Themes,External Link,Google Drive Link,Status,Quality / Depth,Audience Level,Access,Rights / Licensing,Language,Duration,Year Produced,Date Added,Date Accessed,Added By,Suggested By,Notes

Controlled vocabularies — use ONLY these values:
- Resource Type: Book | Primary Text | Journal Article | Video | Podcast |
  Website | Film Clip | Museum/Archive | Course/Lesson
- Source Category: Academic / Peer-Reviewed | Practitioner / Devotional |
  Public / General Audience | Student / Educational
- Topic: the topic strand for this run, verbatim
- Status: always "🔍 To Review"
- Quality / Depth: Reference-Grade | Deep | Solid | Surface
- Audience Level: Introductory | Intermediate | Advanced | Academic
- Access: Free | Paid | Open Archive | Unknown
- Rights / Licensing: Unknown | ⚠️ Check copyright | Educational use permitted
- Language: English unless otherwise stated
- Date Added and Date Accessed: today's date, ISO format (YYYY-MM-DD)
- Added By / Suggested By: leave blank
- Notes: one sentence on why this earns its place, plus any caveat
  (bias, contested status, quality issues, copyright risk)

Then output a SECOND CSV code block of People rows for every Creator above,
with EXACTLY these columns:

Name,Category,Perspective,Specialism,Institution / Affiliation,Notable Works,X/Twitter Handle,Website,Credibility Notes,Added By

- Category: Scholar / Academic | Author | Commentator | Organisation |
  Educator | Media / Film
- Perspective: Academic / Critical | Traditional / Practitioner |
  Reform / Neo-Hindu | Popular / Accessible | Public / Accessible
- Credibility Notes: be candid — say if not peer-reviewed, anonymous,
  affiliated with one tradition, or contested, and why they matter anyway.
- Creator names must match EXACTLY between the two CSV blocks.
- Skip people already in this list (do not re-output them):
  [PASTE YOUR CURRENT PEOPLE LIST HERE — keep this updated between runs]

INTEGRITY RULES (non-negotiable)
1. Verify before you include. Every title, author, year, and URL must come
   from a page you actually retrieved this session.
2. URLs point to the specific resource. For books prefer the publisher page
   or archive.org; never a bare Amazon search.
3. Leave a field blank rather than guess. No invented years or publishers.
4. After the CSVs, add a short plain-text section: "LOW-CONFIDENCE / EXCLUDED"
   — things that looked promising but failed verification, so the curators
   know what was already considered.
5. Diacritics: use IAST where natural (Dharmaśāstra, Bhagavad Gītā) but keep
   titles exactly as published.
```

### Per-run starter lines (with subtopic steers)

Begin each run with one of these:

| Run starter | Subtopic steer to append |
|---|---|
| TOPIC: Cross-Topic / General | survey textbooks, reference works, timelines, atlases, glossaries, encyclopedia entries |
| TOPIC: Yoga, Body & Spirituality | Patañjali's Yoga Sūtras, haṭha yoga, tantra, modern postural yoga and its history, āyurveda, body in Hindu thought |
| TOPIC: Cosmology & Mythology | creation hymns (Nāsadīya, Puruṣa Sūkta), yugas and cyclical time, purāṇic cosmology, avatāra, myth theory |
| TOPIC: Ethics & Moral Philosophy | dharma ethics, ahiṃsā, karma and rebirth, puruṣārthas, Gītā ethics, applied/bio-ethics in Hindu perspective |
| TOPIC: Modern Hinduism & Diaspora | 19th-c. reform movements, Vivekananda, Hindutva debates (handle carefully, both scholarship and critique), UK/US diaspora, temples in the West, Hinduism and modernity |
| TOPIC: History of Hinduism | Indus Valley debates, Vedic period, classical and medieval developments, bhakti movements, colonial encounter, historiography controversies |
| TOPIC: Ritual & Practice | pūjā, saṃskāras (rites of passage), festivals, pilgrimage, temple ritual, domestic worship, food and purity |
| TOPIC: Deity & Devotional Traditions | Vaiṣṇava/Śaiva/Śākta traditions, bhakti poets (Mīrābāī, Tulsīdās, Āḻvārs, Nāyaṉmārs), iconography, darśan, mūrti debates |
| TOPIC: Hindu Philosophy & Darshanas | six darśanas, Advaita/Viśiṣṭādvaita/Dvaita Vedānta, key debates (self, consciousness, liberation), primary texts in translation |
| TOPIC: Vedas & Sacred Texts | Vedic corpus structure, Upaniṣads, epics, Bhagavad Gītā, śruti vs smṛti, oral transmission, translation issues |
| TOPIC: Dharma, Varna, Caste & Social Ethics | Dharmaśāstra, varṇāśrama, caste critique, Ambedkar, Gandhi, contemporary debates — note: partially populated, paste existing titles to avoid duplicates |

---

## The verification pass (second prompt, separate run)

Before importing any batch, run this on the CSV output — ideally in a fresh
chat so it can't defend its own work:

```
You are a fact-checker. Below is a CSV of resources about [TOPIC] destined
for an educational database. For EACH row, use web search to check:
1. Does this resource exist with this exact title and creator?
2. Does the URL resolve to that specific resource?
3. Is the year correct (if given)?
4. Is the Source Category honest? (e.g. is something labelled
   Academic / Peer-Reviewed actually peer-reviewed?)
Output the same CSV with a new final column "Verification" containing
✅ Verified | ⚠️ <specific problem> | ❌ Could not verify — recommend removal.
Do not silently fix problems; flag them.

[PASTE CSV]
```

---

## Workflow for the three of you

1. One person runs gathering (one topic per Research run, 20–25 rows).
2. Same or second person runs the verification pass in a fresh chat.
3. Import verified rows into Notion (Merge with existing database, or paste
   rows in). Everything lands as 🔍 To Review.
4. Human review IS the Status pipeline: To Review → In Progress → Done /
   ⭐ Key Source. Reviewer sets Quality / Depth — don't trust the AI's rating,
   it's a starting guess.
5. After each import, update the "existing People" list in the Master Prompt
   so later runs don't duplicate.
6. Keep the LOW-CONFIDENCE / EXCLUDED lists in a Notion page — they're a
   useful record of what was considered and rejected.
