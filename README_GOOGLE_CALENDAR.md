# U6 Google Calendar Sync (read-only for today)

This adds a small backend to read **today's** Google Calendar events and convert them into local list items.

## 1) Configure Google OAuth
1. Open Google Cloud Console → Credentials
2. Copy OAuth **Client ID** and **Client Secret**
3. Add OAuth redirect URI:
   - `http://localhost:4000/auth/google/callback`
4. Ensure your OAuth consent screen is published (or use test users).

## 2) Configure backend env
Edit `U6/server/.env`:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI` (should be the redirect URI above)

## 3) Install backend deps
From the U6 folder:
```bat
cd U6\server
npm install
```

## 4) Run backend
```bat
npm start
```
Backend listens on `http://localhost:4000`.

## 5) Update frontend
The frontend should call:
- `GET /api/calendar/today`
- and connect via `/auth/google` (through backend endpoint)

Note: this project only supports **reading today’s events**. Removing items from the local list does **not** delete anything from Google Calendar.

