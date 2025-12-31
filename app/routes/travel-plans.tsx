import { type LoaderFunctionArgs, data } from "react-router";
import { getSession } from "~/lib/auth-utils.server";
import { prisma } from "~/lib/prisma.server";
import { useLoaderData, Link } from "react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import { Airplane01Icon, Calendar03Icon, Location01Icon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { DateTime } from "luxon";
import { Button } from "~/components/ui/button";

export async function loader({ request }: LoaderFunctionArgs) {
    const session = await getSession(request);
    if (!session) {
        return data({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const userId = session.user.id;
    const travelPlans = await prisma.travelPlan.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: {
            _count: {
                select: { tweets: true }
            }
        }
    });

    return { travelPlans };
}

export default function TravelPlansPage() {
    const { travelPlans, error } = useLoaderData<typeof loader>() as any;

    if (error) {
        return <div className="p-4 text-destructive">{error}</div>;
    }

    return (
        <div className="flex flex-col min-h-screen">
            <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between">
                <h1 className="text-xl font-bold font-heading">내 여행 일정</h1>
                <Button variant="ghost" size="icon" className="rounded-full">
                    <HugeiconsIcon icon={PlusSignIcon} className="h-5 w-5" />
                </Button>
            </header>

            <main className="flex-1 p-4">
                <div className="grid gap-4">
                    {travelPlans.length === 0 ? (
                        <div className="text-center py-20 bg-accent/20 rounded-2xl border border-dashed border-border">
                            <HugeiconsIcon icon={Airplane01Icon} className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                            <h3 className="text-lg font-bold mb-1">등록된 여행 일정이 없습니다</h3>
                            <p className="text-sm text-muted-foreground mb-6">첫 번째 여행 계획을 세워보세요!</p>
                            <Button className="rounded-full">새 여행 계획 만들기</Button>
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
                                                {DateTime.fromJSDate(new Date(plan.startDate)).setLocale("ko").toFormat("yyyy.MM.dd")}
                                                {plan.endDate && ` ~ ${DateTime.fromJSDate(new Date(plan.endDate)).setLocale("ko").toFormat("MM.dd")}`}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1.5">
                                        <HugeiconsIcon icon={Airplane01Icon} className="h-3.5 w-3.5" />
                                        <span>연결된 트윗 {plan._count.tweets}개</span>
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

import { cn } from "~/lib/utils";
