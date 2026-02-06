import { useState, useEffect, useRef } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    AiIdeaIcon,
    AiBookIcon,
    AiChat01Icon,
    Mic01Icon,
    Location01Icon,
    Cancel01Icon,
    ArrowRight01Icon,
    AiViewIcon,
    Tick01Icon,
    ReloadIcon,
    Camera01Icon,
    TextIcon
} from "@hugeicons/core-free-icons";
import { cn } from "~/lib/utils";
import { toast } from "sonner";
import { useNavigate } from "react-router";

interface LogModeOverlayProps {
    isOpen: boolean;
    onClose: () => void;
}

type WritingStyle = "emotional" | "information" | "witty" | "auto" | "dictation";

export function LogModeOverlay({ isOpen, onClose }: LogModeOverlayProps) {
    const navigate = useNavigate();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [selectedStyle, setSelectedStyle] = useState<WritingStyle>("emotional");
    const [isRecording, setIsRecording] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedResult, setGeneratedResult] = useState<{ content: string, image: string } | null>(null);
    const [generatedByDictation, setGeneratedByDictation] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [transcribedText, setTranscribedText] = useState("");
    const [currentLocation, setCurrentLocation] = useState<{ name: string; lat?: number; lng?: number }>({ name: "위치 파악 중..." });

    // STT용 Recognition 객체
    const [recognition, setRecognition] = useState<any>(null);
    const [isLandscape, setIsLandscape] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const mq = window.matchMedia("(orientation: landscape)");
        const handler = (e: MediaQueryListEvent) => setIsLandscape(e.matches);
        setIsLandscape(mq.matches);
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, []);

    useEffect(() => {
        if (typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "speechRecognition" in window)) {
            const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).speechRecognition;
            const recognizer = new SpeechRecognition();
            recognizer.lang = "ko-KR";
            recognizer.continuous = true;
            recognizer.interimResults = true;

            recognizer.onresult = (event: any) => {
                let interimTranscript = "";
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        setTranscribedText(prev => prev + event.results[i][0].transcript);
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }
                console.log("Interim:", interimTranscript);
            };

            recognizer.onerror = (event: any) => {
                console.error("Speech Recognition Error", event.error);
                setIsRecording(false);
            };

            setRecognition(recognizer);
        }
    }, []);

    // 카메라 프리뷰 시작 (실제 브라우저 환경에서만 동작)
    useEffect(() => {
        if (isOpen) {
            setGeneratedResult(null);
            setGeneratedByDictation(false);
            setTranscribedText("");
            // 위치 정보 가져오기
            if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition(async (position) => {
                    const { latitude, longitude } = position.coords;
                    try {
                        const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&language=ko`);
                        const data = await response.json();
                        if (data.results && data.results[0]) {
                            // 시/군/구 단위의 이름 추출 시도
                            const address = data.results[0].formatted_address;
                            const shortAddress = address.split(" ").slice(1, 4).join(" "); // '대한민국' 제외
                            setCurrentLocation({ name: shortAddress, lat: latitude, lng: longitude });
                        } else {
                            setCurrentLocation({ name: "알 수 없는 장소", lat: latitude, lng: longitude });
                        }
                    } catch (e) {
                        setCurrentLocation({ name: "장소 식별 실패", lat: latitude, lng: longitude });
                    }
                }, () => {
                    setCurrentLocation({ name: "위치 권한 필요" });
                });
            }

            // 카메라와 오디오를 동시에 가져오되, 오디오 실패 시 카메라만이라도 가져오도록 분리 시도
            navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: true
            })
                .then(s => {
                    setStream(s);
                })
                .catch(async (err) => {
                    console.warn("Audio+Video failed, trying video only:", err);
                    try {
                        const videoOnly = await navigator.mediaDevices.getUserMedia({
                            video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
                        });
                        setStream(videoOnly);
                        toast.error("마이크 연결에 문제가 있어 음성 인식이 제한될 수 있습니다.");
                    } catch (vErr) {
                        console.error("Camera access error:", vErr);
                        toast.error("카메라 권한을 허용해주세요.");
                    }
                });
        } else {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
                setStream(null);
            }
            if (recognition) recognition.stop();
            setIsRecording(false);
        }
    }, [isOpen]);

    // 비디오 태그에 스트림 연결 (ref 사용 시 필수)
    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    /** 비디오 현재 프레임을 JPEG Base64로 캡처 (generateLog / 직접 쓰기 공용) */
    const captureFrame = (): string | null => {
        const video = videoRef.current;
        if (!video || !video.videoWidth) return null;
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;
        ctx.drawImage(video, 0, 0);
        return canvas.toDataURL("image/jpeg", 0.8);
    };

    const handleToggleRecording = () => {
        if (!recognition) {
            toast.error("이 브라우저는 음성 인식을 지원하지 않습니다.");
            return;
        }

        if (isRecording) {
            recognition.stop();
            setIsRecording(false);
            if (selectedStyle === "dictation") {
                setTimeout(() => {
                    const imageData = captureFrame();
                    if (imageData) {
                        setGeneratedResult({
                            content: transcribedText.trim() || "음성 내용을 입력해 주세요.",
                            image: imageData
                        });
                        setGeneratedByDictation(true);
                    } else {
                        toast.error("사진 캡처에 실패했습니다.");
                    }
                }, 500);
                return;
            }
            setTimeout(() => {
                generateLog();
            }, 500);
        } else {
            setTranscribedText("");
            recognition.start();
            setIsRecording(true);
        }
    };

    // 음성 없이 즉시 분석 (스마트 분석 모드용)
    const handleDirectAnalysis = () => {
        setTranscribedText(""); // 음성 텍스트 비움
        generateLog(); // generateLog 함수 내부에서 selectedStyle === "auto" 체크
    };

    const generateLog = async () => {
        if (!stream || !videoRef.current) {
            console.error("Stream or videoRef missing");
            return;
        }
        const imageData = captureFrame();
        if (!imageData) {
            toast.error("사진 캡처에 실패했습니다.");
            return;
        }
        setIsGenerating(true);

        try {
            // API 호출
            const formData = new FormData();
            formData.append("image", imageData);

            // 스마트 분석 모드인 경우 텍스트를 비우거나 특수 신호를 보냄
            const isAuto = selectedStyle === "auto";
            const finalSpeechText = isAuto ? "" : (transcribedText.trim() || "현장의 아름다운 풍경과 분위기");

            formData.append("voiceText", finalSpeechText);
            formData.append("style", selectedStyle);
            formData.append("location", currentLocation.name);

            const response = await fetch("/api/ai-travel-log", {
                method: "POST",
                body: formData
            });

            const result = await response.json();
            if (result.success) {
                setGeneratedResult({ content: result.content, image: imageData });
                setGeneratedByDictation(false);
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast.error(error.message || "여행기 생성에 실패했습니다.");
        } finally {
            setIsGenerating(false);
        }
    };

    /** 직접 쓰기 결과를 AI로 다듬기 (결과 화면에서만 호출) */
    const handlePolishWithAi = async () => {
        if (!generatedResult || isGenerating) return;
        setIsGenerating(true);
        try {
            const formData = new FormData();
            formData.append("image", generatedResult.image);
            formData.append("voiceText", generatedResult.content);
            formData.append("style", "emotional");
            formData.append("location", currentLocation.name);
            const response = await fetch("/api/ai-travel-log", { method: "POST", body: formData });
            const result = await response.json();
            if (result.success) {
                setGeneratedResult({ content: result.content, image: generatedResult.image });
                setGeneratedByDictation(false);
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast.error(error.message || "AI 다듬기에 실패했습니다.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handlePublish = async () => {
        if (!generatedResult || isGenerating) return;

        setIsGenerating(true);
        try {
            const formData = new FormData();
            formData.append("content", generatedResult.content);
            formData.append("location", JSON.stringify({
                name: currentLocation.name,
                latitude: currentLocation.lat,
                longitude: currentLocation.lng
            }));
            // 오늘 날짜를 여행 날짜로 자동 등록
            formData.append("travelDate", new Date().toISOString());
            // 캡처된 이미지를 Base64 형태로 전송
            formData.append("aiImage", generatedResult.image);

            const response = await fetch("/api/tweets", {
                method: "POST",
                body: formData,
            });

            if (response.ok) {
                toast.success("여행기가 피드에 게시되었습니다!");
                onClose();
                navigate("/");
            } else {
                const errorData = await response.json().catch(() => ({}));
                toast.error(errorData.error || "게시에 실패했습니다.");
            }
        } catch (error) {
            console.error("Publish Error:", error);
            toast.error("게시에 실패했습니다.");
        } finally {
            setIsGenerating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={cn("fixed inset-0 z-100 bg-black overflow-hidden flex animate-in fade-in duration-300", isLandscape ? "flex-row" : "flex-col")}>
            {/* Camera + Top Bar 영역 (Landscape 시 flex-1로 카메라 영역 확보) */}
            <div className={cn("relative", isLandscape ? "flex-1 min-w-0" : "contents")}>
                {/* Camera Preview Placeholder / Real View */}
                <div className={cn("z-0", isLandscape ? "absolute inset-0" : "absolute inset-0")}>
                    {stream ? (
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                            <HugeiconsIcon icon={AiViewIcon} className="w-16 h-16 text-white/20 animate-pulse" />
                        </div>
                    )}
                </div>

                {/* Top Bar: Location & Close (Landscape 시 카메라 위에만 절대 배치) */}
                <div className={cn(
                    "z-10 flex items-center justify-between p-4",
                    isLandscape ? "absolute left-0 top-0 right-0 pt-4" : "relative pt-12 md:pt-6"
                )}>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white/90">
                        <HugeiconsIcon icon={Location01Icon} size={16} />
                        <span className="text-sm font-medium">{currentLocation.name}</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white hover:bg-white/20 transition-colors"
                    >
                        <HugeiconsIcon icon={Cancel01Icon} size={24} />
                    </button>
                </div>
            </div>

            {/* Bottom Panel: Controls (Hidden if result is showing) */}
            {!generatedResult && (
                <div className={cn(
                    "relative z-10 flex flex-col items-center animate-in slide-in-from-bottom duration-500",
                    isLandscape ? "absolute right-0 top-0 bottom-0 w-[140px] justify-center gap-4 p-4" : "mt-auto p-6 pb-12 md:pb-8 gap-8"
                )}>
                    {/* Style Selector (녹음 중에는 카메라 영역 확보를 위해 숨김) */}
                    {!isRecording && (
                    <div className={cn(
                        "w-full grid gap-2 rounded-2xl bg-black/60 backdrop-blur-2xl border border-white/10 p-1.5",
                        isLandscape ? "grid-cols-1 max-w-none" : "max-w-sm grid-cols-3 gap-3"
                    )}>
                        <button
                            onClick={() => setSelectedStyle("emotional")}
                            className={cn(
                                "flex flex-col items-center gap-1.5 rounded-xl transition-all duration-300",
                                isLandscape ? "py-2" : "py-3",
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
                                "flex flex-col items-center gap-1.5 rounded-xl transition-all duration-300",
                                isLandscape ? "py-2" : "py-3",
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
                                "flex flex-col items-center gap-1.5 rounded-xl transition-all duration-300",
                                isLandscape ? "py-2" : "py-3",
                                selectedStyle === "witty"
                                    ? "bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]"
                                    : "text-white/60 hover:text-white"
                            )}
                        >
                            <HugeiconsIcon icon={AiChat01Icon} size={20} />
                            <span className="text-[11px] font-bold">위트/발랄</span>
                        </button>
                        <button
                            onClick={() => setSelectedStyle("auto")}
                            className={cn(
                                "flex flex-col items-center gap-1.5 rounded-xl transition-all duration-300",
                                isLandscape ? "py-2" : "py-3",
                                selectedStyle === "auto"
                                    ? "bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]"
                                    : "text-white/60 hover:text-white"
                            )}
                        >
                            <HugeiconsIcon icon={Camera01Icon} size={20} />
                            <span className="text-[11px] font-bold">스마트 분석</span>
                        </button>
                        <button
                            onClick={() => setSelectedStyle("dictation")}
                            className={cn(
                                "flex flex-col items-center gap-1.5 rounded-xl transition-all duration-300",
                                isLandscape ? "py-2" : "py-3",
                                selectedStyle === "dictation"
                                    ? "bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]"
                                    : "text-white/60 hover:text-white"
                            )}
                        >
                            <HugeiconsIcon icon={TextIcon} size={20} />
                            <span className="text-[11px] font-bold">직접 쓰기</span>
                        </button>
                    </div>
                    )}

                    {/* Speech Transcript Preview (Landscape: compact) */}
                    {transcribedText && (
                        <div className={cn("text-center text-white/90 font-medium bg-black/40 px-4 py-2 rounded-lg backdrop-blur-sm animate-in fade-in zoom-in", isLandscape ? "max-w-full text-xs" : "max-w-xs text-sm")}>
                            "{transcribedText}"
                        </div>
                    )}

                    {/* Recording or Action Button */}
                    <div className="relative flex items-center justify-center">
                        {(isRecording || isGenerating) && (
                            <>
                                <div className={cn("absolute rounded-full border-2 border-primary animate-ping opacity-40", isLandscape ? "w-[80px] h-[80px]" : "w-[120px] h-[120px]")} />
                                <div className={cn("absolute rounded-full border border-primary animate-ping delay-300 opacity-20", isLandscape ? "w-[100px] h-[100px]" : "w-[160px] h-[160px]")} />
                            </>
                        )}

                        {selectedStyle === "auto" && !isRecording ? (
                            <button
                                onClick={handleDirectAnalysis}
                                disabled={isGenerating}
                                className={cn(
                                    "relative z-20 rounded-full flex items-center justify-center transition-all duration-500 bg-primary text-white hover:scale-110 shadow-xl shadow-primary/20",
                                    isLandscape ? "w-16 h-16" : "w-24 h-24",
                                    isGenerating && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                {isGenerating ? (
                                    <div className="w-10 h-10 rounded-full border-4 border-white/30 border-t-white animate-spin" />
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <HugeiconsIcon icon={Camera01Icon} size={isLandscape ? 24 : 32} />
                                        <span className="text-[10px] font-bold mt-1">분석 및 생성</span>
                                    </div>
                                )}
                            </button>
                        ) : (
                            <button
                                onClick={handleToggleRecording}
                                disabled={isGenerating}
                                className={cn(
                                    "relative z-20 rounded-full flex items-center justify-center transition-all duration-500",
                                    isLandscape ? "w-16 h-16" : "w-24 h-24",
                                    isRecording
                                        ? "bg-destructive scale-90"
                                        : "bg-white text-black hover:scale-110 shadow-xl shadow-white/10",
                                    isGenerating && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                {isGenerating ? (
                                    <div className="w-10 h-10 rounded-full border-4 border-primary border-t-white animate-spin" />
                                ) : isRecording ? (
                                    <div className="w-8 h-8 bg-white rounded-sm" />
                                ) : (
                                    <HugeiconsIcon icon={Mic01Icon} size={isLandscape ? 28 : 40} />
                                )}
                            </button>
                        )}

                        {!isLandscape && !isRecording && !isGenerating && (
                            <div className="absolute -bottom-10 whitespace-nowrap text-white/80 text-sm font-medium flex items-center gap-1.5 animate-bounce">
                                {selectedStyle === "auto" ? "버튼을 눌러 바로 분석해보세요" : "눌러서 감상을 말해보세요"} <HugeiconsIcon icon={ArrowRight01Icon} size={14} className="rotate-90" />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* AI Generated Result Overlay */}
            {generatedResult && (
                <div className="absolute inset-x-4 bottom-24 md:bottom-10 z-30 p-6 rounded-3xl bg-black/80 backdrop-blur-2xl border border-white/10 animate-in slide-in-from-bottom duration-500 shadow-2xl shadow-primary/10">
                    <div className="flex flex-col gap-4 text-center">
                        <div className="flex justify-center">
                            <div className="w-12 h-1 rounded-full bg-white/20 mb-2" />
                        </div>
                        <h3 className="text-primary text-[10px] font-black tracking-widest uppercase">Result Verification</h3>

                        {isEditing ? (
                            <textarea
                                autoFocus
                                value={generatedResult.content}
                                onChange={(e) => setGeneratedResult({ ...generatedResult, content: e.target.value })}
                                onBlur={() => setIsEditing(false)}
                                className="w-full bg-white/5 border border-primary/30 rounded-xl p-4 text-white text-lg font-medium leading-relaxed focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none min-h-[120px]"
                            />
                        ) : (
                            <p
                                onClick={() => setIsEditing(true)}
                                className="text-lg font-medium text-white leading-relaxed cursor-text hover:bg-white/5 p-2 rounded-xl transition-colors min-h-[60px] flex items-center justify-center"
                            >
                                "{generatedResult.content}"
                            </p>
                        )}

                        <div className="text-white/40 text-[10px] italic">
                            {isEditing ? "문장을 수정하고 바깥을 클릭하세요" : "문장을 터치하여 직접 수정할 수 있습니다"}
                        </div>

                        <div className="flex flex-col gap-3 mt-2">
                            {generatedByDictation && (
                                <button
                                    type="button"
                                    onClick={handlePolishWithAi}
                                    disabled={isEditing || isGenerating}
                                    className={cn(
                                        "flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition-all",
                                        (isEditing || isGenerating)
                                            ? "bg-slate-700 text-white/50 cursor-not-allowed"
                                            : "bg-white/15 text-white hover:bg-white/25 border border-white/10"
                                    )}
                                >
                                    {isGenerating ? (
                                        <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                    ) : (
                                        <HugeiconsIcon icon={AiIdeaIcon} size={18} />
                                    )}
                                    {isGenerating ? "다듬는 중..." : "AI로 다듬기"}
                                </button>
                            )}
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => {
                                        setGeneratedResult(null);
                                        setGeneratedByDictation(false);
                                        setIsEditing(false);
                                    }}
                                    className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white/10 text-white font-bold hover:bg-white/20 transition-all text-sm"
                                >
                                    <HugeiconsIcon icon={ReloadIcon} size={18} />
                                    다시 하기
                                </button>
                                <button
                                    onClick={handlePublish}
                                    disabled={isEditing || isGenerating}
                                    className={cn(
                                        "flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold transition-all shadow-lg text-sm",
                                        (isEditing || isGenerating)
                                            ? "bg-slate-700 text-white/50 cursor-not-allowed"
                                            : "bg-primary text-white hover:opacity-90 shadow-primary/20"
                                    )}
                                >
                                    {isGenerating ? (
                                        <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                    ) : (
                                        <HugeiconsIcon icon={Tick01Icon} size={18} />
                                    )}
                                    {isGenerating ? "게시 중..." : "확인 및 게시"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Premium Glow Gradient overlay (Landscape: 우측만, Portrait: 하단) */}
            <div className={cn(
                "absolute pointer-events-none",
                isLandscape
                    ? "right-0 top-0 bottom-0 w-24 bg-linear-to-l from-black/70 to-transparent"
                    : "bottom-0 left-0 right-0 h-1/2 bg-linear-to-t from-black/80 to-transparent"
            )} />
        </div>
    );
}
