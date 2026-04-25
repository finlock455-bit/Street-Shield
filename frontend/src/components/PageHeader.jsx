import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import ShieldLogo from "@/components/ShieldLogo";

/**
 * Reusable header for sub-pages with back button + page title.
 */
export default function PageHeader({ title, subtitle }) {
    const navigate = useNavigate();
    return (
        <div className="relative z-10 px-5 pt-6 pb-4">
            <div className="flex items-center justify-between">
                <button
                    type="button"
                    onClick={() => navigate("/")}
                    data-testid="back-button"
                    className="flex items-center gap-2 px-3 py-2 rounded-md neon-card border-glow-cyan-soft hover:border-glow-cyan transition-all"
                    style={{ color: "var(--cyan)" }}
                >
                    <ArrowLeft size={16} />
                    <span className="font-display tracking-[0.2em] text-xs">BACK</span>
                </button>
                <ShieldLogo size={32} />
            </div>
            <div className="mt-6">
                <h1
                    className="font-display font-bold glow-cyan tracking-[0.18em] text-[28px] leading-tight"
                    style={{ color: "var(--cyan)" }}
                >
                    {title}
                </h1>
                {subtitle && (
                    <p
                        className="font-display tracking-[0.32em] text-[10px] mt-1 uppercase"
                        style={{ color: "var(--pink)" }}
                    >
                        {subtitle}
                    </p>
                )}
            </div>
        </div>
    );
}
