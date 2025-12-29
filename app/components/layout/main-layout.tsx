import { Sidebar } from "./sidebar";
import { BottomNav } from "./bottom-nav";
import { Form, Link } from "react-router";
import { HugeiconsIcon } from "@hugeicons/react";

import { Search01Icon as SearchIcon } from "@hugeicons/core-free-icons";

interface MainLayoutProps {
    children: React.ReactNode;
    popularTags?: {
        id: string;
        name: string;
        slug: string;
        _count: {
            tweetTags: number;
        };
    }[];
}

export function MainLayout({ children, popularTags }: MainLayoutProps) {
    return (
        <div className="min-h-screen bg-background text-foreground flex justify-center">
            <div className="flex w-full max-w-[1300px]">
                {/* Left Sidebar - Hidden on mobile, icon-only on tablet */}
                <div className="hidden sm:block">
                    <Sidebar />
                </div>

                {/* Main Feed Area */}
                <main className="flex-1 w-full max-w-[600px] border-r border-border pb-20 sm:pb-0">
                    {children}
                </main>

                {/* Right Sidebar - Hidden on mobile and small tablets */}
                <aside className="hidden lg:block w-[350px] p-4 flex flex-col gap-4">
                    {/* Search Bar */}
                    <div className="sticky top-2 z-10">
                        <Form action="/search" method="get" className="relative group">
                            <HugeiconsIcon
                                icon={SearchIcon}
                                strokeWidth={2}
                                className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors"
                            />
                            <input
                                type="text"
                                name="q"
                                placeholder="검색"
                                className="w-full bg-secondary py-3 pl-12 pr-4 rounded-full border border-transparent focus:border-primary focus:bg-background outline-none transition-all"
                            />
                        </Form>

                    </div>

                    {/* Premium/Subscribe (Mockup) */}
                    <div className="bg-secondary p-4 rounded-2xl flex flex-col gap-2">
                        <h2 className="text-xl font-black">프리미엄 구독</h2>
                        <p className="text-sm font-medium">새로운 기능을 이용하려면 구독하세요. 자격이 되는 경우 광고 수익 배분금도 받을 수 있습니다.</p>
                        <button className="bg-foreground text-background font-bold py-2 px-4 rounded-full w-fit mt-1 hover:opacity-90 transition-opacity">
                            구독하기
                        </button>
                    </div>

                    {/* Trending Tags (Real Data) */}
                    {popularTags && popularTags.length > 0 ? (
                        <div className="bg-secondary rounded-2xl overflow-hidden">
                            <h2 className="text-xl font-black p-4">인기 여행 태그</h2>
                            <div className="flex flex-col">
                                {popularTags.map((tag) => (
                                    <Link
                                        key={tag.id}
                                        to={`/tags/${tag.slug}`}
                                        className="px-4 py-3 hover:bg-accent/50 text-left transition-colors flex flex-col outline-none group"
                                    >
                                        <span className="text-xs text-muted-foreground mb-0.5">실시간 인기</span>
                                        <span className="font-bold group-hover:underline">#{tag.name}</span>
                                        <span className="text-xs text-muted-foreground mt-0.5">{tag._count.tweetTags}개 게시물</span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ) : (
                        /* Fallback Mockup if no tags */
                        <div className="bg-secondary rounded-2xl overflow-hidden">
                            <h2 className="text-xl font-black p-4">나를 위한 트렌드</h2>
                            <div className="flex flex-col">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <button key={i} className="px-4 py-3 hover:bg-accent/50 text-left transition-colors flex flex-col outline-none">
                                        <span className="text-xs text-muted-foreground">대한민국에서 트렌드 중</span>
                                        <span className="font-bold">#트렌드_{i}</span>
                                        <span className="text-xs text-muted-foreground">{i * 1.2}K 게시물</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Who to follow (Mockup) */}
                    <div className="bg-secondary rounded-2xl overflow-hidden">
                        <h2 className="text-xl font-black p-4">팔로우 추천</h2>
                        <div className="flex flex-col">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="px-4 py-3 hover:bg-accent/50 transition-colors flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-muted border border-border shrink-0" />
                                    <div className="flex flex-col flex-1 overflow-hidden text-sm">
                                        <span className="font-bold truncate">추천인_{i}</span>
                                        <span className="text-xs text-muted-foreground truncate">@recommend_{i}</span>
                                    </div>
                                    <button className="bg-foreground text-background text-xs font-bold py-1.5 px-4 rounded-full hover:opacity-90 transition-opacity">
                                        팔로우
                                    </button>
                                </div>
                            ))}
                            <button className="p-4 text-primary hover:bg-accent/50 text-left transition-colors text-sm font-medium">
                                더 보기
                            </button>
                        </div>
                    </div>
                </aside>
            </div>

            {/* Mobile Bottom Navigation */}
            <BottomNav />
        </div>
    );
}
