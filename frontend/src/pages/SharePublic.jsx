import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ShieldAPI } from "@/lib/api";
import { ShieldCheck, MapPin, Clock, Radio } from "lucide-react";
import ShieldLogo from "@/components/ShieldLogo";

// Fix default marker icons (Leaflet's default ones break in CRA)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom cyan pulsing marker
const cyanIcon = L.divIcon({
    className: "ss-marker",
    html: `<div style="position:relative;width:32px;height:32px;">
      <span style="position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle, rgba(37,232,226,0.55), rgba(37,232,226,0.0));animation:ss-ping 1.6s ease-out infinite;"></span>
      <span style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:14px;height:14px;border-radius:50%;background:#25E8E2;box-shadow:0 0 14px #25E8E2;"></span>
    </div>
    <style>
      @keyframes ss-ping { 0% { transform: scale(0.4); opacity: 0.9; } 100% { transform: scale(2.2); opacity: 0; } }
      .leaflet-container { background: #04070d !important; }
      .leaflet-tile-pane { filter: invert(1) hue-rotate(180deg) saturate(0.7) brightness(0.85) contrast(1.1); }
      .leaflet-control-attribution { background: rgba(0,0,0,0.6) !important; color: #5a6b7a !important; font-size: 9px !important; }
      .leaflet-control-attribution a { color: #25E8E2 !important; }
      .leaflet-control-zoom a { background: #0a1119 !important; color: #25E8E2 !important; border: 1px solid rgba(37,232,226,0.4) !important; }
    </style>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
});

function Recenter({ position }) {
    const map = useMap();
    useEffect(() => {
        if (position) map.setView(position, map.getZoom() || 16, { animate: true });
    }, [position, map]);
    return null;
}

const formatTimeAgo = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 5) return "just now";
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
};

export default function SharePublic() {
    const { token } = useParams();
    const [sess, setSess] = useState(null);
    const [error, setError] = useState(null);
    const [, force] = useState(0); // force re-render for "time ago"
    const tickRef = useRef(null);

    const fetchSess = async () => {
        try {
            const data = await ShieldAPI.getShare(token);
            setSess(data);
            setError(null);
        } catch (err) {
            const status = err?.response?.status;
            if (status === 404) setError("Share link not found.");
            else setError("Could not load share session.");
        }
    };

    useEffect(() => {
        fetchSess();
        tickRef.current = setInterval(fetchSess, 5000);
        const timeTick = setInterval(() => force((x) => x + 1), 1000);
        return () => {
            clearInterval(tickRef.current);
            clearInterval(timeTick);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    const loc = sess?.last_location;
    const position = loc ? [loc.lat, loc.lng] : null;
    const isActive = sess?.active;

    return (
        <div className="min-h-screen flex flex-col">
            {/* Header */}
            <header className="relative z-10 px-5 py-4 flex items-center justify-between border-b" style={{ borderColor: "rgba(37,232,226,0.25)" }}>
                <div className="flex items-center gap-3">
                    <ShieldLogo size={32} />
                    <div>
                        <h1
                            className="font-display font-bold tracking-[0.06em] glow-cyan leading-none"
                            style={{ color: "var(--cyan)", fontSize: "20px" }}
                            data-testid="share-public-title"
                        >
                            STREET SHIELD
                        </h1>
                        <p
                            className="mt-0.5 font-display tracking-[0.32em]"
                            style={{ color: "var(--pink)", fontSize: "9px" }}
                        >
                            FIND MY SHIELD
                        </p>
                    </div>
                </div>
                {isActive ? (
                    <div
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                        style={{
                            background: "rgba(255,46,109,0.1)",
                            border: "1px solid var(--pink)",
                        }}
                    >
                        <span
                            className="w-2 h-2 rounded-full animate-neon-pulse"
                            style={{ background: "var(--pink)", boxShadow: "0 0 6px var(--pink)" }}
                        />
                        <span className="font-display tracking-[0.2em] text-[10px]" style={{ color: "var(--pink)" }}>
                            LIVE
                        </span>
                    </div>
                ) : sess ? (
                    <span className="font-display tracking-[0.2em] text-[10px]" style={{ color: "var(--slate)" }}>
                        ENDED
                    </span>
                ) : null}
            </header>

            {/* Status banner */}
            {sess && (
                <div className="px-5 py-3 grid grid-cols-3 gap-2 border-b" style={{ borderColor: "rgba(37,232,226,0.15)" }}>
                    <div className="flex items-center gap-2">
                        <ShieldCheck size={14} style={{ color: "var(--cyan)" }} />
                        <div>
                            <div className="font-display tracking-[0.18em] text-[9px]" style={{ color: "var(--slate)" }}>
                                FROM
                            </div>
                            <div className="font-body text-sm truncate" style={{ color: "#fff" }} data-testid="share-public-sender">
                                {sess.sender_name}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Clock size={14} style={{ color: "var(--cyan)" }} />
                        <div>
                            <div className="font-display tracking-[0.18em] text-[9px]" style={{ color: "var(--slate)" }}>
                                LAST PING
                            </div>
                            <div className="font-body text-sm" style={{ color: "#fff" }} data-testid="share-public-last-ping">
                                {formatTimeAgo(sess.last_ping_at)}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Radio size={14} style={{ color: "var(--pink)" }} />
                        <div>
                            <div className="font-display tracking-[0.18em] text-[9px]" style={{ color: "var(--slate)" }}>
                                STATUS
                            </div>
                            <div className="font-body text-sm" style={{ color: isActive ? "var(--pink)" : "var(--slate)" }}>
                                {isActive ? "Active" : "Stopped"}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Map / message */}
            <div className="flex-1 relative">
                {error && (
                    <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
                        <div className="neon-card border-glow-cyan-soft rounded-xl p-6">
                            <MapPin size={28} style={{ color: "var(--pink)" }} className="mx-auto" />
                            <p className="mt-3 font-display tracking-[0.18em] text-sm" style={{ color: "var(--pink)" }}>
                                {error}
                            </p>
                        </div>
                    </div>
                )}

                {!error && !position && sess && (
                    <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
                        <div className="neon-card border-glow-cyan-soft rounded-xl p-6">
                            <p className="font-display tracking-[0.18em] text-sm" style={{ color: "var(--cyan)" }}>
                                WAITING FOR FIRST LOCATION PING…
                            </p>
                        </div>
                    </div>
                )}

                {position && (
                    <MapContainer
                        center={position}
                        zoom={16}
                        style={{ height: "100%", width: "100%", minHeight: "60vh" }}
                        zoomControl={true}
                        scrollWheelZoom={true}
                    >
                        <TileLayer
                            attribution='&copy; OpenStreetMap'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <Marker position={position} icon={cyanIcon}>
                            <Popup>
                                <div style={{ fontFamily: "Rajdhani, sans-serif" }}>
                                    <strong>{sess?.sender_name}</strong>
                                    <br />
                                    {position[0].toFixed(5)}, {position[1].toFixed(5)}
                                </div>
                            </Popup>
                        </Marker>
                        <Recenter position={position} />
                    </MapContainer>
                )}
            </div>

            {position && (
                <div
                    className="px-5 py-3 font-mono text-[11px] text-center border-t"
                    style={{
                        color: "var(--slate)",
                        borderColor: "rgba(37,232,226,0.15)",
                        background: "rgba(2, 5, 10, 0.85)",
                    }}
                >
                    {position[0].toFixed(5)}, {position[1].toFixed(5)} · refreshing every 5s
                </div>
            )}
        </div>
    );
}
