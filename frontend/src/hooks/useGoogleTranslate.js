import { useEffect, useState, useCallback } from "react";

/**
 * Hook that interfaces with the Google Translate Element widget loaded in index.html.
 * Provides a programmatic way to translate the page to a target language.
 */
export const LANGUAGES = [
    { code: "en", label: "EN", name: "English" },
    { code: "es", label: "ES", name: "Español" },
    { code: "fr", label: "FR", name: "Français" },
    { code: "de", label: "DE", name: "Deutsch" },
    { code: "it", label: "IT", name: "Italiano" },
    { code: "pt", label: "PT", name: "Português" },
    { code: "ja", label: "JA", name: "日本語" },
    { code: "ko", label: "KO", name: "한국어" },
    { code: "zh-CN", label: "ZH", name: "简体中文" },
    { code: "ar", label: "AR", name: "العربية" },
    { code: "hi", label: "HI", name: "हिन्दी" },
    { code: "ru", label: "RU", name: "Русский" },
];

export function useGoogleTranslate() {
    const [ready, setReady] = useState(Boolean(window.__gtReady));
    const [lang, setLang] = useState(() => {
        return localStorage.getItem("ss_lang") || "en";
    });

    useEffect(() => {
        if (window.__gtReady) {
            setReady(true);
            return;
        }
        const onReady = () => setReady(true);
        window.addEventListener("google-translate-ready", onReady);
        // Polling fallback
        const t = setInterval(() => {
            if (window.__gtReady) {
                setReady(true);
                clearInterval(t);
            }
        }, 300);
        return () => {
            window.removeEventListener("google-translate-ready", onReady);
            clearInterval(t);
        };
    }, []);

    const translate = useCallback((targetLang) => {
        // Find Google's language <select> in the hidden widget and trigger change
        const select = document.querySelector(
            "#google_translate_element select.goog-te-combo",
        );
        if (!select) return false;
        select.value = targetLang;
        select.dispatchEvent(new Event("change", { bubbles: true }));
        setLang(targetLang);
        localStorage.setItem("ss_lang", targetLang);
        return true;
    }, []);

    // Apply persisted language on first ready
    useEffect(() => {
        if (!ready) return;
        const stored = localStorage.getItem("ss_lang");
        if (stored && stored !== "en") {
            // Wait a tick for the select to render
            setTimeout(() => translate(stored), 400);
        }
    }, [ready, translate]);

    return { ready, lang, translate, languages: LANGUAGES };
}
