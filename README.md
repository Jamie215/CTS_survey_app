# CTS Diagnostic Survey

An open-access web application for screening Carpal Tunnel Syndrome (CTS). It combines two assessments — one **Kamath & Stothard questionnaire-based** and one **Katz hand diagram-based** — into a single guided workflow, producing a dual score that aids both patients and healthcare professionals in evaluating CTS likelihood.

**Live demo (standalone mode):** [cts-survey-app.pages.dev](https://cts-survey-app.pages.dev/)

> **Status:** the `redcap` branch adds a REDCap integration that runs on Cloudflare Pages Functions. That hosting design is **not expected to receive REB approval**, because submissions are decrypted inside Cloudflare (a US company with a global network) before reaching REDCap. Do not use it to collect study data until the server-side code has moved to Canadian, institution-controlled hosting. See [Data residency](#data-residency-open-item).

## Background

Carpal Tunnel Syndrome is the most common peripheral nerve entrapment. Early identification improves outcomes, but access to specialist assessment is not always immediate. This tool digitises two screening instruments based on well-established clinical assessments so they can be completed independently or as part of a clinical consultation:

- **Kamath & Stothard-based questionnaire** — A scored set of yes/no questions covering classic CTS symptoms (nocturnal tingling, median nerve distribution, symptom provocation) alongside discriminating questions that reduce false positives (little-finger symptoms, neck pain suggesting cervical radiculopathy, toe numbness suggesting polyneuropathy).
- **Katz-based hand diagram** — The patient draws areas of pain, tingling and numbness onto palm and back hand outlines. Pixel-level coverage analysis determines whether the symptom distribution matches the classic, probable, possible, or unlikely CTS pattern based on median nerve territory involvement.

Each instrument produces an independent score. Together they provide a more robust screening result than either alone.

## Features

- **Three-section guided workflow** — Diagnostic questions → Hand diagrams → Results
- **Branching questions** — follow-up questions appear only when the gateway questions (numbness/tingling, wrist splint) are answered Yes
- **Interactive canvas drawing** — Freehand symptom mapping on SVG hand outlines for pain (orange), tingling (purple) and numbness (blue)
- **Dual scoring engine** — Kamath-based score (questionnaire) and Katz-based score per hand (pixel analysis with finger/palm zone detection)
- **Patient / healthcare professional views** — Results show a simplified summary for patients and detailed breakdowns (score tables, coverage percentages, zone analysis) for professionals
- **Guided onboarding tours** — driver.js-powered walkthroughs for the questions and hand diagram sections
- **Export** — Print the results page; the healthcare professional view can also download results as CSV (same field names as the REDCap project)
- **Session protection** — 10-minute idle timeout with a 60-second warning, after which the page resets; nothing is stored in the browser
- **REDCap study mode** (`redcap` branch) — personalised invitation links resolve to a participant and timepoint, and results are submitted to REDCap automatically
- **Accessible and responsive** — Tailwind CSS layout adapts to desktop, tablet and mobile viewports

## Modes

| Mode | How it starts | Data leaves the device? |
|------|---------------|-------------------------|
| Standalone | Open the site normally | No — scoring and export run entirely in the browser |
| Study (REDCap) | Open an invitation link containing `?k=<access key>` | Yes — on reaching Results, answers, scores and four hand-diagram images are submitted to REDCap |

### How study mode works (`redcap` branch)

1. A coordinator creates a record in REDCap. REDCap's Data Entry Trigger calls `/api/redcap/provision`, which writes one access key per timepoint (`baseline_arm_1`, `6_weeks_arm_1`, `3_months_arm_1`) into the record's `access_key` field. Existing keys are never rotated.
2. A REDCap Alert emails the participant `https://<site>/?k=[access_key]`.
3. The browser sends the key to `/api/redcap/session`, which looks up the record and timepoint and sets a signed, HttpOnly session cookie (2 hours). The record ID never reaches the browser.
4. When Results appear, the browser posts the field map and four PNGs to `/api/redcap/submit`, which imports the record, then uploads each image into its file-upload field (`katz_l_palmar`, `katz_l_dorsal`, `katz_r_palmar`, `katz_r_dorsal`).
5. Images are best-effort and never block the saved answers, but they are never silent either. Each failed upload is retried once; any image still missing (never received, or rejected by REDCap) is reported back by field name, and the participant is asked to tell their coordinator. If `IMAGE_STATUS_FIELD` names a text field in the REDCap project, the server also writes `complete` or `missing: <fields>` there, so incomplete records can be found with a REDCap report.
6. If submission fails, a banner offers **Try again** and asks the participant to contact the study coordinator (the professional view also points to the CSV download).
7. Responses are final once submitted. A timepoint whose `timestamp` field is already filled in is closed: reopening its link (or an idle-timeout reload) shows an "already submitted" notice, and `/api/redcap/submit` refuses a second submission. Other timepoints for the same participant stay open.

Required server secrets: `REDCAP_API_URL`, `REDCAP_API_TOKEN`, `SESSION_SECRET`, `PROVISION_SECRET`, and optionally `REDCAP_PROJECT_ID` and `IMAGE_STATUS_FIELD`. Never commit these to the repository.

## Data residency (open item)

When running on Cloudflare Pages Functions, every REDCap call (including each participant's submission) is relayed through Cloudflare's network, which may process it outside Canada. The REB is not expected to approve this. Options under consideration:

| Option | Remote participation | REB likelihood |
|--------|----------------------|----------------|
| 1a. Web app, results saved to an encrypted study device and collected in person | No | High |
| 1b. Mobile app on a study-provided tablet | No | High |
| 2a. Site and REDCap functions hosted on a Western-managed (WTS) server in Canada | Yes | High |
| 2b. Same as 2a on a commercial cloud pinned to a Canadian region | Yes | Moderate / conditional |

The functions in `functions/api/` use only standard web APIs (fetch, FormData, Web Crypto), so they can be moved into a small Node.js server with a thin adapter. See the handover *Design & Workflow Overview* for details.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (static export) |
| UI | React 19, Tailwind CSS 3 |
| Icons | lucide-react |
| Onboarding | driver.js |
| Tests | Vitest |
| Hosting (demo) | Cloudflare Pages |
| REDCap server functions (`redcap` branch) | Cloudflare Pages Functions — to be replaced, see above |

## Project Structure

```
CTS_survey_app/
├── app/                        # Next.js entry: layout, page, global + print styles
├── components/
│   ├── CTSSurvey.js            # Main orchestrator: sections, navigation, REDCap banner
│   ├── HandDiagramCanvas.js    # Reusable canvas + clear button
│   ├── ErrorBoundary.js        # Friendly error page with reload
│   ├── IdleWarningModal.js     # Idle-timeout countdown
│   ├── EmptyDiagramConfirmModal.js
│   ├── Modal.js
│   └── sections/
│       ├── DiagnosticQuestions.js
│       ├── HandDiagrams.js
│       └── Results.js          # Role dialog, score cards, print/CSV controls
├── data/
│   ├── constants.js            # Canvas size, colours, thresholds, Katz regions, timeouts
│   └── diagnosticQuestions.js  # Questions, gateways, REDCap field names
├── functions/api/              # Cloudflare Pages Functions (redcap branch)
│   ├── _lib/redcap.js          # REDCap API helpers, value coding, cookie signing
│   └── redcap/                 # provision.js, session.js, submit.js
├── hooks/
│   ├── useCanvasDrawing.js     # Canvas state, pointer handlers, SVG loading
│   ├── useExport.js            # Field map (REDCap contract), CSV download, print
│   ├── useIdleTimeout.js       # Idle timeout state machine
│   ├── useRedcapSession.js     # Resolve ?k= link to a session
│   ├── useRedcapSubmit.js      # Auto-submit on Results
│   ├── useScoring.js           # Kamath + Katz score computation
│   └── useTour.js              # driver.js tour lifecycle
├── lib/
│   ├── canvasUtils.js
│   ├── kamathScoring.js        # Questionnaire weights and bands
│   ├── katzScoring.js          # Hand diagram pixel analysis and classification
│   ├── redcapClient.js         # Browser calls to /api/redcap/*
│   └── tourConfig.js
├── public/
│   ├── hands/                  # SVG and PNG hand diagram assets (SVG labels = region masks)
│   ├── _headers                # Security headers + Content-Security-Policy
│   └── robots.txt              # Disallows indexing
├── tests/                      # Vitest unit tests
├── next.config.mjs
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18.18 or later (20 LTS recommended)
- npm

### Installation

```bash
git clone https://github.com/<owner>/CTS_survey_app.git
cd CTS_survey_app
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). This runs standalone mode; study mode also needs the REDCap server functions and secrets.

### Checks

There is no CI yet, so run these before pushing:

```bash
npm run lint
npm test
npm run build
```

### Production Build

```bash
npm run build
```

This generates the static site in `out/`. To preview it locally:

```bash
npx serve out
```

## Deployment

The front end is a static export (`output: 'export'` in `next.config.mjs`) and can be served by any static host or web server. The REDCap server functions need a runtime alongside it; until the data residency decision is made, only standalone mode should be deployed publicly.

If the app is served from a subdirectory, uncomment the `basePath` line in `next.config.mjs`:

```js
basePath: process.env.NEXT_PUBLIC_BASE_PATH || '/your-subdirectory',
```

## Scoring Overview

### Kamath-based Score (Questionnaire)

Each question carries a weight. Positive indicators (night-time waking, median nerve distribution, relief by movement, symptom provocation, effective splint) add points; discriminating questions (little-finger symptoms, neck pain, toe numbness) subtract points. Gateway questions are not scored. The total maps to:

- **≥ 5** — Classic / Probable CTS
- **3–4** — Possible CTS: Unclear
- **≤ 2** — Unlikely CTS

Weights and bands live in `lib/kamathScoring.js`.

### Katz-based Score (Hand Diagram, per hand)

A digit is affected when the thumb distal segment is > 5% covered, or the index/middle distal segment is > 5% or middle segment ≥ 50% covered. Palm, wrist and dorsum count above 5%.

- **3 Classic** — ≥ 2 of thumb/index/middle affected, no palm, no dorsum
- **2 Probable** — ≥ 2 digits affected, palm involved but not confined to the ulnar side, no dorsum
- **1 Possible** — ≥ 1 digit affected
- **0 Unlikely** — no shading on thumb, index or middle

Rules live in `lib/katzScoring.js`; thresholds in `data/constants.js`.

## Clinical References

- **Kamath V, Stothard J.** A clinical questionnaire for the diagnosis of carpal tunnel syndrome. *J Hand Surg Br.* 2003;28B(5):455–459.
- **Katz JN, Stirrat CR.** A self-administered hand diagram for the diagnosis of carpal tunnel syndrome. *J Hand Surg Am.* 1990;15(2):360–363.

## Contributing

Contributions are welcome. Please open an issue to discuss proposed changes before submitting a pull request.
