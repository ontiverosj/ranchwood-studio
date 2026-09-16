import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Upload,
  Play,
  Pause,
  Scissors,
  Trash2,
  Save,
  FolderOpen,
  Download,
  Undo2,
  Redo2,
  Plus,
  Type,
  Captions,
  Volume2,
  Music2,
  ZoomIn,
  ZoomOut,
  WandSparkles,
  Settings,
  Eye,
  EyeOff,
  X,
  CheckCircle2,
} from "lucide-react";
import "./styles.css";
const api = window.studio || {
    importMedia: async () => [],
    probeMedia: async () => ({ duration: 0 }),
    autoEdit: async () => [],
    claudeStatus: async () => ({ connected: false }),
    saveClaudeKey: async () => ({ connected: false }),
    removeClaudeKey: async () => ({ connected: false }),
    testClaude: async () => ({ connected: false }),
    saveProject: async () => null,
    openProject: async () => null,
    exportVideo: async () => {
      throw Error("Run in Electron");
    },
    onExportProgress: () => {},
  },
  url = (p) => `file://${p.replace(/\\/g, "/")}`,
  fmt = (n) =>
    `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, "0")}.${String(Math.floor((n % 1) * 10))}`;
function App() {
  const [p, setP] = useState({
      version: 2,
      name: "Untitled social edit",
      ratio: "9:16",
      preset: "jake",
      media: [],
      clips: [],
      audioTrack: null,
      overlay: { text: "" },
    }),
    [sel, setSel] = useState(),
    [playing, setPlaying] = useState(false),
    [time, setTime] = useState(0),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(""),
    [past, setPast] = useState([]),
    [next, setNext] = useState([]),
    [zoom, setZoom] = useState(16),
    [targetDuration, setTargetDuration] = useState(60),
    [settingsOpen, setSettingsOpen] = useState(false),
    [claudeKey, setClaudeKey] = useState(""),
    [showKey, setShowKey] = useState(false),
    [claudeConnected, setClaudeConnected] = useState(false),
    [testingClaude, setTestingClaude] = useState(false),
    [claudeMessage, setClaudeMessage] = useState("");
  const video = useRef(),
    music = useRef(),
    clip = p.clips.find((x) => x.id === sel) || p.clips[0],
    total = useMemo(
      () => p.clips.reduce((s, x) => s + x.trimEnd - x.trimStart, 0),
      [p.clips],
    );
  useEffect(() => api.onExportProgress(setProgress), []);
  useEffect(() => {
    api.claudeStatus().then((status) => setClaudeConnected(status.connected));
  }, []);
  useEffect(() => {
    if (clip && video.current) {
      video.current.currentTime = clip.trimStart;
      setTime(clip.trimStart);
    }
  }, [clip?.id]);
  useEffect(() => {
    if (music.current)
      music.current.volume = Math.min(1, (p.audioTrack?.volume ?? 30) / 100);
  }, [p.audioTrack?.volume]);
  const commit = (fn) => {
      setPast((h) => [...h.slice(-39), p]);
      setNext([]);
      setP(fn(p));
    },
    undo = () => {
      if (past.length) {
        setNext((n) => [p, ...n]);
        setP(past.at(-1));
        setPast((h) => h.slice(0, -1));
      }
    },
    redo = () => {
      if (next.length) {
        setPast((h) => [...h, p]);
        setP(next[0]);
        setNext((n) => n.slice(1));
      }
    },
    imports = async () => {
      const imported = await api.importMedia();
      if (!imported.length) return;
      setBusy(true);
      setProgress("Adding videos to timeline");
      const newClips = [];
      const rejected = [];
      for (const media of imported.filter((item) => item.type === "video")) {
        try {
          const duration = media.duration || (await api.probeMedia(media.path)).duration;
          if (!duration) throw new Error("No duration found");
          newClips.push({
            ...media,
            id: `${media.id}-import-${Date.now()}-${newClips.length}`,
            duration,
            trimStart: 0,
            trimEnd: duration,
            volume: 100,
            muted: false,
            fadeIn: 0,
            fadeOut: 0,
            transition: "none",
          });
        } catch (error) {
          rejected.push(`${media.name}: ${error.message}`);
        }
      }
      const firstAudio = imported.find((item) => item.type === "audio");
      setP((q) => ({
        ...q,
        media: [...q.media, ...imported],
        clips: [...q.clips, ...newClips],
        audioTrack: q.audioTrack || (firstAudio ? { ...firstAudio, volume: 30 } : null),
      }));
      if (newClips.length) setSel(newClips[0].id);
      setBusy(false);
      setProgress("");
      if (rejected.length) alert(`Some files could not be added:\n${rejected.join("\n")}`);
      else if (newClips.length) alert(`${newClips.length} video${newClips.length === 1 ? "" : "s"} added to the timeline.`);
    },
    add = async (m) => {
      if (m.type === "audio")
        return commit((q) => ({ ...q, audioTrack: { ...m, volume: 30 } }));
      try {
        const duration = m.duration || (await api.probeMedia(m.path)).duration;
        if (!duration) throw new Error("No duration found");
        commit((q) => ({
          ...q,
          clips: [
            ...q.clips,
            {
              ...m,
              id: m.id + Date.now(),
              duration,
              trimStart: 0,
              trimEnd: duration,
              volume: 100,
              muted: false,
              fadeIn: 0,
              fadeOut: 0,
              transition: "none",
            },
          ],
        }));
      } catch (error) {
        alert(`Could not add ${m.name}: ${error.message}`);
      }
    },
    agentEdit = async () => {
      const videos = p.media.filter((m) => m.type === "video");
      if (!videos.length) return alert("Import at least one video first.");
      setBusy(true);
      setProgress("Agent is finding the best cuts");
      try {
        const segments = await api.autoEdit(videos, targetDuration);
        const clips = segments.map(({ item, start, end }, index) => ({
          ...item,
          id: `${item.id}-agent-${Date.now()}-${index}`,
          duration: end,
          trimStart: start,
          trimEnd: end,
          volume: 100,
          muted: false,
          fadeIn: 0.08,
          fadeOut: 0.08,
          transition: "none",
        }));
        commit((q) => ({ ...q, clips }));
        setSel(clips[0]?.id);
      } catch (error) {
        alert(`Agent edit failed: ${error.message}`);
      } finally {
        setBusy(false);
        setProgress("");
      }
    },
    startDrag = (event, media) => {
      event.dataTransfer.effectAllowed = "copy";
      event.dataTransfer.setData("application/x-ranchwood-media", media.id);
    },
    receiveDrop = (event) => {
      event.preventDefault();
      const id = event.dataTransfer.getData("application/x-ranchwood-media");
      const media = p.media.find((item) => item.id === id);
      if (media) add(media);
    },
    patch = (x) =>
      commit((q) => ({
        ...q,
        clips: q.clips.map((c) => (c.id === clip.id ? { ...c, ...x } : c)),
      })),
    split = () => {
      if (!clip || time <= clip.trimStart + 0.05 || time >= clip.trimEnd - 0.05)
        return;
      commit((q) => {
        let i = q.clips.findIndex((c) => c.id === clip.id);
        return {
          ...q,
          clips: [
            ...q.clips.slice(0, i),
            { ...clip, trimEnd: time },
            { ...clip, id: clip.id + Date.now(), trimStart: time },
            ...q.clips.slice(i + 1),
          ],
        };
      });
    },
    toggle = () => {
      if (playing) {
        video.current?.pause();
        music.current?.pause();
      } else {
        video.current?.play();
        music.current?.play();
      }
    },
    load = async () => {
      let x = await api.openProject();
      if (x) setP({ version: 2, audioTrack: null, ...x });
    },
    save = () => api.saveProject(p),
    saveClaude = async () => {
      setClaudeMessage("");
      try {
        const status = await api.saveClaudeKey(claudeKey);
        setClaudeConnected(status.connected);
        setClaudeKey("");
        setClaudeMessage("API key encrypted and saved on this Mac.");
      } catch (error) {
        setClaudeMessage(error.message);
      }
    },
    testClaude = async () => {
      setTestingClaude(true);
      setClaudeMessage("Testing Claude connection…");
      try {
        const status = await api.testClaude();
        setClaudeConnected(status.connected);
        setClaudeMessage(`Claude replied: ${status.reply}`);
      } catch (error) {
        setClaudeConnected(false);
        setClaudeMessage(`Connection failed: ${error.message}`);
      } finally {
        setTestingClaude(false);
      }
    },
    removeClaude = async () => {
      const status = await api.removeClaudeKey();
      setClaudeConnected(status.connected);
      setClaudeKey("");
      setClaudeMessage("Claude API key removed from this Mac.");
    },
    exportNow = async () => {
      setBusy(true);
      try {
        let r = await api.exportVideo({
          clips: p.clips,
          audioTrack: p.audioTrack,
          ratio: p.ratio,
          overlay: p.overlay,
          preset: p.preset,
        });
        if (r?.path) alert("Export complete:\n" + r.path);
      } catch (e) {
        alert("Export failed: " + e.message);
      } finally {
        setBusy(false);
      }
    };
  return (
    <div className="app">
      <header>
        <div className="brand">
          <div className="mark">R</div>
          <div>
            <b>Ranchwood Studio</b>
            <small>Reel Agent editor</small>
          </div>
        </div>
        <input
          className="project-name"
          value={p.name}
          onChange={(e) => setP({ ...p, name: e.target.value })}
        />
        <div className="top-actions">
          <button className="ghost" onClick={() => setSettingsOpen(true)}>
            <Settings />
            AI Settings
            <i className={`connection-dot ${claudeConnected ? "online" : ""}`} />
          </button>
          <button className="ghost" onClick={load}>
            <FolderOpen />
            Open
          </button>
          <button className="ghost" onClick={save}>
            <Save />
            Save
          </button>
          <button
            className="export"
            disabled={busy || !p.clips.length}
            onClick={exportNow}
          >
            <Download />
            {busy ? progress || "Exporting" : "Export MP4"}
          </button>
        </div>
      </header>
      <main>
        <aside className="library">
          <div className="panel-title">
            Media
            <button className="icon" onClick={imports}>
              <Plus />
            </button>
          </div>
          <button className="drop" onClick={imports}>
            <Upload />
            <b>Import and add videos</b>
            <span>Videos go directly onto the timeline</span>
          </button>
          <div className="reel-length">
            <label htmlFor="reel-duration">TikTok length</label>
            <select id="reel-duration" value={targetDuration} onChange={(event) => setTargetDuration(Number(event.target.value))}>
              <option value="30">30 seconds</option>
              <option value="60">60 seconds</option>
              <option value="90">90 seconds</option>
            </select>
          </div>
          <button className="agent-edit" onClick={agentEdit} disabled={busy || !p.media.some((m) => m.type === "video")}>
            <WandSparkles />
            <span><b>Reel Agent</b><small>Turn long footage into a {targetDuration}s TikTok</small></span>
          </button>
          <div className="media-grid">
            {p.media.map((m) => (
              <button
                className="media-card"
                key={m.id}
                draggable
                onDragStart={(event) => startDrag(event, m)}
                onClick={() => add(m)}
              >
                {m.type === "video" ? (
                  <video className="thumb-video" src={url(m.path)} muted />
                ) : (
                  <div className="thumb audio">♪</div>
                )}
                <span>{m.name}</span>
                <small>Click to add</small>
              </button>
            ))}
          </div>
        </aside>
        <section className="stage">
          <div className="stagebar">
            <select
              value={p.ratio}
              onChange={(e) => setP({ ...p, ratio: e.target.value })}
            >
              <option>9:16</option>
              <option>16:9</option>
              <option>1:1</option>
            </select>
            <span>Fit</span>
          </div>
          <div
            className={`canvas drop-target ratio-${p.ratio.replace(":", "-")}`}
            onDragOver={(event) => event.preventDefault()}
            onDrop={receiveDrop}
          >
            {clip ? (
              <video
                ref={video}
                src={url(clip.path)}
                muted={clip.muted}
                volume={Math.min(1, (clip.volume ?? 100) / 100)}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onTimeUpdate={(e) => {
                  setTime(e.currentTarget.currentTime);
                  if (e.currentTarget.currentTime >= clip.trimEnd) {
                    e.currentTarget.pause();
                    music.current?.pause();
                  }
                }}
              />
            ) : (
              <div className="empty">
                <b>Drop a video here</b>
                <span>Or import clips and click Reel Agent</span>
              </div>
            )}
            {clip && p.overlay.text && (
              <div className={`overlay ${p.preset}`}>{p.overlay.text}</div>
            )}
            {p.audioTrack && (
              <audio ref={music} src={url(p.audioTrack.path)} loop />
            )}
          </div>
          <div className="transport">
            <button className="play" onClick={toggle}>
              {playing ? <Pause /> : <Play />}
            </button>
            <span>
              {fmt(time)} / {fmt(clip?.trimEnd || 0)}
            </span>
          </div>
        </section>
        <aside className="inspector">
          <div className="panel-title">Quick tools</div>
          <label>
            Brand
            <select
              value={p.preset}
              onChange={(e) => setP({ ...p, preset: e.target.value })}
            >
              <option value="jake">Jake Eats · pink</option>
              <option value="greywolf">Greywolf · blue</option>
            </select>
          </label>
          <label>
            <span>
              <Type />
              Title
            </span>
            <textarea
              value={p.overlay.text}
              onChange={(e) =>
                setP({ ...p, overlay: { text: e.target.value } })
              }
            />
          </label>
          <button className="tool">
            <Captions />
            Auto captions<small>Phase 3</small>
          </button>
          {clip && (
            <div className="clip-settings">
              <h3>Selected clip</h3>
              <label>
                Start {fmt(clip.trimStart)}
                <input
                  type="range"
                  min="0"
                  max={clip.trimEnd - 0.1}
                  step=".1"
                  value={clip.trimStart}
                  onChange={(e) => patch({ trimStart: +e.target.value })}
                />
              </label>
              <label>
                End {fmt(clip.trimEnd)}
                <input
                  type="range"
                  min={clip.trimStart + 0.1}
                  max={clip.duration}
                  step=".1"
                  value={clip.trimEnd}
                  onChange={(e) => patch({ trimEnd: +e.target.value })}
                />
              </label>
              <label>
                <span>
                  <Volume2 />
                  Volume {clip.muted ? 0 : clip.volume}%
                </span>
                <input
                  type="range"
                  min="0"
                  max="150"
                  value={clip.muted ? 0 : clip.volume}
                  onChange={(e) =>
                    patch({
                      volume: +e.target.value,
                      muted: +e.target.value === 0,
                    })
                  }
                />
              </label>
              <label>
                Transition
                <select
                  value={clip.transition}
                  onChange={(e) => patch({ transition: e.target.value })}
                >
                  <option value="none">None</option>
                  <option value="fade">Fade through black</option>
                </select>
              </label>
              <div className="fade-grid">
                <label>
                  Fade in
                  <input
                    type="number"
                    min="0"
                    max="5"
                    step=".1"
                    value={clip.fadeIn}
                    onChange={(e) => patch({ fadeIn: +e.target.value })}
                  />
                </label>
                <label>
                  Fade out
                  <input
                    type="number"
                    min="0"
                    max="5"
                    step=".1"
                    value={clip.fadeOut}
                    onChange={(e) => patch({ fadeOut: +e.target.value })}
                  />
                </label>
              </div>
            </div>
          )}
        </aside>
      </main>
      <section className="timeline">
        <div className="timeline-tools">
          <button onClick={undo} disabled={!past.length}>
            <Undo2 />
          </button>
          <button onClick={redo} disabled={!next.length}>
            <Redo2 />
          </button>
          <i />
          <button onClick={split}>
            <Scissors />
            Split
          </button>
          <button
            className="danger"
            onClick={() =>
              clip &&
              commit((q) => ({
                ...q,
                clips: q.clips.filter((c) => c.id !== clip.id),
              }))
            }
          >
            <Trash2 />
            Delete
          </button>
          <i />
          <button onClick={() => setZoom((z) => Math.max(8, z - 4))}>
            <ZoomOut />
          </button>
          <button onClick={() => setZoom((z) => Math.min(40, z + 4))}>
            <ZoomIn />
          </button>
          <span>
            {p.clips.length} clips · {fmt(total)}
          </span>
        </div>
        <div className="track">
          <div className="track-label">VIDEO 1</div>
          <div
            className="clips timeline-drop"
            onDragOver={(event) => event.preventDefault()}
            onDrop={receiveDrop}
          >
            {p.clips.map((c, i) => (
              <button
                key={c.id}
                className={`clip ${sel === c.id ? "selected" : ""}`}
                style={{
                  width: Math.max(110, (c.trimEnd - c.trimStart) * zoom),
                }}
                onClick={() => setSel(c.id)}
              >
                <video src={url(c.path)} muted />
                <b>{i + 1}</b>
                <span>{c.name}</span>
                <small>
                  {fmt(c.trimEnd - c.trimStart)}{" "}
                  {c.transition === "fade" ? "· fade" : ""}
                </small>
              </button>
            ))}
          </div>
        </div>
        <div className="track audio-track">
          <div className="track-label">
            <Music2 />
            AUDIO
          </div>
          <div className="clips">
            {p.audioTrack ? (
              <div className="music-clip">
                <Music2 />
                <span>{p.audioTrack.name}</span>
                <label>
                  <Volume2 />
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={p.audioTrack.volume}
                    onChange={(e) =>
                      setP({
                        ...p,
                        audioTrack: {
                          ...p.audioTrack,
                          volume: +e.target.value,
                        },
                      })
                    }
                  />
                  <b>{p.audioTrack.volume}%</b>
                </label>
                <button
                  onClick={() => commit((q) => ({ ...q, audioTrack: null }))}
                >
                  <Trash2 />
                </button>
              </div>
            ) : (
              <div className="timeline-empty">
                Double-click audio to add music
              </div>
            )}
          </div>
        </div>
      </section>
      {settingsOpen && (
        <div className="settings-backdrop" onMouseDown={() => setSettingsOpen(false)}>
          <section className="settings-modal" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div>
                <h2>AI Connections</h2>
                <p>Connect Claude as Ranchwood Studio’s editing brain.</p>
              </div>
              <button className="icon" onClick={() => setSettingsOpen(false)}><X /></button>
            </header>
            <div className="provider-card">
              <div className="provider-heading">
                <div className="claude-mark">C</div>
                <div><b>Anthropic Claude</b><small>{claudeConnected ? "Connected securely" : "Not connected"}</small></div>
                {claudeConnected && <CheckCircle2 className="connected-icon" />}
              </div>
              <label>Anthropic API key<div className="key-field"><input type={showKey ? "text" : "password"} value={claudeKey} onChange={(event) => setClaudeKey(event.target.value)} placeholder={claudeConnected ? "Enter a new key to replace the saved key" : "sk-ant-…"} autoComplete="off"/><button onClick={() => setShowKey((value) => !value)}>{showKey ? <EyeOff /> : <Eye />}</button></div></label>
              <p className="security-note">Encrypted with macOS secure storage. The key is never saved in GitHub or your project files.</p>
              {claudeMessage && <div className={`claude-message ${claudeConnected ? "success" : ""}`}>{claudeMessage}</div>}
              <div className="settings-actions">
                <button className="primary" disabled={!claudeKey.trim()} onClick={saveClaude}>Save key</button>
                <button disabled={!claudeConnected || testingClaude} onClick={testClaude}>{testingClaude ? "Testing…" : "Test connection"}</button>
                {claudeConnected && <button className="danger" onClick={removeClaude}>Remove</button>}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
