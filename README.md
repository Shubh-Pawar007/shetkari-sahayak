# शेतकरी सहाय्यक (Shetkari Sahayak)

A small workflow tool in **Marathi** for the field-level government worker (Krushi Sahayak / Talathi) who processes **crop-damage compensation applications** (पीक नुकसान भरपाई) after unseasonal rain or flood.

Live demo: see the link in the submission email. Test logins: `officer1` / `Demo@1234` and `officer2` / `Demo@1234`, or create your own account on the sign-up page. All data is fake.

## 1. The problem and who it affects

When rain destroys a crop, a farmer applies for compensation. In many talukas the file then moves by paper between the Krushi Sahayak, Talathi and Tehsildar office. Three things go wrong in practice:

- The worker has no single list of what is waiting, so the oldest and most urgent files get buried.
- Checks are skipped or done late (is the 7/12 extract there? is the claimed area larger than the registered land? does the field damage match the claim?).
- When a file is returned or rejected, nobody can later see who decided what and why. Farmers keep visiting the office to ask.

This affects small and marginal farmers most: they cannot afford repeated trips, and a delayed payout can mean no money for the next sowing.

I picked this service because the process is well defined (documents, panchnama, assessment, decision) and the worker is under real time pressure. The compensation rule in the app (damage of at least 33% is eligible, rate per hectare, capped at 3 ha) follows the usual norm, but **the rate is a demo value** and must come from the current government notification in real use.

## 2. What the app does

The worker logs in and sees an overview. Pending applications are sorted by a priority score (days waiting, past the 14-day target, returned files, claimed damage), and the top three carry an "आधी लक्ष द्या" marker. Counts at the top show pending, overdue and returned files.

Each application goes through four steps:

1. **कागदपत्र तपासणी (document check)**: 7/12, Aadhaar-linked bank account, damage photos, self-declaration. It cannot advance with a missing document; it is returned to the applicant instead.
2. **प्रत्यक्ष शेत पाहणी (field inspection / panchnama)**: the worker records the actual damage % and inspected area.
3. **नुकसान भरपाई मोजणी (assessment)**: the app suggests an amount from the inspection. The worker can change it.
4. **अंतिम निर्णय (final decision)**: approve, reject or return.

At every step the worker can **return** (one step back, reason required) or **reject** (reason required). Every action writes a history entry (who, when, step, note), shown newest first on the application page. Final decisions cannot be changed.

## 3. Where AI helps and why

An "AI सहाय्य" button on each step gives a short Marathi suggestion:

| Step | What AI does |
| --- | --- |
| Document check | Names missing documents, flags a claimed area larger than the 7/12 area, flags claims under 33% |
| Inspection | Lists what to check in this specific case (crop, cause, survey no.), reminds to compare with neighbouring fields |
| Assessment | Explains the suggested amount, flags a large gap between claimed and inspected damage |
| Decision | Summarises the file so the worker can decide quickly |

Design choices:

- **The worker always decides.** The AI never moves an application. It only gives text, and the screen says so.
- **Rules first, Gemini second.** A deterministic rules assistant produces the baseline suggestion. If `GEMINI_API_KEY` is set, Gemini rewrites it in simple Marathi using only the application data. If the key is missing or the call fails or times out, the rules text is shown. The tool never breaks because of the AI.
- Each AI use is logged in the history, without storing the model output.

## 4. How I would measure impact, and why I think it will work

Measure before and after in a pilot taluka (same season, same office):

- **Median days from application to decision.** Target: 30% lower.
- **Share of applications past the 14-day target.** Target: under 10%.
- **Return-after-decision rate** (files re-opened because a document or check was missed). Target: halve it. The step gates and AI flags are aimed at this.
- **Worker time per file** from a short time-and-motion sample.
- **Farmer office visits** per application, from a counter at the help desk.

Why I think it works: the delays come from invisible queues and late-found missing documents, and both are cheap to fix with a sorted list and a gate at step 1. The AI part is small on purpose; it saves reading time but the tool still helps if AI is wrong or off. Risk: workers distrust the amount suggestion. Mitigation: it shows its formula and is always editable.

## 5. Main technical decisions

- **Next.js 14 (App Router) + TypeScript.** Server components for the pages, small client component only for the action panel. Works with Netlify out of the box.
- **Workflow as a pure function** (`lib/workflow.ts`): `applyAction(app, input)` returns a new application or throws a typed error. All rules (document gate, inspection validation, reasons required, final states are immutable) live there and are covered by tests. Routes and UI contain no business logic.
- **Storage behind a small interface** (`lib/store.ts`). The demo uses an in-memory seed so it runs anywhere with no setup. **Data resets on cold start and is per server instance**, so on a serverless host an action may occasionally be lost between requests. Production would use Postgres (applications table plus an append-only `history` table); the interface was shaped for that swap.
- **Auth is simple but not naive**: sign-up and login with scrypt-hashed passwords, and an httpOnly, HMAC-signed session cookie (set `SESSION_SECRET` in production). New accounts are stored in Netlify Blobs on Netlify and in memory locally. Real use needs the state's identity provider, OTP and role-based permissions.
- **Marathi first**: all UI strings are in `lib/i18n.ts`; large tap targets (44px), single column, high contrast, readable on a cheap phone in the field. Marathi is the only language so far; adding Hindi/English means adding another strings file.
- **No external services needed to run.** Gemini is optional.

Known gaps (what I would do next): photo upload and GPS stamp in the inspection step, offline mode for patchy network, Postgres, real roles (Krushi Sahayak, Talathi, Tehsildar) with step-wise permissions, SMS to the farmer on return/decision.

## 6. Run locally

```bash
npm install
cp .env.example .env.local   # optional: add GEMINI_API_KEY
npm run dev                  # http://localhost:3000
npm test                     # needs Node 22+
npm run build && npm start   # production build
```

Login: `officer1` / `Demo@1234`.

## Layout

```
app/                 pages and API routes
components/          ActionPanel (client)
lib/workflow.ts      state transitions, rules, priority score
lib/ai.ts            rules assistant + optional Gemini
lib/store.ts         in-memory store and seed data
lib/i18n.ts          Marathi strings
__tests__/           workflow tests
```

## AI tools used while building

I used AI coding tools (Claude Code, Gemini CLI) during development. I reviewed the code and can explain each part.
