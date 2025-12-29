import { Sidebar } from "./sidebar";
import { BottomNav } from "./bottom-nav";
import { Form, Link } from "react-router";
import { HugeiconsIcon } from "@hugeicons/react";

import { Search01Icon as SearchIcon, AiViewIcon } from "@hugeicons/core-free-icons";
import { useState } from "react";
import { LogModeOverlay } from "../ai/log-mode-overlay";
import { useSession } from "~/lib/auth-client";
import {
    Sheet,
    SheetContent,
    SheetTrigger,
    SheetTitle
} from "~/components/ui/sheet";
import { UserIcon } from "@hugeicons/core-free-icons";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";

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
    const [isAiLogOpen, setIsAiLogOpen] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const { data: session } = useSession();

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col items-center">
            {/* Mobile Header - Top Sticky */}
            <header className="sm:hidden sticky top-0 z-40 w-full bg-background/80 backdrop-blur-md border-b border-border flex items-center h-14 px-4">
                <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
                    <SheetTrigger
                        render={
                            <button className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center overflow-hidden border border-border">
                                {session?.user?.image ? (
                                    <img src={session.user.image} alt={session.user.name ?? ""} className="h-full w-full object-cover" />
                                ) : (
                                    <HugeiconsIcon icon={UserIcon} strokeWidth={2} className="h-5 w-5 text-muted-foreground" />
                                )}
                            </button>
                        }
                    />
                    <SheetContent side="left" className="p-0 w-[280px] bg-background border-r border-border">
                        <VisuallyHidden.Root>
                            <SheetTitle>메뉴</SheetTitle>
                        </VisuallyHidden.Root>
                        {/* Reuse Sidebar in Drawer, no need for redundant UI */}
                        <Sidebar
                            onAiLogOpen={() => {
                                setIsAiLogOpen(true);
                                setIsDrawerOpen(false);
                            }}
                            isMobileMenu={true}
                            onClose={() => setIsDrawerOpen(false)}
                        />
                    </SheetContent>
                </Sheet>

                <div className="flex-1 flex justify-center">
                    <Link to="/">
                        <svg viewBox="0 0 24 24" className="h-6 w-6 text-primary fill-current" aria-hidden="true">
                            <g><path d="M23.643 4.937c-.835.37-1.732.62-2.675.733.962-.576 1.7-1.49 2.048-2.578-.9.534-1.897.922-2.958 1.13-.85-.904-2.06-1.47-3.4-1.47-2.572 0-4.658 2.086-4.658 4.66 0 .364.042.718.12 1.06-3.873-.195-7.304-2.05-9.602-4.868-.4.69-.63 1.49-.63 2.342 0 1.616.823 3.043 2.072 3.878-.764-.025-1.482-.234-2.11-.583v.06c0 2.257 1.605 4.14 3.737 4.568-.392.106-.803.162-1.227.162-.3 0-.593-.028-.877-.082.593 1.85 2.313 3.198 4.352 3.234-1.595 1.25-3.604 1.995-5.786 1.995-.376 0-.747-.022-1.112-.065 2.062 1.323 4.51 2.093 7.14 2.093 8.57 0 13.255-7.098 13.255-13.254 0-.2-.005-.402-.014-.602.91-.658 1.7-1.477 2.323-2.41z"></path></g>
                        </svg>
                    </Link>
                </div>
                <div className="h-8 w-8 invisible" /> {/* Placeholder for right spacing balance */}
            </header>

            <div className="flex w-full max-w-[1300px]">
                {/* Left Sidebar - Hidden on mobile, icon-only on tablet */}
                <div className="hidden sm:block">
                    <Sidebar onAiLogOpen={() => setIsAiLogOpen(true)} />
                </div>

                {/* Main Feed Area */}
                <main className="flex-1 w-full max-w-[600px] border-r border-border pb-20 sm:pb-0">
                    {children}
                </main>

                {/* Right Sidebar - Hidden on mobile and small tablets */}
                <aside className="hidden lg:block w-[350px] p-4">
                    <div className="flex flex-col gap-4">
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
                                    placeholder="AI 검색"
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
                    </div>
                </aside>

            </div>

            {/* AI Log Mode Trigger Button (FAB) */}
            <button
                onClick={() => setIsAiLogOpen(true)}
                className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-[60] w-14 h-14 rounded-full bg-primary text-white shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all group"
                title="AI 여행 일지 작성"
            >
                <div className="absolute inset-0 rounded-full bg-primary animate-ping opacity-20 group-hover:opacity-40" />
                <HugeiconsIcon icon={AiViewIcon} size={28} className="relative z-10" />
            </button>

            {/* AI Log Mode Overlay */}
            <LogModeOverlay
                isOpen={isAiLogOpen}
                onClose={() => setIsAiLogOpen(false)}
            />

            {/* Mobile Bottom Navigation */}
            <BottomNav />
        </div>
    );
}
