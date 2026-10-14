# TAI hackathon demo video script

**Target runtime:** 5 minutes 20 seconds  
**Format:** edited screen recording with separately recorded voice-over  
**Core story:** bring your material → understand it → practise it → trust the source

## Recording approach

Record the interface first in short clips, then edit the clips into the order below.
Record the narration only after the visual edit is close to final. Aim for a calm pace of
125–135 words per minute. Leave a short pause after the opening question, before the
first AI result, and before the closing line.

Use one prepared, non-sensitive PDF with a strong title, clean extracted text, six to
eight concepts, and a saved activity pack. Keep a second browser state ready with the
graded answer and targeted follow-up already generated. This keeps the video moving
without pretending that live model calls are instant.

## Timed master script

| Time | Picture and interaction | Voice-over |
| --- | --- | --- |
| **0:00–0:18** | Cold open in focus mode. Show a strong question, enter a short response, then reveal the source-grounded result. Click a source chip so the cited PDF page opens. On-screen title fades in: **“TAI — Learn from what you already have.”** | **“What if your course material could stop being a file you keep postponing, and become a learning companion that asks, checks, and shows its evidence? This is TAI.”** |
| **0:18–0:48** | Cut to a quiet montage: a long PDF, a learner scrolling, then TAI’s Home screen. Caption: **“Reading is available. Understanding is harder.”** | **“Students already have lecture notes, handbooks, and PDFs. The problem is rarely access alone. The hard part is finding what matters, practising it actively, and returning after an interruption without starting over. Generic chat tools can explain a topic, but a learner also needs traceability, progress, and control.”** |
| **0:48–1:10** | Show the signed-out landing, Google sign-in button, then the authenticated Home screen. Brief architecture overlay: **React + Cloudflare Worker · D1 · R2 · Workers AI through AI Gateway**. | **“TAI is a self-directed learning companion built on Cloudflare. One Worker serves the React experience and API. D1 stores learning progress, R2 stores the learner’s original file, and Workers AI runs behind AI Gateway. Google sign-in keeps each study space tied to its owner.”** |
| **1:10–1:48** | Open **Study spaces**. Create a space, select the prepared PDF, show local processing, page count, and save. Move quickly through loading states; do not wait on dead air. Caption: **“PDF and TXT · browser extraction · private original”**. | **“I begin with my own material. TAI supports text-based PDF and TXT files. Extraction happens in the browser, where file limits and readable text are checked before saving. The original remains private in R2, while structured chunks in D1 keep stable page references. The model receives bounded excerpts only when a learning task needs them, never the entire PDF.”** |
| **1:48–2:28** | Open the saved material. Let the two-zone reader settle. Scroll the PDF slightly, show the sticky page controls, then generate or display concepts. Toggle one concept off, edit one label, switch briefly to Map and back to List. Click a page chip and show the citation panel/PDF jump. | **“The saved source remains the centre of the experience. Beside it, TAI organizes a small set of editable, source-backed concepts. I can select what matters, rename a label without breaking its identity, or view suggested relationships as a map. Every concept keeps its supporting location. When I open a citation, TAI takes me back to the exact evidence instead of asking me to trust a floating answer.”** |
| **2:28–3:05** | Click **Start practice**. On Practice, pause on the dominant prepared-session card and the quieter Flashcards/Learn-by-doing options. Resume the saved session. Show the progress bar and one-question focus mode. | **“From here, practice is deliberate. TAI prepares small packs across recall, multiple choice, explanation, scenarios, and supported calculations. The learner chooses the time and can resume an interrupted session. Questions appear one at a time in an untimed focus mode, while flashcards provide an instant, private option without another AI call.”** |
| **3:05–3:48** | Demonstrate one short written answer. Use **Check answer**. Show the compact rubric result, criterion rows, and source chips. Then show **Next small step**, enter a follow-up response, and display its result. | **“For open responses, TAI does not force false certainty. It compares the saved answer with a source-grounded rubric and can return supported, partial, uncertain, or not supported. The feedback shows what the response covered, what needs work, and where that judgment came from. It then creates one targeted follow-up around the assessed gap. One answer is evidence for a next step; it is not a diagnosis of the learner.”** |
| **3:48–4:12** | Quick split montage: MCQ local check; calculation with value/unit and working feedback; **Hint** or **See the answer**; then the session summary. Add small captions: **“MCQ: local”**, **“Numeric result: deterministic”**, **“Hint/reveal ≠ recall success”**. | **“Deterministic rules stay outside the model. Multiple choice is checked locally. Supported numeric answers use reviewed tolerances and units. Hints, reveals, skips, confidence, and correctness remain separate, so seeing an answer never masquerades as successful recall. Progress is saved before completion is shown.”** |
| **4:12–4:36** | Return to Home, reopen the study space, then show Settings and the deletion control without confirming it. Briefly show mobile bottom navigation or a 320-pixel view. Caption: **“Resume · retry · delete · keyboard accessible”**. | **“TAI is designed for real interruptions. Saved sessions can be resumed, failed requests preserve the learner’s draft for an explicit retry, and deletion removes application-controlled study data. The interface supports keyboard navigation, large text, reduced motion, mobile layouts, and learning without timers or streak punishment.”** |
| **4:36–5:03** | Cut to a clean development montage: roadmap documents, a small code diff, test output, PR list, and the final interface. Show text cards one at a time: **Plan → Build → Review → Verify** and **Codex** beneath them. | **“Codex played a significant role throughout development. I used it first to turn the product requirements into an architecture, milestone plan, risks, and acceptance criteria. During implementation, specialized principal-engineer and coder agents worked on bounded changes across the React app, Worker APIs, D1 migrations, R2 storage, Workers AI integration, and the design system. Reviewer and tester agents then challenged each milestone for privacy, accessibility, persistence, source integrity, and regressions. Codex also helped reproduce UI problems from screenshots, refine the interaction design, and maintain automated browser and contract coverage. I remained responsible for the product direction, scope decisions, credentials, live configuration, and what ultimately shipped.”** |
| **5:03–5:20** | Return to the opening source citation, then pull back to the TAI Home screen. End card: **“TAI — Read. Make sense of it. Recall it.”** Under it: **“Built on Cloudflare.”** | **“TAI turns the material a learner already trusts into a focused cycle: read it, make sense of it, recall it, and inspect the evidence. It is learning at your pace, without losing your place. This is TAI.”** |

