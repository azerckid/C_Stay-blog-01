import { Outlet, NavLink, useLocation, useParams } from "react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    Settings01Icon,
    Mail01Icon,
    Search01Icon,
    ArrowLeft01Icon,
    LockIcon,
} from "@hugeicons/core-free-icons";
import { cn } from "~/lib/utils";
import { MOCK_CONVERSATIONS } from "~/lib/mock-messages";
import { useState } from "react";

export default function MessagesLayout() {
    const [selectedTab, setSelectedTab] = useState<"all" | "requests">("all");
    const { conversationId } = useParams();
    const location = useLocation();

    // Check if we are in a conversation view on mobile
    const isChatView = !!conversationId;

    return (
        <div className="flex h-[calc(100vh-53px)] sm:h-screen bg-background overflow-hidden">
            {/* Conversation List Sidebar */}
            <div className={cn(
                "w-full sm:w-[350px] lg:w-[400px] border-r border-border flex flex-col shrink-0",
                isChatView ? "hidden sm:flex" : "flex"
            )}>
                {/* Header */}
                <div className="px-4 py-3 flex items-center justify-between border-b border-border">
                    <h1 className="text-xl font-black">쪽지</h1>
                    <div className="flex items-center gap-1">
                        <button className="p-2 hover:bg-accent rounded-full transition-colors">
                            <HugeiconsIcon icon={Settings01Icon} size={20} strokeWidth={2} />
                        </button>
                        <button className="p-2 hover:bg-accent rounded-full transition-colors">
                            <HugeiconsIcon icon={Mail01Icon} size={20} strokeWidth={2} />
                        </button>
                    </div>
                </div>

                {/* Search & Tabs */}
                <div className="px-4 py-3 flex flex-col gap-4 border-b border-border/50">
                    <div className="relative">
                        <HugeiconsIcon
                            icon={Search01Icon}
                            size={18}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                        />
                        <input
                            type="text"
                            placeholder="쪽지 검색"
                            className="w-full bg-secondary py-2.5 pl-12 pr-4 rounded-full border border-transparent focus:border-primary focus:bg-background outline-none transition-all"
                        />
                    </div>
                    <div className="flex gap-1">
                        <button
                            onClick={() => setSelectedTab("all")}
                            className={cn(
                                "flex-1 py-3 text-sm font-bold border-b-2 transition-colors",
                                selectedTab === "all" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:bg-accent"
                            )}
                        >
                            전체
                        </button>
                        <button
                            onClick={() => setSelectedTab("requests")}
                            className={cn(
                                "flex-1 py-3 text-sm font-bold border-b-2 transition-colors",
                                selectedTab === "requests" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:bg-accent"
                            )}
                        >
                            요청
                        </button>
                    </div>
                </div>

                {/* List Scroll Area */}
                <div className="flex-1 overflow-y-auto">
                    {MOCK_CONVERSATIONS.map((conv) => {
                        const user = conv.participants[0].user;
                        const isActive = conversationId === conv.id;
                        return (
                            <NavLink
                                key={conv.id}
                                to={`/messages/${conv.id}`}
                                className={cn(
                                    "px-4 py-4 flex gap-3 hover:bg-accent/50 transition-colors border-r-2",
                                    isActive ? "bg-accent border-primary" : "border-transparent"
                                )}
                            >
                                <div className="h-12 w-12 rounded-full bg-muted border border-border overflow-hidden shrink-0">
                                    {user.image && <img src={user.image} alt={user.name} className="h-full w-full object-cover" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-1">
                                        <div className="flex items-center gap-1 min-w-0">
                                            <span className="font-bold truncate">{user.name}</span>
                                            {user.isPrivate && (
                                                <HugeiconsIcon icon={LockIcon} size={14} className="text-muted-foreground shrink-0" />
                                            )}
                                            <span className="text-sm text-muted-foreground truncate">@{user.email.split("@")[0]}</span>
                                            <span className="text-sm text-muted-foreground shrink-0">· 21주</span>
                                        </div>
                                    </div>
                                    <p className={cn(
                                        "text-sm truncate",
                                        conv.unreadCount > 0 ? "text-foreground font-bold" : "text-muted-foreground"
                                    )}>
                                        {conv.lastMessage?.content}
                                    </p>
                                </div>
                            </NavLink>
                        );
                    })}
                </div>
            </div>

            {/* Conversation Content Area */}
            <div className={cn(
                "flex-1 flex flex-col bg-background",
                isChatView ? "flex" : "hidden sm:flex"
            )}>
                <Outlet />
            </div>
        </div>
    );
}
