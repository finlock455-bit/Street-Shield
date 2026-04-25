import { useState } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Splash from "@/pages/Splash";
import Home from "@/pages/Home";
import VoiceAI from "@/pages/VoiceAI";
import QuickAlert from "@/pages/QuickAlert";
import Radar from "@/pages/Radar";
import AIAudio from "@/pages/AIAudio";
import Activity from "@/pages/Activity";
import CyclingMode from "@/pages/CyclingMode";
import VoiceInfo from "@/pages/VoiceInfo";
import SharePublic from "@/pages/SharePublic";
import { Toaster } from "sonner";

function App() {
    const [splashed, setSplashed] = useState(() => {
        try {
            return sessionStorage.getItem("ss_splashed") === "1";
        } catch {
            return false;
        }
    });

    const onSplashDone = () => {
        sessionStorage.setItem("ss_splashed", "1");
        setSplashed(true);
    };

    return (
        <div className="App">
            <BrowserRouter>
                <Routes>
                    <Route
                        path="/"
                        element={
                            splashed ? (
                                <Home />
                            ) : (
                                <Splash onDone={onSplashDone} />
                            )
                        }
                    />
                    <Route path="/voice-ai" element={<VoiceAI />} />
                    <Route path="/quick-alert" element={<QuickAlert />} />
                    <Route path="/radar" element={<Radar />} />
                    <Route path="/ai-audio" element={<AIAudio />} />
                    <Route path="/activity" element={<Activity />} />
                    <Route path="/cycling" element={<CyclingMode />} />
                    <Route path="/voice-info" element={<VoiceInfo />} />
                    <Route path="/share/:token" element={<SharePublic />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
            <Toaster
                position="top-center"
                theme="dark"
                toastOptions={{
                    style: {
                        background: "#0a1119",
                        border: "1px solid rgba(37,232,226,0.4)",
                        color: "#ffffff",
                        fontFamily: "Rajdhani, sans-serif",
                    },
                }}
            />
        </div>
    );
}

export default App;
