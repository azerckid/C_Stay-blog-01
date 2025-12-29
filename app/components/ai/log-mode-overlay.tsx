import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    AiIdeaIcon,
    AiBookIcon,
    AiChat01Icon,
    Mic01Icon,
    Location01Icon,
    Cancel01Icon,
    ArrowRight01Icon,
    AiViewIcon
} from "@hugeicons/core-free-icons";
import { cn } from "~/lib/utils";

interface LogModeOverlayProps {
    isOpen: boolean;
    onClose: () => void;
}

type WritingStyle = "emotional" | "information" | "witty";

export function LogModeOverlay({ isOpen, onClose }: LogModeOverlayProps) {
    const [selectedStyle, setSelectedStyle] = useState<WritingStyle>("emotional");
    const [isRecording, setIsRecording] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);

    // 카메라 프리뷰 시작 (실제 브라우저 환경에서만 동작)
    useEffect(() => {
        if (isOpen) {
            navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: true })
                .then(setStream)
                .catch(err => console.error("Camera access error:", err));
        } else {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
                setStream(null);
            }
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black overflow-hidden flex flex-col animate-in fade-in duration-300">
            {/* Camera Preview Placeholder / Real View */}
            <div className="absolute inset-0 z-0">
                {stream ? (
                    <video
                        autoPlay
                        playsInline
                        muted
                        ref={(video) => { if (video) video.srcObject = stream; }}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                        <HugeiconsIcon icon={AiViewIcon} className="w-16 h-16 text-white/20 animate-pulse" />
                    </div>
                )}
            </div>

            {/* Top Bar: Location & Close */}
            <div className="relative z-10 flex items-center justify-between p-4 pt-12 md:pt-6">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white/90">
                    <HugeiconsIcon icon={Location01Icon} size={16} />
                    <span className="text-sm font-medium">제주 한림 해변</span>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white hover:bg-white/20 transition-colors"
                >
                    <HugeiconsIcon icon={Cancel01Icon} size={24} />
                </button>
            </div>

            {/* Bottom Panel: Controls */}
            <div className="mt-auto relative z-10 p-6 pb-12 md:pb-8 flex flex-col items-center gap-8">
                {/* Style Selector */}
                <div className="w-full max-w-sm grid grid-cols-3 gap-3 p-1.5 rounded-2xl bg-black/60 backdrop-blur-2xl border border-white/10">
                    <button
                        onClick={() => setSelectedStyle("emotional")}
                        className={cn(
                            "flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all duration-300",
                            selectedStyle === "emotional"
                                ? "bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]"
                                : "text-white/60 hover:text-white"
                        )}
                    >
                        <HugeiconsIcon icon={AiIdeaIcon} size={20} />
                        <span className="text-[11px] font-bold">감성적</span>
                    </button>
                    <button
                        onClick={() => setSelectedStyle("information")}
                        className={cn(
                            "flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all duration-300",
                            selectedStyle === "information"
                                ? "bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]"
                                : "text-white/60 hover:text-white"
                        )}
                    >
                        <HugeiconsIcon icon={AiBookIcon} size={20} />
                        <span className="text-[11px] font-bold">정보 전달</span>
                    </button>
                    <button
                        onClick={() => setSelectedStyle("witty")}
                        className={cn(
                            "flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all duration-300",
                            selectedStyle === "witty"
                                ? "bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]"
                                : "text-white/60 hover:text-white"
                        )}
                    >
                        <HugeiconsIcon icon={AiChat01Icon} size={20} />
                        <span className="text-[11px] font-bold">위트/발랄</span>
                    </button>
                </div>

                <div className="text-white/40 text-[11px] font-bold tracking-widest uppercase">
                    Choose your writing style
                </div>

                {/* Recording Button */}
                <div className="relative flex items-center justify-center">
                    {/* Ripple Animations for Recording */}
                    {isRecording && (
                        <>
                            <div className="absolute w-[120px] h-[120px] rounded-full border-2 border-primary animate-ping opacity-40" />
                            <div className="absolute w-[160px] h-[160px] rounded-full border border-primary animate-ping delay-300 opacity-20" />
                        </>
                    )}

                    <button
                        onClick={() => setIsRecording(!isRecording)}
                        className={cn(
                            "relative z-20 w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500",
                            isRecording
                                ? "bg-destructive scale-90"
                                : "bg-white text-black hover:scale-110 shadow-xl shadow-white/10"
                        )}
                    >
                        {isRecording ? (
                            <div className="w-8 h-8 bg-white rounded-sm" />
                        ) : (
                            <HugeiconsIcon icon={Mic01Icon} size={40} />
                        )}
                    </button>

                    {/* Hint */}
                    {!isRecording && (
                        <div className="absolute -bottom-10 whitespace-nowrap text-white/80 text-sm font-medium flex items-center gap-1.5 animate-bounce">
                            눌러서 감상을 말해보세요 <HugeiconsIcon icon={ArrowRight01Icon} size={14} className="rotate-90" />
                        </div>
                    )}
                </div>
            </div>

            {/* Premium Glow Gradient overlay */}
            <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
        </div>
    );
}
