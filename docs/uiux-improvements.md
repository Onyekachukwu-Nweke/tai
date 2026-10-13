# TAI – UI/UX Improvement Plan

> Audience: demo prep. Priority-ordered. Highest-impact changes first.

---

## Summary of Problems

The current UI presents everything on a single long scrolling page with no navigation,
flat visual hierarchy, tiny interactive areas, and six or more undifferentiated buttons per
question. The experience feels like a form, not a learning companion. These changes
focus on the demo's P0 journey: upload → explore concepts → practice → done.

---

## 1. Global Layout — Replace the Scroll Wall with Structured Views

**Problem:** Every section (dashboard, material preview, concept explorer, concept
review, activity pack, settings) lives in one unbroken vertical scroll. The learner has no
mental model of where they are.

**Fix:**
- Add a persistent left sidebar (collapsed to icon-rail on small screens) with labelled
  sections: **Home**, **Study Space**, **Practice**, **Settings**.
- The main content area shows only the active section.
- Study space → concept explorer → practice session flow becomes a step-by-step
  wizard with a breadcrumb trail at the top: `Study space > Concepts > Practice`.
- Footer "One step at a time." is charming — keep it but give it room to breathe.

---

## 2. Button Hierarchy — Three Visual Tiers

**Problem:** Every button (primary action, helper, destructive, meta) renders identically
as a thin outline with equal weight. "Delete study space" looks the same as "Preview
material". "Flag incorrect" looks the same as "Hint".

**Fix — three tiers everywhere:**

| Tier | Style | Examples |
|------|-------|---------|
| Primary | Solid green fill, white text, rounded | Start session, Submit answer, Save label |
| Secondary | Outlined green, green text | Preview material, Prepare another pack |
| Tertiary / Ghost | No border, muted text | Hint, Explain in simpler English |
| Destructive | Outlined red or red text | Delete study space, Delete my account |
| Meta / Feedback | Small pill, grey | Flag incorrect, Flag ambiguous |

Apply consistently across every screen. Never put a destructive action beside a
primary action without visual separation and a confirmation step.

---

## 3. Activity Session — One Question at a Time

**Problem (biggest impact on demo):** All 4–5 questions are stacked vertically on one
page. Each question has 6–7 buttons in an unstructured cluster. The response textarea
is barely two lines tall. Nothing shows progress.

**Fix — focused question view:**

```
┌─────────────────────────────────────────────────────┐
│  ← Back to pack        Question 1 of 4   ●●○○  11m  │
│─────────────────────────────────────────────────────│
│  RECALL · ~2 min                                    │
│                                                     │
│  What are the key aspects of IT Project             │
│  Management in the context of a case study?         │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │                                               │  │
│  │  Your answer here…                            │  │
│  │                                               │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  Confidence: ○ Low  ○ Medium  ○ High               │
│                                                     │
│  [  Check answer  ]   Hint   Simpler English        │
│                                                     │
│  ─────────────────────────────────────────────      │
│  Skip     Reveal answer     ⚑ Flag                  │
└─────────────────────────────────────────────────────┘
```

Specific changes:
- Show one question at a time; next/previous arrows or automatic advance.
- Progress bar + question counter + remaining time estimate at the top.
- Textarea: minimum 120px tall, grows with content.
- **Button grouping:** primary action (`Check answer`) gets solid green. Help actions
  (`Hint`, `Simpler English`) are ghost text links beside it. Skip/Reveal go on a
  secondary row, visually dimmer. `Flag` is a small icon-pill in the corner.
- Activity type (RECALL, EXPLAIN, SCENARIO, MCQ) shown as a coloured badge, not
  just bold text. Suggest: Recall = blue, Explain = purple, Scenario = amber, MCQ = teal.
- Remove "Why this activity: You asked to learn from your current material." — it adds
  no information and breaks rhythm. Replace with a one-word type badge.

---

## 4. Dashboard / Study Spaces — Card Grid, Not a Form Stack

**Problem:** The "create" form and existing study spaces are stacked with no visual
grouping. The material preview dumps inline after the card without transition.

**Fix:**
- Study spaces render as a card grid (2 columns on desktop, 1 on mobile).
- Each card: space name as heading, last-opened date, a "▶ Open" primary button,
  a "⋯" overflow menu for Preview / Delete.
- The "New study space" card uses a dashed border with a `+` icon — standard
  "add item" affordance.
- Clicking "Open" navigates to the Study Space view (separate section), not an
  inline expand.
- Delete is inside the overflow menu, requires a confirmation dialog: "Delete
  *System Specs Case Study*? This removes the file and all progress." with a red
  "Delete" and a "Cancel".

---

## 5. Concept Explorer — Reduce Card Clutter

**Problem:** Each concept card contains a checkbox, an editable label input, a Save
button, a description line, and one or two long source links — all at the same visual
weight. The List/Map toggle looks like action buttons, not a toggle.

**Fix:**
- List/Map: use a segmented control (`▤ List | ⬡ Map`) styled as a single grouped
  pill — clearly a view switch, not two separate actions.
- Concept card layout:

```
┌──────────────────────────────────────────────┐
│  ☑  IT Project Management          [Edit ✎]  │
│  SystemSpecs case study analysis             │
│  Source: Page 1, section 1  ↗               │
└──────────────────────────────────────────────┘
```
  - Checkbox and label on one line; edit only appears on hover/focus (reduces noise).
  - "Save label" disappears unless the user has changed the text (show only when
    dirty).
  - Source link truncated to "Page 1, section 1" with an icon, not the full raw text.
