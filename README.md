# CTS Diagnostic Survey

An open-access web application for screening Carpal Tunnel Syndrome (CTS). It combines two assessments — one **Kamath & Stothard questionnaire-based** and one **Katz hand diagram-based** — into a single guided workflow, producing a dual score that aids both patients and healthcare professionals in evaluating CTS likelihood.

This is the standalone version of the app, and the reference for **in-person study collection (option 1a)**: nothing is ever sent over the network. Remote collection through REDCap (option 2a) lives on the `redcap` branch.

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
- **Export** — Print the results page or download the results as CSV
- **In-person study export** — Study staff save one ZIP per session (REDCap import row + the four hand drawings) to an encrypted study drive; see [In-person study mode](#in-person-study-mode-option-1a)
- **Session protection** — 10-minute idle timeout with a 60-second warning, after which the page resets; nothing is stored in the browser
- **Fully static** — No server code: all processing happens in the browser
- **Accessible and responsive** — Tailwind CSS layout adapts to desktop, tablet and mobile viewports

## In-person study mode (option 1a)

Participants complete the survey in person on a study device, using the plain site address.

1. On the Results page, study staff enter the **participant ID** and **timepoint** in "Save the study record" and click **Save study files (ZIP)**.
2. The ZIP, named `CTS_<participant ID>_<timepoint>_<YYYYMMDD-HHMM>.zip`, contains:
   - `<base>_redcap.csv` — one row in REDCap's import format: `record_id`, `redcap_event_name`, then every field using REDCap's codes (Yes = 1, No = 0, …). Import it with REDCap's Data Import Tool.
   - `<base>_katz_l_palmar.png`, `_katz_l_dorsal`, `_katz_r_palmar`, `_katz_r_dorsal` — the combined hand drawings, named after the REDCap file-upload fields they are uploaded to.
3. Save the ZIP to the encrypted study drive (set the study device's browser to ask where to save, or to save there directly), then click **Finish and start next participant** to clear the session.

Nothing is sent over the network: the export is built in the browser and downloaded. The site is fully static, so when it is hosted on Cloudflare Pages, Cloudflare only serves the site's files and never sees study data.

The REDCap value coding lives in `lib/redcapCoding.js` (the `redcap` branch has an identical copy, so both data paths write the same codes); the export itself is `lib/studyExport.js`, `hooks/useStudyExport.js` and `components/StudyRecordPanel.js`.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (static export) |
| UI | React 19, Tailwind CSS 3 |
| Icons | lucide-react |
| Onboarding | driver.js |
| ZIP export | fflate |
| Tests | Vitest |
| CI | GitHub Actions (lint, tests, build) |
| Hosting | Cloudflare Pages (static site only) |

## Project Structure

```
CTS_survey_app/
├── app/                        # Next.js entry: layout, page, global + print styles
├── components/
│   ├── CTSSurvey.js            # Main orchestrator: sections, navigation
│   ├── StudyRecordPanel.js     # Results-page panel: participant ID, timepoint, save ZIP, finish
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
│   ├── constants.js            # Canvas size, colours, thresholds, Katz regions, timeouts, study timepoints
│   └── diagnosticQuestions.js  # Questions, gateways, REDCap field names
├── hooks/
│   ├── useCanvasDrawing.js     # Canvas state, pointer handlers, SVG loading
│   ├── useExport.js            # Field map (REDCap field names), CSV download, print
│   ├── useStudyExport.js       # Builds and downloads the study ZIP
│   ├── useIdleTimeout.js       # Idle timeout state machine
│   ├── useScoring.js           # Kamath + Katz score computation
│   └── useTour.js              # driver.js tour lifecycle
├── lib/
│   ├── canvasUtils.js
│   ├── kamathScoring.js        # Questionnaire weights and bands
│   ├── katzScoring.js          # Hand diagram pixel analysis and classification
│   ├── redcapCoding.js         # Answer labels → REDCap codes
│   ├── studyExport.js          # Study ZIP contents and file names (pure functions)
│   └── tourConfig.js
├── public/
│   ├── hands/                  # SVG and PNG hand diagram assets (SVG labels = region masks)
│   ├── _headers                # Security headers + Content-Security-Policy
│   └── robots.txt              # Disallows indexing
├── tests/                      # Vitest unit tests
├── .github/workflows/ci.yml    # CI: lint, tests, build
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

Open [http://localhost:3000](http://localhost:3000).

### Checks

GitHub Actions (`.github/workflows/ci.yml`) runs these on every push to `main`/`redcap`/`in-person` and on every pull request. Run them locally before pushing:

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

The application is a static export (`output: 'export'` in `next.config.mjs`) and can be served by any static host:

- **Cloudflare Pages** — Connect the repository, set the production branch to `main`, framework preset Next.js (Static HTML Export), build command `npm run build`, output directory `out`, and `NODE_VERSION` = `20`. This branch has no `functions/` folder, so only the static site is published; no secrets are needed.
- **GitHub Pages / Netlify / Vercel / S3** — Point the build output to `out/`.

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

## Acknowledgements

Developed by the [Musculoskeletal Innovation Factory (MSK-IF)](https://uwo.ca/fhs/research/mskif/), Faculty of Health Sciences, Western University, in collaboration with the [Roth | McFarlane Hand and Upper Limb Centre (HULC)](https://www.sjhc.london.on.ca/areas-of-care/roth-mcfarlane-hand-and-upper-limb-centre-hulc), St. Joseph's Health Care London.

## Licence

This project is licensed under the [GNU General Public License v3.0](https://www.gnu.org/licenses/gpl-3.0.en.html).
