import { HugeiconsIcon } from "@hugeicons/react";
import { PackageSearchIcon } from "@hugeicons/core-free-icons";

interface EmptyStateProps {
    title?: string;
    message?: string;
    icon?: any;
    children?: React.ReactNode;
}

export function EmptyState({
    title = "표시할 내용이 없습니다",
    message = "아직 등록된 정보가 없거나 검색 결과가 없습니다.",
    icon = PackageSearchIcon,
    children
}: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center p-12 text-center gap-4">
            <div className="bg-muted p-5 rounded-full">
                <HugeiconsIcon icon={icon} className="h-12 w-12 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <div className="space-y-2">
                <h3 className="text-xl font-bold">{title}</h3>
                <p className="text-muted-foreground max-w-xs mx-auto text-sm leading-relaxed">
                    {message}
                </p>
            </div>
            {children && (
                <div className="mt-2">
                    {children}
                </div>
            )}
        </div>
    );
}
