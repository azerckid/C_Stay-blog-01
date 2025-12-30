import { HugeiconsIcon } from "@hugeicons/react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Calendar } from "~/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator
} from "~/components/ui/dropdown-menu";
import {
    Image01Icon,
    AiBrain01Icon,
    Location01Icon,
    Calendar03Icon,
    Cancel01Icon,
    Tag01Icon,
    Globe02Icon,
    UserGroupIcon,
    LockKeyIcon,
    ArrowDown01Icon
} from "@hugeicons/core-free-icons";
import { useSession } from "~/lib/auth-client";
import { cn } from "~/lib/utils";
import { useState, useEffect, useRef } from "react";
import { useFetcher, useRevalidator } from "react-router";
import { toast } from "sonner";
import { LocationPickerDialog, type LocationData } from "~/components/maps/location-picker-dialog";
import { TagPickerDialog } from "./tag-picker-dialog";
import { Badge } from "~/components/ui/badge";

interface TweetComposeProps {
    parentId?: string;
    placeholder?: string;
}

interface MediaAttachment {
    url: string;
    publicId: string;
    type: "image" | "video";
}

type Visibility = "PUBLIC" | "FOLLOWERS" | "PRIVATE";

export function TweetCompose({ parentId, placeholder = "무슨 일이 일어나고 있나요?" }: TweetComposeProps) {
    const { data: session } = useSession();
    const [content, setContent] = useState("");
    const [attachments, setAttachments] = useState<MediaAttachment[]>([]);
    const [location, setLocation] = useState<LocationData | null>(null);
    const [locationPickerOpen, setLocationPickerOpen] = useState(false);

    // Tags State
    const [tags, setTags] = useState<string[]>([]);
    const [tagPickerOpen, setTagPickerOpen] = useState(false);
    const [date, setDate] = useState<Date | undefined>(undefined);

    // Visibility State
    const [visibility, setVisibility] = useState<Visibility>("PUBLIC");

    const fetcher = useFetcher(); // Tweet submission
    const uploadFetcher = useFetcher(); // File upload
    const revalidator = useRevalidator();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initialize visibility based on user preference (isPrivate)
    useEffect(() => {
        if ((session?.user as any)?.isPrivate) {
            setVisibility("FOLLOWERS");
        } else {
            setVisibility("PUBLIC");
        }
    }, [(session?.user as any)?.isPrivate]);

    // Tweet Submission Result
    useEffect(() => {
        if (fetcher.state === "idle" && fetcher.data) {
            const result = fetcher.data as any;
            if (result.success) {
                toast.success(parentId ? "답글이 게시되었습니다!" : "트윗이 게시되었습니다!");
                setContent("");
                setAttachments([]); // Clear attachments
                setLocation(null); // Clear location
                setTags([]); // Clear tags
                setDate(undefined);
                // Reset visibility
                if ((session?.user as any)?.isPrivate) {
                    setVisibility("FOLLOWERS");
                } else {
                    setVisibility("PUBLIC");
                }
                revalidator.revalidate();
            } else if (result.error) {
                toast.error(result.error);
            }
        }
    }, [fetcher.state, fetcher.data, parentId, (session?.user as any)?.isPrivate]);

    // File Upload Result
    useEffect(() => {
        if (uploadFetcher.state === "idle" && uploadFetcher.data) {
            const result = uploadFetcher.data as any;
            if (result.success && result.media) {
                setAttachments(prev => [...prev, result.media]);
            } else if (result.error) {
                toast.error(result.error);
            }
        }
    }, [uploadFetcher.state, uploadFetcher.data]);

    const isSubmitting = fetcher.state !== "idle" || uploadFetcher.state !== "idle";
    const isUploading = uploadFetcher.state !== "idle";

    const handleSubmit = () => {
        if ((!content.trim() && attachments.length === 0) || isSubmitting) return;

        const formData = new FormData();
        formData.append("content", content);
        formData.append("visibility", visibility);

        if (parentId) {
            formData.append("parentId", parentId);
        }
        if (attachments.length > 0) {
            formData.append("media", JSON.stringify(attachments));
        }
        if (location) {
            formData.append("location", JSON.stringify(location));
        }
        if (tags.length > 0) {
            formData.append("tags", JSON.stringify(tags));
        }
        if (date) {
            formData.append("travelDate", date.toISOString());
        }

        fetcher.submit(formData, {
            method: "POST",
            action: "/api/tweets",
            encType: "multipart/form-data",
        });
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Basic validation
        if (file.size > 10 * 1024 * 1024) {
            toast.error("파일 크기는 10MB를 초과할 수 없습니다.");
            return;
        }

        if (attachments.length >= 4) {
            toast.error("이미지는 최대 4장까지 첨부할 수 없습니다.");
            return;
        }

        const formData = new FormData();
        formData.append("file", file);
        uploadFetcher.submit(formData, { method: "POST", action: "/api/upload", encType: "multipart/form-data" });

        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const getVisibilityConfig = (v: Visibility) => {
        switch (v) {
            case "PUBLIC":
                return { label: "모든 사람", icon: Globe02Icon, color: "text-primary" };
            case "FOLLOWERS":
                return { label: "팔로워", icon: UserGroupIcon, color: "text-green-500" };
            case "PRIVATE":
                return { label: "나만 보기", icon: LockKeyIcon, color: "text-muted-foreground" };
        }
    };

    const activeVisibility = getVisibilityConfig(visibility);

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
                {/* Visibility Button */}
                {!parentId && (
                    <div className="flex">
                        <DropdownMenu>
                            <DropdownMenuTrigger className="outline-none">
                                <span

                                    className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-border text-xs font-semibold text-primary hover:bg-primary/5 transition-colors cursor-pointer disabled:opacity-50"
                                >
                                    <HugeiconsIcon icon={activeVisibility.icon} className={cn("w-3.5 h-3.5", activeVisibility.color)} />
                                    <span>{activeVisibility.label}에게 표시</span>
                                    <HugeiconsIcon icon={ArrowDown01Icon} className="w-3 h-3" />
                                </span>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-[200px]">
                                <DropdownMenuLabel>공개 범위 설정</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={() => setVisibility("PUBLIC")}
                                    disabled={(session?.user as any)?.isPrivate} // 비공개 계정은 전체 공개 불가
                                    className="gap-2"
                                >
                                    <HugeiconsIcon icon={Globe02Icon} className="w-4 h-4 text-primary" />
                                    <div className="flex flex-col">
                                        <span className="font-medium">모든 사람</span>
                                        <span className="text-[10px] text-muted-foreground">누구나 볼 수 있습니다</span>
                                    </div>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setVisibility("FOLLOWERS")} className="gap-2">
                                    <HugeiconsIcon icon={UserGroupIcon} className="w-4 h-4 text-green-500" />
                                    <div className="flex flex-col">
                                        <span className="font-medium">팔로워</span>
                                        <span className="text-[10px] text-muted-foreground">나를 팔로우하는 사람만</span>
                                    </div>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setVisibility("PRIVATE")} className="gap-2">
                                    <HugeiconsIcon icon={LockKeyIcon} className="w-4 h-4 text-muted-foreground" />
                                    <div className="flex flex-col">
                                        <span className="font-medium">나만 보기</span>
                                        <span className="text-[10px] text-muted-foreground">나에게만 보입니다</span>
                                    </div>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )}

                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={placeholder}
                    disabled={isSubmitting}
                    className="w-full bg-transparent text-xl outline-none resize-none pt-2 min-h-[100px] placeholder:text-muted-foreground/60 disabled:opacity-50"
                />

                {/* Location Preview */}
                {location && (
                    <div className="flex items-center gap-2">
                        <div className="bg-primary/10 text-primary px-3 py-1.5 rounded-full flex items-center gap-2 w-fit">
                            <HugeiconsIcon icon={Location01Icon} className="w-4 h-4" />
                            <span className="text-sm font-bold">{location.name}</span>
                            <button
                                onClick={() => setLocation(null)}
                                className="hover:bg-primary/20 rounded-full p-0.5"
                            >
                                <HugeiconsIcon icon={Cancel01Icon} className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Tags Preview */}
                {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {tags.map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs pointer-events-none">
                                #{tag}
                                <button
                                    onClick={() => setTags(prev => prev.filter(t => t !== tag))}
                                    className="ml-1 hover:bg-secondary/50 rounded-full p-0.5"
                                >
                                    <HugeiconsIcon icon={Cancel01Icon} className="w-2.5 h-2.5" />
                                </button>
                            </Badge>
                        ))}
                    </div>
                )}

                {/* Date Preview */}
                {date && (
                    <div className="flex items-center gap-2 mb-2">
                        <div className="bg-primary/10 text-primary px-3 py-1.5 rounded-full flex items-center gap-2 w-fit">
                            <HugeiconsIcon icon={Calendar03Icon} className="w-4 h-4" />
                            <span className="text-sm font-bold">{format(date, "yyyy년 MM월 dd일", { locale: ko })}</span>
                            <button
                                onClick={() => setDate(undefined)}
                                className="hover:bg-primary/20 rounded-full p-0.5"
                            >
                                <HugeiconsIcon icon={Cancel01Icon} className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Attachments Preview */}
                {attachments.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto py-2">
                        {attachments.map((media, index) => (
                            <div key={media.publicId} className="relative w-24 h-24 rounded-xl overflow-hidden border border-border flex-shrink-0 group">
                                {media.type === 'video' ? (
                                    <video src={media.url} className="w-full h-full object-cover" />
                                ) : (
                                    <img src={media.url} alt="attachment" className="w-full h-full object-cover" />
                                )
                                }
                                <button
                                    onClick={() => removeAttachment(index)}
                                    type="button"
                                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-black/80 transition-colors"
                                >
                                    <HugeiconsIcon icon={Cancel01Icon} className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                        {isUploading && (
                            <div className="w-24 h-24 rounded-xl border border-border flex items-center justify-center bg-secondary/50 animate-pulse">
                                <span className="text-xs text-muted-foreground">업로드 중...</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between border-t border-border pt-3">
                    <div className="flex items-center -ml-2 text-primary">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            accept="image/*,video/*"
                            className="hidden"
                        />
                        <button
                            type="button"
                            title="이미지/동영상"
                            disabled={isSubmitting || attachments.length >= 4}
                            onClick={() => fileInputRef.current?.click()}
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
                            onClick={() => setLocationPickerOpen(true)}
                            className="p-2 hover:bg-primary/10 rounded-full transition-colors hidden sm:block disabled:opacity-50"
                        >
                            <HugeiconsIcon icon={Location01Icon} strokeWidth={2} className="h-5 w-5" />
                        </button>
                        <button
                            type="button"
                            title="태그"
                            disabled={isSubmitting}
                            onClick={() => setTagPickerOpen(true)}
                            className="p-2 hover:bg-primary/10 rounded-full transition-colors hidden sm:block disabled:opacity-50"
                        >
                            <HugeiconsIcon icon={Tag01Icon} strokeWidth={2} className="h-5 w-5" />
                        </button>
                        <Popover>
                            <PopoverTrigger
                                title="일정"
                                disabled={isSubmitting}
                                className={cn("p-2 hover:bg-primary/10 rounded-full transition-colors hidden sm:block disabled:opacity-50", date && "text-primary")}
                            >
                                <HugeiconsIcon icon={Calendar03Icon} strokeWidth={2} className="h-5 w-5" />
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={setDate}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={(!content.trim() && attachments.length === 0 && tags.length === 0) || isSubmitting}
                        className={cn(
                            "text-white font-bold py-2 px-5 rounded-full transition-all",
                            (content.trim() || attachments.length > 0 || tags.length > 0) && !isSubmitting ? "bg-primary hover:bg-primary/90" : "bg-primary/50 cursor-not-allowed"
                        )}
                    >
                        {isUploading ? "업로드 중..." : isSubmitting ? "게시 중..." : "게시하기"}
                    </button>
                </div>
            </div>

            <LocationPickerDialog
                open={locationPickerOpen}
                onOpenChange={setLocationPickerOpen}
                onLocationSelect={(loc) => {
                    setLocation(loc);
                    setLocationPickerOpen(false);
                }}
            />
            <TagPickerDialog
                open={tagPickerOpen}
                onOpenChange={setTagPickerOpen}
                onTagsSelected={(selected) => setTags(selected)}
                initialTags={tags}
            />
        </div>
    );
}
