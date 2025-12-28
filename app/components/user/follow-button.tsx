import { useState } from "react";
import { useFetcher } from "react-router";
import { Button } from "~/components/ui/button";
import { toast } from "sonner";
import { cn } from "~/lib/utils";

interface FollowButtonProps {
    targetUserId: string;
    initialIsFollowing: boolean;
    className?: string;
    variant?: "default" | "outline" | "secondary" | "ghost" | "link";
    size?: "default" | "sm" | "lg" | "icon";
}

export function FollowButton({
    targetUserId,
    initialIsFollowing,
    className,
    variant = initialIsFollowing ? "outline" : "default",
    size = "sm",
}: FollowButtonProps) {
    const fetcher = useFetcher<{ success: boolean; isFollowing: boolean; message: string; error?: string }>();
    const [isHovering, setIsHovering] = useState(false);

    // Optimistic UI state
    const isFollowing = fetcher.formData
        ? fetcher.formData.get("intent") === "follow"
        : initialIsFollowing;

    // Handle immediate feedback/errors based on fetcher state if needed?
    // Actually, standard optimistic is cleaner if we just derive from formData.
    // But we need to handle "intent" correctly.

    // Actually, better logic:
    // Use local state for immediate feedback but sync with fetcher?
    // No, fetcher.formData is best for optimistic update in Remix/React Router.

    const isSubmitting = fetcher.state !== "idle";

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const intent = isFollowing ? "unfollow" : "follow";

        fetcher.submit(
            { targetUserId, intent },
            { method: "post", action: "/api/follows" }
        );
    };

    // Determine button text and style based on state and hover
    const getButtonText = () => {
        if (isFollowing) {
            return isHovering ? "언팔로우" : "팔로잉";
        }
        return "팔로우";
    };

    const getButtonVariant = () => {
        if (isFollowing && isHovering) {
            return "destructive"; // Red on hover for unfollow
        }
        return isFollowing ? "outline" : "default"; // Outline for following, Solid for follow
    };

    return (
        <Button
            variant={getButtonVariant() as any}
            size={size}
            className={cn(
                "transition-all duration-200 font-semibold rounded-full",
                isFollowing && "hover:bg-red-50 hover:text-red-500 hover:border-red-200 dark:hover:bg-red-950/30 dark:hover:text-red-400 dark:hover:border-red-800",
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
