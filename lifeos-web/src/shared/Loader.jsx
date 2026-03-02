import { useEffect, useMemo, useState } from "react";

export default function Loader({
  title = "LifeOS",
  subtitle = "gentle productivity",
  lines,
  small = false,
  className = "",
}) {
  const defaultLines = useMemo(
    () => [
      "Preparing your day…",
      "Syncing your reflections…",
      "Restoring your rhythm…",
      "Gentle systems take a second…",
    ],
    []
  );

  const list = (lines && lines.length ? lines : defaultLines).slice(0, 4);

  // pick a starting line so it feels “alive”, not always the same
  const [start, setStart] = useState(0);
  useEffect(() => {
    setStart(Math.floor(Math.random() * list.length));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rotated = useMemo(() => {
    if (!list.length) return list;
    return [...list.slice(start), ...list.slice(0, start)];
  }, [list, start]);

  const wrapStyle = {
    minHeight: small ? 160 : "calc(100vh - 140px)",
    display: "grid",
    placeItems: "center",
    padding: 24,
    borderRadius: 18,
    background:
      "radial-gradient(1000px 500px at 20% 0%, #eaf7ef 0%, #f6fbf7 60%, #ffffff 100%)",
  };

  const cardStyle = {
    width: "min(420px, 92vw)",
    background: "rgba(255,255,255,.75)",
    border: "1px solid rgba(36,50,43,.08)",
    borderRadius: 20,
    padding: 24,
    boxShadow: "0 12px 40px rgba(0,0,0,.08)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
  };

  return (
    <div style={wrapStyle} className={className} role="status" aria-live="polite">
      <style>{`
        @keyframes lifeosSlide {
          0% { transform: translateX(-60%); opacity: .7; }
          50% { transform: translateX(60%); opacity: 1; }
          100% { transform: translateX(170%); opacity: .7; }
        }
        @keyframes lifeosRotate {
          0%   { opacity: 0; transform: translateY(6px); }
          5%   { opacity: 1; transform: translateY(0); }
          25%  { opacity: 1; transform: translateY(0); }
          30%  { opacity: 0; transform: translateY(-6px); }
          100% { opacity: 0; }
        }
        @keyframes lifeosSoftFade {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{ ...cardStyle, animation: "lifeosSoftFade .55s ease forwards" }}>
        <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: 0.2, color: "#24322b" }}>
          {title}
        </div>
        <div style={{ marginTop: 6, fontSize: 14, color: "rgba(36,50,43,.6)" }}>
          {subtitle}
        </div>

        <div
          style={{
            marginTop: 18,
            height: 8,
            borderRadius: 999,
            background: "rgba(36,50,43,.08)",
            overflow: "hidden",
          }}
          aria-hidden="true"
        >
          <span
            style={{
              display: "block",
              height: "100%",
              width: "40%",
              borderRadius: 999,
              background: "linear-gradient(90deg,#cfe8d5,#f7c9dd,#ddd6fe)",
              animation: "lifeosSlide 1.1s ease-in-out infinite",
            }}
          />
        </div>

        <div
          style={{
            position: "relative",
            marginTop: 16,
            fontSize: 13,
            color: "rgba(36,50,43,.6)",
            height: 20,
            overflow: "hidden",
          }}
        >
          {rotated.map((t, i) => (
            <span
              key={t}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                opacity: 0,
                animation: "lifeosRotate 8s infinite",
                animationDelay: `${i * 2}s`,
              }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
