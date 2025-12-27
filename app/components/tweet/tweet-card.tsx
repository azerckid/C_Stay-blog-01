import { HugeiconsIcon } from "@hugeicons/react";
import {
    Comment01Icon,
    RepeatIcon,
    FavouriteIcon,
    ViewIcon,
    Share01Icon,
    MoreHorizontalIcon
} from "@hugeicons/core-free-icons";
import { cn } from "~/lib/utils";

interface TweetCardProps {
    user: {
        name: string;
        username: string;
        image?: string | null;
    };
    content: string;
    createdAt: string;
    stats?: {
        replies: number;
        retweets: number;
        likes: number;
        views: string;
    };
    media?: {
        type: "IMAGE" | "VIDEO";
        url: string;
    }[];
}

export function TweetCard({ user, content, createdAt, stats, media }: TweetCardProps) {
    return (
        <div className="p-4 border-b border-border hover:bg-accent/20 transition-colors cursor-pointer flex gap-3 group/card">
            {/* Avatar */}
            <div className="h-10 w-10 rounded-full bg-secondary flex-shrink-0 border border-border overflow-hidden">
                {user.image ? (
                    <img src={user.image} alt={user.name} className="h-full w-full object-cover" />
                ) : (
                    <div className="h-full w-full flex items-center justify-center text-muted-foreground font-bold">
                        {user.name[0]}
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 overflow-hidden">
                        <span className="font-bold hover:underline truncate">{user.name}</span>
                        <span className="text-muted-foreground text-sm truncate">@{user.username}</span>
                        <span className="text-muted-foreground text-sm flex-shrink-0">· {createdAt}</span>
                    </div>
                    <button className="p-2 -mr-2 hover:bg-primary/10 hover:text-primary rounded-full transition-colors text-muted-foreground">
                        <HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} className="h-4.5 w-4.5" />
                    </button>
                </div>

                <p className="text-[15px] leading-normal break-words whitespace-pre-wrap">
                    {content}
                </p>

                {/* Media (Optional) */}
                {media && media.length > 0 && (
                    <div className="mt-3 aspect-video rounded-2xl bg-muted border border-border overflow-hidden">
                        {/* Phase 8에서 실제 미디어 렌더링 구현 예정 */}
                        <div className="h-full w-full flex items-center justify-center text-muted-foreground italic text-sm">
                            [미디어 콘텐츠]
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-between mt-3 -ml-2 text-muted-foreground max-w-md">
                    <button className="flex items-center gap-2 group/action hover:text-primary transition-colors pr-3">
                        <div className="p-2 group-hover/action:bg-primary/10 rounded-full transition-colors">
                            <HugeiconsIcon icon={Comment01Icon} strokeWidth={2} className="h-4.5 w-4.5" />
                        </div>
                        <span className="text-xs">{stats?.replies ?? 0}</span>
                    </button>

                    <button className="flex items-center gap-2 group/action hover:text-green-500 transition-colors pr-3">
                        <div className="p-2 group-hover/action:bg-green-500/10 rounded-full transition-colors">
                            <HugeiconsIcon icon={RepeatIcon} strokeWidth={2} className="h-4.5 w-4.5" />
                        </div>
                        <span className="text-xs">{stats?.retweets ?? 0}</span>
                    </button>

                    <button className="flex items-center gap-2 group/action hover:text-red-500 transition-colors pr-3">
                        <div className="p-2 group-hover/action:bg-red-500/10 rounded-full transition-colors">
                            <HugeiconsIcon icon={FavouriteIcon} strokeWidth={2} className="h-4.5 w-4.5" />
                        </div>
                        <span className="text-xs">{stats?.likes ?? 0}</span>
                    </button>

                    <button className="flex items-center gap-2 group/action hover:text-primary transition-colors pr-3">
                        <div className="p-2 group-hover/action:bg-primary/10 rounded-full transition-colors">
                            <HugeiconsIcon icon={ViewIcon} strokeWidth={2} className="h-4.5 w-4.5" />
                        </div>
                        <span className="text-xs">{stats?.views ?? "0"}</span>
                    </button>

                    <button className="flex items-center group/action hover:text-primary transition-colors">
                        <div className="p-2 group-hover/action:bg-primary/10 rounded-full transition-colors">
                            <HugeiconsIcon icon={Share01Icon} strokeWidth={2} className="h-4.5 w-4.5" />
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
}