## On-screen text rules

- Keep captions to one line and six words where possible.
- Use TAI’s evergreen, mint, warm white, and dark-ink palette.
- Animate captions with a short fade and 4–6 pixel rise; avoid dramatic zooms.
- Keep the cursor still while narration explains a result.
- Zoom only for source chips, rubric outcomes, and the Codex workflow.
- Never show `.env`, secrets, Cloudflare tokens, private learner documents, raw
  production records, or account email addresses.

## Capture checklist

1. Use a clean browser profile and hide bookmarks, extensions, notifications, and the
   operating-system dock where possible.
2. Record at 1440×900 or 1920×1080. Keep the browser at 100% zoom.
3. Prepare the study space and activity pack before recording. Capture AI loading as a
   short clip, then cut to the completed result.
4. Record every interaction as a separate clip with two seconds of stillness at both
   ends. This makes editing and voice-over alignment much easier.
5. Capture the mobile view separately at 390×844 and place it beside the desktop view
   for the accessibility montage.
6. Record voice-over in a quiet room, 15–20 centimetres from the microphone. Speak to
   one learner, not to “the judges.”
7. Add quiet background music only if the voice remains effortless to understand.
   Lower it further during the Codex explanation and final line.

## Claims to avoid

- Do not claim that TAI verifies whether uploaded material is factually correct.
- Do not claim proven learning or retention improvement without learner-study data.
- Do not call the current prototype fully offline.
- Do not claim every PDF works; the demo supports text-based PDF and TXT material.
- Do not imply that AI grading is always correct. Show the uncertainty states and
  source-backed rationale.
- Do not describe prototype performance targets as measured results unless they have
  been timed on the recorded deployment.

## Emergency 30-second cut list

If the video runs long, shorten the architecture overlay by five seconds, remove the
Map toggle, show only one deterministic grading example, and trim the interruption
montage. Keep the opening citation, the source-backed feedback, the Codex workflow,
and the final learning loop; those carry the story.
