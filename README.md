# INNO Prototype

INNO is a WebApp MVP for a verified international student social platform.

The first version intentionally does not use a database. It uses mock data and browser `localStorage` to simulate:

- School email verification
- Profile setup
- Friend recommendations
- Friend request consent
- Chat messages
- Event sign-ups

## Run

```bash
npm run dev
```

Then open:

```text
http://localhost:4173
```

## Database Plan

For the first prototype, no database setup is required.

Later, when the flow is validated, the easiest production-style options are:

- Supabase: good for SQL tables, auth, storage, and quick student profiles.
- Firebase: good for realtime chat and fast mobile migration.

Recommended future tables/collections:

- users
- profiles
- friend_requests
- messages
- events
- event_signups
- reports
