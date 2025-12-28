import { HugeiconsIcon } from "@hugeicons/react";
import {
    Comment01Icon,
    RepeatIcon,
    FavouriteIcon,
    ViewIcon,
    Share01Icon,
    MoreHorizontalIcon,
    Delete02Icon,
    PencilEdit02Icon
} from "@hugeicons/core-free-icons";
import { cn } from "~/lib/utils";
import { useSession } from "~/lib/auth-client";
import { useFetcher, useRevalidator } from "react-router";
import { toast } from "sonner";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { useState, useEffect } from "react";

interface TweetCardProps {
    id?: string;
    user: {
        id?: string;
        name: string;
        username: string;
        image?: string | null;
    };
    content: string;
    createdAt: string;
    fullCreatedAt?: string;
    stats?: {
        replies: number;
        retweets: number;
        likes: number;
        views: string;
    };
    isLiked?: boolean; // 좋아요 여부 추가
    media?: {
        type: "IMAGE" | "VIDEO";
        url: string;
    }[];
}

import { useNavigate } from "react-router";

export function TweetCard({ id, user, content, createdAt, fullCreatedAt, stats, isLiked = false, media }: TweetCardProps) {
    const navigate = useNavigate();
    const { data: session } = useSession();
    const fetcher = useFetcher();
    const likeFetcher = useFetcher(); // 좋아요 전용 fetcher
    const revalidator = useRevalidator();
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(content);

    // 낙관적 UI를 위한 로컬 상태
    const [liked, setLiked] = useState(isLiked);
    const [likeCount, setLikeCount] = useState(stats?.likes ?? 0);

    // Props가 변경되면 로컬 상태 업데이트 (피드 갱신 시 동기화)
    useEffect(() => {
        setLiked(isLiked);
        setLikeCount(stats?.likes ?? 0);
    }, [isLiked, stats?.likes]);

    const isOwner = session?.user?.id === user.id;

    const handleDelete = () => {
        if (!confirm("정말로 이 트윗을 삭제하시겠습니까?")) return;

        if (id) {
            fetcher.submit({ tweetId: id }, { method: "DELETE", action: "/api/tweets" });
        }
    };

    const handleEdit = () => {
        setEditContent(content);
        setIsEditing(true);
    };

    const handleUpdate = () => {
        if (!id) return;
        if (!editContent.trim()) {
            toast.error("내용을 입력해주세요.");
            return;
        }

        fetcher.submit(
            { tweetId: id, content: editContent },
            { method: "PATCH", action: "/api/tweets" }
        );
    };

    const handleLike = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!session) {
            toast.error("로그인이 필요합니다.");
            return;
        }
        if (!id) return;

        // 낙관적 업데이트
        const newLiked = !liked;
        setLiked(newLiked);
        setLikeCount(prev => newLiked ? prev + 1 : prev - 1);

        likeFetcher.submit(
            { tweetId: id },
            { method: "POST", action: "/api/likes" }
        );
    };

    // 좋아요 API 응답 처리
    useEffect(() => {
        if (likeFetcher.state === "idle" && likeFetcher.data) {
            const result = likeFetcher.data as any;
            if (!result.success) {
                // 에러 발생 시에만 롤백 수행
                setLiked(!liked);
                setLikeCount(prev => liked ? prev - 1 : prev + 1);
                toast.error(result.error || "좋아요 처리에 실패했습니다.");
            }
        }
    }, [likeFetcher.state, likeFetcher.data]);


    useEffect(() => {
        if (fetcher.state === "idle" && fetcher.data) {
            const result = fetcher.data as any;
            if (result.success) {
                if (result.message === "트윗이 수정되었습니다.") {
                    toast.success("트윗이 수정되었습니다.");
                    setIsEditing(false);
                    revalidator.revalidate(); // 피드 갱신
                } else if (result.message === "트윗이 삭제되었습니다.") {
                    toast.success("트윗이 삭제되었습니다.");
                    revalidator.revalidate(); // 피드 갱신
                }
            } else if (result.error) {
                toast.error(result.error);
            }
        }
    }, [fetcher.state, fetcher.data, revalidator]);

    const handleClick = () => {
        if (id) {
            navigate(`/tweet/${id}`);
        }
    };

    return (
        <div
            onClick={handleClick}
            className="p-4 border-b border-border hover:bg-accent/20 transition-colors cursor-pointer flex gap-3 group/card"
        >
            {/* Left Column: Avatar */}
            <div className="flex-shrink-0 mr-3">
                <div className="h-10 w-10 rounded-full bg-secondary border border-border overflow-hidden">
                    {user.image ? (
                        <img src={user.image} alt={user.name} className="h-full w-full object-cover" />
                    ) : (
                        <div className="h-full w-full flex items-center justify-center text-muted-foreground font-bold">
                            {user.name[0]}
                        </div>
                    )}
                </div>
            </div>

            {/* Right Column: Content & Actions */}
            <div className="flex-1 min-w-0 flex flex-col">

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 overflow-hidden">
                        <span className="font-bold hover:underline truncate">{user.name}</span>
                        <span className="text-muted-foreground text-sm truncate">@{user.username}</span>
                        <span
                            className="text-muted-foreground text-sm flex-shrink-0 cursor-help"
                            title={fullCreatedAt}
                        >
                            · {createdAt}
                        </span>
                    </div>
                    {isOwner && (
                        <div onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                                <DropdownMenuTrigger className="p-2 -mr-2 hover:bg-primary/10 hover:text-primary rounded-full transition-colors text-muted-foreground outline-none">
                                    <HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} className="h-4.5 w-4.5" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={handleEdit}>
                                        <HugeiconsIcon icon={PencilEdit02Icon} className="mr-2 h-4 w-4" />
                                        수정하기
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleDelete} className="text-red-500 focus:text-red-500">
                                        <HugeiconsIcon icon={Delete02Icon} className="mr-2 h-4 w-4" />
                                        삭제하기
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    )}
                </div>

                <p className="text-[15px] leading-normal break-words whitespace-pre-wrap mt-1">
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
                <div className="flex items-center justify-between mt-3 text-muted-foreground w-full max-w-md">
                    <button className="flex items-center gap-2 group/action hover:text-primary transition-colors pr-3" onClick={(e) => e.stopPropagation()}>
                        <div className="p-2 group-hover/action:bg-primary/10 rounded-full transition-colors">
                            <HugeiconsIcon icon={Comment01Icon} strokeWidth={2} className="h-4.5 w-4.5" />
                        </div>
                        <span className="text-xs">{stats?.replies ?? 0}</span>
                    </button>

                    <button className="flex items-center gap-2 group/action hover:text-green-500 transition-colors pr-3" onClick={(e) => e.stopPropagation()}>
                        <div className="p-2 group-hover/action:bg-green-500/10 rounded-full transition-colors">
                            <HugeiconsIcon icon={RepeatIcon} strokeWidth={2} className="h-4.5 w-4.5" />
                        </div>
                        <span className="text-xs">{stats?.retweets ?? 0}</span>
                    </button>

                    <button
                        onClick={handleLike}
                        className={cn(
                            "flex items-center gap-2 group/action transition-colors pr-3",
                            liked ? "text-red-500" : "hover:text-red-500"
                        )}
                    >
                        <div className={cn(
                            "p-2 rounded-full transition-colors",
                            liked ? "bg-red-500/10" : "group-hover/action:bg-red-500/10"
                        )}>
                            <HugeiconsIcon
                                icon={FavouriteIcon}
                                strokeWidth={liked ? 0 : 2}
                                className={cn(
                                    "h-4.5 w-4.5",
                                    liked && "fill-current"
                                )}
                            />
                        </div>
                        <span className={cn("text-xs", liked && "text-red-500")}>{likeCount}</span>
                    </button>

                    <button className="flex items-center gap-2 group/action hover:text-primary transition-colors pr-3" onClick={(e) => e.stopPropagation()}>
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
            {/* Edit Dialog */}
            <Dialog open={isEditing} onOpenChange={setIsEditing}>
                <DialogContent onClick={(e) => e.stopPropagation()}>
                    <DialogHeader>
                        <DialogTitle>트윗 수정하기</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="min-h-[150px] text-lg resize-none border-none focus-visible:ring-0 p-0"
                            placeholder="무슨 일이 일어나고 있나요?"
                        />
                    </div>
                    <DialogFooter>
                        <DialogClose>
                            <Button variant="ghost">취소</Button>
                        </DialogClose>
                        <Button onClick={handleUpdate} disabled={fetcher.state !== "idle"}>
                            {fetcher.state !== "idle" ? "수정 중..." : "수정하기"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
