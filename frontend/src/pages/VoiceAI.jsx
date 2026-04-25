import React, { useState, useEffect } from "react";
import PageHeader from "@/components/PageHeader";
import { Mic, MicOff, Volume2 } from "lucide-react";
import { ShieldAPI } from "@/lib/api";
import { toast } from "sonner";

export default function VoiceAI() {
    const [active, setActive] = useState(true);

    useEffect(() => {
        ShieldAPI.getState()
            .then((s) => setActive(Boolean(s.voice_ai)))
            .catch(() => {});
    }, []);

    const toggle = async () => {
        const next = !active;
        setActive(next);
        try {
            await ShieldAPI.setState({ voice_ai: next });
            toast(next ? "VOICE AI ENGAGED" : "VOICE AI MUTED");
        } catch {
            toast.error("Could not save state");
        }
    };

    return (
        <div className="min-h-screen pb-12">
            <PageHeader title="VOICE AI" subtitle="NEURAL VOICE GUARDIAN" />

            <div className="px-5 mt-4 fade-up">
                <div className="neon-card border-glow-cyan-soft rounded-xl p-6 flex flex-col items-center gap-6 relative overflow-hidden">
                    <div className="absolute inset-0 pointer-events-none">
                        {active && <div className="scan-line" />}
                    </div>

                    <button
                        type="button"
                        onClick={toggle}
                        data-testid="voice-ai-toggle"
                        className={`relative flex items-center justify-center rounded-full transition-transform active:scale-95 ${active ? "animate-neon-pulse" : ""}`}
                        style={{
                            width: 160,
                            height: 160,
                            background: active
                                ? "radial-gradient(circle, rgba(37,232,226,0.32), rgba(37,232,226,0.04))"
                                : "rgba(20,30,40,0.6)",
                            border: `2px solid ${active ? "var(--cyan)" : "var(--slate-2)"}`,
                            boxShadow: active
                                ? "0 0 36px rgba(37,232,226,0.45)"
                                : "none",
                        }}
                    >
                        {active ? (
                            <Mic size={64} strokeWidth={2} style={{ color: "var(--cyan)" }} />
                        ) : (
                            <MicOff size={64} strokeWidth={2} style={{ color: "var(--slate)" }} />
                        )}
                        {active && (
                            <span
                                className="absolute inset-0 rounded-full ping-ring"
                                style={{
                                    border: "2px solid var(--cyan)",
                                }}
                            />
                        )}
                    </button>

                    <div className="text-center">
                        <p
                            className="font-display tracking-[0.32em] text-xs"
                            style={{ color: active ? "var(--cyan)" : "var(--slate)" }}
                        >
                            {active ? "LISTENING" : "MUTED"}
                        </p>
                        <p className="font-body text-base mt-2" style={{ color: "#cfd8e3" }}>
                            {active
                                ? "Hands-free voice commands enabled."
                                : "Tap mic to enable hands-free guard."}
                        </p>
                    </div>

                    <div className="w-full grid grid-cols-1 gap-2">
                        {[
                            "Activate shield",
                            "Send SOS",
                            "Start cycling mode",
                            "What's around me?",
                        ].map((cmd) => (
                            <div
                                key={cmd}
                                className="flex items-center gap-3 px-4 py-3 rounded-md border-glow-dim"
                                style={{ background: "rgba(10,17,25,0.6)" }}
                            >
                                <Volume2 size={16} style={{ color: "var(--cyan)" }} />
                                <span className="font-mono text-sm" style={{ color: "#cfd8e3" }}>
                                    “{cmd}”
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
