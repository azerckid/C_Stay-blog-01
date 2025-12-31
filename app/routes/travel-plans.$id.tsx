import { DateTime } from "luxon";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    Airplane01Icon,
    Calendar03Icon,
    ArrowLeft01Icon,
    MoreHorizontalIcon,
    Edit01Icon,
    Delete02Icon,
    PlusSignIcon,
    Location01Icon,
    Clock01Icon,
    CheckmarkCircle01Icon,
    CircleIcon
} from "@hugeicons/core-free-icons";
import { Button } from "~/components/ui/button";
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
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "~/components/ui/select";
import { toast } from "sonner";
import { cn } from "~/lib/utils";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "~/components/ui/tabs";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { TweetCard } from "~/components/tweet/tweet-card";

import { type LoaderFunctionArgs, data } from "react-router";
import { getSession } from "~/lib/auth-utils.server";
import { prisma } from "~/lib/prisma.server";
import { useLoaderData, useNavigate, useFetcher } from "react-router";
import { useState, useEffect } from "react";

export async function loader({ request, params }: LoaderFunctionArgs) {
    const { id: planId } = params;
    const session = await getSession(request);
    const userId = session?.user?.id;

    if (!planId) {
        return data({ error: "잘못된 접근입니다." }, { status: 400 });
    }

    const plan = await prisma.travelPlan.findUnique({
        where: { id: planId },
        include: {
            items: {
                orderBy: { order: "asc" }
            },
            tweets: {
                where: { deletedAt: null },
                orderBy: { createdAt: "desc" },
                include: {
                    user: true,
                    media: true,
                    _count: {
                        select: {
                            likes: true,
                            replies: true,
                            retweets: true,
                        }
                    },
                    likes: userId ? {
                        where: { userId },
                        select: { userId: true }
                    } : false,
                    retweets: userId ? {
                        where: { userId },
                        select: { userId: true }
                    } : false,
                    bookmarks: userId ? {
                        where: { userId },
                        select: { userId: true }
                    } : false,
                    tags: {
                        include: {
                            travelTag: true
                        }
                    },
                    travelPlan: true
                }
            }
        }
    });

    if (!plan) {
        return data({ error: "여행 계획을 찾을 수 없습니다." }, { status: 404 });
    }

    const formattedTweets = plan.tweets.map((tweet: any) => ({
        id: tweet.id,
        content: tweet.content,
        createdAt: DateTime.fromJSDate(tweet.createdAt).setLocale("ko").toRelative() || "방금 전",
        fullCreatedAt: DateTime.fromJSDate(tweet.createdAt).setLocale("ko").toLocaleString(DateTime.DATETIME_MED),
        user: {
            id: tweet.user.id,
            name: tweet.user.name || "알 수 없음",
            username: tweet.user.email.split("@")[0],
            image: tweet.user.image,
        },
        media: tweet.media.map((m: any) => ({
            id: m.id,
            url: m.url,
            type: m.type as "IMAGE" | "VIDEO",
            altText: m.altText
        })),
        stats: {
            likes: tweet._count.likes,
            replies: tweet._count.replies,
            retweets: tweet._count.retweets,
            views: "0",
        },
        isLiked: tweet.likes && tweet.likes.length > 0,
        isRetweeted: tweet.retweets && tweet.retweets.length > 0,
        isBookmarked: tweet.bookmarks && tweet.bookmarks.length > 0,
        location: tweet.locationName ? {
            name: tweet.locationName,
            latitude: tweet.latitude,
            longitude: tweet.longitude,
            address: tweet.address,
            city: tweet.city,
            country: tweet.country,
            travelDate: tweet.travelDate ? new Date(tweet.travelDate).toLocaleDateString() : undefined,
        } : undefined,
        tags: tweet.tags.map((t: any) => ({
            id: t.travelTag.id,
            name: t.travelTag.name,
            slug: t.travelTag.slug
        })),
        travelPlan: tweet.travelPlan ? {
            id: tweet.travelPlan.id,
            title: tweet.travelPlan.title,
        } : undefined,
        travelDate: tweet.travelDate ? new Date(tweet.travelDate).toISOString() : null
    }));

    return { plan, tweets: formattedTweets };
}

