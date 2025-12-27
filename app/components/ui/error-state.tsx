import { HugeiconsIcon } from "@hugeicons/react";
import { AlertCircleIcon, RefreshIcon } from "@hugeicons/core-free-icons";
import { Button } from "./button";

interface ErrorStateProps {
    title?: string;
    message?: string;
    onRetry?: () => void;
}

export function ErrorState({
    title = "문제가 발생했습니다",
    message = "데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    onRetry
}: ErrorStateProps) {
    return (
        <div className="flex flex-col items-center justify-center p-8 text-center gap-4">
            <div className="bg-destructive/10 p-4 rounded-full">
                <HugeiconsIcon icon={AlertCircleIcon} className="h-10 w-10 text-destructive" strokeWidth={2} />
            </div>
            <div className="space-y-2">
                <h3 className="text-xl font-bold">{title}</h3>
                <p className="text-muted-foreground max-w-xs mx-auto text-sm leading-relaxed">
                    {message}
                </p>
            </div>
            {onRetry && (
                <Button onClick={onRetry} variant="outline" className="gap-2 mt-2">
                    <HugeiconsIcon icon={RefreshIcon} className="h-4 w-4" strokeWidth={2} />
                    다시 시도
                </Button>
            )}
        </div>
    );
}
