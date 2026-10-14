# TAI: learn from what you already have

**TAI** is a self-directed learning companion. Bring your own course material and TAI
helps you understand it, practise it, and always check where an answer came from.

**▶ [Try the live app](https://tai.nwekeejioforscheller.workers.dev)** ·
**🎬 [Watch the demo video](https://www.loom.com/share/646c4f703ec949cdb39cf112bb1641ae)**

> Hackathon prototype. Sign in with Google, then upload a text-based PDF or TXT file in
> English. Need something to try? Use the
> [demo case study](docs/demo-material/tai-demo-case-study.pdf).

> Hackathon Theme: Engagement & Staying in the Learning Journey. Tools that help learners stay motivated and keep going, so they remain in the learning process over time rather than falling off.

## Why TAI

Students already have lecture notes, handbooks and PDFs. Access is rarely the problem.
The hard part is finding what matters, practising it actively, and picking up again
after an interruption. General chat tools can explain a topic, but they can't show you
where an answer came from in *your* material. TAI is built around that: every concept,
question and piece of feedback stays linked to the page it came from.

## What you can do

**Read**

- Create a study space and upload a text-based PDF or TXT file. Text is extracted in
  your browser, and the original is stored privately.
- Read the original PDF page by page inside TAI.
- Generate concepts from the whole document, or from one chapter when the PDF has
  bookmarks. Cover and near-empty pages are skipped.
- Explore concepts as a list or a map of suggested connections, untick or rename them,
  and open any **Page N** chip to see the exact cited passage.

**Practise**

- **Practice questions** in a full-screen focus mode, one at a time and untimed: recall,
  multiple choice, explanation, scenario and supported calculation questions.
- Check a recall answer against what your material supports, then judge it yourself:
  Not yet, Partial or Remembered.
- Multiple choice and numeric answers are checked by fixed rules, not by AI.
- Written answers get source-grounded rubric feedback that can say *uncertain*, plus one
  targeted follow-up question on the gap.
- Ask for a hint or a simpler-English explanation without giving away the answer.
- **Flashcards** built from your concepts: flip, rate 1–5, no AI call.
- **Learn by doing**: a small, safe practical task for one concept.
- Checked supplementary resources that match your concepts.

**Pick up where you left off**

- Sessions can be resumed. If saving fails, your draft is kept for an explicit retry.
- Concept review shows what you have practised and when to come back.
- Keyboard shortcuts, larger text, reduced motion and mobile layouts.
- Delete a study space or your whole account and its data at any time.

## How it works

```text
Browser (React)                      Cloudflare Worker (API)
 ├─ extracts PDF/TXT text locally ──▶ ├─ D1: study spaces, chunks, concepts, attempts, progress
 ├─ renders the original PDF          ├─ R2: private original files
 └─ sends IDs, never documents ─────▶ └─ Workers AI via AI Gateway: bounded excerpts only
```

- **One Cloudflare Worker** serves the React app and the API, with Google sign-in.
- **The AI follows a fixed pipeline, not an autonomous agent:** read (organise
  concepts) → write (prepare a 3–5 question pack) → grade (rubric feedback) → targeted
  follow-up.
- **The browser sends IDs, not text.** The Worker loads the relevant excerpts itself,
  so the model never receives the whole document.
- **Every model output is validated** against a strict schema, and every cited source
  must belong to the learner's own material. If the evidence is insufficient, TAI says
  so instead of inventing support.
- **Rules that must be exact stay out of the model:** multiple-choice grading, numeric
  checks, review dates, session budgets, persistence and deletion.
- **Each user has a daily AI quota,** checked before every model call. Prompts,
  documents and answers are kept out of logs.

## Honest limits

- Text-based PDF and TXT in English only; scanned PDFs and OCR are not supported.
- TAI does not verify that your material is factually correct.
- AI feedback can be wrong. It shows its evidence and an *uncertain* outcome rather than
  false confidence.
- Review timing is a simple study heuristic, not a validated model of memory.
- Full offline use is not part of this prototype.

## Run it locally

Requires Node.js (see `.nvmrc`) and a Cloudflare account for live AI features.

```sh
nvm use
npm ci
cp .env.example .env   # add Google OAuth and Cloudflare values; never commit .env
npm run db:migrate
npm run dev            # http://localhost:8787
```

`npm run dev` builds the web app once and serves it through Wrangler. Run
`npm run build:web` after changing client code. See the
[local setup guide](docs/developer-guide/setup.md) for Google sign-in, Worker secrets
and deployment.

Run every check (formatting, lint, types, Worker and contract tests, browser tests and
the production build) with:

```sh
npm run check
```

Tests use synthetic data and fake AI providers, so they make no billed model calls.

## How it was built

TAI was built with Codex as a development partner. Specialised principal-engineer,
coder, reviewer and tester agents ([role definitions](.codex/agents/)) planned
milestones, implemented bounded changes, and reviewed each one for privacy,
accessibility, persistence and source integrity. Product direction, scope decisions,
credentials, live configuration and what shipped remained with the author.

## Documentation

- [Product requirements (v0.2)](PRD_v2.md)
- [Development roadmap](docs/roadmap/README.md)
- [Developer guide](docs/developer-guide/README.md)
- [Documentation index](docs/README.md)
- [Demo video script](docs/demo-video-script.md)
