import { useState, useRef, useEffect } from "react";
import { useFetcher } from "react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { HugeiconsIcon } from "@hugeicons/react";
import { Camera01Icon, Loading03Icon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { Switch } from "~/components/ui/switch";

interface ProfileEditDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user: {
        id: string;
        name: string | null;
        bio: string | null;
        image: string | null;
        coverImage: string | null;
        isPrivate?: boolean;
    };
}

export function ProfileEditDialog({ open, onOpenChange, user }: ProfileEditDialogProps) {
    const fetcher = useFetcher();
    const avatarUploadFetcher = useFetcher<{ success: boolean; media?: { url: string }; error?: string }>();
    const coverUploadFetcher = useFetcher<{ success: boolean; media?: { url: string }; error?: string }>();

    const [name, setName] = useState(user.name || "");
    const [bio, setBio] = useState(user.bio || "");
    const [avatarUrl, setAvatarUrl] = useState(user.image || "");
    const [coverUrl, setCoverUrl] = useState(user.coverImage || "");
    const [isPrivate, setIsPrivate] = useState(user.isPrivate || false);

    const avatarInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);

    // Initial state sync
    // Initial state sync
    useEffect(() => {
        if (open) {
            setName(user.name || "");
            setBio(user.bio || "");
            setAvatarUrl(user.image || "");
            setCoverUrl(user.coverImage || "");
            setIsPrivate(user.isPrivate || false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    // Avatar Upload Effect
    useEffect(() => {
        if (avatarUploadFetcher.data?.success && avatarUploadFetcher.data.media) {
            setAvatarUrl(avatarUploadFetcher.data.media.url);
            toast.success("프로필 이미지가 업로드되었습니다.");
        } else if (avatarUploadFetcher.data?.error) {
            toast.error(avatarUploadFetcher.data.error);
        }
    }, [avatarUploadFetcher.data]);

    // Cover Upload Effect
    useEffect(() => {
        if (coverUploadFetcher.data?.success && coverUploadFetcher.data.media) {
            setCoverUrl(coverUploadFetcher.data.media.url);
            toast.success("배너 이미지가 업로드되었습니다.");
        } else if (coverUploadFetcher.data?.error) {
            toast.error(coverUploadFetcher.data.error);
        }
    }, [coverUploadFetcher.data]);

    // Profile Update Effect
    useEffect(() => {
        if (fetcher.data && (fetcher.data as any).success) {
            toast.success("프로필이 업데이트되었습니다.");
            onOpenChange(false);
        } else if (fetcher.data && (fetcher.data as any).error) {
            toast.error((fetcher.data as any).error);
        }
    }, [fetcher.data, onOpenChange]);


    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover') => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);

        if (type === 'avatar') {
            avatarUploadFetcher.submit(formData, { method: "POST", action: "/api/upload", encType: "multipart/form-data" });
        } else {
            coverUploadFetcher.submit(formData, { method: "POST", action: "/api/upload", encType: "multipart/form-data" });
        }
    };

    const handleSubmit = () => {
        const formData = new FormData();
        formData.append("name", name);
        formData.append("bio", bio);
        formData.append("isPrivate", String(isPrivate));
        if (avatarUrl !== user.image) formData.append("image", avatarUrl);
        if (coverUrl !== user.coverImage) formData.append("coverImage", coverUrl);

        fetcher.submit(formData, { method: "PATCH", action: "/api/users" });
    };

    const isUpdating = fetcher.state === "submitting" || avatarUploadFetcher.state === "submitting" || coverUploadFetcher.state === "submitting";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] p-0 gap-0 overflow-hidden">
                <DialogHeader className="p-4 flex flex-row items-center justify-between border-b">
                    <div className="flex items-center gap-4">
                        <button onClick={() => onOpenChange(false)} className="text-sm font-bold">취소</button>
                        <DialogTitle className="text-xl font-bold">프로필 수정</DialogTitle>
                    </div>
                    <Button
                        onClick={handleSubmit}
                        disabled={isUpdating}
                        className="rounded-full px-6 font-bold"
                    >
                        {isUpdating && <HugeiconsIcon icon={Loading03Icon} className="mr-2 h-4 w-4 animate-spin" />}
                        저장
                    </Button>
                </DialogHeader>

                <div className="relative">
                    {/* Cover Image Area */}
                    <div className="h-48 bg-slate-200 dark:bg-slate-800 relative group">
                        {coverUrl && (
                            <img src={coverUrl} alt="Cover" className="h-full w-full object-cover" />
                        )}
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center gap-4 opacity-100 transition-opacity">
                            <button
                                onClick={() => coverInputRef.current?.click()}
                                className="p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                            >
                                <HugeiconsIcon icon={Camera01Icon} strokeWidth={2} className="h-6 w-6" />
                            </button>
                        </div>
                        <input
                            type="file"
                            ref={coverInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => handleFileChange(e, 'cover')}
                        />
                    </div>

                    {/* Avatar Area */}
                    <div className="absolute top-32 left-4 h-32 w-32 rounded-full border-4 border-background bg-background overflow-hidden group">
                        <Avatar className="h-full w-full">
                            <AvatarImage src={avatarUrl || undefined} className="object-cover" />
                            <AvatarFallback className="text-4xl">{name?.[0] || "?"}</AvatarFallback>
                        </Avatar>
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-100 transition-opacity">
                            <button
                                onClick={() => avatarInputRef.current?.click()}
                                className="p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                            >
                                <HugeiconsIcon icon={Camera01Icon} strokeWidth={2} className="h-6 w-6" />
                            </button>
                        </div>
                        <input
                            type="file"
                            ref={avatarInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => handleFileChange(e, 'avatar')}
                        />
                    </div>
                </div>

                <div className="mt-20 px-4 pb-8 flex flex-col gap-6">
                    <div className="grid gap-2">
                        <label htmlFor="name" className="text-sm font-medium">이름</label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="이름"
                        />
                    </div>

                    <div className="grid gap-2">
                        <label htmlFor="bio" className="text-sm font-medium">자기소개</label>
                        <Textarea
                            id="bio"
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            placeholder="자기소개를 입력하세요"
                            className="min-h-[100px] resize-none"
                        />
                    </div>

                    {/* API 업데이트를 위해 isPrivate 필드 추가 */}
                    <div className="flex items-center justify-between space-x-2 border p-4 rounded-lg">
                        <div className="space-y-0.5">
                            <label htmlFor="is-private" className="text-sm font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                비공개 계정
                            </label>
                            <div className="text-[12px] text-muted-foreground">
                                계정을 비공개로 설정하면 승인된 팔로워만 내 트윗과 프로필 정보를 볼 수 있습니다.
                            </div>
                        </div>
                        <Switch
                            id="is-private"
                            checked={isPrivate}
                            onChange={(e) => setIsPrivate(e.target.checked)}
                        />
                    </div>
                </div>

            </DialogContent>
        </Dialog>
    );
}
