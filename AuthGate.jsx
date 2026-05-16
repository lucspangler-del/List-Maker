import React from "react";

export default function AuthGate({ onSignIn }) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 14,
        padding: 16,
        maxWidth: 520,
        margin: "24px auto",
        background: "white",
      }}
    >
      <h1 style={{ marginTop: 0, marginBottom: 8, fontSize: 20 }}>Sign in to continue</h1>
      <p style={{ opacity: 0.75, marginTop: 0, lineHeight: 1.4 }}>
        This unit uses Google Calendar login for importing.
      </p>

      <button
        onClick={onSignIn}
        style={{
          width: "100%",
          marginTop: 12,
          padding: "12px 14px",
          borderRadius: 12,
          border: "none",
          background: "#111827",
          color: "white",
          cursor: "pointer",
          fontWeight: 700,
          fontSize: 14,
        }}
      >
        Sign in with Google
      </button>

      <div style={{ opacity: 0.6, fontSize: 12, marginTop: 10 }}>
        (If you don’t have the backend running, this button may fail.)
      </div>
    </div>
  );
}

