# CTS Diagnostic Survey

An open-access web application for screening Carpal Tunnel Syndrome (CTS). It combines two assessments — one **Katz hand diagram-based** and one **Kamath & Stothard questionnaire-based** — into a single guided workflow, producing a dual score that aids both patients and healthcare professionals in evaluating CTS likelihood.

**Live demo:** [cts-survey-app.pages.dev](https://cts-survey-app.pages.dev/)

## Background

Carpal Tunnel Syndrome is the most common peripheral nerve entrapment. Early identification improves outcomes, but access to specialist assessment is not always immediate. This tool digitises two screening instruments based on well-established clinical assessments so they can be completed independently or as part of a clinical consultation:

- **Kamath & Stothard-based questionnaire** — A scored set of yes/no questions covering classic CTS symptoms (nocturnal tingling, median nerve distribution, symptom provocation) alongside discriminating questions that reduce false positives (neck pain suggesting cervical radiculopathy, toe numbness suggesting polyneuropathy).
- **Katz-based hand diagram** — The patient draws areas of tingling, numbness and pain onto dorsal and palmar hand outlines. Pixel-level coverage analysis determines whether the symptom distribution matches the classic, probable, possible, or unlikely CTS pattern based on median nerve territory involvement.

Each instrument produces an independent score. Together they provide a more robust screening result than either alone.

## Features

- **Three-section guided workflow** — Diagnostic questions → Hand diagrams → Results
- **Interactive canvas drawing** — Freehand symptom mapping on SVG hand outlines for tingling (purple), numbness (blue) and pain (orange)
- **Dual scoring engine** — Kamath-based score (questionnaire, 0–11 scale) and Katz-based score (hand diagram pixel analysis with finger/palm zone detection)
- **Clinician identification modal** — Results page conditionally shows detailed clinical breakdowns (score tables, coverage percentages, zone analysis) for healthcare professionals while presenting a simplified summary for patients
- **Guided onboarding tours** — driver.js-powered walkthroughs for the questions section (highlight) and hand diagram section (step-by-step) to orient first-time users
- **Export options** — Download results as CSV, or print directly from the browser
- **In-person study export** — Study staff save one ZIP per session (REDCap import row + the four hand drawings) to an encrypted study drive; see [In-person study mode](#in-person-study-mode-option-1a)
- **Fully static** — Exports as a standalone site with no server-side dependencies; all processing happens client-side
- **Accessible and responsive** — Tailwind CSS layout adapts to desktop, tablet and mobile viewports

## In-person study mode (option 1a)

This branch is the reference for collecting study data **in person**, with nothing sent over the internet. (Remote collection through REDCap lives on the `redcap` branch.)

1. The participant completes the survey on a study device using the plain site address.
2. On the Results page, study staff enter the **participant ID** and **timepoint** and click **Save study files (ZIP)**.
3. The ZIP contains:
   - `<base>_redcap.csv` — one row in REDCap's import format: `record_id`, `redcap_event_name`, then every field using REDCap's codes (Yes = 1, No = 0, …). Import it with REDCap's Data Import Tool.
   - `<base>_katz_l_palmar.png`, `_katz_l_dorsal`, `_katz_r_palmar`, `_katz_r_dorsal` — the combined hand drawings, named after the REDCap file-upload fields they are uploaded to.
4. Save the ZIP to the encrypted study drive, then click **Finish and start next participant** to clear the session.

`<base>` is `CTS_<participant ID>_<timepoint>_<YYYYMMDD-HHMM>`. The REDCap coding lives in `lib/redcapCoding.js` (shared with the `redcap` branch); the export itself is `lib/studyExport.js`, `hooks/useStudyExport.js` and `components/StudyRecordPanel.js`.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (static export) |
| UI | React 19, Tailwind CSS 3 |
| Icons | lucide-react |
| Onboarding | driver.js |
| Deployment | Cloudflare Pages |

## Project Structure

```
cts-survey/
├── app/
│   ├── globals.css          # Global + scoped print styles
│   ├── layout.js            # Root layout with metadata
│   └── page.js              # Entry point, renders CTSSurvey
├── components/
│   ├── CTSSurvey.js         # Main orchestrator (~250 lines)
│   ├── HandDiagramCanvas.js # Reusable canvas + clear button
│   └── sections/
│       ├── DiagnosticQuestions.js
│       ├── HandDiagrams.js
│       └── Results.js       # Includes modal, score cards, export controls
├── hooks/
│   ├── useCanvasDrawing.js  # Canvas state, pointer handlers, SVG loading
│   ├── useExport.js         # JSON/CSV download, print
│   ├── useScoring.js        # Kamath + Katz score computation
│   └── useTour.js           # driver.js tour lifecycle
├── lib/
│   ├── canvasUtils.js       # Pure canvas drawing utilities
│   ├── kamathScoring.js     # Questionnaire scoring logic
│   ├── katzScoring.js       # Hand diagram pixel analysis
│   └── tourConfig.js        # Tour step definitions + createDriver wrapper
├── data/
│   ├── constants.js         # Canvas dimensions, colours, thresholds, section metadata
│   └── diagnosticQuestions.js
├── public/
│   └── hands/               # SVG and PNG hand diagram assets
├── next.config.mjs          # Static export config, basePath documentation
├── tailwind.config.js
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18 or later
- npm

### Installation

```bash
git clone <repository-url>
cd cts-survey
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
```

This generates a fully static site in the `out/` directory. To preview it locally:

```bash
npx serve out
```

## Deployment

The application is configured for static export (`output: 'export'` in `next.config.mjs`), making it compatible with any static hosting platform:

- **Cloudflare Pages** — Connect the repository and set the build command to `npm run build` with output directory `out`.
- **GitHub Pages** — Push the `out/` directory or use a GitHub Actions workflow. Uncomment and set `basePath` in `next.config.mjs` if deploying to a subdirectory (e.g. `/cts-survey`).
- **Netlify / Vercel / S3** — Point the build output to `out/`.

### Base Path

If the app is served from a subdirectory rather than the root, uncomment the `basePath` line in `next.config.mjs`:

```js
basePath: process.env.NEXT_PUBLIC_BASE_PATH || '/your-subdirectory',
```

## Clinical References

- **Kamath V, Stothard J.** A clinical questionnaire for the diagnosis of carpal tunnel syndrome. *J Hand Surg Br.* 2003;28B(5):455–459.
- **Katz JN, Stirrat CR.** A self-administered hand diagram for the diagnosis of carpal tunnel syndrome. *J Hand Surg Am.* 1990;15(2):360–363.

## Scoring Overview

### Kamath-based Score (Questionnaire)

Each question carries a weighted score. Positive indicators (nocturnal symptoms, median nerve distribution, symptom provocation) add points; discriminating questions (neck pain, toe numbness) subtract points where relevant. The total maps to an interpretation band:

- **≥ 5** — CTS likely
- **3–4** — CTS possible
- **≤ 2** — CTS unlikely

### Katz-based Score (Hand Diagram)

Pixel coverage is analysed per finger and palm zone against the hand outline masks. The symptom distribution is then classified:

- **Classic** — Symptoms in at least two of digits 1–3 with no extra-median involvement
- **Probable** — Symptoms in at least two of digits 1–3 with some additional areas
- **Possible** — Symptoms present but not fitting the classic/probable pattern
- **Unlikely** — No significant median nerve territory involvement

## Contributing

Contributions are welcome. Please open an issue to discuss proposed changes before submitting a pull request.

## Acknowledgements

Developed by the [Musculoskeletal Innovation Factory (MSK-IF)](https://uwo.ca/fhs/research/mskif/), Faculty of Health Sciences, Western University, in collaboration with the [Roth | McFarlane Hand and Upper Limb Centre (HULC)](https://www.sjhc.london.on.ca/areas-of-care/roth-mcfarlane-hand-and-upper-limb-centre-hulc), St. Joseph's Health Care London.

## Licence

This project is licensed under the [GNU General Public License v3.0](https://www.gnu.org/licenses/gpl-3.0.en.html).