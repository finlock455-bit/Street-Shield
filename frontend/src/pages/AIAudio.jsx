import React, { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { Headphones, Play, Pause } from "lucide-react";
import { ShieldAPI } from "@/lib/api";
import { toast } from "sonner";

const SCAPES = [
    { id: "city", name: "City Pulse", desc: "Urban ambient guardian loop" },
    { id: "forest", name: "Forest Watch", desc: "Calming foliage soundscape" },
    { id: "white", name: "White Shield", desc: "Pure focus / drown-out" },
    { id: "binaural", name: "Binaural 528Hz", desc: "Stress-relief beats" },
];

export default function AIAudio() {
    const [active, setActive] = useState(false);
    const [scape, setScape] = useState("city");

    useEffect(() => {
        ShieldAPI.getState()
            .then((s) => setActive(Boolean(s.ai_audio)))
            .catch(() => {});
    }, []);

    const toggle = async () => {
        const next = !active;
        setActive(next);
        try {
            await ShieldAPI.setState({ ai_audio: next });
            toast(next ? "AUDIO ENGAGED" : "AUDIO STOPPED");
        } catch {
            toast.error("Could not save state");
        }
    };

    return (
        <div className="min-h-screen pb-12">
            <PageHeader title="AI AUDIO" subtitle="ADAPTIVE SOUNDSCAPES" />

            <div className="px-5 mt-4 fade-up">
                <div className="neon-card border-glow-cyan-soft rounded-xl p-6 flex flex-col items-center gap-5 relative overflow-hidden">
                    <div
                        className="flex items-center justify-center rounded-full relative"
                        style={{
                            width: 140,
                            height: 140,
                            background: active
                                ? "radial-gradient(circle, rgba(217,70,239,0.32), rgba(217,70,239,0.04))"
                                : "rgba(20,30,40,0.6)",
                            border: `2px solid ${active ? "#d946ef" : "var(--slate-2)"}`,
                            boxShadow: active ? "0 0 32px rgba(217,70,239,0.55)" : "none",
                        }}
                    >
                        <Headphones size={56} strokeWidth={2} style={{ color: active ? "#d946ef" : "var(--slate)" }} />
                        {active && (
                            <span
                                className="absolute inset-0 rounded-full ping-ring"
                                style={{ border: "2px solid #d946ef" }}
                            />
                        )}
                    </div>

                    <button type="button" onClick={toggle} data-testid="audio-toggle" className="cyber-btn flex items-center gap-2">
                        {active ? <Pause size={16} /> : <Play size={16} />}
                        {active ? "PAUSE" : "PLAY"}
                    </button>

                    <div className="w-full grid grid-cols-1 gap-2">
                        {SCAPES.map((s) => (
                            <button
                                type="button"
                                key={s.id}
                                onClick={() => setScape(s.id)}
                                data-testid={`scape-${s.id}`}
                                className={`text-left px-4 py-3 rounded-md transition-all ${scape === s.id ? "border-glow-cyan-soft" : "border-glow-dim"}`}
                                style={{ background: "rgba(10,17,25,0.6)" }}
                            >
                                <div
                                    className="font-display tracking-[0.18em] text-sm"
                                    style={{
                                        color: scape === s.id ? "var(--cyan)" : "#fff",
                                    }}
                                >
                                    {s.name}
                                </div>
                                <div className="font-body text-xs" style={{ color: "var(--slate)" }}>
                                    {s.desc}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
