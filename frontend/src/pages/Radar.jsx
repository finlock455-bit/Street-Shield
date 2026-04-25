import React, { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { ShieldAPI } from "@/lib/api";
import { toast } from "sonner";

const FAKE_BLIPS = [
    { angle: 25, dist: 0.55, label: "PEDESTRIAN", risk: "low" },
    { angle: 130, dist: 0.78, label: "VEHICLE", risk: "med" },
    { angle: 210, dist: 0.40, label: "GROUP", risk: "low" },
    { angle: 300, dist: 0.85, label: "INCIDENT", risk: "high" },
];

export default function Radar() {
    const [active, setActive] = useState(true);

    useEffect(() => {
        ShieldAPI.getState()
            .then((s) => setActive(Boolean(s.radar)))
            .catch(() => {});
    }, []);

    const toggle = async () => {
        const next = !active;
        setActive(next);
        try {
            await ShieldAPI.setState({ radar: next });
            toast(next ? "RADAR ONLINE" : "RADAR OFFLINE");
        } catch {
            toast.error("Could not save state");
        }
    };

    return (
        <div className="min-h-screen pb-12">
            <PageHeader title="RADAR" subtitle="ENVIRONMENTAL SCAN" />

            <div className="px-5 mt-4 fade-up">
                <div className="neon-card border-glow-cyan-soft rounded-xl p-6 flex flex-col items-center gap-5 relative overflow-hidden">
                    {/* Radar disc */}
                    <div
                        className="relative rounded-full"
                        style={{
                            width: 280,
                            height: 280,
                            background:
                                "radial-gradient(circle, rgba(37,232,226,0.10) 0%, rgba(37,232,226,0.02) 60%, transparent 100%)",
                            border: "1px solid rgba(37,232,226,0.45)",
                            boxShadow: "0 0 32px rgba(37,232,226,0.18) inset",
                        }}
                        data-testid="radar-disc"
                    >
                        {/* Concentric rings */}
                        {[0.33, 0.66, 1].map((r, i) => (
                            <span
                                key={i}
                                className="absolute rounded-full"
                                style={{
                                    inset: `${(1 - r) * 50}%`,
                                    border: "1px dashed rgba(37,232,226,0.25)",
                                }}
                            />
                        ))}
                        {/* Crosshair */}
                        <span className="absolute left-1/2 top-0 bottom-0 w-px" style={{ background: "rgba(37,232,226,0.25)" }} />
                        <span className="absolute top-1/2 left-0 right-0 h-px" style={{ background: "rgba(37,232,226,0.25)" }} />

                        {/* Sweep */}
                        {active && (
                            <span
                                className="absolute inset-0 radar-sweep"
                                style={{
                                    background:
                                        "conic-gradient(from 0deg, rgba(37,232,226,0.55), rgba(37,232,226,0.0) 30%, transparent 100%)",
                                    borderRadius: "50%",
                                    maskImage: "radial-gradient(circle, black 0%, black 100%)",
                                }}
                            />
                        )}

                        {/* Blips */}
                        {active &&
                            FAKE_BLIPS.map((b, i) => {
                                const rad = (b.angle * Math.PI) / 180;
                                const x = 50 + Math.cos(rad) * b.dist * 45;
                                const y = 50 + Math.sin(rad) * b.dist * 45;
                                const color =
                                    b.risk === "high"
                                        ? "var(--pink)"
                                        : b.risk === "med"
                                          ? "#facc15"
                                          : "var(--cyan)";
                                return (
                                    <span
                                        key={i}
                                        className="absolute"
                                        style={{
                                            left: `${x}%`,
                                            top: `${y}%`,
                                            transform: "translate(-50%, -50%)",
                                        }}
                                    >
                                        <span
                                            className="block w-2.5 h-2.5 rounded-full animate-neon-pulse"
                                            style={{
                                                background: color,
                                                boxShadow: `0 0 10px ${color}`,
                                            }}
                                        />
                                    </span>
                                );
                            })}

                        {/* Center dot */}
                        <span
                            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
                            style={{
                                background: "var(--cyan)",
                                boxShadow: "0 0 14px var(--cyan)",
                            }}
                        />
                    </div>

                    <div className="text-center">
                        <p
                            className="font-display tracking-[0.32em] text-xs"
                            style={{ color: active ? "var(--cyan)" : "var(--slate)" }}
                        >
                            {active ? "SCANNING — 50M RADIUS" : "OFFLINE"}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={toggle}
                        data-testid="radar-toggle"
                        className="cyber-btn"
                    >
                        {active ? "DISABLE RADAR" : "ENABLE RADAR"}
                    </button>

                    <div className="w-full grid grid-cols-3 gap-2 mt-2">
                        {FAKE_BLIPS.slice(0, 3).map((b, i) => (
                            <div key={i} className="border-glow-dim rounded-md p-3" style={{ background: "rgba(10,17,25,0.6)" }}>
                                <div
                                    className="font-display tracking-[0.18em] text-[10px]"
                                    style={{
                                        color:
                                            b.risk === "high"
                                                ? "var(--pink)"
                                                : b.risk === "med"
                                                  ? "#facc15"
                                                  : "var(--cyan)",
                                    }}
                                >
                                    {b.label}
                                </div>
                                <div className="font-mono text-[11px]" style={{ color: "var(--slate)" }}>
                                    {(b.dist * 50).toFixed(0)}m · {b.risk.toUpperCase()}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
