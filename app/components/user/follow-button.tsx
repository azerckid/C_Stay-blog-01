import { useState } from "react";
import { useFetcher } from "react-router";
import { Button } from "~/components/ui/button";
import { toast } from "sonner";
import { cn } from "~/lib/utils";

interface FollowButtonProps {
    targetUserId: string;
    initialIsFollowing: boolean;
    initialIsPending?: boolean;
    className?: string;
    variant?: "default" | "outline" | "secondary" | "ghost" | "link";
    size?: "default" | "sm" | "lg" | "icon";
}

export function FollowButton({
    targetUserId,
    initialIsFollowing,
    initialIsPending = false,
    className,
    variant = initialIsFollowing ? "outline" : "default",
    size = "sm",
}: FollowButtonProps) {
    const fetcher = useFetcher<{ success: boolean; isFollowing: boolean; isPending?: boolean; message: string; error?: string }>();
    const [isHovering, setIsHovering] = useState(false);

    // Optimistic UI logic could be complex because we don't know if target is private here directly
    // unless we pass isPrivate prop. But for now, let's rely on server response for Pending state switch,
    // or assume if initialIsPending is true, action is 'unfollow' (cancel request).

    // Server source of truth (priority over initial)
    const serverIsFollowing = fetcher.data?.isFollowing !== undefined ? fetcher.data.isFollowing : initialIsFollowing;
    const serverIsPending = fetcher.data?.isPending !== undefined ? fetcher.data.isPending : initialIsPending;

    // Optimistic override
    // If formData exists, user just clicked.
    // If we were pending (serverIsPending=true), click means 'unfollow' (cancel).
    // If we were following (serverIsFollowing=true), click means 'unfollow'.
    // If neither, click means 'follow'.

    let isFollowing = serverIsFollowing;
    let isPending = serverIsPending;

    if (fetcher.formData) {
        const intent = fetcher.formData.get("intent");
        if (intent === "toggle") {
            // Optimistic Toggle Logic
            if (isFollowing) {
                // Was following -> Unfollow
                isFollowing = false;
                isPending = false;
            } else if (isPending) {
                // Was pending -> Cancel request
                isFollowing = false;
                isPending = false;
            } else {
                // Not following/pending -> Follow
                // We assume 'following' optimistically. Server will correct to 'pending' if private.
                isFollowing = true;
                isPending = false;
            }
        }
    }

    const isSubmitting = fetcher.state !== "idle";

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        fetcher.submit(
            { targetUserId, intent: "toggle" },
            { method: "post", action: "/api/follows" }
        );
    };

    // Determine button text and style based on state and hover
    const getButtonText = () => {
        if (isPending) {
            return isHovering ? "요청 취소" : "요청됨";
        }
        if (isFollowing) {
            return isHovering ? "언팔로우" : "팔로잉";
        }
        return "팔로우";
    };

    const getButtonVariant = () => {
        if ((isFollowing || isPending) && isHovering) {
            return "destructive"; // Red on hover for unfollow/cancel
        }
        return (isFollowing || isPending) ? "outline" : "default";
    };

    return (
        <Button
            variant={getButtonVariant() as any}
            size={size}
            className={cn(
                "transition-all duration-200 font-semibold rounded-full",
                (isFollowing || isPending) && "hover:bg-red-50 hover:text-red-500 hover:border-red-200 dark:hover:bg-red-950/30 dark:hover:text-red-400 dark:hover:border-red-800",
                className
            )}
            onClick={handleClick}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            disabled={isSubmitting}
        >
            {getButtonText()}
        </Button>
    );
}
