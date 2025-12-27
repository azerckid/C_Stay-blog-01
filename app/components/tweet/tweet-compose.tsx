import { HugeiconsIcon } from "@hugeicons/react";
import { Image01Icon, AiBrain01Icon, Location01Icon, Calendar03Icon } from "@hugeicons/core-free-icons";
import { useSession } from "~/lib/auth-client";
import { cn } from "~/lib/utils";
import { useState, useEffect } from "react";
import { useFetcher, useRevalidator } from "react-router";
import { toast } from "sonner";

export function TweetCompose() {
    const { data: session } = useSession();
    const [content, setContent] = useState("");
    const fetcher = useFetcher();
    const revalidator = useRevalidator();

    // fetcher의 상태 변화를 감시하여 결과 처리
    useEffect(() => {
        if (fetcher.state === "idle" && fetcher.data) {
            const result = fetcher.data as any;
            if (result.success) {
                toast.success("트윗이 게시되었습니다!");
                setContent("");
                revalidator.revalidate(); // 데이터 갱신 트리거
            } else if (result.error) {
                toast.error(result.error);
            }
        }
    }, [fetcher.state, fetcher.data]);

    const isSubmitting = fetcher.state !== "idle";

    const handleSubmit = () => {
        if (!content.trim() || isSubmitting) return;

        // server-side action 호출
        fetcher.submit(
            { content },
            { method: "POST", action: "/api/tweets" }
        );
    };

    return (
        <div className="p-4 border-b border-border flex gap-3 bg-background">
            {/* Avatar */}
            <div className="h-10 w-10 rounded-full bg-secondary flex-shrink-0 border border-border overflow-hidden">
                {session?.user?.image ? (
                    <img src={session.user.image} alt={session.user.name ?? ""} className="h-full w-full object-cover" />
                ) : (
                    <div className="h-full w-full flex items-center justify-center text-muted-foreground font-bold">
                        {session?.user?.name?.[0] || "?"}
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="flex-1 flex flex-col gap-3">
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="무슨 일이 일어나고 있나요?"
                    disabled={isSubmitting}
                    className="w-full bg-transparent text-xl outline-none resize-none pt-2 min-h-[100px] placeholder:text-muted-foreground/60 disabled:opacity-50"
                />

                {/* Actions */}
                <div className="flex items-center justify-between border-t border-border pt-3">
                    <div className="flex items-center -ml-2 text-primary">
                        <button
                            type="button"
                            title="이미지"
                            disabled={isSubmitting}
                            className="p-2 hover:bg-primary/10 rounded-full transition-colors disabled:opacity-50"
                        >
                            <HugeiconsIcon icon={Image01Icon} strokeWidth={2} className="h-5 w-5" />
                        </button>
                        <button
                            type="button"
                            title="AI 도움말"
                            disabled={isSubmitting}
                            className="p-2 hover:bg-primary/10 rounded-full transition-colors disabled:opacity-50"
                        >
                            <HugeiconsIcon icon={AiBrain01Icon} strokeWidth={2} className="h-5 w-5" />
                        </button>
                        <button
                            type="button"
                            title="위치"
                            disabled={isSubmitting}
                            className="p-2 hover:bg-primary/10 rounded-full transition-colors hidden sm:block disabled:opacity-50"
                        >
                            <HugeiconsIcon icon={Location01Icon} strokeWidth={2} className="h-5 w-5" />
                        </button>
                        <button
                            type="button"
                            title="일정"
                            disabled={isSubmitting}
                            className="p-2 hover:bg-primary/10 rounded-full transition-colors hidden sm:block disabled:opacity-50"
                        >
                            <HugeiconsIcon icon={Calendar03Icon} strokeWidth={2} className="h-5 w-5" />
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!content.trim() || isSubmitting}
                        className={cn(
                            "text-white font-bold py-2 px-5 rounded-full transition-all",
                            content.trim() && !isSubmitting ? "bg-primary hover:bg-primary/90" : "bg-primary/50 cursor-not-allowed"
                        )}
                    >
                        {isSubmitting ? "게시 중..." : "게시하기"}
                    </button>
                </div>
            </div>
        </div>
    );
}
