import { type LoaderFunctionArgs, data } from "react-router";
import { getSession } from "~/lib/auth-utils.server";
import { db } from "~/db";
import { travelPlans } from "~/db/schema";
import { eq, desc } from "drizzle-orm";
import { useLoaderData, Link, useFetcher } from "react-router";
import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Airplane01Icon, Calendar03Icon, Location01Icon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { DateTime } from "luxon";
import { Button } from "~/components/ui/button";
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

export async function loader({ request }: LoaderFunctionArgs) {
    const session = await getSession(request);
    if (!session) {
        return data({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const userId = session.user.id;
    const plans = await db.query.travelPlans.findMany({
        where: eq(travelPlans.userId, userId),
        orderBy: [desc(travelPlans.createdAt)],
        with: {
            // Need items and tweets to count them
            // If optimization needed, use aggregation query, but mapping is fine for simple list
            items: { columns: { id: true } },
            tweets: { columns: { id: true } }
        }
    });

    const formattedPlans = plans.map(p => ({
        ...p,
        _count: {
            items: p.items.length,
            tweets: p.tweets.length
        }
    }));

    return { travelPlans: formattedPlans };
}

export default function TravelPlansPage() {
    const { travelPlans, error } = useLoaderData<typeof loader>() as any;
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const fetcher = useFetcher();

    useEffect(() => {
        if (fetcher.state === "idle" && fetcher.data) {
            if ((fetcher.data as any).travelPlan) {
                toast.success("여행 계획이 생성되었습니다.");
                setIsDialogOpen(false);
            } else if ((fetcher.data as any).error) {
                toast.error((fetcher.data as any).error);
            }
        }
    }, [fetcher.state, fetcher.data]);

    if (error) {
        return <div className="p-4 text-destructive">{error}</div>;
    }

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        fetcher.submit(formData, { method: "POST", action: "/api/travel-plans" });
    };

    return (
        <div className="flex flex-col min-h-screen">
            <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between">
                <h1 className="text-xl font-bold font-heading">내 여행 일정</h1>
                <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setIsDialogOpen(true)}>
                    <HugeiconsIcon icon={PlusSignIcon} className="h-5 w-5" />
                </Button>
            </header>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>새 여행 계획 만들기</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="title">여행 제목</Label>
                            <Input
                                id="title"
                                name="title"
                                placeholder="예: 2024 일본 오사카 여행"
                                required
                                autoFocus
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="description">설명</Label>
                            <Textarea
                                id="description"
                                name="description"
                                placeholder="어떤 여행인가요? (선택)"
                                className="resize-none"
                                rows={3}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="startDate">시작일</Label>
                                <Input id="startDate" name="startDate" type="date" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="endDate">종료일</Label>
                                <Input id="endDate" name="endDate" type="date" />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="status">상태</Label>
                            <Select name="status" defaultValue="PLANNING">
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
                                onClick={() => setIsDialogOpen(false)}
                                disabled={fetcher.state !== "idle"}
                            >
                                취소
                            </Button>
                            <Button type="submit" disabled={fetcher.state !== "idle"}>
                                {fetcher.state !== "idle" ? "생성 중..." : "계획 생성"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <main className="flex-1 p-4">
                <div className="grid gap-4">
                    {travelPlans.length === 0 ? (
                        <div className="text-center py-20 bg-accent/20 rounded-2xl border border-dashed border-border">
                            <HugeiconsIcon icon={Airplane01Icon} className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                            <h3 className="text-lg font-bold mb-1">등록된 여행 일정이 없습니다</h3>
                            <p className="text-sm text-muted-foreground mb-6">첫 번째 여행 계획을 세워보세요!</p>
                            <Button className="rounded-full" onClick={() => setIsDialogOpen(true)}>새 여행 계획 만들기</Button>
                        </div>
                    ) : (
                        travelPlans.map((plan: any) => (
                            <Link
                                key={plan.id}
                                to={`/travel-plans/${plan.id}`}
                                className="bg-background border border-border p-5 rounded-2xl hover:border-primary/50 transition-all group shadow-sm hover:shadow-md"
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <h2 className="text-xl font-bold group-hover:text-primary transition-colors">{plan.title}</h2>
                                    <span className={cn(
                                        "text-[10px] font-bold px-2 py-0.5 rounded-full",
                                        plan.status === "COMPLETED" ? "bg-secondary text-muted-foreground" : "bg-primary/10 text-primary"
                                    )}>
                                        {plan.status === "PLANNING" ? "준비 중" : plan.status === "ONGOING" ? "여행 중" : "완료됨"}
                                    </span>
                                </div>

                                {plan.description && (
                                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                                        {plan.description}
                                    </p>
                                )}

                                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground font-medium">
                                    {plan.startDate && (
                                        <div className="flex items-center gap-1.5">
                                            <HugeiconsIcon icon={Calendar03Icon} className="h-3.5 w-3.5" />
                                            <span>
                                                {DateTime.fromISO(plan.startDate).setLocale("ko").toFormat("yyyy.MM.dd")}
                                                {plan.endDate && ` ~ ${DateTime.fromISO(plan.endDate).setLocale("ko").toFormat("MM.dd")}`}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1.5">
                                        <HugeiconsIcon icon={Airplane01Icon} className="h-3.5 w-3.5" />
                                        <span>일정 {plan._count.items}개</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <HugeiconsIcon icon={PlusSignIcon} className="h-3.5 w-3.5" />
                                        <span>게시물 {plan._count.tweets}개</span>
                                    </div>
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            </main>
        </div>
    );
}
