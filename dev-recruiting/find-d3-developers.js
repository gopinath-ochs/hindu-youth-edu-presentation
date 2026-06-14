#!/usr/bin/env node
/**
 * D3.js Developer Finder — India
 *
 * Searches GitHub's public API for D3.js / data-visualisation developers
 * based in India and writes results to ~/developer-candidates.csv and
 * ~/developer-candidates.json.
 *
 * Usage:
 *   node find-d3-developers.js
 *
 * With a GitHub token (recommended — raises rate limit from 60 to 5000/hr):
 *   GITHUB_TOKEN=ghp_xxx node find-d3-developers.js
 *
 * Custom output directory:
 *   OUTPUT_DIR=/tmp node find-d3-developers.js
 */

'use strict';

const https = require('https');
const fs    = require('fs');
const path  = require('path');
const os    = require('os');

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION  — edit these values to tune the search
// ─────────────────────────────────────────────────────────────────────────────

const CONFIG = {
  location:      'india',        // GitHub location filter
  minStars:      10,             // minimum stars to include a D3 repo in search
  minFollowers:  5,              // minimum followers when searching users directly
  // With a token the rate limit is 5000/hr so we can afford far more profiles.
  // Without a token it's 60/hr, so keep the cap low to avoid hitting the wall.
  maxCandidates: process.env.GITHUB_TOKEN ? 150 : 40,
  updatedAfter:  '2024-01-01',   // only repos pushed after this date
  outputDir:     process.env.OUTPUT_DIR || os.homedir(),
  csvFile:       'developer-candidates.csv',
  jsonFile:      'developer-candidates.json',
};

// ─────────────────────────────────────────────────────────────────────────────
// RATE-LIMIT STATE  (updated from GitHub response headers each request)
// ─────────────────────────────────────────────────────────────────────────────

const rl = {
  remaining:       60,
  resetAt:         Date.now() + 3_600_000,
  isAuthenticated: false,
};

// ─────────────────────────────────────────────────────────────────────────────
// HTTP CLIENT
// ─────────────────────────────────────────────────────────────────────────────

class RateLimitError extends Error {
  constructor(msg) { super(msg); this.name = 'RateLimitError'; }
}

