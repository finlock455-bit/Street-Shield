import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Volume2,
    AlertTriangle,
    Crosshair,
    Headphones,
    Heart,
    Bike,
    Info,
    Play,
    Power,
} from "lucide-react";
import ShieldLogo from "@/components/ShieldLogo";
import LanguagePill from "@/components/LanguagePill";
import Tile from "@/components/Tile";
import { ShieldAPI } from "@/lib/api";
import { toast } from "sonner";

export default function Home() {
    const navigate = useNavigate();
    const [state, setState] = useState({
        active: false,
        voice_ai: true,
        radar: true,
        cycling: false,
        quick_alert: false,
        ai_audio: false,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        ShieldAPI.getState()
            .then((s) => setState((prev) => ({ ...prev, ...s })))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const toggleShield = async () => {
        const next = !state.active;
        const newState = { ...state, active: next };
        setState(newState);
        try {
            await ShieldAPI.setState(newState);
            toast(next ? "SHIELD ACTIVATED" : "SHIELD DEACTIVATED", {
                description: next
                    ? "Neural safety network online."
                    : "Going offline.",
            });
        } catch {
            toast.error("Could not save state");
        }
    };

    return (
        <div className="relative min-h-screen pb-12">
            {/* Header */}
            <header className="relative z-10 px-5 pt-6 pb-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div
                            className="p-2 rounded-md border-glow-cyan-soft"
                            style={{
                                background: "rgba(37,232,226,0.06)",
                            }}
                        >
                            <ShieldLogo size={36} />
                        </div>
                        <div>
                            <h1
                                className="font-display font-bold glow-cyan leading-none tracking-[0.06em]"
                                style={{
                                    color: "var(--cyan)",
                                    fontSize: "clamp(26px, 7vw, 36px)",
                                }}
                                data-testid="home-title"
                            >
                                STREET SHIELD
                            </h1>
                            <p
                                className="mt-1 font-display tracking-[0.34em] glow-pink"
                                style={{
                                    color: "var(--pink)",
                                    fontSize: "10px",
                                }}
                            >
                                NEURAL SAFETY NETWORK
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-4 flex justify-center">
                    <LanguagePill />
                </div>

                <div
                    className="mt-5 h-px w-full"
                    style={{
                        background:
                            "linear-gradient(90deg, transparent, rgba(37,232,226,0.45), transparent)",
                    }}
                />
            </header>

            {/* Activate Shield big button */}
            <section className="px-5 mt-2 fade-up">
                <button
                    type="button"
                    onClick={toggleShield}
                    data-testid="activate-shield-button"
                    className={`w-full neon-card rounded-xl px-5 py-6 flex items-center justify-center gap-4 transition-all ${state.active ? "border-glow-cyan" : "border-glow-cyan-soft"}`}
                    style={{
                        background: state.active
                            ? "linear-gradient(180deg, rgba(37,232,226,0.16), rgba(13,22,32,0.9))"
                            : undefined,
                    }}
                >
                    <span
                        className="flex items-center justify-center rounded-full"
                        style={{
                            width: 52,
                            height: 52,
                            background: "#ffffff",
                            boxShadow: state.active
                                ? "0 0 18px rgba(37,232,226,0.65)"
                                : "0 0 10px rgba(37,232,226,0.3)",
                        }}
                    >
                        {state.active ? (
                            <Power
                                size={22}
                                strokeWidth={2.6}
                                style={{ color: "var(--cyan-dim)" }}
                            />
                        ) : (
                            <Play
                                size={22}
                                strokeWidth={2.6}
                                fill="var(--cyan-dim)"
                                style={{
                                    color: "var(--cyan-dim)",
                                    marginLeft: 3,
                                }}
                            />
                        )}
                    </span>
                    <span
                        className="font-display font-bold tracking-[0.28em] glow-cyan"
                        style={{
                            color: "var(--cyan)",
                            fontSize: "clamp(18px, 5vw, 24px)",
                        }}
                    >
                        {state.active ? "DEACTIVATE SHIELD" : "ACTIVATE SHIELD"}
                    </span>
                </button>
            </section>

            {/* Tiles grid */}
            <section className="px-5 mt-6 grid grid-cols-2 gap-4 fade-up" style={{ animationDelay: "120ms" }}>
                <Tile
                    icon={Volume2}
                    iconColor="#3ee9c5"
                    iconBg="rgba(62, 233, 197, 0.12)"
                    title="VOICE AI"
                    sub={state.voice_ai ? "ACTIVE" : "SETUP"}
                    variant={state.voice_ai ? "active" : "setup"}
                    to="/voice-ai"
                    testId="tile-voice-ai"
                />
                <Tile
                    icon={AlertTriangle}
                    iconColor="var(--pink)"
                    iconBg="rgba(255, 46, 109, 0.12)"
                    title="QUICK ALERT"
                    sub={state.quick_alert ? "READY" : "SETUP"}
                    variant={state.quick_alert ? "active" : "setup"}
                    to="/quick-alert"
                    testId="tile-quick-alert"
                />
                <Tile
                    icon={Crosshair}
                    iconColor="var(--cyan)"
                    iconBg="rgba(37,232,226,0.12)"
                    title="RADAR"
                    sub={state.radar ? "ACTIVE" : "SETUP"}
                    variant={state.radar ? "active" : "setup"}
                    to="/radar"
                    testId="tile-radar"
                />
                <Tile
                    icon={Headphones}
                    iconColor="#d946ef"
                    iconBg="rgba(217, 70, 239, 0.14)"
                    title="AI AUDIO"
                    sub={state.ai_audio ? "PLAYING" : "SETUP"}
                    variant={state.ai_audio ? "active" : "setup"}
                    to="/ai-audio"
                    testId="tile-ai-audio"
                />
                <Tile
                    icon={Heart}
                    iconColor="#94a3b8"
                    iconBg="rgba(148, 163, 184, 0.10)"
                    title="ACTIVITY"
                    sub="INSIGHTS"
                    variant="setup"
                    to="/activity"
                    testId="tile-activity"
                />
                <Tile
                    icon={Bike}
                    iconColor="var(--cyan)"
                    iconBg="rgba(37,232,226,0.12)"
                    title="CYCLING MODE"
                    sub={state.cycling ? "ACTIVE" : "TAP FOR BIKES"}
                    variant="highlight"
                    to="/cycling"
                    testId="tile-cycling"
                />
                <Tile
                    icon={Info}
                    iconColor="#ffffff"
                    iconBg="#ffffff10"
                    title="VOICE INFO"
                    sub="TAP TO START"
                    variant="tap"
                    to="/voice-info"
                    testId="tile-voice-info"
                />
            </section>

            {!loading && (
                <p
                    className="mt-8 text-center font-display tracking-[0.32em] text-[10px]"
                    style={{ color: "var(--slate)" }}
                >
                    SYSTEM ONLINE — NEURAL UPLINK STABLE
                </p>
            )}
        </div>
    );
}
