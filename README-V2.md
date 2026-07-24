# StudyNest V2

StudyNest V2 removes all demo users, tasks, notes, courses, and statistics.

## Fully connected features

- Supabase registration, login, session protection, and logout
- Empty workspace for every new user
- User-owned courses with create, edit, progress, and delete
- User-owned tasks with completion and deletion
- User-owned notes with create, edit, and delete
- Study-session recording
- Dashboard statistics calculated from database records
- Dynamic progress page
- Profile and preference settings
- Pricing-plan choice stored in the profile
- Footer credit: Built and maintained by TanTanTzy

## Required setup

1. Create a Supabase project.
2. Run `studynest-v2-database.sql`.
3. Put the project URL and public anon key in `config.js`.
4. Add the deployed GitHub Pages URL under Supabase Authentication URL Configuration.
5. Upload all files.

## Pricing

The pricing page is fully usable as a plan-selection interface, but it does not charge cards. Real billing requires Stripe, PayMongo, or another payment processor plus secure server-side functions. This omission is intentional because payment secret keys must never be placed in a static GitHub Pages website.

## New users

New users begin with:
- 0 courses
- 0 tasks
- 0 study hours
- 0% progress
- no notes

No sample or demo data is inserted.
