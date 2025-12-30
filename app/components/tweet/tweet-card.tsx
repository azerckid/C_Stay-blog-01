import { HugeiconsIcon } from "@hugeicons/react";
import {
    Comment01Icon,
    RepeatIcon,
    FavouriteIcon,
    ViewIcon,
    Share01Icon,
    MoreHorizontalIcon,
    Delete02Icon,
    PencilEdit02Icon,
    Image01Icon,
    Cancel01Icon,
    Tag01Icon,
    PlusSignIcon,
    Calendar03Icon,
    Location01Icon
} from "@hugeicons/core-free-icons";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Badge } from "~/components/ui/badge";
import { TagPickerDialog } from "./tag-picker-dialog";
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
import { LocationPickerDialog, type LocationData } from "~/components/maps/location-picker-dialog";
import { Calendar } from "~/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
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
import { useState, useEffect, useRef } from "react";

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
    isRetweeted?: boolean; // 리트윗 여부 추가
    media?: {
        id: string;
        type: "IMAGE" | "VIDEO";
        url: string;
    }[];
    retweetedBy?: {
        name: string;
        username: string;
        retweetedAt?: string;
    };
    location?: {
        name: string;
        latitude?: number;
        longitude?: number;
    };
    tags?: {
        id: string;
        name: string;
        slug: string;
    }[];
    travelDate?: string | null;
}
import { useNavigate, Link } from "react-router";

