# Rolevant AI — AI Resume Builder, Scanner & Job Matching

A full-stack AI career platform: build professional resumes with live preview,
scan them against ATS-style criteria (score out of 100 across 9 categories),
compare them to job descriptions, generate cover letters / LinkedIn summaries,
and discover jobs scored against your resume.

## Stack

- **Frontend:** Next.js 15 (App Router), React 19, Tailwind CSS v4, Framer Motion
- **Backend:** Node/Express 5, MongoDB (Mongoose), JWT auth, OpenAI (optional)
- **Export:** jsPDF + html2canvas (PDF), `docx` (Word)

## Features

- 5 resume templates (Classic, Modern, Minimal, Executive, Creative) with live
  preview, accent color / font / spacing customization, and drag-to-reorder or
  hide sections
- Autosave (local draft always; debounced server autosave when logged in),
  version history with restore and side-by-side comparison, duplicate-per-job
- Deterministic resume scanner: overall score /100 plus ATS, formatting,
  impact, keywords, skills, experience, grammar, readability, and completeness
  — each with explanations and concrete fixes
- Job-description matching: match %, matched/missing keywords & skills,
  missing qualifications, no-stuffing keyword plan, AI bullet rewrites
- AI generation (server-side prompts, validated, per-user rate-limited):
  summaries, bullets, skills, achievements, cover letters, LinkedIn "About",
  professional bios
- Job discovery via a provider system (Greenhouse & Lever public feeds, or
  clearly-flagged sample data in development), preferences, saved jobs,
  application tracking, and strong-match alerts (in-app; email-ready stub)

## Development

```bash
# Frontend
npm install
cp .env.local.example .env.local   # point at your local backend
npm run dev

# Backend
cd backend
npm install
cp .env.example .env               # fill in MONGODB_URI + JWT_SECRET
npm run dev
```

Run `npm run build` (frontend) before deploying. The backend needs no build step.

## Environment variables

See `backend/.env.example` and `.env.local.example` for the full list —
only `MONGODB_URI` and `JWT_SECRET` are required; AI, job feeds, and email
degrade gracefully when unconfigured.
