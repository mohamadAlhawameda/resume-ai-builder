// Central app configuration.
// NEXT_PUBLIC_API_URL lets you point the frontend at a local backend
// (http://localhost:5000) during development without touching code.
export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ||
  'https://resume-ai-builder-esnw.onrender.com';

export const APP_NAME = 'Rolevant AI';

// Two-tone logo rendering (e.g. "Rolevant" + accent-colored "AI") — split on
// the last space instead of a hardcoded index so it stays correct if the name
// changes again.
const lastSpace = APP_NAME.lastIndexOf(' ');
export const APP_NAME_PRIMARY = lastSpace === -1 ? APP_NAME : APP_NAME.slice(0, lastSpace);
export const APP_NAME_ACCENT = lastSpace === -1 ? '' : APP_NAME.slice(lastSpace + 1);