export function TweetCard({ id, user, content, createdAt, fullCreatedAt, stats, isLiked = false, isRetweeted = false, media, retweetedBy, location, tags, travelDate }: TweetCardProps) {
    const navigate = useNavigate();
    const { data: session } = useSession();
    // ... (기존 hook 및 state 유지)
    const fetcher = useFetcher();
    const likeFetcher = useFetcher();
    const retweetFetcher = useFetcher();
    const uploadFetcher = useFetcher(); // File upload for editing
    const revalidator = useRevalidator();
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(content);

    // Media Editing State
    const [existingMedia, setExistingMedia] = useState(media || []);
    const [newAttachments, setNewAttachments] = useState<{ url: string; publicId: string; type: "image" | "video" }[]>([]);
    const [deletedMediaIds, setDeletedMediaIds] = useState<string[]>([]);
    const [editTags, setEditTags] = useState<string[]>([]);
    const [editTagPickerOpen, setEditTagPickerOpen] = useState(false);

    // Location & Date Editing State
    const [editLocation, setEditLocation] = useState<LocationData | null>(null);
    const [locationPickerOpen, setLocationPickerOpen] = useState(false);
    const [editDate, setEditDate] = useState<Date | undefined>(undefined);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 낙관적 UI를 위한 로컬 상태
    const [liked, setLiked] = useState(isLiked);
    const [likeCount, setLikeCount] = useState(stats?.likes ?? 0);
    const [retweeted, setRetweeted] = useState(isRetweeted);
    const [retweetCount, setRetweetCount] = useState(stats?.retweets ?? 0);

    const isOwner = session?.user?.id === user?.id;


    // ... (기존 핸들러 유지)
    const handleDelete = () => { /* ... */
        if (!confirm("정말로 이 트윗을 삭제하시겠습니까?")) return;
        if (id) {
            fetcher.submit({ tweetId: id }, { method: "DELETE", action: "/api/tweets" });
        }
    };
    const handleEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsEditing(true);
        setEditContent(content);
        setExistingMedia(media || []);
        setNewAttachments([]);
        setDeletedMediaIds([]);
        setEditTags(tags?.map(t => t.name) || []);
        // Initialize location: we might lack full address details from standard props, so handle carefully or fetch if needed.
        // For now, map available prop fields.
        if (location) {
            setEditLocation({
                name: location.name,
                latitude: location.latitude!,
                longitude: location.longitude!,
                address: "", // Missing in prop
                city: "", // Missing in prop
                country: "", // Missing in prop
                placeId: "existing"
            });
        } else {
            setEditLocation(null);
        }
        setEditDate(travelDate ? new Date(travelDate) : undefined);
    };
    const handleUpdate = () => { /* ... */
        if (!id) return;
        if (!editContent.trim()) {
            toast.error("내용을 입력해주세요.");
            return;
        }

        const payload: any = { tweetId: id, content: editContent };

        if (deletedMediaIds.length > 0) {
            payload.deletedMediaIds = JSON.stringify(deletedMediaIds);
        }
        if (newAttachments.length > 0) {
            payload.newMedia = JSON.stringify(newAttachments);
        }
        if (editLocation) {
            payload.location = JSON.stringify(editLocation);
        }
        if (editDate) {
            payload.travelDate = editDate.toISOString();
        }

        // Always send tags to ensure they are synced (empty array clears tags)
        payload.tags = JSON.stringify(editTags);

        fetcher.submit(
            payload,
            { method: "PATCH", action: "/api/tweets" }
        );
    };

    // File Upload Handler for Edit
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            toast.error("파일 크기는 10MB를 초과할 수 없습니다.");
            return;
        }

        const currentTotal = existingMedia.length + newAttachments.length;
        if (currentTotal >= 4) {
            toast.error("이미지는 최대 4장까지 첨부할 수 있습니다.");
            return;
        }

        const formData = new FormData();
        formData.append("file", file);
        uploadFetcher.submit(formData, { method: "POST", action: "/api/upload", encType: "multipart/form-data" });

        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    // Handle Upload Result
    useEffect(() => {
        if (uploadFetcher.state === "idle" && uploadFetcher.data) {
            const result = uploadFetcher.data as any;
            if (result.success && result.media) {
                setNewAttachments(prev => [...prev, result.media]);
            } else if (result.error) {
                toast.error(result.error);
            }
        }
    }, [uploadFetcher.state, uploadFetcher.data]);

    const removeExisting = (mediaId: string) => {
        setExistingMedia(prev => prev.filter(m => m.id !== mediaId));
        setDeletedMediaIds(prev => [...prev, mediaId]);
    };

    const removeNew = (index: number) => {
        setNewAttachments(prev => prev.filter((_, i) => i !== index));
    };
    const handleLike = (e: React.MouseEvent) => { /* ... */
        e.stopPropagation();
        if (!session) {
            toast.error("로그인이 필요합니다.");
            return;
        }
        if (!id) return;
        const newLiked = !liked;
        setLiked(newLiked);
        setLikeCount(prev => newLiked ? prev + 1 : prev - 1);
        likeFetcher.submit({ tweetId: id }, { method: "POST", action: "/api/likes" });
    };
    const handleRetweet = (e: React.MouseEvent) => { /* ... */
        e.stopPropagation();
        if (!session) {
            toast.error("로그인이 필요합니다.");
            return;
        }
        if (!id) return;
        const newRetweeted = !retweeted;
        setRetweeted(newRetweeted);
        setRetweetCount(prev => newRetweeted ? prev + 1 : prev - 1);
        retweetFetcher.submit({ tweetId: id }, { method: "POST", action: "/api/retweets" });
    };

    // ... (useEffect 유지)
    // 좋아요 API 응답 처리
    useEffect(() => {
        if (likeFetcher.state === "idle" && likeFetcher.data) {
            const result = likeFetcher.data as any;
            if (!result.success) {
                setLiked(!liked);
                setLikeCount(prev => liked ? prev - 1 : prev + 1);
                toast.error(result.error || "좋아요 처리에 실패했습니다.");
            }
        }
    }, [likeFetcher.state, likeFetcher.data]);

    // 리트윗 API 응답 처리
    useEffect(() => {
        if (retweetFetcher.state === "idle" && retweetFetcher.data) {
            const result = retweetFetcher.data as any;
            if (!result.success) {
                setRetweeted(!retweeted);
                setRetweetCount(prev => retweeted ? prev - 1 : prev + 1);
                toast.error(result.error || "리트윗 처리에 실패했습니다.");
            }
        }
    }, [retweetFetcher.state, retweetFetcher.data]);

    useEffect(() => { /* ... */
        if (fetcher.state === "idle" && fetcher.data) {
            const result = fetcher.data as any;
            if (result.success) {
                if (result.message === "트윗이 수정되었습니다.") {
                    toast.success("트윗이 수정되었습니다.");
                    setIsEditing(false);
                    revalidator.revalidate();
                } else if (result.message === "트윗이 삭제되었습니다.") {
                    toast.success("트윗이 삭제되었습니다.");
                    revalidator.revalidate();
                }
            } else if (result.error) {
                toast.error(result.error);
            }
        }
    }, [fetcher.state, fetcher.data]);

    const handleClick = () => { /* ... */
        if (id) {
            navigate(`/tweet/${id}`);
        }
    };

    return (
        <div
            onClick={handleClick}
            className="p-4 border-b border-border hover:bg-accent/20 transition-colors cursor-pointer flex flex-col gap-1 group/card"
        >
            {/* 리트윗 표시 (조건부 렌더링) */}
            {retweetedBy && (
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1 ml-10">
                    <HugeiconsIcon icon={RepeatIcon} strokeWidth={2} className="h-4 w-4" />
                    <span className="font-bold hover:underline" onClick={(e) => e.stopPropagation()}>
                        {retweetedBy.name}님이 리트윗했습니다
                    </span>
                </div>
            )}

            <div className="flex gap-3">
                {/* Left Column: Avatar */}
                <div className="flex-shrink-0 mr-3">
                    <Link
                        className="h-10 w-10 rounded-full bg-secondary border border-border overflow-hidden hover:opacity-80 transition-opacity block"
                        to={`/user/${user.id}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {user.image ? (
                            <img src={user.image} alt={user.name} className="h-full w-full object-cover" />
                        ) : (
                            <div className="h-full w-full flex items-center justify-center text-muted-foreground font-bold">
                                {user.name[0]}
                            </div>
                        )}
                    </Link>
                </div>
            </div>

            {/* Right Column: Content & Actions */}
            <div className="flex-1 min-w-0 flex flex-col">

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 overflow-hidden">
                        <Link
                            className="font-bold hover:underline truncate"
                            to={`/user/${user.id}`}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {user.name}
                        </Link>
                        <Link
                            className="text-muted-foreground text-sm truncate"
                            to={`/user/${user.id}`}
                            onClick={(e) => e.stopPropagation()}
                        >
                            @{user.username}
                        </Link>
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

                {/* Location Pill */}
                {/* Metadata: Location, Date, Tags */}
                {(location || travelDate || (tags && tags.length > 0)) && (
                    <div className="flex flex-wrap gap-3 mt-2 items-center">
                        {location && (
                            <div className="flex items-center gap-1 text-muted-foreground text-sm font-medium w-fit hover:underline cursor-pointer hover:text-primary transition-colors" onClick={(e) => { e.stopPropagation(); /* TODO: Show map */ }}>
                                <HugeiconsIcon icon={Location01Icon} className="h-4 w-4" />
                                <span>{location.name}</span>
                            </div>
                        )}
                        {travelDate && (
                            <div className="flex items-center gap-1 text-muted-foreground text-sm font-medium w-fit">
                                <HugeiconsIcon icon={Calendar03Icon} className="h-4 w-4" />
                                <span>{format(new Date(travelDate), "yyyy. MM. dd.", { locale: ko })}</span>
                            </div>
                        )}
                        {tags && tags.map(tag => (
                            <span
                                key={tag.id}
                                className="text-primary text-sm hover:underline cursor-pointer font-medium"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/tags/${tag.slug}`);
                                }}
                            >
                                #{tag.name}
                            </span>
                        ))}
                    </div>
                )}

                {/* Media Display */}
                {media && media.length > 0 && (
                    <div className={cn(
                        "mt-3 rounded-2xl overflow-hidden border border-border",
                        media.length > 1 ? "grid gap-0.5 aspect-[16/9]" : "",
                        media.length === 2 ? "grid-cols-2" : "",
                        media.length === 3 ? "grid-cols-2 grid-rows-2" : "",
                        media.length === 4 ? "grid-cols-2 grid-rows-2" : ""
                    )}>
                        {media.map((item, index) => {
                            const isThree = media.length === 3;
                            const isFirstOfThree = isThree && index === 0;

                            return (
                                <div
                                    key={item.url}
                                    className={cn(
                                        "relative overflow-hidden bg-secondary",
                                        media.length === 1 ? "w-full max-h-[600px]" : "w-full h-full",
                                        isFirstOfThree ? "row-span-2" : ""
                                    )}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        // TODO: Open lightbox/modal
                                    }}
                                >
                                    {item.type === 'VIDEO' ? (
                                        <video
                                            src={item.url}
                                            controls
                                            className={cn(
                                                "object-cover",
                                                media.length === 1 ? "w-full h-auto max-h-[600px]" : "w-full h-full"
                                            )}
                                        />
                                    ) : (
                                        <img
                                            src={item.url}
                                            alt="media"
                                            loading="lazy"
                                            className={cn(
                                                "object-cover hover:scale-105 transition-transform duration-300",
                                                media.length === 1 ? "w-full h-auto max-h-[600px]" : "w-full h-full"
                                            )}
                                        />
                                    )}
                                </div>
                            );
                        })}
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

                    <button
                        onClick={handleRetweet}
                        className={cn(
                            "flex items-center gap-2 group/action transition-colors pr-3",
                            retweeted ? "text-green-500" : "hover:text-green-500"
                        )}
                    >
                        <div className={cn(
                            "p-2 rounded-full transition-colors",
                            retweeted ? "bg-green-500/10" : "group-hover/action:bg-green-500/10"
                        )}>
                            <HugeiconsIcon
                                icon={RepeatIcon}
                                strokeWidth={retweeted ? 0 : 2}
                                className={cn(
                                    "h-4.5 w-4.5",
                                    retweeted && "fill-current"
                                )}
                            />
                        </div>
                        <span className={cn("text-xs", retweeted && "text-green-500")}>{retweetCount}</span>
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

                        {/* Edit Tags */}
                        <div className="flex flex-wrap gap-2 mt-3">
                            {editTags.map(tag => (
                                <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                                    #{tag}
                                    <button onClick={() => setEditTags(prev => prev.filter(t => t !== tag))} className="ml-1 hover:text-destructive">
                                        <HugeiconsIcon icon={Cancel01Icon} className="h-3 w-3" />
                                    </button>
                                </Badge>
                            ))}
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setEditTagPickerOpen(true)}
                                className="h-6 text-xs gap-1 rounded-full"
                            >
                                <HugeiconsIcon icon={PlusSignIcon} className="h-3 w-3" />
                                태그 추가
                            </Button>
                        </div>

                        <TagPickerDialog
                            open={editTagPickerOpen}
                            onOpenChange={setEditTagPickerOpen}
                            onTagsSelected={(newTags) => setEditTags(newTags)}
                            initialTags={editTags}
                        />

                        {/* Edit Media Preview */}
                        <div className="flex gap-2 overflow-x-auto py-2 mt-2">
                            {/* Existing Media */}
                            {existingMedia.map((m) => (
                                <div key={m.id} className="relative w-20 h-20 rounded-md overflow-hidden border border-border flex-shrink-0 group">
                                    {m.type === 'VIDEO' ? (
                                        <video src={m.url} className="w-full h-full object-cover" />
                                    ) : (
                                        <img src={m.url} alt="media" className="w-full h-full object-cover" />
                                    )}
                                    <button
                                        onClick={() => removeExisting(m.id)}
                                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-black/80 transition-colors"
                                    >
                                        <HugeiconsIcon icon={Cancel01Icon} className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                            {/* New Media */}
                            {newAttachments.map((m, idx) => (
                                <div key={idx} className="relative w-20 h-20 rounded-md overflow-hidden border border-border flex-shrink-0 group">
                                    {m.type === 'video' ? (
                                        <video src={m.url} className="w-full h-full object-cover" />
                                    ) : (
                                        <img src={m.url} alt="new media" className="w-full h-full object-cover" />
                                    )}
                                    <button
                                        onClick={() => removeNew(idx)}
                                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-black/80 transition-colors"
                                    >
                                        <HugeiconsIcon icon={Cancel01Icon} className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}

                            {/* Uploading Indicator */}
                            {uploadFetcher.state !== "idle" && (
                                <div className="w-20 h-20 rounded-md border border-border flex items-center justify-center bg-secondary/50 animate-pulse">
                                    <span className="text-[10px] text-muted-foreground">업로드...</span>
                                </div>
                            )}
                        </div>

                        {/* Add Media Button */}
                        <div className="mt-2">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                accept="image/*,video/*"
                                className="hidden"
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadFetcher.state !== "idle" || (existingMedia.length + newAttachments.length >= 4)}
                                className="p-2 hover:bg-primary/10 rounded-full transition-colors text-primary disabled:opacity-50"
                            >
                                <HugeiconsIcon icon={Image01Icon} strokeWidth={2} className="h-5 w-5" />
                            </button>

                            {/* Location Picker Trigger */}
                            <button
                                type="button"
                                onClick={() => setLocationPickerOpen(true)}
                                className={cn("p-2 hover:bg-primary/10 rounded-full transition-colors hidden sm:inline-block", editLocation && "text-primary")}
                            >
                                <HugeiconsIcon icon={Location01Icon} strokeWidth={2} className="h-5 w-5" />
                            </button>

                            {/* Date Picker Trigger */}
                            <Popover>
                                <PopoverTrigger
                                    className={cn("p-2 hover:bg-primary/10 rounded-full transition-colors hidden sm:inline-block", editDate && "text-primary")}
                                >
                                    <HugeiconsIcon icon={Calendar03Icon} strokeWidth={2} className="h-5 w-5" />
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={editDate}
                                        onSelect={setEditDate}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Previews for Edit Mode */}
                        {(editLocation || editDate) && (
                            <div className="flex flex-wrap gap-2 mt-2">
                                {editLocation && (
                                    <Badge variant="outline" className="gap-1 pl-2">
                                        <HugeiconsIcon icon={Location01Icon} className="h-3 w-3" />
                                        {editLocation.name}
                                        <button onClick={() => setEditLocation(null)} className="ml-1 hover:text-destructive">
                                            <HugeiconsIcon icon={Cancel01Icon} className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                )}
                                {editDate && (
                                    <Badge variant="outline" className="gap-1 pl-2">
                                        <HugeiconsIcon icon={Calendar03Icon} className="h-3 w-3" />
                                        {format(editDate, "yyyy. MM. dd.", { locale: ko })}
                                        <button onClick={() => setEditDate(undefined)} className="ml-1 hover:text-destructive">
                                            <HugeiconsIcon icon={Cancel01Icon} className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                )}
                            </div>
                        )}

                        <LocationPickerDialog
                            open={locationPickerOpen}
                            onOpenChange={setLocationPickerOpen}
                            onLocationSelect={setEditLocation}
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
