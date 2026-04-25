import React, { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { Bike, Gauge, Battery, Route } from "lucide-react";
import { ShieldAPI } from "@/lib/api";
import { toast } from "sonner";

export default function CyclingMode() {
    const [active, setActive] = useState(false);

    useEffect(() => {
        ShieldAPI.getState()
            .then((s) => setActive(Boolean(s.cycling)))
            .catch(() => {});
    }, []);

    const toggle = async () => {
        const next = !active;
        setActive(next);
        try {
            await ShieldAPI.setState({ cycling: next });
            toast(next ? "CYCLING MODE ACTIVE" : "CYCLING MODE OFF");
        } catch {
            toast.error("Could not save state");
        }
    };

    return (
        <div className="min-h-screen pb-12">
            <PageHeader title="CYCLING MODE" subtitle="BIKE GUARDIAN" />

            <div className="px-5 mt-4 fade-up">
                <div className="neon-card border-glow-cyan rounded-xl p-6 flex flex-col items-center gap-5 relative overflow-hidden">
                    <div
                        className="flex items-center justify-center rounded-full"
                        style={{
                            width: 130,
                            height: 130,
                            background: active
                                ? "radial-gradient(circle, rgba(37,232,226,0.32), rgba(37,232,226,0.04))"
                                : "rgba(20,30,40,0.6)",
                            border: `2px solid ${active ? "var(--cyan)" : "var(--slate-2)"}`,
                            boxShadow: active ? "0 0 32px rgba(37,232,226,0.45)" : "none",
                        }}
                    >
                        <Bike size={64} strokeWidth={2} style={{ color: active ? "var(--cyan)" : "var(--slate)" }} />
                    </div>

                    <button type="button" onClick={toggle} data-testid="cycling-toggle" className="cyber-btn">
                        {active ? "STOP RIDE" : "START RIDE"}
                    </button>

                    <div className="w-full grid grid-cols-3 gap-2">
                        <div className="border-glow-dim rounded-md p-3 text-center" style={{ background: "rgba(10,17,25,0.6)" }}>
                            <Gauge size={18} style={{ color: "var(--cyan)" }} className="mx-auto" />
                            <div className="font-display tracking-[0.18em] text-[10px] mt-1" style={{ color: "var(--slate)" }}>
                                SPEED
                            </div>
                            <div className="font-display font-bold text-lg" style={{ color: "var(--cyan)" }}>
                                {active ? "18.2" : "0.0"}
                            </div>
                            <div className="font-mono text-[10px]" style={{ color: "var(--slate)" }}>
                                km/h
                            </div>
                        </div>
                        <div className="border-glow-dim rounded-md p-3 text-center" style={{ background: "rgba(10,17,25,0.6)" }}>
                            <Route size={18} style={{ color: "var(--pink)" }} className="mx-auto" />
                            <div className="font-display tracking-[0.18em] text-[10px] mt-1" style={{ color: "var(--slate)" }}>
                                DISTANCE
                            </div>
                            <div className="font-display font-bold text-lg" style={{ color: "var(--pink)" }}>
                                {active ? "3.4" : "0.0"}
                            </div>
                            <div className="font-mono text-[10px]" style={{ color: "var(--slate)" }}>
                                km
                            </div>
                        </div>
                        <div className="border-glow-dim rounded-md p-3 text-center" style={{ background: "rgba(10,17,25,0.6)" }}>
                            <Battery size={18} style={{ color: "#3ee9c5" }} className="mx-auto" />
                            <div className="font-display tracking-[0.18em] text-[10px] mt-1" style={{ color: "var(--slate)" }}>
                                SHIELD
                            </div>
                            <div className="font-display font-bold text-lg" style={{ color: "#3ee9c5" }}>
                                92%
                            </div>
                            <div className="font-mono text-[10px]" style={{ color: "var(--slate)" }}>
                                BATTERY
                            </div>
                        </div>
                    </div>

                    <p className="font-body text-sm text-center max-w-xs" style={{ color: "#cfd8e3" }}>
                        Cycling-aware sensors track speed, fall events, and bike-lane safety in real time.
                    </p>
                </div>
            </div>
        </div>
    );
}
