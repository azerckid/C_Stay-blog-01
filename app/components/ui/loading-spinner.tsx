import { cn } from "~/lib/utils";

interface LoadingSpinnerProps {
    size?: "sm" | "md" | "lg";
    className?: string;
}

export function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps) {
    const sizeClasses = {
        sm: "h-4 w-4 border-2",
        md: "h-8 w-8 border-3",
        lg: "h-12 w-12 border-4",
    };

    return (
        <div className={cn("flex items-center justify-center", className)}>
            <div
                className={cn(
                    "animate-spin rounded-full border-primary border-t-transparent",
                    sizeClasses[size]
                )}
            />
        </div>
    );
}

export function FullPageLoading() {
    return (
        <div className="fixed inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-[100]">
            <div className="flex flex-col items-center gap-4">
                <LoadingSpinner size="lg" />
                <p className="text-muted-foreground font-medium animate-pulse">로딩 중...</p>
            </div>
        </div>
    );
}
