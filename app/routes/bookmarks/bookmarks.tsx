import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { getSession } from "~/lib/auth-utils.server";
import { useSession } from "~/lib/auth-client";
import { useLoaderData, data, Form, useSubmit, useSearchParams, Link, useRevalidator } from "react-router";
import { TweetCard } from "~/components/tweet/tweet-card";
import { db } from "~/db";
import { bookmarks, tweets, bookmarkCollections } from "~/db/schema";
import { eq, and, desc, ilike, exists, asc } from "drizzle-orm";
import { DateTime } from "luxon";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    Search01Icon as SearchIcon,
    Folder01Icon as FolderIcon,
    Image01Icon as ImageIcon,
    Add01Icon as AddIcon,
    FilterIcon,
    ArrowLeft02Icon,
    Cancel01Icon
} from "@hugeicons/core-free-icons";
import { useState, useEffect } from "react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "~/components/ui/dialog";
import { toast } from "sonner";

export const meta: MetaFunction = () => {
    return [
        { title: "북마크 / STAYnC" },
        { name: "description", content: "STAYnC 북마크 목록" },
    ];
};

export async function loader({ request }: LoaderFunctionArgs) {
    const session = await getSession(request);
    if (!session) {
        return data({
            tweets: [],
            collections: [],
            filters: { q: "", onlyMedia: false, collectionId: "" }
        }, { status: 401 });
    }

    const userId = session.user.id;
    const url = new URL(request.url);
    const q = url.searchParams.get("q") || "";
    const onlyMedia = url.searchParams.get("media") === "true";
    const collectionId = url.searchParams.get("collection") || "";

    // Drizzle doesn't support deep filtering in query builder easily (e.g. filter bookmarks by tweet content).
    // We can use query builder with `findMany` if we accept client side filtering OR use `findMany` strategy with `where: (b, {exists})`?
    // Let's use `db.query.bookmarks.findMany` and filtering manually in JS for now if scale permits, or try to use `where` effectively.
    // Actually, `bookmarks` are personal, so volume likely < 1000. Client-side filter or simple filtering is okay-ish, but let's try strict DB filtering.
    // Filtering by tweet content needs a join or subquery.

    // Let's use `db.query.bookmarks.findMany` and fetch all, then filter.
    // To filter by tweet content/media at DB level for bookmarks, we would need to join.
    // But `db.query` is convenient for relations.
    // Solution: Fetch bookmarks that match filters using `db.select().from(bookmarks).innerJoin(tweets)...` then use IDs to fetch details?
    // Or just `db.query` with `where` logic.
    // Since `tweet` is a relation, we can't filter top-level `bookmarks` by `tweet` fields easily in `db.query` without `exists`.
    // But `tweet` is 1:1 (or N:1) from bookmark side.

    // Easier approach: Use `db.query.bookmarks.findMany` with relations, and filter by collectionId (easy).
    // For `q` and `onlyMedia`, we can use `where` with exists if strict, or filter in JS.
    // Let's filter in JS to keep relation fetching simple and consistent with other migrations, assuming reasonable bookmark count. 
    // Wait, `tweet` relation fetching is needed anyway.

    // Actually, let's try `db.query.bookmarks.findMany` filtered by collectionId.
    // Then filter by `q` and `media` in memory.

    const bookmarksList = await db.query.bookmarks.findMany({
        where: collectionId
            ? and(eq(bookmarks.userId, userId), eq(bookmarks.collectionId, collectionId))
            : eq(bookmarks.userId, userId),
        orderBy: [desc(bookmarks.createdAt)],
        with: {
            tweet: {
                with: {
                    user: true,
                    media: true,
                    likes: { columns: { userId: true } },
                    replies: { columns: { id: true } },
                    retweets: { columns: { userId: true } },
                    bookmarks: { where: (b, { eq }) => eq(b.userId, userId), columns: { userId: true } },
                    tags: { with: { travelTag: true } }
                }
            }
        }
    });

    const collectionsList = await db.query.bookmarkCollections.findMany({
        where: eq(bookmarkCollections.userId, userId),
        orderBy: [asc(bookmarkCollections.name)]
    });

    // In-memory filtering for tweet content/media
    let filteredTweets = bookmarksList.map(b => b.tweet).filter((t): t is NonNullable<typeof t> => !!t && !t.deletedAt);

    if (q) {
        const lowerQ = q.toLowerCase();
        filteredTweets = filteredTweets.filter(t => t.content.toLowerCase().includes(lowerQ));
    }
    if (onlyMedia) {
        filteredTweets = filteredTweets.filter(t => t.media.length > 0);
    }

    const formattedTweets = filteredTweets.map(tweet => ({
        id: tweet.id,
        content: tweet.content,
        createdAt: DateTime.fromISO(tweet.createdAt).setLocale("ko").toRelative() || "방금 전",
        fullCreatedAt: DateTime.fromISO(tweet.createdAt).setLocale("ko").toLocaleString(DateTime.DATETIME_MED),
        user: {
            id: tweet.user.id,
            name: tweet.user.name || "알 수 없음",
            username: tweet.user.email.split("@")[0],
            image: tweet.user.image,
        },
        media: tweet.media.map(m => ({
            id: m.id,
            url: m.url,
            type: m.type as "IMAGE" | "VIDEO",
            altText: m.altText
        })),
        stats: {
            likes: tweet.likes.length,
            replies: tweet.replies.length,
            retweets: tweet.retweets.length,
            views: "0",
        },
        isLiked: tweet.likes.some(l => l.userId === userId),
        isRetweeted: tweet.retweets.some(r => r.userId === userId),
        isBookmarked: (tweet.bookmarks?.length ?? 0) > 0,
        location: tweet.locationName ? {
            name: tweet.locationName,
            latitude: tweet.latitude || undefined,
            longitude: tweet.longitude || undefined,
        } : undefined,
        travelDate: tweet.travelDate, // Already string
        tags: tweet.tags.map(t => ({
            id: t.travelTag.id,
            name: t.travelTag.name,
            slug: t.travelTag.slug
        })),
    }));

    return data({
        tweets: formattedTweets,
        collections: collectionsList,
        filters: { q, onlyMedia, collectionId }
    });
}

