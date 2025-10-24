// server/server.js
// Fully working Express backend: health, weather (cached proxy), crops, todos (with datetime), and Gemini chat.

import express from "express";
import cors from "cors";
import https from "https";

// If you use node-fetch in your project, uncomment the next line:
// import fetch from "node-fetch";

// Node 18+ has global fetch. If using older Node, install node-fetch and import it.

// Environment
const PORT = process.env.PORT || 4000;
const FRONTEND_ORIGIN = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map(s => s.trim());

// Create app and middleware
const app = express();
app.use(express.json());
app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: false
  })
);

// Health
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// =============================
// Weather (OpenWeather) — Fast, cached proxy
// =============================
const httpsAgent = new https.Agent({ keepAlive: true });
const WEATHER_TTL_MS = 60_000; // 60s cache
const weatherCache = new Map(); // key -> { ts, data }

app.get("/api/weather", async (req, res) => {
  try {
    const { lat, lon, units = "metric", lang = "en" } = req.query;
    if (!lat || !lon) {
      return res.status(400).json({ error: "lat and lon are required" });
    }
    if (!process.env.OPENWEATHER_API_KEY) {
      return res.status(500).json({ error: "OPENWEATHER_API_KEY missing in server/.env" });
    }

    const key = `${Number(lat).toFixed(3)},${Number(lon).toFixed(3)},${units},${lang}`;
    const now = Date.now();
    const cached = weatherCache.get(key);
    if (cached && now - cached.ts < WEATHER_TTL_MS) {
      res.set("Cache-Control", "public, max-age=30, stale-while-revalidate=120");
      return res.json(cached.data);
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=${units}&lang=${lang}&appid=${process.env.OPENWEATHER_API_KEY}`;
    const r = await fetch(url, { agent: httpsAgent });
    const data = await r.json();
    if (!r.ok) {
      // Common: 401 invalid key; 429 rate limit; 404 bad params
      return res.status(r.status).json(data);
    }

    weatherCache.set(key, { ts: now, data });
    res.set("Cache-Control", "public, max-age=30, stale-while-revalidate=120");
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: "Weather fetch failed", details: e?.message ?? String(e) });
  }
});

// =============================
// Crops & To‑Dos (in‑memory)
// =============================
let crops = []; // {id,name,variety}
let todos = []; // {id,title,cropId,done,when} where when is "YYYY-MM-DDTHH:mm" local

const makeId = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

app.get("/api/crops", (_req, res) => res.json(crops));

app.post("/api/crops", (req, res) => {
  const { name = "Crop", variety = "" } = req.body || {};
  const c = { id: makeId(), name, variety };
  crops.push(c);
  res.status(201).json(c);
});

app.put("/api/crops/:id", (req, res) => {
  crops = crops.map(c => (c.id === req.params.id ? { ...c, ...req.body } : c));
  const found = crops.find(c => c.id === req.params.id) || null;
  res.json(found);
});

app.delete("/api/crops/:id", (req, res) => {
  crops = crops.filter(c => c.id !== req.params.id);
  res.status(204).end();
});

app.get("/api/todos", (_req, res) => res.json(todos));

app.post("/api/todos", (req, res) => {
  const { title = "Task", cropId = null, when = null } = req.body || {};
  const t = { id: makeId(), title, cropId, when, done: false };
  todos.push(t);
  res.status(201).json(t);
});

app.put("/api/todos/:id", (req, res) => {
  todos = todos.map(t => (t.id === req.params.id ? { ...t, ...req.body } : t));
  const found = todos.find(t => t.id === req.params.id) || null;
  res.json(found);
});

app.delete("/api/todos/:id", (req, res) => {
  todos = todos.filter(t => t.id !== req.params.id);
  res.status(204).end();
});

// =============================
// Gemini Chat (Google Gen AI SDK)
// =============================
// Install in server:  npm install @google/genai
import { GoogleGenAI } from "@google/genai";

let ai = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

app.post("/api/gemini-chat", async (req, res) => {
  try {
    if (!ai) {
      return res.status(500).json({ error: "GEMINI_API_KEY missing in server/.env" });
    }
    const { message = "", crop = "", coords = null, weather = null } = req.body || {};

    const contextLines = [
      "You are a helpful farming assistant.",
      crop ? `Crop: ${crop}` : "",
      coords?.lat && coords?.lon ? `Coords: ${coords.lat},${coords.lon}` : "",
      weather ? `Weather: ${JSON.stringify(weather)}` : ""
    ].filter(Boolean);

    const prompt = `${contextLines.join(" | ")}\nUser: ${message}`.trim();

    // Fast, cost‑effective model; change if needed
    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    });

    // Different SDK versions expose text differently; try both
    const text =
      (typeof result?.text === "string" && result.text) ||
      (typeof result?.response?.text === "function" && result.response.text()) ||
      "No reply.";
    res.json({ reply: text });
  } catch (e) {
    res.status(500).json({ error: "Gemini error", details: e?.message ?? String(e) });
  }
});

// =============================
// Start server
// =============================
app.listen(PORT, () => {
  console.log(`API on http://localhost:${PORT}`);
});
