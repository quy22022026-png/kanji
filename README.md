# Neko Japanese – Phase 3, Batch 1

React + TypeScript + Vite foundation for the private Neko Japanese PWA.

## Included
- Responsive pastel login and starter dashboard.
- Supabase email/password authentication integration.
- Profile lookup and `admin` / `learner` role display.
- Supabase migration for profiles, role helper, RLS read policies, and profile creation trigger.
- PWA manifest and basic shell service worker.
- Environment variable template.

## Setup
1. Install Node.js 20+.
2. Run `npm install`.
3. Create a Supabase project.
4. Run `supabase/migrations/0001_profiles.sql` in Supabase SQL Editor.
5. Disable public sign-ups in Supabase Authentication settings.
6. Create the admin and learner accounts manually in Supabase Auth.
7. Promote the admin profile using the SQL comment in the migration.
8. Copy `.env.example` to `.env` and fill in the project URL and anon/publishable key.
9. Run `npm run dev`.

## Notes
- No demo users or fabricated Supabase credentials are included.
- TTS, learning content, flashcards, SRS, Smart Tap, full offline data and sync are not implemented in this first batch.
- PWA shell caching is a starting point only; full offline learning requires the later IndexedDB/content-sync phase.
- For production, deploy over HTTPS and configure Supabase redirect URLs for the deployed domain.