export default function BookmarksPage() {
    const { tweets, collections, filters } = useLoaderData<typeof loader>();
    const { data: session } = useSession();
    const [searchParams, setSearchParams] = useSearchParams();
    const submit = useSubmit();
    const revalidator = useRevalidator();

    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [newCollectionName, setNewCollectionName] = useState("");

    const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const q = formData.get("q") as string;
        setSearchParams(prev => {
            if (q) prev.set("q", q);
            else prev.delete("q");
            return prev;
        });
    };

    const toggleMedia = () => {
        setSearchParams(prev => {
            if (prev.get("media") === "true") prev.delete("media");
            else prev.set("media", "true");
            return prev;
        });
    };

    const selectCollection = (id: string) => {
        setSearchParams(prev => {
            if (id) prev.set("collection", id);
            else prev.delete("collection");
            return prev;
        });
    };

    const handleCreateCollection = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCollectionName.trim()) return;

        const formData = new FormData();
        formData.append("_action", "create");
        formData.append("name", newCollectionName);

        submit(formData, {
            method: "POST",
            action: "/api/bookmarks/collections",
            navigate: false
        });

        setNewCollectionName("");
        setIsCreateDialogOpen(false);
        toast.success("폴더가 생성되었습니다.");
        // Refresh data to show new folder
        setTimeout(() => revalidator.revalidate(), 100);
    };

    if (!session) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <h1 className="text-2xl font-bold mb-4 font-heading">로그인이 필요합니다</h1>
                <p className="text-muted-foreground">북마크를 확인하려면 로그인해 주세요.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen">
            <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border">
                <div className="px-4 py-3 flex items-center justify-between">
                    <h1 className="text-xl font-bold font-heading">북마크</h1>
                    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                        <DialogTrigger
                            render={
                                <Button variant="ghost" size="icon" className="rounded-full">
                                    <HugeiconsIcon icon={AddIcon} size={20} />
                                </Button>
                            }
                        />
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>새 북마크 폴더 생성</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleCreateCollection} className="space-y-4 pt-4">
                                <Input
                                    placeholder="폴더 이름 (예: 제주도 맛집)"
                                    value={newCollectionName}
                                    onChange={(e) => setNewCollectionName(e.target.value)}
                                    autoFocus
                                />
                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>취소</Button>
                                    <Button type="submit">생성하기</Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Filters Row */}
                <div className="px-4 pb-3 flex flex-col gap-3">
                    <form onSubmit={handleSearch} className="relative group">
                        <HugeiconsIcon
                            icon={SearchIcon}
                            strokeWidth={2}
                            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors"
                        />
                        <input
                            type="text"
                            name="q"
                            defaultValue={filters.q}
                            placeholder="북마크 내 검색"
                            className="w-full bg-secondary/50 py-2 pl-10 pr-4 rounded-full border border-transparent focus:border-primary focus:bg-background outline-none transition-all text-sm"
                        />
                    </form>

                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                        <Button
                            variant={!filters.collectionId ? "secondary" : "ghost"}
                            size="sm"
                            className="rounded-full whitespace-nowrap h-8"
                            onClick={() => selectCollection("")}
                        >
                            전체
                        </Button>
                        <Button
                            variant={filters.onlyMedia ? "secondary" : "ghost"}
                            size="sm"
                            className="rounded-full whitespace-nowrap h-8 gap-1.5"
                            onClick={toggleMedia}
                        >
                            <HugeiconsIcon icon={ImageIcon} size={14} />
                            미디어
                        </Button>
                        {(collections as any[]).map(col => (
                            <div key={col.id} className="relative group/folder">
                                <Button
                                    variant={filters.collectionId === col.id ? "secondary" : "ghost"}
                                    size="sm"
                                    className="rounded-full whitespace-nowrap h-8 gap-1.5 pr-8"
                                    onClick={() => selectCollection(col.id)}
                                >
                                    <HugeiconsIcon icon={FolderIcon} size={14} />
                                    {col.name}
                                </Button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm(`"${col.name}" 폴더를 삭제하시겠습니까?\n\n폴더 내 북마크는 삭제되지 않고 기본 폴더로 이동됩니다.`)) {
                                            const formData = new FormData();
                                            formData.append("_action", "delete");
                                            formData.append("id", col.id);
                                            submit(formData, {
                                                method: "POST",
                                                action: "/api/bookmarks/collections",
                                                navigate: false
                                            });
                                            toast.success("폴더가 삭제되었습니다.");
                                            if (filters.collectionId === col.id) {
                                                selectCollection("");
                                            }
                                            // Refresh data to update UI
                                            setTimeout(() => revalidator.revalidate(), 100);
                                        }
                                    }}
                                    className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/folder:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded-full"
                                    title="폴더 삭제"
                                >
                                    <HugeiconsIcon icon={Cancel01Icon} size={12} className="text-destructive" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </header>

            <main className="flex-1">
                {tweets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                        <div className="h-16 w-16 bg-secondary/50 rounded-full flex items-center justify-center mb-4">
                            <HugeiconsIcon icon={FolderIcon} size={32} className="text-muted-foreground" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2 font-heading">북마크를 찾을 수 없습니다</h2>
                        <p className="text-muted-foreground max-w-xs">
                            {filters.q || filters.collectionId || filters.onlyMedia
                                ? "필터를 조정하거나 다른 검색어를 입력해 보세요."
                                : "나중에 다시 보고 싶은 트윗을 북마크에 추가해 보세요."}
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {tweets.map((tweet) => (
                            <TweetCard key={tweet.id} {...tweet} />
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
