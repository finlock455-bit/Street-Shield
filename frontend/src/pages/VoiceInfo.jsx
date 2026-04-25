import React, { useState } from "react";
import PageHeader from "@/components/PageHeader";
import { Info, Volume2, VolumeX } from "lucide-react";

const TIPS = [
    {
        title: "DOUBLE-TAP TO ALERT",
        body: "Double-tap your screen anywhere to silently dispatch an SOS to your trusted contacts.",
    },
    {
        title: "VOICE COMMANDS",
        body: "Say “Shield on” or “Send SOS” to control Street Shield hands-free.",
    },
    {
        title: "RADAR PRIVACY",
        body: "All radar scans run on-device. No tracking data ever leaves your phone.",
    },
    {
        title: "BATTERY SAVER",
        body: "Cycling Mode automatically dims the screen and lowers polling frequency to save power.",
    },
];

export default function VoiceInfo() {
    const [reading, setReading] = useState(null);

    const speak = (text, idx) => {
        if (!("speechSynthesis" in window)) return;
        if (reading === idx) {
            window.speechSynthesis.cancel();
            setReading(null);
            return;
        }
        window.speechSynthesis.cancel();
        const utter = new window.SpeechSynthesisUtterance(text);
        utter.rate = 1.0;
        utter.pitch = 1.0;
        utter.onend = () => setReading(null);
        utter.onerror = () => setReading(null);
        window.speechSynthesis.speak(utter);
        setReading(idx);
    };

    return (
        <div className="min-h-screen pb-12">
            <PageHeader title="VOICE INFO" subtitle="GUIDED TUTORIAL" />

            <div className="px-5 mt-4 space-y-3 fade-up">
                <div className="neon-card border-glow-cyan-soft rounded-xl p-5 flex items-start gap-3">
                    <Info size={22} style={{ color: "var(--cyan)" }} />
                    <p className="font-body text-sm" style={{ color: "#cfd8e3" }}>
                        Tap any tip below to have Street Shield read it aloud. Use this to learn how to operate
                        your Neural Guardian without taking your eyes off the road.
                    </p>
                </div>

                {TIPS.map((t, i) => {
                    const active = reading === i;
                    return (
                        <button
                            key={i}
                            type="button"
                            onClick={() => speak(`${t.title}. ${t.body}`, i)}
                            data-testid={`voice-info-tip-${i}`}
                            className={`w-full text-left neon-card rounded-xl p-4 flex items-center gap-3 transition-all ${active ? "border-glow-cyan" : "border-glow-dim"}`}
                        >
                            <span
                                className="flex items-center justify-center rounded-full shrink-0"
                                style={{
                                    width: 42,
                                    height: 42,
                                    background: active ? "rgba(37,232,226,0.2)" : "#ffffff10",
                                }}
                            >
                                {active ? (
                                    <VolumeX size={20} style={{ color: "var(--cyan)" }} />
                                ) : (
                                    <Volume2 size={20} style={{ color: "#fff" }} />
                                )}
                            </span>
                            <div>
                                <div
                                    className="font-display tracking-[0.18em] text-sm"
                                    style={{ color: active ? "var(--cyan)" : "#fff" }}
                                >
                                    {t.title}
                                </div>
                                <div className="font-body text-xs mt-0.5" style={{ color: "var(--slate)" }}>
                                    {t.body}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
