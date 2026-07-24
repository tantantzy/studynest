# StudyNest V1.1 — Supabase User Database

This release replaces demo-only login, tasks, and notes with an optional Supabase backend.

## What works with Supabase

- Real email/password registration
- Real login and logout
- Persistent user profiles
- Per-user tasks
- Per-user notes
- Selected pricing plan stored on the profile
- Row Level Security so users only access their own data

When `config.js` is not configured, the site still works in local demo mode.

## Setup

1. Create a Supabase project.
2. Open SQL Editor and run `studynest-database.sql`.
3. In Project Settings → API, copy:
   - Project URL
   - Public anon/publishable key
4. Put the values in `config.js`.
5. Upload the entire folder to your host.
6. In Supabase Authentication settings, add your deployed site URL and redirect URLs.
7. Test registration with a new email.

## What the Pricing page is for

Pricing describes how the application can make money:

- Starter: free basic access
- Pro: paid plan for unlimited courses and advanced features
- Group: paid plan for study teams

In V1.1, selecting a plan only saves the choice to `profiles.plan`. It does **not** charge a card.

Real payments require a payment provider such as Stripe or PayMongo plus secure server-side code or Supabase Edge Functions. Never put a payment secret key in browser JavaScript.

## Database tables

- `profiles`
- `courses`
- `tasks`
- `notes`
- `study_sessions`