export default function TravelPlanDetailPage() {
    const { plan, tweets, error } = useLoaderData<typeof loader>() as any;
    const navigate = useNavigate();
    const fetcher = useFetcher();
    const itemFetcher = useFetcher();
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);

    useEffect(() => {
        if (fetcher.state === "idle" && fetcher.data) {
            if ((fetcher.data as any).success) {
                toast.success("여행 계획이 삭제되었습니다.");
                navigate("/travel-plans", { replace: true });
            } else if ((fetcher.data as any).travelPlan) {
                toast.success("여행 계획이 수정되었습니다.");
                setIsEditDialogOpen(false);
            } else if ((fetcher.data as any).error) {
                toast.error((fetcher.data as any).error);
            }
        }
    }, [fetcher.state, fetcher.data, navigate]);

    useEffect(() => {
        if (itemFetcher.state === "idle" && itemFetcher.data) {
            if ((itemFetcher.data as any).item) {
                toast.success(editingItem ? "일정이 수정되었습니다." : "새 일정이 추가되었습니다.");
                setIsAddItemDialogOpen(false);
                setEditingItem(null);
            } else if ((itemFetcher.data as any).success) {
                toast.success("일정이 삭제되었습니다.");
            } else if ((itemFetcher.data as any).error) {
                toast.error((itemFetcher.data as any).error);
            }
        }
    }, [itemFetcher.state, itemFetcher.data, editingItem]);

    if (error) {
        return <div className="p-4 text-destructive">{error}</div>;
    }

    const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        fetcher.submit(formData, { method: "PATCH", action: `/api/travel-plans/${plan.id}` });
    };

    const handleDelete = () => {
        if (confirm("정말로 이 여행 계획을 삭제하시겠습니까? 연결된 트윗의 정보는 유지되지만 일정 정보는 사라집니다.")) {
            fetcher.submit({}, { method: "DELETE", action: `/api/travel-plans/${plan.id}` });
        }
    };

    const handleDeleteItem = (itemId: string) => {
        if (confirm("정말로 이 일정을 삭제하시겠습니까?")) {
            itemFetcher.submit({}, { method: "DELETE", action: `/api/travel-plan-items/${itemId}` });
        }
    };

    const handleItemSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        if (editingItem) {
            itemFetcher.submit(formData, { method: "PATCH", action: `/api/travel-plan-items/${editingItem.id}` });
        } else {
            formData.append("travelPlanId", plan.id);
            itemFetcher.submit(formData, { method: "POST", action: "/api/travel-plan-items" });
        }
    };

    const openEditItem = (item: any) => {
        setEditingItem(item);
        setIsAddItemDialogOpen(true);
    };

    return (
        <div className="flex flex-col min-h-screen">
            <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center gap-4">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 hover:bg-accent rounded-full transition-colors"
                >
                    <HugeiconsIcon icon={ArrowLeft01Icon} className="h-5 w-5" />
                </button>
                <div className="flex-1">
                    <h1 className="text-xl font-bold">{plan.title}</h1>
                    <p className="text-xs text-muted-foreground">{tweets.length}개의 게시물</p>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger>
                        <Button variant="ghost" size="icon" className="rounded-full">
                            <HugeiconsIcon icon={MoreHorizontalIcon} className="h-5 w-5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
                            <HugeiconsIcon icon={Edit01Icon} className="h-4 w-4 mr-2" />
                            <span>일정 수정</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={handleDelete}
                        >
                            <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4 mr-2" />
                            <span>일정 삭제</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </header>

            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>여행 계획 수정</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleUpdate} className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="title">여행 제목</Label>
                            <Input
                                id="title"
                                name="title"
                                defaultValue={plan.title}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="description">설명</Label>
                            <Textarea
                                id="description"
                                name="description"
                                defaultValue={plan.description || ""}
                                className="resize-none"
                                rows={3}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="startDate">시작일</Label>
                                <Input
                                    id="startDate"
                                    name="startDate"
                                    type="date"
                                    defaultValue={plan.startDate ? DateTime.fromJSDate(new Date(plan.startDate)).toISODate() || undefined : undefined}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="endDate">종료일</Label>
                                <Input
                                    id="endDate"
                                    name="endDate"
                                    type="date"
                                    defaultValue={plan.endDate ? DateTime.fromJSDate(new Date(plan.endDate)).toISODate() || undefined : undefined}
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="status">상태</Label>
                            <Select name="status" defaultValue={plan.status}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PLANNING">준비 중</SelectItem>
                                    <SelectItem value="ONGOING">여행 중</SelectItem>
                                    <SelectItem value="COMPLETED">완료됨</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <DialogFooter className="mt-4">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setIsEditDialogOpen(false)}
                                disabled={fetcher.state !== "idle"}
                            >
                                취소
                            </Button>
                            <Button type="submit" disabled={fetcher.state !== "idle"}>
                                {fetcher.state !== "idle" ? "저장 중..." : "변경사항 저장"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={isAddItemDialogOpen} onOpenChange={(open) => {
                setIsAddItemDialogOpen(open);
                if (!open) setEditingItem(null);
            }}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{editingItem ? "일정 수정" : "새 일정 추가"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleItemSubmit} className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="item-title">활동 제목</Label>
                            <Input
                                id="item-title"
                                name="title"
                                placeholder="예: 루브르 박물관 방문"
                                defaultValue={editingItem?.title}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="item-description">설명</Label>
                            <Textarea
                                id="item-description"
                                name="description"
                                placeholder="활동에 대한 메모"
                                defaultValue={editingItem?.description || ""}
                                className="resize-none"
                                rows={2}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="item-date">날짜</Label>
                                <Input
                                    id="item-date"
                                    name="date"
                                    type="date"
                                    defaultValue={editingItem?.date ? DateTime.fromJSDate(new Date(editingItem.date)).toISODate() || undefined : undefined}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="item-time">시간</Label>
                                <Input
                                    id="item-time"
                                    name="time"
                                    type="time"
                                    defaultValue={editingItem?.time || ""}
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="item-location">장소</Label>
                            <Input
                                id="item-location"
                                name="locationName"
                                placeholder="장소 이름"
                                defaultValue={editingItem?.locationName || ""}
                            />
                        </div>
                        {editingItem && (
                            <div className="grid gap-2">
                                <Label htmlFor="item-status">상태</Label>
                                <Select name="status" defaultValue={editingItem.status}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="TODO">할 일</SelectItem>
                                        <SelectItem value="IN_PROGRESS">진행 중</SelectItem>
                                        <SelectItem value="DONE">완료됨</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <DialogFooter className="mt-4">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setIsAddItemDialogOpen(false)}
                                disabled={itemFetcher.state !== "idle"}
                            >
                                취소
                            </Button>
                            <Button type="submit" disabled={itemFetcher.state !== "idle"}>
                                {itemFetcher.state !== "idle" ? "저장 중..." : (editingItem ? "수정 완료" : "일정 추가")}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <div className="p-5 border-b border-border bg-accent/5">
                {plan.description && (
                    <p className="text-sm text-muted-foreground mb-4 whitespace-pre-wrap">{plan.description}</p>
                )}
                <div className="flex flex-wrap gap-4 text-sm font-medium">
                    {plan.startDate && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                            <HugeiconsIcon icon={Calendar03Icon} className="h-4 w-4" />
                            <span>
                                {DateTime.fromJSDate(new Date(plan.startDate)).setLocale("ko").toFormat("yyyy년 MM월 dd일")}
                                {plan.endDate && ` ~ ${DateTime.fromJSDate(new Date(plan.endDate)).setLocale("ko").toFormat("MM월 dd일")}`}
                            </span>
                        </div>
                    )}
                    <div className="flex items-center gap-1.5 text-primary">
                        <HugeiconsIcon icon={Airplane01Icon} className="h-4 w-4" />
                        <span>{plan.status === "PLANNING" ? "여행 준비 중" : plan.status === "ONGOING" ? "현재 여행 중" : "추억 여행 완료"}</span>
                    </div>
                </div>
            </div>

            <Tabs defaultValue="itinerary" className="w-full">
                <TabsList className="w-full justify-start h-auto p-0 bg-transparent border-b border-border rounded-none">
                    <TabsTrigger
                        value="itinerary"
                        className="flex-1 py-3 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none"
                    >
                        일정
                    </TabsTrigger>
                    <TabsTrigger
                        value="tweets"
                        className="flex-1 py-3 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none"
                    >
                        게시물
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="itinerary" className="mt-0">
                    <div className="p-4 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold">세부 일정</h2>
                            <Button
                                size="sm"
                                className="h-8 gap-1.5"
                                onClick={() => setIsAddItemDialogOpen(true)}
                            >
                                <HugeiconsIcon icon={PlusSignIcon} className="h-4 w-4" />
                                일정 추가
                            </Button>
                        </div>

                        {plan.items?.length === 0 ? (
                            <div className="text-center py-10 bg-accent/5 rounded-xl border border-dashed border-border">
                                <p className="text-muted-foreground">아직 등록된 일정이 없습니다.</p>
                                <Button
                                    variant="link"
                                    className="mt-2"
                                    onClick={() => setIsAddItemDialogOpen(true)}
                                >
                                    첫 번째 일정 추가하기
                                </Button>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {plan.items.map((item: any, index: number) => (
                                    <div key={item.id} className="relative group">
                                        {index < plan.items.length - 1 && (
                                            <div className="absolute left-[19px] top-10 bottom-0 w-0.5 bg-border z-0" />
                                        )}
                                        <div className="flex gap-4 p-4 rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex-shrink-0 mt-1 z-10">
                                                <div className={cn(
                                                    "h-10 w-10 rounded-full flex items-center justify-center",
                                                    item.status === "DONE" ? "bg-green-500/10 text-green-600" : "bg-primary/5 text-primary"
                                                )}>
                                                    <HugeiconsIcon
                                                        icon={item.status === "DONE" ? CheckmarkCircle01Icon : item.status === "IN_PROGRESS" ? Clock01Icon : CircleIcon}
                                                        className="h-5 w-5"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <h3 className={cn(
                                                            "font-bold text-base",
                                                            item.status === "DONE" && "text-muted-foreground line-through"
                                                        )}>
                                                            {item.title}
                                                        </h3>
                                                        {item.locationName && (
                                                            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                                                                <HugeiconsIcon icon={Location01Icon} className="h-3.5 w-3.5" />
                                                                <span>{item.locationName}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <HugeiconsIcon icon={MoreHorizontalIcon} className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => openEditItem(item)}>
                                                                <HugeiconsIcon icon={Edit01Icon} className="h-4 w-4 mr-2" />
                                                                수정
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                className="text-destructive focus:text-destructive"
                                                                onClick={() => handleDeleteItem(item.id)}
                                                            >
                                                                <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4 mr-2" />
                                                                삭제
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>

                                                {item.description && (
                                                    <p className="text-sm text-card-foreground/80 mt-2 line-clamp-2">{item.description}</p>
                                                )}

                                                <div className="flex flex-wrap gap-3 mt-3">
                                                    {(item.date || item.time) && (
                                                        <Badge variant="secondary" className="font-normal text-xs gap-1 py-0.5">
                                                            <HugeiconsIcon icon={Clock01Icon} className="h-3 w-3" />
                                                            {item.date ? format(new Date(item.date), "MM.dd") : ""}
                                                            {item.time ? ` ${item.time}` : ""}
                                                        </Badge>
                                                    )}
                                                    {item.status && (
                                                        <Badge
                                                            variant="outline"
                                                            className={cn(
                                                                "text-[10px] px-1.5 py-0",
                                                                item.status === "DONE" && "bg-green-500/10 text-green-600 border-green-500/20",
                                                                item.status === "IN_PROGRESS" && "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                                            )}
                                                        >
                                                            {item.status === "DONE" ? "완료" : item.status === "IN_PROGRESS" ? "진행 중" : "대기"}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="tweets" className="mt-0">
                    <main className="flex-1">
                        {tweets.length === 0 ? (
                            <div className="text-center py-20">
                                <p className="text-muted-foreground">이 여행 계획에 연결된 트윗이 없습니다.</p>
                                <p className="text-sm text-muted-foreground mt-1">트윗 작성 시 이 여행 계획을 선택해보세요!</p>
                            </div>
                        ) : (
                            tweets.map((tweet: any) => (
                                <TweetCard key={tweet.id} {...tweet} />
                            ))
                        )}
                    </main>
                </TabsContent>
            </Tabs>
        </div>
    );
}

