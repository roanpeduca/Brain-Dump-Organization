"use client";

import { useState, useRef } from "react";

const paper = "#FFFEFB";
const line = "#E4DED0";
const inkSoft = "#6B675C";
const tutorials = "#33604A";
const personal = "#5A4A78";
const gold = "#A9822E";
const danger = "#A14435";

export default function Page() {
  const [notes, setNotes] = useState("");
  const [tasks, setTasks] = useState([]);
  const [quote, setQuote] = useState(null);
  const [summary, setSummary] = useState("");
  const [genBusy, setGenBusy] = useState(false);
  const [sumBusy, setSumBusy] = useState(false);
  const [genStatus, setGenStatus] = useState("");
  const [sumStatus, setSumStatus] = useState("");
  const [recording, setRecording] = useState(false);
  const recognitionRef = useRef(null);

  function toggleRecord() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setGenStatus("Voice input isn't supported in this browser.");
      return;
    }
    if (recording) {
      recognitionRef.current && recognitionRef.current.stop();
      setRecording(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript + " ";
        }
      }
      if (finalText.trim()) {
        setNotes((prev) => (prev ? prev.trim() + " " : "") + finalText.trim());
      }
    };
    recognition.onerror = () => setRecording(false);
    recognition.onend = () => {
      if (recognitionRef.current === recognition && recording) {
        recognition.start();
      }
    };
    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
  }

  async function generate() {
    setGenBusy(true);
    setGenStatus("Sorting...");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setTasks(data.tasks || []);
      setQuote(data.quote || null);
      setSummary("");
      setNotes("");
      setGenStatus("Synced to Notion.");
    } catch (e) {
      setGenStatus(e.message || "Could not generate tasks.");
    } finally {
      setGenBusy(false);
    }
  }

  async function summarize() {
    setSumBusy(true);
    setSumStatus("Writing summary...");
    try {
      const res = await fetch("/api/summarize", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setSummary(data.summary || "");
      setSumStatus("Written to Notion.");
    } catch (e) {
      setSumStatus(e.message || "Could not write the summary.");
    } finally {
      setSumBusy(false);
    }
  }

  async function toggleTask(id, checked) {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: checked } : t))
    );
    try {
      await fetch("/api/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockId: id, checked }),
      });
    } catch (e) {
      // leave the optimistic UI update in place; Notion sync can be retried on next generate
    }
  }

  const tut = tasks.filter((t) => t.bucket === "Tutorials");
  const pers = tasks.filter((t) => t.bucket === "Personal");

  return (
    <div style={{ maxWidth: 620, margin: "0 auto", padding: "36px 24px 60px" }}>
      <header
        style={{
          borderBottom: `1px solid ${line}`,
          paddingBottom: 16,
          marginBottom: 20,
        }}
      >
        <h1
          style={{
            fontFamily: "Georgia, 'Iowan Old Style', serif",
            fontSize: 26,
            fontWeight: 600,
            margin: 0,
          }}
        >
          Brain Dump
        </h1>
      </header>

      {quote && (
        <div
          style={{
            fontFamily: "Georgia, serif",
            fontStyle: "italic",
            fontSize: 15,
            borderLeft: `2px solid ${gold}`,
            paddingLeft: 14,
            marginBottom: 28,
          }}
        >
          "{quote.text}"
          {quote.author && (
            <span style={{ display: "block", fontStyle: "normal", fontSize: 12, color: inkSoft, marginTop: 4 }}>
              — {quote.author}
            </span>
          )}
        </div>
      )}

      <section style={{ marginBottom: 30 }}>
        <label style={{ display: "block", fontSize: 13, color: inkSoft, marginBottom: 8 }}>
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add notes, or leave blank to pull straight from Notion"
          style={{
            width: "100%",
            minHeight: 110,
            resize: "vertical",
            background: paper,
            border: `1px solid ${line}`,
            borderRadius: 4,
            padding: "12px 14px",
            fontSize: 14,
            fontFamily: "inherit",
          }}
        />
        <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
          <button onClick={toggleRecord} style={btnStyle(recording)}>
            {recording ? "Stop recording" : "Record"}
          </button>
          <button onClick={generate} disabled={genBusy} style={btnStyle(true)}>
            Generate tasks
          </button>
        </div>
        <div style={{ fontSize: 12, color: genStatus.startsWith("Could") ? danger : inkSoft, marginTop: 8, minHeight: "1.2em" }}>
          {genStatus}
        </div>
      </section>

      {tasks.length > 0 && (
        <section style={{ marginBottom: 30 }}>
          <Bucket title="Tutorials" color={tutorials} items={tut} onToggle={toggleTask} />
          <Bucket title="Personal" color={personal} items={pers} onToggle={toggleTask} />
        </section>
      )}

      <hr style={{ border: "none", borderTop: `1px solid ${line}`, margin: "28px 0" }} />

      <section>
        <label style={{ display: "block", fontSize: 13, color: inkSoft, marginBottom: 8 }}>
          Day summary
        </label>
        <button onClick={summarize} disabled={sumBusy} style={btnStyle(false)}>
          Summarize my day
        </button>
        <div style={{ fontSize: 12, color: sumStatus.startsWith("Could") ? danger : inkSoft, marginTop: 8, minHeight: "1.2em" }}>
          {sumStatus}
        </div>
        {summary && (
          <div
            style={{
              background: paper,
              border: `1px solid ${line}`,
              borderRadius: 4,
              padding: 16,
              fontSize: 14,
              marginTop: 12,
            }}
          >
            {summary}
          </div>
        )}
      </section>
    </div>
  );
}

function Bucket({ title, color, items, onToggle }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600, marginBottom: 10 }}>
        <span style={{ width: 9, height: 9, borderRadius: "50%", background: color, display: "inline-block" }} />
        {title}
      </div>
      {items.length === 0 ? (
        <p style={{ fontSize: 13, color: inkSoft, fontStyle: "italic" }}>Nothing right now.</p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {items.map((t) => (
            <li
              key={t.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "8px 0",
                borderBottom: `1px solid ${line}`,
              }}
            >
              <input
                type="checkbox"
                checked={!!t.done}
                onChange={(e) => onToggle(t.id, e.target.checked)}
                style={{ marginTop: 3 }}
              />
              <span
                style={{
                  flex: 1,
                  textDecoration: t.done ? "line-through" : "none",
                  color: t.done ? inkSoft : "inherit",
                }}
              >
                <span style={{ fontSize: 11, fontFamily: "Georgia, serif", color: inkSoft, marginRight: 6 }}>
                  [{t.priority}]
                </span>
                {t.text}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function btnStyle(filled) {
  return {
    fontFamily: "inherit",
    fontSize: 14,
    border: "1px solid #26241F",
    background: filled ? "#26241F" : "transparent",
    color: filled ? "#F6F3EC" : "#26241F",
    padding: "9px 16px",
    borderRadius: 4,
    cursor: "pointer",
  };
}
