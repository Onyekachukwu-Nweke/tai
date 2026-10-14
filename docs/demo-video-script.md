# TAI hackathon demo video script

**Target runtime:** about 5 minutes  
**Format:** one continuous Loom recording (screen + voice), no editing  
**Core story:** bring your material → understand it → practise it → trust the source

## How to use this script

You talk while you click. Each beat has **Do** (what to click) and **Say** (what to
say). Don't read it word for word; learn the idea of each beat and say it naturally.
Speak at a calm pace, and when something loads, keep talking instead of waiting in
silence. The timings are a guide: if you finish a beat early, move on.

## Before you press record

1. **Rebuild the web app** so the browser runs the latest code: `npm run build:web`,
   then restart `npm run dev`. Open `http://localhost:8787` and sign in.
2. **Prepare one study space ahead of time** (for example "System Specs Case Study")
   with the PDF saved, concepts already generated, and an activity pack prepared.
   Live AI generation takes about 25 seconds and uses daily quota, so don't generate
   during the recording.
3. **Make sure a fresh session is ready.** If you rehearsed and answered the
   questions, use **Start a different session** on the Practice page before recording
   so the questions are unanswered again. The first question should be a recall
   question and the second a multiple-choice question.
4. **Clean screen:** close other tabs, hide the bookmarks bar, turn on Do Not Disturb,
   keep the browser at 100% zoom, and don't show the terminal, `.env` or your email.
5. **Optional second tab:** the GitHub pull requests page, to show during the Codex
   section.
6. **Rehearse once** with a timer. If you're over 5:30, shorten the "Say" lines in
   beats 3 and 7.

## Run of show

### 1 · Opening (0:00–0:30)

**Do:** Start on TAI's Home page. Leave the mouse still.

**Say:** "Hi, I'm Onyekachukwu, and this is TAI, a learning companion for the
material you already have. Every student has lecture notes and PDFs they mean to study.
Getting the file is easy. The hard part is working out what matters, practising it
actively, and picking up again after you've been interrupted. General chatbots can
explain a topic, but they can't show you where an answer came from in *your*
material. TAI is built around that."

### 2 · Study space and upload (0:30–1:05)

**Do:** Click **Study Space** in the sidebar. Point at the **New study space** card,
then click **▶ Open** on your prepared space.

**Say:** "Everything starts with a study space. You give it a name and upload a
text-based PDF or TXT file. The text is extracted in the browser, and TAI checks file
size, page count and whether the text is readable before anything is saved. The
original file is stored privately and is never sent to the AI. When a learning task
needs it, the AI only receives short excerpts. I've already saved a case study here,
so let's open it."

### 3 · Read the material and its concepts (1:05–2:05)

**Do:**
1. Let the PDF show. Click the **›** arrow to move to page 2, then back with **‹**.
2. Scroll to **Concepts**. Point at "Generate from: Whole document" (don't click
   Generate).
3. Click **Map**, pause two seconds, then click **List**.
4. Click a **Page 1** chip on a concept. The cited-passage panel opens. Close it with
   **✕**.

**Say:** "This is the reading side. The actual PDF stays in the centre: I'm reading
my document, not an AI summary of it. Below, TAI has pulled out the key concepts.
It works from the whole document, or from a single chapter if the PDF has chapters,
and it skips near-empty pages like the cover. I can untick a concept I don't care about
or rename it. The map view shows suggested connections between concepts; they're
ideas to explore, never a fixed order. And the most important part: every concept
keeps its source. When I click this page chip, TAI shows me the exact passage it came
from. I don't have to trust a floating answer; I can check it."

### 4 · Practice questions in focus mode (2:05–3:05)

**Do:**
1. Scroll up and click **Start practice ▶**. Pause on the two cards.
2. Click **Resume session ▶** (or **Start session ▶**). Focus mode opens.
3. On the recall question, type a short answer, then click **See the answer**.
4. Click **Partial** (or press **2**).
5. Press **→** or click **Next →** for the multiple-choice question. Choose an option
   and click **Check answer**.
