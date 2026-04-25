import React, { useEffect, useRef, useState } from "react";
import {
    X,
    MessageSquare,
    Mail,
    Copy,
    Check,
    Square,
    MapPin,
    Radio,
    Phone,
} from "lucide-react";
import { ShieldAPI } from "@/lib/api";
import { toast } from "sonner";

/**
 * Share modal that opens after SOS:
 *  - Creates a share session (token) and starts pinging location every 15s
 *  - Provides SMS / Mailto / WhatsApp / Copy share buttons
 *  - "Stop sharing" ends the session
 */
export default function ShareModal({
    open,
    onClose,
    senderName,
    contacts,
    initialLocation,
}) {
    const [session, setSession] = useState(null);
    const [shareUrl, setShareUrl] = useState("");
    const [copied, setCopied] = useState(false);
    const [pings, setPings] = useState(0);
    const pingTimer = useRef(null);
    const watchId = useRef(null);

    // Start session when modal opens
    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        (async () => {
            try {
                const sess = await ShieldAPI.startShare({
                    sender_name: senderName || "Anonymous",
                    location: initialLocation || null,
                });
                if (cancelled) return;
                setSession(sess);
                const url = `${window.location.origin}/share/${sess.token}`;
                setShareUrl(url);
                toast.success("LIVE SHARE LINK READY");
            } catch (err) {
                toast.error("Could not start share session");
                console.error(err);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [open, senderName, initialLocation]);

    // Live location watch + periodic ping
    useEffect(() => {
        if (!open || !session?.token) return;
        if (!navigator.geolocation) return;

        let lastSent = 0;
        watchId.current = navigator.geolocation.watchPosition(
            (pos) => {
                const loc = {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                };
                // Throttle to ~15s
                const now = Date.now();
                if (now - lastSent >= 14_000) {
                    lastSent = now;
                    ShieldAPI.pingShare(session.token, { location: loc })
                        .then(() => setPings((p) => p + 1))
                        .catch(() => {});
                }
            },
            () => {},
            { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
        );

        return () => {
            if (watchId.current != null) {
                navigator.geolocation.clearWatch(watchId.current);
                watchId.current = null;
            }
            if (pingTimer.current) clearInterval(pingTimer.current);
        };
    }, [open, session]);

    const stopSharing = async () => {
        if (!session?.token) {
            onClose();
            return;
        }
        try {
            await ShieldAPI.stopShare(session.token);
            toast("LIVE SHARE STOPPED");
        } catch {
            // ignore
        }
        if (watchId.current != null) {
            navigator.geolocation.clearWatch(watchId.current);
        }
        onClose();
    };

    const buildBody = () =>
        `🚨 SOS from ${senderName || "Anonymous"}. Live location: ${shareUrl}. Sent via Street Shield.`;

    const sendSMS = (phone) => {
        const body = encodeURIComponent(buildBody());
        const sep = /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent)
            ? "?"
            : "?";
        window.location.href = `sms:${phone}${sep}body=${body}`;
    };

    const sendMail = () => {
        const body = encodeURIComponent(buildBody());
        const subj = encodeURIComponent("🚨 SOS — Street Shield");
        const to = contacts.map((c) => c.phone).join(",");
        window.location.href = `mailto:?subject=${subj}&body=${body}`;
    };

    const sendWhatsApp = () => {
        const text = encodeURIComponent(buildBody());
        window.open(`https://wa.me/?text=${text}`, "_blank", "noopener");
    };

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            toast("LINK COPIED");
            setTimeout(() => setCopied(false), 1500);
        } catch {
            toast.error("Could not copy");
        }
    };

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-3 sm:p-6"
            style={{ background: "rgba(2, 5, 10, 0.86)" }}
            data-testid="share-modal"
        >
            <div
                className="w-full max-w-md neon-card border-glow-cyan rounded-xl p-5 max-h-[92vh] overflow-y-auto fade-up relative"
                style={{
                    boxShadow:
                        "0 0 24px rgba(255,46,109,0.25), 0 0 36px rgba(37,232,226,0.18)",
                }}
            >
                <button
                    type="button"
                    onClick={stopSharing}
                    data-testid="share-modal-close"
                    className="absolute top-3 right-3 p-2 rounded-md hover:bg-white/5"
                    style={{ color: "var(--cyan)" }}
                >
                    <X size={20} />
                </button>

                <div className="flex items-center gap-2 mb-3">
                    <span
                        className="w-2 h-2 rounded-full animate-neon-pulse"
                        style={{
                            background: "var(--pink)",
                            boxShadow: "0 0 8px var(--pink)",
                        }}
                    />
                    <h2
                        className="font-display tracking-[0.22em] text-sm glow-pink"
                        style={{ color: "var(--pink)" }}
                    >
                        FIND MY SHIELD — LIVE
                    </h2>
                </div>

                <p className="font-body text-sm mb-4" style={{ color: "#cfd8e3" }}>
                    Send this link to your contacts. They can open it to see your
                    live location until you stop sharing.
                </p>

                {/* Share URL */}
                <div
                    className="rounded-md border-glow-cyan-soft p-3 flex items-center gap-2 mb-2"
                    style={{ background: "rgba(10,17,25,0.7)" }}
                >
                    <Radio size={16} style={{ color: "var(--cyan)" }} />
                    <span
                        className="flex-1 truncate font-mono text-xs"
                        style={{ color: "#cfd8e3" }}
                        data-testid="share-url"
                    >
                        {shareUrl || "Generating link…"}
                    </span>
                    <button
                        type="button"
                        onClick={copyLink}
                        disabled={!shareUrl}
                        data-testid="share-copy-button"
                        className="cyber-btn !py-1.5 !px-3 !text-xs flex items-center gap-1"
                    >
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                        {copied ? "COPIED" : "COPY"}
                    </button>
                </div>

                {/* Quick share buttons */}
                <div className="grid grid-cols-2 gap-2 mt-3">
                    <button
                        type="button"
                        onClick={sendMail}
                        data-testid="share-mail-button"
                        className="cyber-btn !py-3 flex items-center justify-center gap-2"
                    >
                        <Mail size={14} /> EMAIL
                    </button>
                    <button
                        type="button"
                        onClick={sendWhatsApp}
                        data-testid="share-whatsapp-button"
                        className="cyber-btn !py-3 flex items-center justify-center gap-2"
                    >
                        <MessageSquare size={14} /> WHATSAPP
                    </button>
                </div>

                {/* Per-contact SMS */}
                <div className="mt-4">
                    <h3
                        className="font-display tracking-[0.22em] text-xs mb-2"
                        style={{ color: "var(--cyan)" }}
                    >
                        TEXT EACH CONTACT
                    </h3>
                    {contacts.length === 0 ? (
                        <p
                            className="font-body text-xs"
                            style={{ color: "var(--slate)" }}
                        >
                            No contacts saved.
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {contacts.map((c) => (
                                <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => sendSMS(c.phone)}
                                    data-testid={`share-sms-${c.id}`}
                                    className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md border-glow-dim hover:border-glow-cyan-soft transition-all"
                                    style={{ background: "rgba(10,17,25,0.6)" }}
                                >
                                    <div className="flex items-center gap-3">
                                        <Phone
                                            size={14}
                                            style={{ color: "var(--cyan)" }}
                                        />
                                        <div className="text-left">
                                            <div
                                                className="font-body text-sm"
                                                style={{ color: "#fff" }}
                                            >
                                                {c.name}
                                            </div>
                                            <div
                                                className="font-mono text-[10px]"
                                                style={{ color: "var(--slate)" }}
                                            >
                                                {c.phone}
                                            </div>
                                        </div>
                                    </div>
                                    <span
                                        className="font-display tracking-[0.18em] text-[10px]"
                                        style={{ color: "var(--pink)" }}
                                    >
                                        SMS →
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Live status */}
                <div
                    className="mt-4 rounded-md p-3 flex items-center gap-2"
                    style={{
                        background: "rgba(255,46,109,0.06)",
                        border: "1px solid rgba(255,46,109,0.35)",
                    }}
                >
                    <MapPin size={14} style={{ color: "var(--pink)" }} />
                    <div className="flex-1">
                        <div
                            className="font-display tracking-[0.18em] text-[10px]"
                            style={{ color: "var(--pink)" }}
                        >
                            BROADCASTING
                        </div>
                        <div
                            className="font-mono text-xs"
                            style={{ color: "#cfd8e3" }}
                        >
                            {pings} location pings sent
                        </div>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={stopSharing}
                    data-testid="share-stop-button"
                    className="cyber-btn cyber-btn-pink w-full mt-4 flex items-center justify-center gap-2"
                >
                    <Square size={14} /> STOP SHARING
                </button>
            </div>
        </div>
    );
}
