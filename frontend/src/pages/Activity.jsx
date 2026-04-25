import React, { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { Heart, Footprints, Clock, ShieldCheck, MapPin } from "lucide-react";
import { ShieldAPI } from "@/lib/api";

const Stat = ({ icon: Icon, label, value, color = "var(--cyan)" }) => (
    <div
        className="neon-card border-glow-cyan-soft rounded-xl p-4 flex items-center gap-4"
        data-testid={`stat-${label.replace(/\s/g, "-").toLowerCase()}`}
    >
        <span
            className="flex items-center justify-center rounded-md"
            style={{
                width: 44,
                height: 44,
                background: "rgba(37,232,226,0.10)",
            }}
        >
            <Icon size={22} style={{ color }} />
        </span>
        <div>
            <div className="font-display tracking-[0.18em] text-[10px]" style={{ color: "var(--slate)" }}>
                {label.toUpperCase()}
            </div>
            <div className="font-display font-bold text-2xl" style={{ color }}>
                {value}
            </div>
        </div>
    </div>
);

export default function Activity() {
    const [data, setData] = useState({
        steps: 0,
        distance_km: 0,
        active_minutes: 0,
        safe_routes: 0,
        last_scan_location: null,
    });

    useEffect(() => {
        ShieldAPI.getActivity()
            .then((d) => setData(d))
            .catch(() => {
                setData({
                    steps: 6420,
                    distance_km: 4.8,
                    active_minutes: 47,
                    safe_routes: 3,
                    last_scan_location: "Downtown Sector 4",
                });
            });
    }, []);

    return (
        <div className="min-h-screen pb-12">
            <PageHeader title="ACTIVITY" subtitle="GUARDIAN INSIGHTS" />

            <div className="px-5 mt-4 grid grid-cols-2 gap-3 fade-up">
                <Stat icon={Footprints} label="Steps" value={data.steps?.toLocaleString() ?? 0} />
                <Stat icon={MapPin} label="Distance" value={`${data.distance_km ?? 0} km`} color="var(--pink)" />
                <Stat icon={Clock} label="Active" value={`${data.active_minutes ?? 0}m`} />
                <Stat icon={ShieldCheck} label="Safe Routes" value={data.safe_routes ?? 0} color="#3ee9c5" />
            </div>

            <div className="px-5 mt-4 fade-up" style={{ animationDelay: "120ms" }}>
                <div className="neon-card border-glow-dim rounded-xl p-5">
                    <h3 className="font-display tracking-[0.22em] text-sm" style={{ color: "var(--cyan)" }}>
                        WEEKLY HEARTBEAT
                    </h3>
                    <div className="mt-4 flex items-end gap-2 h-32">
                        {[40, 64, 38, 80, 56, 72, 90].map((v, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                <div
                                    className="w-full rounded-t-sm"
                                    style={{
                                        height: `${v}%`,
                                        background: `linear-gradient(180deg, var(--cyan), rgba(37,232,226,0.15))`,
                                        boxShadow: "0 0 8px rgba(37,232,226,0.4)",
                                    }}
                                />
                                <span className="font-mono text-[10px]" style={{ color: "var(--slate)" }}>
                                    {["M", "T", "W", "T", "F", "S", "S"][i]}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {data.last_scan_location && (
                    <div className="mt-4 neon-card border-glow-dim rounded-xl p-4 flex items-center gap-3">
                        <Heart size={20} style={{ color: "var(--pink)" }} />
                        <div>
                            <div className="font-display tracking-[0.18em] text-[10px]" style={{ color: "var(--slate)" }}>
                                LAST SCAN
                            </div>
                            <div className="font-body text-base" style={{ color: "#fff" }}>
                                {data.last_scan_location}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
