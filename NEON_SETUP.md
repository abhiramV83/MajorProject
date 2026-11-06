# Neon setup

This project links to the existing Neon project `curly-brook-79265543`, branch `production`.
`neon deploy` pulls `DATABASE_URL` (pooled), `DATABASE_URL_UNPOOLED` (direct),
and `NEON_BRANCH` into the ignored root `.env.local`. Run it again when the
credentials change. Do not commit that file.

The FastAPI backend reads the root Neon variables alongside `backend/.env`.
Normal queries use the pooled URL. Schema setup at startup uses the direct URL.
The backend requires `SECRET_KEY` in `backend/.env` or the process environment.

```powershell
neon deploy
npm run build
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

In another terminal, run the frontend:

```powershell
cd frontend
npm run dev
```

Startup on the production branch does not seed demo users or known passwords. To create
the first administrator, run this from `backend` and enter your own credentials:

```powershell
python create_admin.py
```

To add the three synthetic cases from `CODEX_BACKEND_MASTER_PROMPT.md`, run:

```powershell
python seed_demo_data.py
```

On Neon, this creates the judge and case manager with generated passwords in
the ignored `backend/.demo_credentials.local` file. The script is idempotent.
For local SQLite demos, it uses the sample passwords in the master prompt.
The configured `GROQ_API_KEY` is used for intervention recommendations; if a
Groq call fails, the API records a rule-based fallback as its source.

The live master-prompt verification command, while the backend is running, is:

```powershell
python verify_master_prompt.py
```

It tests intake and dynamic predictions, Groq recommendations, trajectory,
simulation, audit and CSV logging, judicial review, and PDF generation. Its
synthetic verification records are removed afterward.

For a temporary API/database smoke check while the backend is running:

```powershell
python neon_smoke.py
```

The smoke test removes its temporary user and audit entries afterward.
