import React, { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import {
    AlertTriangle,
    Plus,
    Trash2,
    Phone,
    MapPin,
    Send,
    User,
} from "lucide-react";
import { ShieldAPI } from "@/lib/api";
import { toast } from "sonner";
import ShareModal from "@/components/ShareModal";

export default function QuickAlert() {
    const [contacts, setContacts] = useState([]);
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [history, setHistory] = useState([]);
    const [pressing, setPressing] = useState(false);

    const [senderName, setSenderName] = useState(
        () => localStorage.getItem("ss_sender_name") || "",
    );
    const [shareOpen, setShareOpen] = useState(false);
    const [initialLoc, setInitialLoc] = useState(null);

    const refresh = async () => {
        try {
            const [c, a] = await Promise.all([
                ShieldAPI.listContacts(),
                ShieldAPI.listAlerts(),
            ]);
            setContacts(c);
            setHistory(a);
        } catch {
            // ignore
        }
    };

    useEffect(() => {
        refresh();
    }, []);

    const saveSenderName = (v) => {
        setSenderName(v);
        localStorage.setItem("ss_sender_name", v);
    };

    const addContact = async (e) => {
        e.preventDefault();
        if (!name.trim() || !phone.trim()) {
            toast.error("Name and phone required");
            return;
        }
        try {
            await ShieldAPI.addContact({
                name: name.trim(),
                phone: phone.trim(),
            });
            setName("");
            setPhone("");
            toast.success("CONTACT ADDED");
            refresh();
        } catch {
            toast.error("Could not add contact");
        }
    };

    const removeContact = async (id) => {
        try {
            await ShieldAPI.deleteContact(id);
            toast("Contact removed");
            refresh();
        } catch {
            toast.error("Could not remove contact");
        }
    };

    const sendSOS = async () => {
        if (!senderName.trim()) {
            toast.error("Enter your name first");
            return;
        }
        if (contacts.length === 0) {
            toast.error("Add at least one contact first");
            return;
        }
        setPressing(true);
        try {
            const loc = await new Promise((resolve) => {
                if (!navigator.geolocation) return resolve(null);
                navigator.geolocation.getCurrentPosition(
                    (pos) =>
                        resolve({
                            lat: pos.coords.latitude,
                            lng: pos.coords.longitude,
                        }),
                    () => resolve(null),
                    { timeout: 5000, enableHighAccuracy: true },
                );
            });
            setInitialLoc(loc);
            await ShieldAPI.sendAlert({
                type: "SOS",
                message: `SOS triggered by ${senderName.trim()}`,
                location: loc,
            });
            setShareOpen(true);
            refresh();
        } catch {
            toast.error("Could not send SOS");
        } finally {
            setTimeout(() => setPressing(false), 800);
        }
    };

    return (
        <div className="min-h-screen pb-12">
            <PageHeader title="QUICK ALERT" subtitle="EMERGENCY DISPATCH" />

            <div className="px-5 mt-4 space-y-5">
                {/* Sender identity */}
                <div className="neon-card border-glow-cyan-soft rounded-xl p-4 fade-up">
                    <div className="flex items-center gap-3">
                        <span
                            className="flex items-center justify-center rounded-md"
                            style={{
                                width: 40,
                                height: 40,
                                background: "rgba(37,232,226,0.10)",
                            }}
                        >
                            <User size={18} style={{ color: "var(--cyan)" }} />
                        </span>
                        <div className="flex-1">
                            <label
                                className="block font-display tracking-[0.22em] text-[10px] mb-1"
                                style={{ color: "var(--slate)" }}
                            >
                                YOUR NAME (for SOS message)
                            </label>
                            <input
                                value={senderName}
                                onChange={(e) => saveSenderName(e.target.value)}
                                placeholder="e.g. Alex"
                                className="cyber-input"
                                data-testid="sender-name-input"
                            />
                        </div>
                    </div>
                </div>

                {/* SOS panic button */}
                <div
                    className="neon-card rounded-xl p-6 flex flex-col items-center gap-4 fade-up"
                    style={{
                        border: "1px solid rgba(255,46,109,0.5)",
                        boxShadow: "0 0 18px rgba(255,46,109,0.2)",
                    }}
                >
                    <button
                        type="button"
                        onClick={sendSOS}
                        data-testid="sos-button"
                        className={`relative flex items-center justify-center rounded-full transition-transform active:scale-95 ${pressing ? "scale-95" : ""}`}
                        style={{
                            width: 160,
                            height: 160,
                            background:
                                "radial-gradient(circle, rgba(255,46,109,0.35), rgba(255,46,109,0.05))",
                            border: "2px solid var(--pink)",
                            boxShadow: "0 0 32px rgba(255,46,109,0.55)",
                        }}
                    >
                        <AlertTriangle
                            size={70}
                            strokeWidth={2}
                            style={{ color: "var(--pink)" }}
                        />
                        <span
                            className="absolute inset-0 rounded-full ping-ring"
                            style={{ border: "2px solid var(--pink)" }}
                        />
                    </button>
                    <p
                        className="font-display tracking-[0.32em] text-xs glow-pink"
                        style={{ color: "var(--pink)" }}
                    >
                        TAP TO BROADCAST SOS
                    </p>
                    <p
                        className="font-body text-xs text-center max-w-xs"
                        style={{ color: "var(--slate)" }}
                    >
                        Generates a live-location share link your contacts can open.
                        Send via SMS, email, or WhatsApp.
                    </p>
                </div>

                {/* Contacts */}
                <div
                    className="neon-card border-glow-cyan-soft rounded-xl p-5 fade-up"
                    style={{ animationDelay: "80ms" }}
                >
                    <h3
                        className="font-display tracking-[0.22em] text-sm mb-4"
                        style={{ color: "var(--cyan)" }}
                    >
                        EMERGENCY CONTACTS
                    </h3>
                    <form
                        onSubmit={addContact}
                        className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2"
                    >
                        <input
                            className="cyber-input"
                            placeholder="Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            data-testid="contact-name-input"
                        />
                        <input
                            className="cyber-input"
                            placeholder="Phone"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            data-testid="contact-phone-input"
                        />
                        <button
                            type="submit"
                            className="cyber-btn flex items-center gap-2 justify-center"
                            data-testid="contact-add-button"
                        >
                            <Plus size={16} /> ADD
                        </button>
                    </form>

                    <div className="mt-4 space-y-2">
                        {contacts.length === 0 && (
                            <p
                                className="font-body text-sm"
                                style={{ color: "var(--slate)" }}
                            >
                                No contacts yet. Add at least one.
                            </p>
                        )}
                        {contacts.map((c) => (
                            <div
                                key={c.id}
                                className="flex items-center justify-between px-3 py-2 rounded-md border-glow-dim"
                                style={{ background: "rgba(10,17,25,0.6)" }}
                                data-testid={`contact-row-${c.id}`}
                            >
                                <div className="flex items-center gap-3">
                                    <Phone
                                        size={14}
                                        style={{ color: "var(--cyan)" }}
                                    />
                                    <div>
                                        <div
                                            className="font-body text-base"
                                            style={{ color: "#fff" }}
                                        >
                                            {c.name}
                                        </div>
                                        <div
                                            className="font-mono text-xs"
                                            style={{ color: "var(--slate)" }}
                                        >
                                            {c.phone}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeContact(c.id)}
                                    data-testid={`contact-delete-${c.id}`}
                                    className="p-2 rounded hover:bg-pink-900/20"
                                    style={{ color: "var(--pink)" }}
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Alert history */}
                <div
                    className="neon-card border-glow-dim rounded-xl p-5 fade-up"
                    style={{ animationDelay: "160ms" }}
                >
                    <h3
                        className="font-display tracking-[0.22em] text-sm mb-3"
                        style={{ color: "var(--cyan)" }}
                    >
                        ALERT LOG
                    </h3>
                    {history.length === 0 ? (
                        <p
                            className="font-body text-sm"
                            style={{ color: "var(--slate)" }}
                        >
                            No alerts dispatched yet.
                        </p>
                    ) : (
                        <ul className="space-y-2">
                            {history.map((a) => (
                                <li
                                    key={a.id}
                                    className="flex items-start gap-3 px-3 py-2 rounded-md border-glow-dim"
                                    style={{ background: "rgba(10,17,25,0.6)" }}
                                >
                                    <Send
                                        size={14}
                                        style={{ color: "var(--pink)" }}
                                    />
                                    <div className="flex-1">
                                        <div
                                            className="font-display tracking-[0.18em] text-xs"
                                            style={{ color: "var(--pink)" }}
                                        >
                                            {a.type}
                                        </div>
                                        <div
                                            className="font-body text-sm"
                                            style={{ color: "#cfd8e3" }}
                                        >
                                            {a.message}
                                        </div>
                                        <div
                                            className="font-mono text-[10px]"
                                            style={{ color: "var(--slate)" }}
                                        >
                                            {new Date(a.created_at).toLocaleString()}
                                            {a.location && (
                                                <span className="inline-flex items-center gap-1 ml-2">
                                                    <MapPin size={10} />
                                                    {a.location.lat.toFixed(3)}
                                                    , {a.location.lng.toFixed(3)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            <ShareModal
                open={shareOpen}
                onClose={() => setShareOpen(false)}
                senderName={senderName}
                contacts={contacts}
                initialLocation={initialLoc}
            />
        </div>
    );
}
