import React from "react";

function Shell({ title, children }) {
  return (
    <div
      style={{
        fontFamily:
          "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        maxWidth: 860,
        margin: "24px auto",
        padding: 16,
        lineHeight: 1.5,
        color: "#0f172a",
      }}
    >
      <h1 style={{ marginTop: 0, fontSize: 24 }}>{title}</h1>
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          background: "rgba(255,255,255,0.75)",
          padding: 16,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function PrivacyPolicy() {
  return (
    <Shell title="Privacy Policy">
      <p style={{ marginTop: 0 }}>
        This app (“List Maker”) is designed to be lightweight.
      </p>

      <h2 style={{ fontSize: 16 }}>1) What data we use</h2>
      <ul style={{ marginTop: 8 }}>
        <li>
          Lists you create are stored <b>locally in your browser</b> using localStorage.
        </li>
        <li>
          If you choose to connect Google Calendar, this backend uses your Google OAuth
          consent to read your calendar events.
        </li>
      </ul>

      <h2 style={{ fontSize: 16, marginTop: 16 }}>2) Data sharing</h2>
      <p>
        Your locally stored lists are only shared if you explicitly create a share link
        or upload/download files.
      </p>

      <h2 style={{ fontSize: 16, marginTop: 16 }}>3) Google OAuth</h2>
      <p>
        When you sign in with Google, OAuth is handled by Google. We do not control
        Google’s privacy practices.
      </p>

      <p style={{ opacity: 0.8, marginBottom: 0 }}>
        For questions, contact the app owner.
      </p>
    </Shell>
  );
}

export function TermsOfService() {
  return (
    <Shell title="Terms of Service">
      <p style={{ marginTop: 0 }}>
        By using this app, you agree to the following terms.
      </p>

      <h2 style={{ fontSize: 16 }}>1) Local-only storage</h2>
      <p>
        Your lists are stored in your browser (localStorage). You are responsible for your
        device/browser data.
      </p>

      <h2 style={{ fontSize: 16, marginTop: 16 }}>2) Google Calendar access</h2>
      <p>
        If you connect Google Calendar, the app will attempt to read your calendar events
        according to your OAuth consent.
      </p>

      <h2 style={{ fontSize: 16, marginTop: 16 }}>3) No warranties</h2>
      <p>
        The app is provided “as is”. We do not guarantee uninterrupted access or error-free
        operation.
      </p>

      <p style={{ opacity: 0.8, marginBottom: 0 }}>
        For questions, contact the app owner.
      </p>
    </Shell>
  );
}