6. Click **Exit**.

**Say:** "Now practice. There are two ways to practise: AI-prepared questions, or
instant flashcards. Questions come in a focus mode, one at a time, with no timer.
Here's a recall question. I write what I remember first, then check it against the
answer supported by my material, and I judge for myself how I did. That honesty
matters: if I skip writing and just look at the answer, TAI records it as a reveal,
not as remembering. Multiple-choice answers are checked locally, by fixed rules rather
than AI. It also works from the keyboard: Enter, the number keys and the arrows."

### 5 · Flashcards (3:05–3:35)

**Do:** Click **Start flashcards ▶**. Press **Space** to flip. Click **4 stars**. Flip
the next card and rate it. Press **Esc**.

**Say:** "Flashcards are the quick option. They're built straight from my concepts,
with no AI call at all. I see the concept, try to recall it, flip, and rate how well I
knew it. Next time round, TAI shows my last rating. These ratings stay private in my
browser."

### 6 · Built for real life (3:35–3:55)

**Do:** Scroll to **Concept review**, then click **Settings** in the sidebar. Click
**Large** text size, then back to **Standard**. Point at **Delete my account**
without clicking it.

**Say:** "TAI is built for real interruptions. Sessions can be resumed, and if
saving fails, your draft is kept so you can try again. You can make the text larger,
use it from the keyboard, and delete your account and study data whenever you want.
Under the hood, it's all on Cloudflare: one Worker for the app and API, D1 for
progress, R2 for your original files, and Workers AI behind AI Gateway, with a daily
AI limit for each user."

### 7 · How Codex was used (3:55–4:45)

**Do:** Switch to the GitHub pull requests tab (optional), or stay on TAI.

**Say:** "Codex played a significant role throughout development. I used it first to
turn the product requirements into an architecture, milestone plan, risks, and
acceptance criteria. During implementation, specialized principal-engineer and coder
agents worked on bounded changes across the React app, Worker APIs, D1 migrations, R2
storage, Workers AI integration, and the design system. Reviewer and tester agents
then challenged each milestone for privacy, accessibility, persistence, source
integrity, and regressions. Codex also helped reproduce UI problems from screenshots,
refine the interaction design, and maintain automated browser and contract coverage. I
remained responsible for the product direction, scope decisions, credentials, live
configuration, and what ultimately shipped."

### 8 · Close (4:45–5:00)

**Do:** Go back to the study space with the PDF on screen. Stop moving the mouse.

**Say:** "So that's TAI: read your material, make sense of it, practise it, and always
be able to check the source. Learning at your own pace, without losing your place.
Thanks for watching."

## Getting clean audio without editing

- **Microphone:** a headset or earbud mic held close sounds better than a laptop mic.
  Record in a small room with soft furniture, curtains or a wardrobe nearby.
- **Loom settings:** in the Loom desktop app, choose the right microphone and turn on
  noise suppression if your version offers it. Do a 10-second test recording and
  listen back with headphones.
- **If you have time for one extra step:** download the finished video from Loom and
  import it into Descript. Use **Studio Sound** to clean the voice, export, and upload
  the result. This needs no real editing knowledge. Free tiers and features change, so
  check what's currently available.
- **Mistakes:** if you stumble, pause, take a breath and repeat the sentence. In one
  take, a small restart sounds natural. Only re-record if a whole beat goes wrong.

## Claims to avoid

- Do not claim that TAI verifies whether uploaded material is factually correct.
- Do not claim proven learning or retention improvement without learner-study data.
- Do not call the current prototype fully offline.
- Do not claim every PDF works; the demo supports text-based PDF and TXT material.
- Do not imply that AI grading is always correct.
- Do not describe prototype performance targets as measured results unless they have
  been timed on the recorded deployment.

## If you're running long

Cut beat 6 down to the Cloudflare sentence, and drop the multiple-choice question in
beat 4. Always keep the citation click (beat 3), the recall check (beat 4), the Codex
section (beat 7) and the closing line.
