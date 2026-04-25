import React, { useEffect } from "react";
import ShieldLogo from "@/components/ShieldLogo";

export default function Splash({ onDone }) {
    useEffect(() => {
        const t = setTimeout(() => onDone && onDone(), 2400);
        return () => clearTimeout(t);
    }, [onDone]);

    return (
        <div
            className="relative min-h-screen w-full flex flex-col items-center justify-center px-6 cursor-pointer overflow-hidden"
            onClick={() => onDone && onDone()}
            data-testid="splash-screen"
        >
            <div className="absolute inset-0 pointer-events-none">
                <div className="scan-line" />
            </div>

            <div className="relative z-10 flex flex-col items-center gap-6 fade-up">
                <div className="animate-neon-pulse">
                    <ShieldLogo size={84} />
                </div>

                <div className="text-center">
                    <h1
                        className="font-display font-bold glow-cyan leading-[0.95] flicker"
                        style={{
                            color: "var(--cyan)",
                            fontSize: "clamp(48px, 14vw, 96px)",
                            letterSpacing: "0.06em",
                        }}
                        data-testid="splash-title"
                    >
                        STREET
                        <br />
                        SHIELD
                    </h1>

                    <div
                        className="mt-4 pt-3 pb-1 border-t"
                        style={{ borderColor: "rgba(37,232,226,0.4)" }}
                    >
                        <p
                            className="font-display tracking-[0.4em] glow-pink"
                            style={{
                                color: "var(--pink)",
                                fontSize: "clamp(11px, 3vw, 14px)",
                            }}
                        >
                            NEURAL SAFETY NETWORK
                        </p>
                    </div>
                </div>

                <p
                    className="text-center font-body text-base sm:text-lg max-w-[320px] mt-4"
                    style={{ color: "#cfd8e3" }}
                >
                    Your <span style={{ color: "var(--cyan)" }} className="font-semibold">AI-Powered</span> Guardian
                    <br />
                    for Every Step
                </p>
            </div>

            <div
                className="absolute bottom-10 left-0 right-0 text-center font-display tracking-[0.4em] text-[10px]"
                style={{ color: "var(--slate)" }}
            >
                TAP TO ENTER
            </div>
        </div>
    );
}
