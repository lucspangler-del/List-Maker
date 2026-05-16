require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Environment variables (create a .env file in U6/server)
// - GOOGLE_CLIENT_ID
// - GOOGLE_CLIENT_SECRET
// - GOOGLE_REDIRECT_URI (must match what you set in Google Cloud)
// - PORT (default 4000)
//
// NOTE: This implementation is intentionally minimal/demonstration-oriented.
// It keeps tokens in memory per user session.

const PORT = Number(process.env.PORT || 4000);

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// In-memory token store: { [userId]: { tokens } }
const tokenStore = new Map();

function getUserIdFromRequest(req) {
  // For simplicity, accept a userId from client.
  // In production, you'd use proper authentication and session cookies.
  return String(req.header('x-user-id') || 'demo');
}

function isConfigured() {
  return (
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REDIRECT_URI
  );
}

app.get('/health', (req, res) => res.json({ ok: true }));

app.get('/auth/google', (req, res) => {
  const configured = isConfigured();
  // Helpful logging to diagnose placeholder/missing env vars.
  // (Do NOT log secret values.)
  console.log('[/auth/google] OAuth configured:', configured, {
    hasClientId: Boolean(process.env.GOOGLE_CLIENT_ID),
    hasClientSecret: Boolean(process.env.GOOGLE_CLIENT_SECRET),
    hasRedirectUri: Boolean(process.env.GOOGLE_REDIRECT_URI),
    redirectUriValue: process.env.GOOGLE_REDIRECT_URI,
  });

  if (!configured) {
    return res.status(500).json({ error: 'Server OAuth not configured. Missing .env vars.' });
  }

  // Detect placeholder values that commonly lead to Google "invalid_request" / malformed OAuth requests.
  const placeholderIndicators = [
    'PUT_YOUR_CLIENT_ID_HERE',
    'PUT_YOUR_CLIENT_SECRET_HERE',
    'PUT_YOUR_REDIRECT_URI_HERE',
  ];
  const hasPlaceholders = [
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  ].some((v) => typeof v === 'string' && placeholderIndicators.some((p) => v.includes(p)));

  if (hasPlaceholders) {
    return res.status(400).json({
      error: 'Google OAuth is still using placeholder credentials. Update U6/server/.env values.'
    });
  }



  // If this endpoint is ever loaded inside an iframe, force the browser to open
  // OAuth as a top-level navigation.
  res.setHeader('X-Frame-Options', 'DENY');

  const userId = getUserIdFromRequest(req);

  const scopes = ['https://www.googleapis.com/auth/calendar.readonly'];

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
    state: userId
  });

  res.redirect(url);
});


app.get('/auth/google/callback', async (req, res) => {
  if (!isConfigured()) {
    return res.status(500).send('Server OAuth not configured.');
  }

  const { code, state } = req.query;
  const userId = String(state || 'demo');

  if (!code) {
    return res.status(400).send('Missing authorization code.');
  }

  try {
    const { tokens } = await oauth2Client.getToken(String(code));

    tokenStore.set(userId, tokens);

    // Redirect back to the React app.
    const clientRedirect = process.env.CLIENT_REDIRECT_URL || 'http://localhost:3000';
    return res.redirect(clientRedirect + '/?googleConnected=1');
  } catch (e) {
    console.error(e);
    return res.status(500).send('OAuth callback failed.');
  }
});

app.post('/api/google/connect', async (req, res) => {
  // Frontend calls this to get the auth URL.
  if (!isConfigured()) {
    return res.status(500).json({ error: 'Server OAuth not configured. Missing .env vars.' });
  }

  const userId = String(req.body?.userId || getUserIdFromRequest(req));

  const scopes = ['https://www.googleapis.com/auth/calendar.readonly'];
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
    state: userId
  });

  res.json({ url });
});

app.get('/api/calendar/today', async (req, res) => {
  const userId = getUserIdFromRequest(req);

  const tokens = tokenStore.get(userId);
  if (!tokens) {
    return res.status(401).json({ error: 'Not connected to Google Calendar.' });
  }

  oauth2Client.setCredentials(tokens);

  try {
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Today in server timezone: start/end at local date
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const eventsResp = await calendar.events.list({
      calendarId: 'primary',
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      singleEvents: true,
      orderBy: 'startTime'
    });

    const events = (eventsResp.data.items || []).map((ev) => {
      const startStr = ev.start?.dateTime || ev.start?.date || '';
      const startDate = startStr ? new Date(startStr) : null;
      return {
        id: ev.id,
        summary: ev.summary || '(No title)',
        start: startDate ? startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        rawStart: startStr
      };
    });

    res.json({ events });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch calendar events.' });
  }
});

app.listen(PORT, () => {
  console.log(`U6 Google Calendar backend listening on http://localhost:${PORT}`);
});

