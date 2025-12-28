import { HugeiconsIcon } from "@hugeicons/react";
import { Image01Icon, AiBrain01Icon, Location01Icon, Calendar03Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { useSession } from "~/lib/auth-client";
import { cn } from "~/lib/utils";
import { useState, useEffect, useRef } from "react";
import { useFetcher, useRevalidator } from "react-router";
import { toast } from "sonner";

interface TweetComposeProps {
    parentId?: string;
    placeholder?: string;
}

interface MediaAttachment {
    url: string;
    publicId: string;
    type: "image" | "video";
}

export function TweetCompose({ parentId, placeholder = "무슨 일이 일어나고 있나요?" }: TweetComposeProps) {
    const { data: session } = useSession();
    const [content, setContent] = useState("");
    const [attachments, setAttachments] = useState<MediaAttachment[]>([]);

    const fetcher = useFetcher(); // Tweet submission
    const uploadFetcher = useFetcher(); // File upload
    const revalidator = useRevalidator();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Tweet Submission Result
    useEffect(() => {
        if (fetcher.state === "idle" && fetcher.data) {
            const result = fetcher.data as any;
            if (result.success) {
                toast.success(parentId ? "답글이 게시되었습니다!" : "트윗이 게시되었습니다!");
                setContent("");
                setAttachments([]); // Clear attachments
                revalidator.revalidate();
            } else if (result.error) {
                toast.error(result.error);
            }
        }
    }, [fetcher.state, fetcher.data, parentId]);

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

        // server-side action 호출
        fetcher.submit(
            {
                content,
                ...(parentId ? { parentId } : {}),
                ...(attachments.length > 0 ? { media: JSON.stringify(attachments) } : {})
            },
            { method: "POST", action: "/api/tweets" }
        );
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
            toast.error("이미지는 최대 4장까지 첨부할 수 있습니다.");
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
                    placeholder={placeholder}
                    disabled={isSubmitting}
                    className="w-full bg-transparent text-xl outline-none resize-none pt-2 min-h-[100px] placeholder:text-muted-foreground/60 disabled:opacity-50"
                />

                {/* Attachments Preview */}
                {attachments.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto py-2">
                        {attachments.map((media, index) => (
                            <div key={media.publicId} className="relative w-24 h-24 rounded-xl overflow-hidden border border-border flex-shrink-0 group">
                                {media.type === 'video' ? (
                                    <video src={media.url} className="w-full h-full object-cover" />
                                ) : (
                                    <img src={media.url} alt="attachment" className="w-full h-full object-cover" />
                                )}
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
                        disabled={(!content.trim() && attachments.length === 0) || isSubmitting}
                        className={cn(
                            "text-white font-bold py-2 px-5 rounded-full transition-all",
                            (content.trim() || attachments.length > 0) && !isSubmitting ? "bg-primary hover:bg-primary/90" : "bg-primary/50 cursor-not-allowed"
                        )}
                    >
                        {isUploading ? "업로드 중..." : isSubmitting ? "게시 중..." : "게시하기"}
                    </button>
                </div>
            </div>
        </div>
    );
}
