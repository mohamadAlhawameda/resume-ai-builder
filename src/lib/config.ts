// Central app configuration.
// NEXT_PUBLIC_API_URL lets you point the frontend at a local backend
// (http://localhost:5000) during development without touching code.
export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ||
  'https://resume-ai-builder-esnw.onrender.com';

export const APP_NAME = 'ResumeAI';
