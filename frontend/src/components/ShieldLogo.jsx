import React from "react";

/** Cyber shield logo - cyan outlined shield with check inside */
export default function ShieldLogo({ size = 48, className = "" }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 64 72"
            fill="none"
            className={className}
            data-testid="shield-logo"
            style={{
                filter: "drop-shadow(0 0 8px rgba(37,232,226,0.55))",
            }}
        >
            <path
                d="M32 4 L58 14 V34 C58 50 46 62 32 68 C18 62 6 50 6 34 V14 Z"
                stroke="#25E8E2"
                strokeWidth="2.4"
                fill="rgba(37,232,226,0.04)"
            />
            <path
                d="M20 34 L29 43 L46 26"
                stroke="#25E8E2"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />
        </svg>
    );
}
