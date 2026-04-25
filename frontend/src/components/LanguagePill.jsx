import React, { useState } from "react";
import { useGoogleTranslate } from "@/hooks/useGoogleTranslate";
import { Languages, Check } from "lucide-react";

/**
 * Language pill that opens a small popover of available languages.
 * Translates the entire page using Google Translate Element widget.
 */
export default function LanguagePill() {
    const { lang, translate, languages, ready } = useGoogleTranslate();
    const [open, setOpen] = useState(false);

    const current = languages.find((l) => l.code === lang) || languages[0];

    const select = (code) => {
        if (!ready) return;
        translate(code);
        setOpen(false);
    };

    return (
        <div className="relative notranslate" translate="no">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                disabled={!ready}
                data-testid="language-pill-button"
                className="flex items-center gap-2 px-4 py-2 rounded-md border-glow-cyan-soft neon-card font-display text-[13px] tracking-[0.2em] text-cyan-300 hover:border-glow-cyan transition-all disabled:opacity-50"
                style={{ color: "var(--cyan)" }}
            >
                <Languages size={16} strokeWidth={2.2} />
                <span className="font-display font-bold">{current.label}</span>
            </button>

            {open && (
                <div
                    className="absolute right-0 mt-2 w-44 z-50 neon-card border-glow-cyan-soft rounded-md p-1 fade-up notranslate"
                    translate="no"
                    data-testid="language-pill-menu"
                >
                    {languages.map((l) => (
                        <button
                            key={l.code}
                            type="button"
                            onClick={() => select(l.code)}
                            data-testid={`lang-option-${l.code}`}
                            className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded text-left text-sm font-body hover:bg-cyan-900/20 transition-colors"
                            style={{
                                color:
                                    l.code === lang ? "var(--cyan)" : "#cfd8e3",
                            }}
                        >
                            <span className="flex items-center gap-2">
                                <span className="font-display font-bold text-xs w-8">
                                    {l.label}
                                </span>
                                <span>{l.name}</span>
                            </span>
                            {l.code === lang && (
                                <Check size={14} style={{ color: "var(--cyan)" }} />
                            )}
                        </button>
                    ))}
                    {!ready && (
                        <div className="px-3 py-2 text-xs text-slate-500 font-body">
                            Loading translator…
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
