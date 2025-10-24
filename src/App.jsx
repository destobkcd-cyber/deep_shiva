import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { attachRipple } from "./ripple";

// Basic hover and entrance variants for tiles. [web:64][web:61]
const tileVariants = {
  hidden: { opacity: 0, y: 14, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1 }
};
const hoverVariants = { hover: { y: -4, scale: 1.01, transition: { duration: 0.18 } } };

const useGeolocation = () => {
  const [coords, setCoords] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setError("Geolocation not supported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => setError(err.message)
    );
  }, []);
  return { coords, error };
}; // Geolocation pattern per platform docs. [web:32][web:38]

const Card = ({ children, className = "", delay = 0 }) => (
  <motion.div
    className={`tile ${className}`}
    variants={tileVariants}
    initial="hidden"
    animate="show"
    whileHover="hover"
    transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1], delay }}
    {...hoverVariants}
  >
    {children}
  </motion.div>
);

const RippleButton = ({ children, className = "", onClick, ...props }) => {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    attachRipple(el);
  }, []);
  return (
    <motion.button
      ref={ref}
      data-ripple
      className={`btn ${className}`}
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      whileHover={{ scale: 1.03 }}
      transition={{ duration: 0.15 }}
      {...props}
    >
      {children}
    </motion.button>
  );
}; // Ripple uses position-aware span. [web:56][web:63]



const TreeTile = () => {
  return (
    <div className="tile tree-tile">
      <h3>Tree</h3>
      <div className="tree-stage">
        <svg viewBox="0 0 200 200" className="tree-svg" aria-label="Animated tree swaying in the wind" role="img">
          <defs>
            <linearGradient id="leafGrad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#3ddc97" />
              <stop offset="100%" stopColor="#0bbf7d" />
            </linearGradient>
            <linearGradient id="trunkGrad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#8b5e3c" />
              <stop offset="100%" stopColor="#5d3b25" />
            </linearGradient>
          </defs>

          {/* Ground */}
          <ellipse cx="100" cy="170" rx="70" ry="10" fill="rgba(0,0,0,0.25)"></ellipse>

          {/* Group all for sway animation */}
          <g className="tree sway">
            {/* Trunk */}
            <rect x="92" y="100" width="16" height="70" rx="6" fill="url(#trunkGrad)"></rect>

            {/* Canopy blobs */}
            <g className="canopy">
              <circle cx="75" cy="95" r="28" fill="url(#leafGrad)"></circle>
              <circle cx="105" cy="80" r="34" fill="url(#leafGrad)"></circle>
              <circle cx="132" cy="98" r="26" fill="url(#leafGrad)"></circle>
              <circle cx="100" cy="110" r="26" fill="url(#leafGrad)"></circle>
            </g>

            {/* Decorative leaves that flutter */}
            <g className="leaves">
              <circle cx="58" cy="92" r="5" fill="#16a34a"></circle>
              <circle cx="142" cy="94" r="5" fill="#16a34a"></circle>
              <circle cx="90" cy="125" r="4" fill="#16a34a"></circle>
              <circle cx="120" cy="120" r="4" fill="#16a34a"></circle>
            </g>
          </g>
        </svg>
      </div>
      <small className="dim">Tip: hover to feel a stronger breeze.</small>
    </div>
  );
};




const LocationTile = ({ coords, error, onManual }) => {
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  return (
    <Card delay={0.02}>
      <h3>Location</h3>
      <AnimatePresence mode="popLayout">
        {coords ? (
          <motion.p key="coords" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            Lat: {coords.lat.toFixed(4)}, Lon: {coords.lon.toFixed(4)}
          </motion.p>
        ) : error ? (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <p>Permission denied or unavailable: {error}</p>
            <div className="row">
              <input placeholder="Latitude" value={lat} onChange={(e) => setLat(e.target.value)} />
              <input placeholder="Longitude" value={lon} onChange={(e) => setLon(e.target.value)} />
              <RippleButton onClick={() => onManual({ lat: Number(lat), lon: Number(lon) })}>Set</RippleButton>
            </div>
          </motion.div>
        ) : (
          <motion.p key="pending" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            Requesting permission…
          </motion.p>
        )}
      </AnimatePresence>
    </Card>
  );
}; // Geolocation UX aligns with platform guidance. [web:32][web:38]

const WeatherTile = ({ coords, weather, onRefresh }) => (
  <Card delay={0.06}>
    <h3>Weather</h3>
    {coords ? (
      weather ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <p>{weather.title} • {weather.desc}</p>
          <p>Temp: {weather.temp}°C • Humidity: {weather.humidity}% • Wind: {weather.wind} m/s</p>
          <RippleButton onClick={onRefresh}>Refresh</RippleButton>
        </motion.div>
      ) : (
        <p>Waiting for data…</p>
      )
    ) : (
      <p>Waiting for location…</p>
    )}
  </Card>
);

// Demo fake weather if backend not connected. Real apps call OpenWeather via server proxy. [web:31][web:37]

const useWeather = (coords) => {
  const [w, setW] = useState(null);
  const refresh = async () => {
    if (!coords?.lat || !coords?.lon) return;
    try {
      const r = await fetch(`/api/weather?lat=${coords.lat}&lon=${coords.lon}&units=metric`);
      if (!r.ok) throw new Error("Weather error");
      const data = await r.json();
      setW({
        title: data.name || "Local",
        temp: Math.round(data.main?.temp ?? 0),
        desc: data.weather?.[0]?.description || "",
        humidity: data.main?.humidity ?? 0,
        wind: data.wind?.speed ?? 0
      });
    } catch {
      setW(null);
    }
  };
  useEffect(() => { refresh(); }, [coords?.lat, coords?.lon]);
  return [w, refresh];
};

