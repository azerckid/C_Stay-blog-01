import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, ArrowLeft01Icon, Tick01Icon } from "@hugeicons/core-free-icons";
import { cn } from "~/lib/utils";

interface MessageSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function MessageSettingsModal({ isOpen, onClose }: MessageSettingsModalProps) {
    const [isVisible, setIsVisible] = useState(false);
    // Mock settings state
    const [allowRequestFrom, setAllowRequestFrom] = useState<"everyone" | "verified" | "follows">("everyone");
    const [readReceipts, setReadReceipts] = useState(true);
    const [filterLowQuality, setFilterLowQuality] = useState(true);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            document.body.style.overflow = 'hidden';
        } else {
            const timer = setTimeout(() => setIsVisible(false), 300);
            document.body.style.overflow = 'unset';
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isOpen && !isVisible) return null;

    return (
        <div className={cn(
            "fixed inset-0 z-[150] flex items-end lg:items-center justify-center lg:backdrop-blur-sm lg:bg-background/20 transition-all duration-300",
            isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}>
            {/* Backdrop click to close */}
            <div className="absolute inset-0" onClick={onClose} />

            <div className={cn(
                "relative w-full lg:w-[600px] h-[90vh] lg:h-[650px] bg-background border border-border shadow-2xl rounded-t-2xl lg:rounded-2xl flex flex-col overflow-hidden transition-transform duration-300 ease-out sm:max-w-md",
                isOpen ? "translate-y-0 scale-100" : "translate-y-full lg:translate-y-10 lg:scale-95"
            )}>
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onClose}
                            className="p-2 -ml-2 hover:bg-accent rounded-full transition-colors"
                        >
                            <HugeiconsIcon icon={ArrowLeft01Icon} size={20} strokeWidth={2.5} />
                        </button>
                        <h2 className="text-xl font-bold">쪽지 설정</h2>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {/* Privacy Section */}
                    <div className="px-4 py-3 border-b border-border">
                        <h3 className="font-bold text-lg mb-4 mt-2">프라이버시</h3>

                        <div className="space-y-6">
                            <div>
                                <p className="text-base font-semibold mb-1">쪽지 요청 허용 대상:</p>
                                <p className="text-sm text-muted-foreground mb-3">
                                    쪽지를 나에게 보낼 수 있는 사람을 선택하세요.
                                </p>

                                <div className="space-y-1">
                                    {[
                                        { id: "everyone", label: "모든 사람" },
                                        { id: "verified", label: "인증된 사용자" },
                                        { id: "follows", label: "내가 팔로우하는 사용자만" }
                                    ].map((option) => (
                                        <label
                                            key={option.id}
                                            className="flex items-center justify-between py-2 cursor-pointer group"
                                        >
                                            <span className="text-[15px]">{option.label}</span>
                                            <div className="relative flex items-center">
                                                <input
                                                    type="radio"
                                                    name="allowRequestFrom"
                                                    value={option.id}
                                                    checked={allowRequestFrom === option.id}
                                                    onChange={(e) => setAllowRequestFrom(e.target.value as any)}
                                                    className="peer appearance-none w-5 h-5 border-2 border-muted-foreground rounded-full checked:border-primary checked:bg-primary transition-all"
                                                />
                                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 peer-checked:opacity-100">
                                                    <div className="w-2 h-2 bg-background rounded-full" />
                                                </div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Preferences Section */}
                    <div className="px-4 py-3">
                        <h3 className="font-bold text-lg mb-4 mt-2">환경 설정</h3>

                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex-1 pr-4">
                                    <p className="text-[15px] font-semibold">저품질 메시지 필터링</p>
                                    <p className="text-sm text-muted-foreground mt-0.5">
                                        스팸으로 의심되는 메시지 요청을 별도의 보관함으로 숨깁니다.
                                    </p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={filterLowQuality}
                                        onChange={(e) => setFilterLowQuality(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-muted-foreground/30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                </label>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex-1 pr-4">
                                    <p className="text-[15px] font-semibold">읽음 확인 표시</p>
                                    <p className="text-sm text-muted-foreground mt-0.5">
                                        상대방이 내가 보낸 메시지를 읽었는지 확인할 수 있습니다.
                                    </p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={readReceipts}
                                        onChange={(e) => setReadReceipts(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-muted-foreground/30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
