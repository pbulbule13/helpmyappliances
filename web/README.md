# HelpMyAppliances — Web (Desktop)

Next.js 14 desktop web interface for HelpMyAppliances. Shares the same FastAPI backend as the Android app.

## Features
- Sign in with Google or Email/Password (Firebase Auth)
- Every user gets isolated data — no data shared between accounts
- Upload appliance label photo → AI extracts model number
- Fetches manuals, SOPs, and documentation for the appliance
- Text + voice chat (Web Speech API) powered by EURI AI
- Full chat history per appliance session
- Documents viewer (manuals, spec sheets, recall notices)

## Local Development

```bash
cd web
cp env.local.example .env.local   # fill in your Firebase config
npm install
npm run dev                        # → http://localhost:3000
```

The backend must be running at `http://localhost:8000`:
```bash
# From project root
docker-compose up postgres redis backend
```

## Environment Variables

Copy `env.local.example` to `.env.local`:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API URL (default: `http://localhost:8000`) |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | From Firebase Console > Project Settings |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | e.g. `helpmyappliances.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | e.g. `helpmyappliances` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | e.g. `helpmyappliances.appspot.com` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | From Firebase Console |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | From Firebase Console |

## Multi-User Isolation

Each user signs in with their unique email. The backend:
1. Creates a user record on first login (tied to Firebase UID)
2. Scopes ALL data (devices, sessions, chat history, documents) to that user
3. No user can ever see another user's data

New users just sign up — they automatically get a clean, isolated account.

## GCP Deployment

### One-time setup
```bash
bash infra/gcp-setup.sh
```

### CI/CD (automatic on push to main)
Set up a Cloud Build trigger pointing at `infra/cloudbuild.yaml`.

Required Cloud Build substitutions:
- `_REGION`, `_PROJECT_ID`, `_BACKEND_SERVICE`, `_FRONTEND_SERVICE`
- `_DB_INSTANCE` (Cloud SQL connection name)
- `_NEXT_PUBLIC_API_URL` (backend Cloud Run URL)
- Firebase config vars (see cloudbuild.yaml)

### Required Firebase setup
1. Enable **Email/Password** auth in Firebase Console > Authentication > Sign-in method
2. Enable **Google** auth
3. Add your Cloud Run frontend URL to **Authorized domains**
4. Copy the Web app config to Cloud Build substitutions
