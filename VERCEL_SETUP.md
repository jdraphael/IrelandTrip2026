# Vercel Setup

This app can run locally with SQLite, but Vercel needs hosted storage because serverless functions do not keep a persistent local database file.

## 1. Import the GitHub repo

In Vercel, import:

`https://github.com/jdraphael/IrelandTrip2026`

Use the default Vite settings:

- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm install`

## 2. Add Neon Postgres

From the Vercel project dashboard, add Neon Postgres through the Marketplace and connect it to this project for Preview and Production. Vercel should add `DATABASE_URL` to the project environment variables.

## 3. Add environment variables

Add these in Vercel Project Settings > Environment Variables:

```env
OPENAI_API_KEY=your_openai_key
OPENAI_MODEL=gpt-5.4-mini
OPENAI_DEEP_MODEL=gpt-5.5
FAMILY_PASSCODE=choose-a-family-passcode
DATABASE_URL=provided-by-neon
```

Do not prefix these with `VITE_`; they must stay server-only.

## 4. Deploy

After the environment variables are set, push to `main` or trigger a redeploy in Vercel. The production URL will be a `*.vercel.app` address unless you add a custom domain later.

## Notes

- The phone-facing hosted app uses Neon Postgres for shared trip edits.
- Local laptop development still uses SQLite in `data/`.
- The family passcode protects the planner and API endpoints. Anyone without the passcode should receive a login screen or `401` API response.
