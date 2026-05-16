import React, { useEffect, useMemo, useState } from "react";
import AuthGate from "./AuthGate";

const STORAGE_KEY = "listmaker.lists.v1";
const AUTH_CHOICE_KEY = "listmaker.authChoice.v1";

// Backend base URL is injected at build time (Render or any host).
// Example: REACT_APP_BACKEND_BASE=https://your-render-backend.onrender.com
const BACKEND_BASE = process.env.REACT_APP_BACKEND_BASE || "http://localhost:4000";


function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function normalizeList(list) {
  return {
    id: String(list?.id ?? uid()),
    name: String(list?.name ?? "Untitled"),
    items: Array.isArray(list?.items) ? list.items.map((x) => String(x)) : [],
    createdAt: Number.isFinite(Number(list?.createdAt)) ? Number(list.createdAt) : Date.now(),
  };
}

function encodeSharedPayload(payload) {
  const json = JSON.stringify(payload);
  return btoa(unescape(encodeURIComponent(json)));
}

function decodeSharedPayload(encoded) {
  const json = decodeURIComponent(escape(atob(encoded)));
  return JSON.parse(json);
}

function getStoredAuthChoice() {
  try {
    const raw = localStorage.getItem(AUTH_CHOICE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function App() {
  const [authChoice, setAuthChoice] = useState(() => getStoredAuthChoice());

  const [lists, setLists] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  const [newListName, setNewListName] = useState("");
  const [newItemText, setNewItemText] = useState("");

  const [shareStatus, setShareStatus] = useState("");

  // Reset storage on every page load so data does NOT persist between reloads/launches.
  useEffect(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(AUTH_CHOICE_KEY);
    } catch {
      // ignore
    }
    setAuthChoice(null);
    setLists([]);
    setSelectedId(null);
  }, []);


  // Handle shared payload in URL (if present)
  useEffect(() => {
    const url = new URL(window.location.href);
    const share = url.searchParams.get("share");
    if (!share) return;

    try {
      const payload = decodeSharedPayload(share);
      const listFromShare = normalizeList(payload?.list ?? payload);

      setLists((prev) => {
        const incoming = { ...listFromShare, id: uid(), createdAt: Date.now() };
        return [incoming, ...prev];
      });
      setSelectedId((prev) => prev);
      setShareStatus("Shared list received and saved locally ✅");

      url.searchParams.delete("share");
      window.history.replaceState({}, document.title, url.toString());
    } catch {
      setShareStatus("Could not import shared list. Link may be invalid.");
    }
  }, []);

  // Persist lists
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
    } catch {
      // ignore
    }
  }, [lists]);

  const selectedList = useMemo(() => {
    return lists.find((l) => l.id === selectedId) ?? null;
  }, [lists, selectedId]);

  function createList() {
    const name = newListName.trim() || "Untitled";
    const list = { id: uid(), name, items: [], createdAt: Date.now() };

    setLists((prev) => [list, ...prev]);
    setSelectedId(list.id);
    setNewListName("");
  }

  function deleteSelectedList() {
    if (!selectedList) return;

    setLists((prev) => prev.filter((l) => l.id !== selectedList.id));
    setSelectedId(null);
    setNewItemText("");
  }

  function addItem() {
    if (!selectedList) return;
    const text = newItemText.trim();
    if (!text) return;

    setLists((prev) =>
      prev.map((l) => {
        if (l.id !== selectedList.id) return l;
        return { ...l, items: [text, ...l.items] };
      })
    );

    setNewItemText("");
  }

  function deleteItem(index) {
    if (!selectedList) return;
    setLists((prev) =>
      prev.map((l) => {
        if (l.id !== selectedList.id) return l;
        return { ...l, items: l.items.filter((_, i) => i !== index) };
      })
    );
  }

  function exportSelectedList() {
    if (!selectedList) return;

    const exportPayload = {
      version: 1,
      exportedAt: Date.now(),
      list: {
        name: selectedList.name,
        items: selectedList.items,
        createdAt: selectedList.createdAt,
      },
    };

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedList.name.replace(/[^a-z0-9\-_ _]/gi, "").trim() || "list"}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    setShareStatus("List downloaded as JSON ✅");
  }

  function importListFromFile(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result ?? "");
        const parsed = JSON.parse(text);
        const maybeList = parsed?.list ?? parsed;
        const normalized = normalizeList(maybeList);

        const incoming = { ...normalized, id: uid(), createdAt: Date.now() };

        setLists((prev) => [incoming, ...prev]);
        setSelectedId(incoming.id);
        setShareStatus("List imported from file ✅");
      } catch {
        setShareStatus("Could not import file. Make sure it’s a valid export JSON.");
      }
    };

    reader.onerror = () => {
      setShareStatus("Could not read file.");
    };

    reader.readAsText(file);
  }

  async function fetchTodayFromGoogleAndCreateList() {
    try {
      setShareStatus("Starting Google Calendar login...");

      // Redirect flow is implemented on the backend at /auth/google.
      // Important: do NOT navigate the current page to a different origin.
      // Instead, open the OAuth flow in a popup window.
      // (Browsers may block cross-origin redirects from within frames.)

      const popupWidth = 500;
      const popupHeight = 650;
      const left = window.screenX + Math.max(0, (window.outerWidth - popupWidth) / 2);
      const top = window.screenY + Math.max(0, (window.outerHeight - popupHeight) / 2);

      // Attempt to open a new *top-level* tab/window.
      // Using location on the current page is blocked in some frame contexts.
      // A new tab is more likely to be treated as top-level by the browser.
      const href = `${BACKEND_BASE}/auth/google`;
      const w = window.open(href, "_blank", "noopener,noreferrer");

      if (!w) {
        setShareStatus("New tab blocked. Please allow popups to sign in.");
        return;
      }

      // Do not navigate current app page.


    } catch {
      setShareStatus("Could not start Google Calendar connection.");
    }
  }


  function shareSelectedList() {
    if (!selectedList) return;

    const payload = { list: { name: selectedList.name, items: selectedList.items } };
    const encoded = encodeSharedPayload(payload);

    const url = new URL(window.location.href);
    url.searchParams.set("share", encoded);
    const shareUrl = url.toString();

    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(shareUrl)
        .then(() => setShareStatus("Share link copied ✅"))
        .catch(() => setShareStatus("Share link ready (copy manually)."));
    } else {
      setShareStatus("Share link ready (copy manually).");
    }

    window.prompt("Copy this share link:", shareUrl);
  }

  const shouldShowGate = !authChoice || !authChoice.choice;

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif", maxWidth: 860, margin: "24px auto", padding: 16 }}>
      <h1 style={{ marginTop: 0 }}>List Maker</h1>
      <p style={{ opacity: 0.8, marginTop: -8 }}>Create lists, save locally, and share via a link that imports into other phones with the app.</p>

      {shouldShowGate ? (
        <AuthGate
          onChoice={(choice) => {
            const next = { choice };
            setAuthChoice(next);
            try {
              localStorage.setItem(AUTH_CHOICE_KEY, JSON.stringify(next));
            } catch {
              // ignore
            }
          }}
          onSignIn={() => {
            const next = { choice: "google" };
            setAuthChoice(next);
            try {
              localStorage.setItem(AUTH_CHOICE_KEY, JSON.stringify(next));
            } catch {
              // ignore
            }
            fetchTodayFromGoogleAndCreateList();
          }}
        />
      ) : (
        <>
          {shareStatus ? (
            <div style={{ background: "#f3f4f6", borderRadius: 10, padding: 12, margin: "16px 0" }}>{shareStatus}</div>
          ) : null}

          <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16 }}>
            <section style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
              <h2 style={{ fontSize: 16, margin: "4px 0 10px" }}>Your lists</h2>

              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="List name"
                  style={{ flex: 1, padding: 10, borderRadius: 10, border: "1px solid #d1d5db" }}
                />
                <button
                  onClick={createList}
                  style={{ padding: "10px 12px", borderRadius: 10, border: "none", background: "#111827", color: "white", cursor: "pointer" }}
                >
                  Add
                </button>
              </div>

              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                {lists.length === 0 ? (
                  <div style={{ opacity: 0.7, fontSize: 14 }}>No lists yet. Create one above.</div>
                ) : (
                  lists.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => setSelectedId(l.id)}
                      style={{
                        textAlign: "left",
                        padding: 10,
                        borderRadius: 10,
                        border: selectedId === l.id ? "2px solid #2563eb" : "1px solid #e5e7eb",
                        background: selectedId === l.id ? "#eff6ff" : "white",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ fontWeight: 700 }}>{l.name}</div>
                      <div style={{ fontSize: 12, opacity: 0.7 }}>{l.items.length} items</div>
                    </button>
                  ))
                )}
              </div>
            </section>

            <section style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
              <h2 style={{ fontSize: 16, margin: "4px 0 10px" }}>List details</h2>

              {!selectedList ? (
                <div style={{ opacity: 0.7 }}>Select a list to view/edit.</div>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 20, fontWeight: 800 }}>{selectedList.name}</div>
                      <div style={{ opacity: 0.7, marginTop: 4, fontSize: 13 }}>
                        Created {new Date(selectedList.createdAt).toLocaleString()}
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                      <button
                        onClick={shareSelectedList}
                        style={{ padding: "10px 12px", borderRadius: 10, border: "none", background: "#0f766e", color: "white", cursor: "pointer" }}
                      >
                        Share list
                      </button>

                      <button
                        onClick={exportSelectedList}
                        style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e7eb", background: "white", color: "#111827", cursor: "pointer" }}
                      >
                        Download JSON
                      </button>

                      <label
                        style={{
                          padding: "10px 12px",
                          borderRadius: 10,
                          border: "1px dashed #6b7280",
                          background: "white",
                          color: "#111827",
                          cursor: "pointer",
                          textAlign: "center",
                        }}
                        title="Upload a previously downloaded list JSON file"
                      >
                        Upload JSON
                        <input
                          type="file"
                          accept="application/json,.json"
                          style={{ display: "none" }}
                          onChange={(e) => importListFromFile(e.target.files?.[0])}
                        />
                      </label>

                      <button
                        onClick={deleteSelectedList}
                        style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ef4444", background: "#fff", color: "#dc2626", cursor: "pointer" }}
                      >
                        Delete list
                      </button>
                    </div>
                  </div>

                  <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
                    <input
                      value={newItemText}
                      onChange={(e) => setNewItemText(e.target.value)}
                      placeholder="Add an item"
                      style={{ flex: 1, padding: 10, borderRadius: 10, border: "1px solid #d1d5db" }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") addItem();
                      }}
                    />
                    <button
                      onClick={addItem}
                      style={{ padding: "10px 12px", borderRadius: 10, border: "none", background: "#111827", color: "white", cursor: "pointer" }}
                    >
                      Add item
                    </button>
                  </div>

                  <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                    {selectedList.items.length === 0 ? (
                      <div style={{ opacity: 0.7, fontSize: 14 }}>No items yet.</div>
                    ) : (
                      selectedList.items.map((item, idx) => (
                        <div
                          key={idx}
                          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, border: "1px solid #e5e7eb", borderRadius: 10, padding: 10 }}
                        >
                          <div style={{ fontWeight: 600 }}>{item}</div>
                          <button
                            onClick={() => deleteItem(idx)}
                            style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #e5e7eb", background: "white", cursor: "pointer" }}
                          >
                            Remove
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </section>
          </div>

          <footer style={{ marginTop: 18, opacity: 0.7, fontSize: 12 }}>
            Data is stored only on your device (localStorage). Share uses a URL import payload.
          </footer>
        </>
      )}
    </div>
  );
}