/** Low-level HTTPS GET against api.github.com */
function rawGet(apiPath) {
  return new Promise((resolve, reject) => {
    const token = process.env.GITHUB_TOKEN;
    const headers = {
      'User-Agent': 'D3-Developer-Finder/1.0',
      'Accept':     'application/vnd.github.v3+json',
    };
    if (token) {
      headers['Authorization'] = `token ${token}`;
      rl.isAuthenticated = true;
    }

    const req = https.request({ hostname: 'api.github.com', path: apiPath, method: 'GET', headers }, res => {
      // Keep rate-limit counters up to date
      if (res.headers['x-ratelimit-remaining'] !== undefined) {
        rl.remaining = parseInt(res.headers['x-ratelimit-remaining'], 10);
        rl.resetAt   = parseInt(res.headers['x-ratelimit-reset'], 10) * 1000;
      }

      let body = '';
      res.on('data', chunk => (body += chunk));
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (res.statusCode === 403 || res.statusCode === 429) {
            const waitMin = Math.ceil(Math.max(0, rl.resetAt - Date.now()) / 60_000);
            reject(new RateLimitError(
              `Rate limit hit (${rl.remaining} left). Resets in ~${waitMin} min. ` +
              `Add GITHUB_TOKEN for 5 000 req/hr instead of 60.`
            ));
          } else if (res.statusCode >= 400) {
            reject(new Error(`GitHub ${res.statusCode}: ${data.message || body}`));
          } else {
            resolve(data);
          }
        } catch (e) {
          reject(new Error(`Parse error: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(30_000, () => { req.destroy(); reject(new Error('Request timed out')); });
    req.end();
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

/**
 * Rate-limited wrapper around rawGet.
 * Unauthenticated: ~2 s between calls stays safely under 60/hr.
 * Authenticated:   150 ms is comfortable under 5 000/hr.
 */
async function githubGet(apiPath) {
  if (rl.remaining < 5) {
    const waitMin = Math.ceil(Math.max(0, rl.resetAt - Date.now()) / 60_000);
    throw new RateLimitError(
      `Only ${rl.remaining} requests left — saving partial results now. ` +
      `Rate limit resets in ~${waitMin} min.`
    );
  }
  await sleep(rl.isAuthenticated ? 150 : 2_000);
  return rawGet(apiPath);
}

// ─────────────────────────────────────────────────────────────────────────────
// GITHUB SEARCH HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function searchD3Repos(page = 1) {
  const q = encodeURIComponent(
    `d3 language:javascript stars:>=${CONFIG.minStars} pushed:>=${CONFIG.updatedAfter}`
  );
  return githubGet(`/search/repositories?q=${q}&sort=stars&order=desc&per_page=100&page=${page}`);
}

function searchIndiaUsers(page = 1) {
  const q = encodeURIComponent(
    `location:india language:javascript followers:>=${CONFIG.minFollowers}`
  );
  return githubGet(`/search/users?q=${q}&sort=followers&order=desc&per_page=100&page=${page}`);
}

// Targeted: India users who explicitly mention D3 in their profile/repos
function searchIndiaD3Users(page = 1) {
  const q = encodeURIComponent(`location:india d3 language:javascript`);
  return githubGet(`/search/users?q=${q}&sort=followers&order=desc&per_page=100&page=${page}`);
}

const getUserProfile = username => githubGet(`/users/${encodeURIComponent(username)}`);
const getUserRepos   = username =>
  githubGet(`/users/${encodeURIComponent(username)}/repos?sort=stars&per_page=30&type=public`);

// ─────────────────────────────────────────────────────────────────────────────
// ANALYSIS HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const INDIA_TERMS = [
  'india','bangalore','bengaluru','mumbai','delhi','new delhi',
  'hyderabad','chennai','madras','pune','kolkata','calcutta',
  'ahmedabad','jaipur','surat','lucknow','kanpur','nagpur',
  'noida','gurgaon','gurugram','chandigarh','kochi','cochin',
  'indore','coimbatore','thiruvananthapuram','trivandrum',
  'mysore','mysuru','bhubaneswar','patna','vadodara','baroda',
  'rajkot','visakhapatnam','vizag','goa','nashik','ranchi',
  'bhopal','agra','varanasi',
];

function isInIndia(location) {
  if (!location) return false;
  const l = location.toLowerCase().replace(/[^a-z ]/g, ' ');
  return INDIA_TERMS.some(t => l.includes(t));
}

const D3_TERMS = [
  'd3','d3js','data visualization','data visualisation','dataviz',
  'data viz','data dashboard','charts','visualization','visualisation',
  'force directed','choropleth','treemap','sunburst','sankey',
  'histogram','scatter plot','bar chart','line chart','bubble chart',
  'geospatial','topojson','svg charts','recharts',
];

function detectD3(repos) {
  for (const r of repos) {
    const text = [r.name, r.description || '', (r.topics || []).join(' ')]
      .join(' ')
      .toLowerCase()
      .replace(/[-_]/g, ' ');
    if (D3_TERMS.some(t => text.includes(t))) return true;
  }
  return false;
}

function topLanguages(repos) {
  const w = {};
  for (const r of repos) {
    if (r.language) w[r.language] = (w[r.language] || 0) + r.stargazers_count + 1;
  }
  return Object.entries(w).sort(([, a], [, b]) => b - a).slice(0, 5).map(([l]) => l);
}

function notableRepos(repos) {
  const vizTerms = ['d3','viz','chart','dashboard','graph','visual','data','map'];
  return repos
    .map(r => {
      const text = [r.name, r.description || '', (r.topics || []).join(' ')].join(' ').toLowerCase();
      const vizBoost = vizTerms.some(t => text.includes(t)) ? 1_000 : 0;
      return { r, score: r.stargazers_count + vizBoost };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ r }) => ({
      name:        r.name,
      stars:       r.stargazers_count,
      description: (r.description || '').slice(0, 120),
      url:         r.html_url,
    }));
}

function lastActivity(repos) {
  if (!repos.length) return '';
  const dates = repos.map(r => r.pushed_at).filter(Boolean).map(d => new Date(d));
  return dates.length
    ? dates.reduce((a, b) => (a > b ? a : b)).toISOString().split('T')[0]
    : '';
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 1 + 2 — collect candidate usernames via GitHub search
// ─────────────────────────────────────────────────────────────────────────────

async function collectUsernames() {
  const found = new Map(); // login → { source, priority }

  const searchPages = async (label, fetchFn, source, priority, maxPages = 3) => {
    console.log(`\n  ${label}...`);
    for (let page = 1; page <= maxPages; page++) {
      try {
        const res = await fetchFn(page);
        console.log(`    Page ${page}: ${res.items.length} results (${res.total_count} total)`);
        for (const item of res.items) {
          const login = item.login || item.owner?.login;
          const type  = item.type  || item.owner?.type;
          if (login && type === 'User' && !found.has(login)) {
            found.set(login, { source, priority });
          }
        }
        if (res.items.length < 100) break;
        await sleep(rl.isAuthenticated ? 500 : 8_000);
      } catch (err) {
        if (err instanceof RateLimitError) throw err;
        console.warn(`    Page ${page} failed: ${err.message}`);
        break;
      }
    }
  };

  console.log('\n[1/3] Collecting candidates via three search strategies:');

  // Priority 1 — India users who explicitly mention D3 in their GitHub profile
  await searchPages(
    '[1a] India + D3 targeted user search',
    searchIndiaD3Users, 'india-d3', 1
  );
  console.log(`      → ${found.size} candidates so far`);

  // Priority 2 — Broad India JS developer search (high pass-rate for India filter)
  await searchPages(
    '[1b] India JavaScript developers (broad)',
    searchIndiaUsers, 'india-js', 2
  );
  console.log(`      → ${found.size} candidates so far`);

  // Priority 3 — Global D3 repo owners (lower India hit-rate, used as supplement)
  await searchPages(
    '[1c] Global D3.js repository owners',
    page => searchD3Repos(page).then(res => ({
      total_count: res.total_count,
      items: res.items.map(r => ({ login: r.owner?.login, type: r.owner?.type })),
    })),
    'd3-repo', 3
  );
  console.log(`      → ${found.size} total unique candidates identified`);

  return found;
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 3 — enrich each candidate with full profile + repo data
// ─────────────────────────────────────────────────────────────────────────────

async function buildProfiles(usernames) {
  const candidates = [];

  // Process highest-priority candidates first so the cap is spent wisely:
  // india-d3 (1) → india-js (2) → d3-repo owners (3)
  const list = [...usernames.entries()]
    .sort(([, a], [, b]) => a.priority - b.priority)
    .map(([login]) => login)
    .slice(0, CONFIG.maxCandidates);

  console.log(`\n[2/3] Fetching profiles (up to ${list.length}, highest-priority first)...`);
  console.log(`  Rate limit: ${rl.remaining} requests remaining\n`);

  for (let i = 0; i < list.length; i++) {
    const username = list[i];
    const pct = String(Math.round(((i + 1) / list.length) * 100)).padStart(3);
    process.stdout.write(`\r  [${pct}%] ${String(i + 1).padStart(3)}/${list.length}  ${username.padEnd(35)}`);

    try {
      const profile = await getUserProfile(username);
      if (!isInIndia(profile.location)) continue; // filter non-India profiles

      const repos = await getUserRepos(username);
      const notable = notableRepos(repos);

      candidates.push({
        name:             profile.name || profile.login,
        githubUrl:        profile.html_url,
        username:         profile.login,
        publicRepos:      profile.public_repos,
        followers:        profile.followers,
        lastActivity:     lastActivity(repos),
        topLanguages:     topLanguages(repos).join(', '),
        hasD3Experience:  detectD3(repos) ? 'Yes' : 'No',
        portfolio:        profile.blog || '',
        location:         profile.location || '',
        bio:              (profile.bio || '').replace(/[\r\n]+/g, ' ').trim(),
        notableReposText: notable.map(r => `${r.name}(★${r.stars})`).join('; '),
        notableReposData: notable,
      });

    } catch (err) {
      if (err instanceof RateLimitError) {
        process.stdout.write('\n');
        console.warn(`\n  Rate limit reached: ${err.message}`);
        console.log(`  Saving ${candidates.length} partial results now.`);
        break;
      }
      // Individual profile fetch failures are skipped silently
    }
  }

  process.stdout.write('\n');
  return candidates;
}

// ─────────────────────────────────────────────────────────────────────────────
// OUTPUT — CSV and JSON
// ─────────────────────────────────────────────────────────────────────────────

/** Escape a value for RFC-4180 CSV */
function csvEsc(v) {
  const s = String(v == null ? '' : v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function writeCsv(candidates, filePath) {
  const date    = new Date().toISOString().split('T')[0];
  const d3Count = candidates.filter(c => c.hasD3Experience === 'Yes').length;
  const sorted  = [...candidates].sort((a, b) => b.followers - a.followers);

  const headers = [
    'Name', 'GitHub URL', 'Username', 'Public Repos', 'Followers',
    'Last Activity', 'Top Languages', 'Has D3 Experience?',
    'Portfolio/Website', 'Location', 'Bio', 'Notable Repos',
  ];

  const rows = [
    `# Found ${candidates.length} candidates (${d3Count} with D3 experience). Updated ${date}.`,
    headers.map(csvEsc).join(','),
    ...sorted.map(c => [
      c.name, c.githubUrl, c.username, c.publicRepos, c.followers,
      c.lastActivity, c.topLanguages, c.hasD3Experience,
      c.portfolio, c.location, c.bio, c.notableReposText,
    ].map(csvEsc).join(',')),
  ];

  fs.writeFileSync(filePath, rows.join('\n') + '\n', 'utf8');
}

function writeJson(candidates, filePath) {
  const d3Count = candidates.filter(c => c.hasD3Experience === 'Yes').length;
  const output  = {
    metadata: {
      generatedAt:  new Date().toISOString(),
      totalCount:   candidates.length,
      d3Count,
      searchConfig: {
        location:     CONFIG.location,
        minStars:     CONFIG.minStars,
        minFollowers: CONFIG.minFollowers,
        updatedAfter: CONFIG.updatedAfter,
      },
      dataSource: 'GitHub public API (api.github.com) — no scraping, no private data',
    },
    candidates: [...candidates]
      .sort((a, b) => b.followers - a.followers)
      .map(c => ({
        name:            c.name,
        githubUrl:       c.githubUrl,
        username:        c.username,
        publicRepos:     c.publicRepos,
        followers:       c.followers,
        lastActivity:    c.lastActivity,
        topLanguages:    c.topLanguages.split(', ').filter(Boolean),
        hasD3Experience: c.hasD3Experience === 'Yes',
        portfolio:       c.portfolio || null,
        location:        c.location,
        bio:             c.bio || null,
        notableRepos:    c.notableReposData,
      })),
  };
  fs.writeFileSync(filePath, JSON.stringify(output, null, 2) + '\n', 'utf8');
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const t0 = Date.now();

  console.log('═'.repeat(56));
  console.log('  D3.js Developer Finder — India');
  console.log('═'.repeat(56));
  console.log(`  Started : ${new Date().toLocaleString()}`);

  if (process.env.GITHUB_TOKEN) {
    console.log('  Auth    : GitHub token detected ✓  (5 000 req/hr)');
  } else {
    console.log('  Auth    : No token — 60 req/hr limit applies');
    console.log('  Tip     : GITHUB_TOKEN=ghp_xxx node find-d3-developers.js');
    console.log('            (free token, no scopes needed)');
  }
  console.log('═'.repeat(56));

  let candidates = [];

  try {
    const usernames = await collectUsernames();
    candidates = await buildProfiles(usernames);
  } catch (err) {
    if (err instanceof RateLimitError) {
      console.error(`\nRate limit: ${err.message}`);
    } else {
      console.error(`\nUnexpected error: ${err.message}`);
    }
    if (!candidates.length) { console.error('No results — exiting.'); process.exit(1); }
    console.log('Saving partial results...');
  }

  const csvPath  = path.join(CONFIG.outputDir, CONFIG.csvFile);
  const jsonPath = path.join(CONFIG.outputDir, CONFIG.jsonFile);
  writeCsv(candidates, csvPath);
  writeJson(candidates, jsonPath);

  const elapsed = Math.round((Date.now() - t0) / 1_000);
  const d3Count = candidates.filter(c => c.hasD3Experience === 'Yes').length;
  const top5    = [...candidates].sort((a, b) => b.followers - a.followers).slice(0, 5);

  console.log('\n' + '═'.repeat(56));
  console.log('  RESULTS');
  console.log('═'.repeat(56));
  console.log(`  Total candidates   : ${candidates.length}`);
  console.log(`  With D3 experience : ${d3Count}`);
  console.log(`  Time taken         : ${elapsed}s`);
  console.log(`  CSV  → ${csvPath}`);
  console.log(`  JSON → ${jsonPath}`);

  if (top5.length) {
    console.log('\n  Top 5 by followers:');
    top5.forEach((c, i) => {
      const tag = c.hasD3Experience === 'Yes' ? '[D3] ' : '     ';
      console.log(`  ${i + 1}. ${tag}${c.name} (@${c.username}) — ${c.followers} followers`);
    });
  }

  console.log('═'.repeat(56) + '\n');
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
