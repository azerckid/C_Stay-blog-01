import { HugeiconsIcon } from "@hugeicons/react";
import { Image01Icon, AiBrain01Icon, SentIcon, Location01Icon, Calendar03Icon, NaturalFoodIcon } from "@hugeicons/core-free-icons";
import { useSession } from "~/lib/auth-client";
import { cn } from "~/lib/utils";
import { useState } from "react";

export function TweetCompose() {
    const { data: session } = useSession();
    const [content, setContent] = useState("");

    return (
        <div className="p-4 border-b border-border flex gap-3">
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
                    className="w-full bg-transparent text-xl outline-none resize-none pt-2 min-h-[100px] placeholder:text-muted-foreground/60"
                />

                {/* Actions */}
                <div className="flex items-center justify-between border-t border-border pt-3">
                    <div className="flex items-center -ml-2 text-primary">
                        <button title="이미지" className="p-2 hover:bg-primary/10 rounded-full transition-colors">
                            <HugeiconsIcon icon={Image01Icon} strokeWidth={2} className="h-5 w-5" />
                        </button>
                        <button title="AI 도움말" className="p-2 hover:bg-primary/10 rounded-full transition-colors">
                            <HugeiconsIcon icon={AiBrain01Icon} strokeWidth={2} className="h-5 w-5" />
                        </button>
                        <button title="위치" className="p-2 hover:bg-primary/10 rounded-full transition-colors hidden sm:block">
                            <HugeiconsIcon icon={Location01Icon} strokeWidth={2} className="h-5 w-5" />
                        </button>
                        <button title="일정" className="p-2 hover:bg-primary/10 rounded-full transition-colors hidden sm:block">
                            <HugeiconsIcon icon={Calendar03Icon} strokeWidth={2} className="h-5 w-5" />
                        </button>
                    </div>

                    <button
                        disabled={!content.trim()}
                        className={cn(
                            "text-white font-bold py-2 px-5 rounded-full transition-all",
                            content.trim() ? "bg-primary hover:bg-primary/90" : "bg-primary/50 cursor-not-allowed"
                        )}
                    >
                        게시하기
                    </button>
                </div>
            </div>
        </div>
    );
}