- The disclaimer blockquote ("Cloudflare Workers AI produced the concepts…") should
  collapse to a `ℹ How are concepts generated?` expandable, not displayed in full
  every time.

---

## 6. Material Preview — Compress the Warning Wall

**Problem:** Two dense blockquotes of caution text appear before the learner sees
anything useful. The extracted text has no container styling to distinguish it from UI
chrome.

**Fix:**
- Collapse the caution text into a single dismissible banner:
  `⚠ Extracted text may lose meaning in equations and tables. Check against your original. [Got it]`
- Once dismissed, remembered in localStorage.
- Button row: `[ Close preview ]  [ View PDF page ]  Open original ↗` — all three
  clearly on one line.
- Extracted text panel: light grey background, monospace-friendly font, clear
  "Page 1 of N / 401 chars" header.
- Page selector: show as a numbered nav row (← 1 2 3 … →) rather than a dropdown
  when ≤10 pages.

---

## 7. Concept Review — Make Progress Visible

**Problem:** "Not checked" repeated three times in a bullet list. No indication of what
"checking" means or how to do it.

**Fix:**
- Replace the bullet list with a row of status chips:

```
  IT Project Management  [Not reviewed]
  Case Study Analysis    [Not reviewed]
  SystemSpecs            [Not reviewed]
```
- Each chip is clickable and marks the concept as reviewed (or opens a quick
  self-assessment: "How well do you know this? 1–5").
- Completed chips turn green with a checkmark.
- Add a "Next review" date shown as "Review again: in 3 days" not just blank.

---

## 8. Practice Activities — Collapse the Technical Disclaimer

**Problem:** The practice activities blockquote is ~100 words of technical detail about
AI providers, grading, rubrics, and hints. A learner doesn't need this before every
session.

**Fix:**
- Replace with a single line: `AI-prepared · Multiple choice graded locally · [How this works ↗]`
- "How this works" opens a modal with the full disclaimer for those who want it.
- "Prepare another pack" and "Today's session" should be visually separated as two
  distinct affordances: Prepare = secondary button; Start session = primary button.

---

## 9. Today's Session Config — Surface the Key Choice

**Problem:** The session config (Time, What to do, Concept) is buried in a card after
scrolling past the entire practice activities section.

**Fix:**
- Pull the session config card to the top of the Practice section, before the question
  list.
- Layout:

```
  ┌─────────────────────────────────────────┐
  │  Today's session                        │
  │  Time: [15 min ▾]  Activity: [Learn ▾] │
  │  Concept: [Use recommendation ▾]        │
  │                   [ Start session ▶ ]   │
  └─────────────────────────────────────────┘
```
- All three controls inline on one row (or two on mobile).
- Primary CTA "Start session" is solid green, large, at the right.

---

## 10. Supplementary Resources — Reduce Metadata Noise

**Problem:** Each resource card lists Publisher, Format, Language, Access, Last
checked as five separate label-value rows, making the card tall and hard to scan.

**Fix:**
```
┌─────────────────────────────────────────────────────┐
│  Project management: the start of the project journey│
│  Supports: IT Project Management                    │
│  Introduces project planning, feasibility, risk…    │
│                                                     │
│  The Open University – OpenLearn  ·  course  ·  Free│
│  Last checked 2026-10-12    [Open resource ↗]       │
└─────────────────────────────────────────────────────┘
```
- Condense Publisher / Format / Access into one line with `·` separators.
- "No checked match for: SystemSpecs" → show as a muted chip inside the resources
  section, not floating plain text after the cards.

---

## 11. Settings — Elevate Text Size Picker

**Problem:** Text size options are three radio buttons with full labels in parentheses.
The language notice is a large paragraph.

**Fix:**
- Text size: segmented control with `A  A+  A++` (visually sized).
- Language notice: single sentence with an icon, not a paragraph.
- Settings page: use a two-column layout (label left, control right) like a standard
  settings panel.

---

## 12. Accessibility — Quick Wins

The PRD requires these; current screenshots suggest some may be missing:
- Visible focus ring on all interactive elements (not just browser default).
- `aria-label` on icon-only buttons and the List/Map toggle.
- Colour contrast: green-on-white links should be checked (the current green may
  fail WCAG AA on light backgrounds).
- Response textareas: associate `<label>` explicitly; don't rely on adjacent text.
- Confirmation dialogs (delete) must trap focus.

---

## 13. Typography & Spacing — Simple Fixes

- Add consistent vertical rhythm: 8px base unit, sections separated by 48px.
- Section headings (h2): slightly larger, semibold, not just bold.
- Body text: increase line-height from default to 1.6 for readability.
- The "EARLY DEVELOPMENT PREVIEW" banner: use a subtle coloured badge, not
  spaced-uppercase inline text that competes with the welcome heading.

---

## Demo Priority Order

| # | Change | Effort | Impact |
|---|--------|--------|--------|
| 1 | One-question-at-a-time activity view + progress bar | Medium | Very high |
| 2 | Three-tier button hierarchy applied everywhere | Low | High |
| 3 | Session config card at top of Practice section | Low | High |
| 4 | Dashboard card grid + overflow menu for delete | Medium | High |
| 5 | Concept card: hide Save until dirty, collapse source text | Low | Medium |
| 6 | Collapse blockquote disclaimers to expandables/banners | Low | Medium |
| 7 | Concept review status chips | Low | Medium |
| 8 | Resource card single-line metadata | Low | Low |
| 9 | Settings two-column layout + segmented text-size control | Low | Low |
| 10 | Sidebar navigation | High | Medium |