const CropsTile = ({ crops, setCrops }) => {
  const [name, setName] = useState("");
  const [variety, setVariety] = useState("");

  useEffect(() => { (async () => {
    const r = await fetch("/api/crops");
    const data = await r.json();
    setCrops(data);
  })(); }, [setCrops]);

  const add = async () => {
    const r = await fetch("/api/crops", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, variety })
    });
    const c = await r.json();
    setCrops((x) => [...x, c]);
    setName(""); setVariety("");
  };

  const del = async (id) => {
    await fetch(`/api/crops/${id}`, { method: "DELETE" });
    setCrops((x) => x.filter((c) => c.id !== id));
  };

  return (
    <div className="tile">
      <h3>Crops</h3>
      <div className="row">
        <input placeholder="Name (e.g., Wheat)" value={name} onChange={(e) => setName(e.target.value)} />
        <input placeholder="Variety (optional)" value={variety} onChange={(e) => setVariety(e.target.value)} />
        <button onClick={add} disabled={!name.trim()}>Add</button>
      </div>
      <ul className="list">
        {crops.map((c) => (
          <li key={c.id}>
            <span>{c.name}{c.variety ? ` • ${c.variety}` : ""}</span>
            <button className="ghost" onClick={() => del(c.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
};


const ToDoTile = ({ crops, todos, setTodos }) => {
  const [title, setTitle] = useState("");
  const [cropId, setCropId] = useState("");
  const [when, setWhen] = useState("");

  useEffect(() => { (async () => {
    const r = await fetch("/api/todos");
    const data = await r.json();
    setTodos(data);
  })(); }, [setTodos]);

  const add = async () => {
    const r = await fetch("/api/todos", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, cropId: cropId || null, when: when || null })
    });
    const t = await r.json();
    setTodos((x) => [...x, t]);
    setTitle(""); setCropId(""); setWhen("");
  };

  const toggle = async (t) => {
    const r = await fetch(`/api/todos/${t.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !t.done })
    });
    const updated = await r.json();
    setTodos((x) => x.map((it) => (it.id === t.id ? updated : it)));
  };

  const del = async (id) => {
    await fetch(`/api/todos/${id}`, { method: "DELETE" });
    setTodos((x) => x.filter((t) => t.id !== id));
  };

  const formatWhen = (val) => {
    if (!val) return "";
    return new Date(val).toLocaleString();
  };

  return (
    <div className="tile">
      <h3>To‑Do</h3>
      <div className="row">
        <input placeholder="Task" value={title} onChange={(e) => setTitle(e.target.value)} />
        <select value={cropId} onChange={(e) => setCropId(e.target.value)}>
          <option value="">No crop</option>
          {crops.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        <button onClick={add} disabled={!title.trim()}>Add</button>
      </div>
      <ul className="list">
        {todos.map((t) => (
          <li key={t.id}>
            <label className={`check ${t.done ? "on" : ""}`}>
              <input type="checkbox" checked={t.done} onChange={() => toggle(t)} />
              <span>{t.title}</span>
            </label>
            <span className="dim">
              {crops.find(c => c.id === t.cropId)?.name ?? ""}
              {t.when ? ` • ${formatWhen(t.when)}` : ""}
            </span>
            <button className="ghost" onClick={() => del(t.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
};



const ChatTile = ({ activeCropName, coords }) => {
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hello! Ask about crop care, irrigation, or scheduling." }
  ]);
  const [input, setInput] = useState("");

  const send = async () => {
    // Optionally include last known weather from your weather hook if you want Gemini to use it:
    // For now, omit or pass null.
    const r = await fetch("/api/gemini-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: input,
        crop: activeCropName || "",
        coords,      // { lat, lon } or null
        weather: null
      })
    });
    const data = await r.json();
    const reply = data.reply || "No reply.";
    setMessages((m) => [...m, { role: "user", text: input }, { role: "assistant", text: reply }]);
    setInput("");
  };

  return (
    <div className="tile chat">
      <h3>Chat</h3>
      <div className="chat-box">
        {messages.map((m, i) => <div key={i} className={m.role}>{m.text}</div>)}
      </div>
      <div className="row">
        <input placeholder="Type your question…" value={input} onChange={(e) => setInput(e.target.value)} />
        <button onClick={send} disabled={!input.trim()}>Send</button>
      </div>
    </div>
  );
};






export default function App() {
  const { coords: geoCoords, error } = useGeolocation();
  const [coords, setCoords] = useState(null);
  const [crops, setCrops] = useState([]);
  const [todos, setTodos] = useState([]);
  const [weather, refreshWeather] = useWeather(coords);

  useEffect(() => { if (geoCoords && !coords) setCoords(geoCoords); }, [geoCoords]);

  const activeCropName = useMemo(() => (crops[0]?.name ?? ""), [crops]);

  return (
    <MotionConfig transition={{ duration: 0.45, ease: "easeInOut" }}>
      <div className="page">
        <header>
          <motion.h2 initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            Farmer Chatbot Dashboard
          </motion.h2>
        </header>

        <main className="grid">

            <TreeTile />
            
          <LocationTile coords={coords} error={error} onManual={setCoords} />
          <WeatherTile coords={coords} weather={weather} onRefresh={refreshWeather} />
          <CropsTile crops={crops} setCrops={setCrops} />
          <ToDoTile crops={crops} todos={todos} setTodos={setTodos} />
          <ChatTile activeCropName={activeCropName} coords={coords} />
          
        </main>

        <footer>
          <motion.small initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            Geolocation needs permission; for production use HTTPS and connect a weather API proxy.
          </motion.small>
        </footer>
      </div>
    </MotionConfig>
  );
}

