import React from "react";
import { useNavigate } from "react-router-dom";

/**
 * Cyberpunk dashboard tile.
 * Variants:
 *   "active"  - cyan border + cyan label (e.g. Voice AI ACTIVE)
 *   "setup"   - dim border, white label
 *   "tap"     - cyan border, white label, "TAP TO START" sub
 *   "highlight" - tinted bg + cyan border (e.g. Cycling Mode)
 */
export default function Tile({
    icon: Icon,
    iconColor = "var(--cyan)",
    iconBg = "rgba(37,232,226,0.10)",
    title,
    sub,
    variant = "setup",
    to,
    onClick,
    testId,
}) {
    const navigate = useNavigate();
    const handle = () => {
        if (onClick) onClick();
        else if (to) navigate(to);
    };

    const isActive = variant === "active";
    const isHighlight = variant === "highlight";
    const isTap = variant === "tap";

    const borderClass =
        isActive || isTap
            ? "border-glow-cyan-soft"
            : isHighlight
              ? "border-glow-cyan"
              : "border-glow-dim";

    const titleColor = isActive
        ? "var(--cyan)"
        : isHighlight
          ? "var(--white)"
          : "var(--white)";

    const cardClass = isHighlight ? "neon-card neon-card-active" : "neon-card";

    return (
        <button
            type="button"
            onClick={handle}
            data-testid={testId}
            className={`${cardClass} ${borderClass} relative w-full aspect-[1.55/1] flex flex-col items-center justify-center gap-3 p-4 overflow-hidden group`}
            style={{
                fontFamily: "Orbitron, sans-serif",
            }}
        >
            <div
                className="flex items-center justify-center rounded-lg transition-transform group-hover:scale-110"
                style={{
                    width: 56,
                    height: 56,
                    background: iconBg,
                }}
            >
                <Icon size={28} strokeWidth={2.2} style={{ color: iconColor }} />
            </div>
            <div className="flex flex-col items-center gap-0.5">
                <div
                    className="font-display font-bold tracking-[0.16em] text-[15px] leading-tight"
                    style={{ color: titleColor }}
                >
                    {title}
                </div>
                <div
                    className="font-display tracking-[0.22em] text-[10px] uppercase"
                    style={{ color: "var(--slate)" }}
                >
                    {sub}
                </div>
            </div>
            {(isActive || isHighlight) && (
                <span
                    className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full animate-neon-pulse"
                    style={{
                        background: "var(--cyan)",
                        boxShadow: "0 0 8px var(--cyan)",
                    }}
                />
            )}
        </button>
    );
}
