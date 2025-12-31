import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    Settings01Icon,
    Mail01Icon,
    ArrowUp01Icon,
    ArrowDown01Icon,
    Search01Icon,
    ArrowLeft01Icon,
    Cancel01Icon,
    SentIcon,
    Add01Icon,
    AiViewIcon,
    TickDouble01Icon,
    LockIcon,
} from "@hugeicons/core-free-icons";
import { cn } from "~/lib/utils";
import { MOCK_CONVERSATIONS, MOCK_MESSAGES, MOCK_USERS } from "~/lib/mock-messages";
import type { DMConversation, DirectMessage } from "~/types/messages";
import { formatRelative, format } from "date-fns";
import { ko } from "date-fns/locale";
import { NewMessageModal } from "./new-message-modal";

type DrawerState = "hidden" | "expanded-list" | "expanded-chat";

export function MessageDrawer() {
    const [state, setState] = useState<DrawerState>("hidden");
    const [selectedTab, setSelectedTab] = useState<"all" | "requests">("all");
    const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
    const [isNewMessageModalOpen, setIsNewMessageModalOpen] = useState(false);

    useEffect(() => {
        const handleToggle = () => {
            setState((prev) => (prev === "hidden" ? "expanded-list" : "hidden"));
        };
        window.addEventListener('toggle-message-drawer', handleToggle);
        return () => window.removeEventListener('toggle-message-drawer', handleToggle);
    }, []);

    const toggleExpand = () => {
        setState("hidden");
    };

    const handleConvClick = (convId: string) => {
        setSelectedConvId(convId);
        setState("expanded-chat");
    };

    const handleBackToList = (e: React.MouseEvent) => {
        e.stopPropagation();
        setState("expanded-list");
        setSelectedConvId(null);
    };

    const handleNewMessageSelect = (userId: string) => {
        // Find existing conversation with this user or just navigate
        const existingConv = MOCK_CONVERSATIONS.find(c =>
            !c.isGroup && c.participants.some(p => p.userId === userId)
        );
        if (existingConv) {
            handleConvClick(existingConv.id);
        } else {
            // In mock mode, if no conv exists, we just select the user
            // In a real app, this would create a new conversation
            alert("기존 대화가 없어 새로 생성하는 시뮬레이션입니다.");
            setState("expanded-chat");
        }
    };

    const selectedConv = MOCK_CONVERSATIONS.find((c) => c.id === selectedConvId);
    const messages = selectedConvId ? MOCK_MESSAGES[selectedConvId] || [] : [];
    const otherParticipant = selectedConv?.participants[0]?.user;

    return (
        <div
            className={cn(
                "fixed bottom-0 right-4 w-[400px] bg-background border border-border shadow-2xl rounded-t-xl transition-all duration-300 ease-in-out z-[100] hidden lg:flex flex-col",
                state === "hidden" ? "translate-y-full opacity-0 pointer-events-none" : "translate-y-0 opacity-100",
                "h-[80vh] max-h-[700px]"
            )}
        >
            {/* Header */}
            <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer border-b border-border group"
                onClick={toggleExpand}
            >
                <div className="flex items-center gap-2">
                    {state === "expanded-chat" && (
                        <button
                            onClick={handleBackToList}
                            className="p-1 hover:bg-accent rounded-full transition-colors"
                        >
                            <HugeiconsIcon icon={ArrowLeft01Icon} size={20} strokeWidth={2} />
                        </button>
                    )}
                    <div className="flex items-center gap-1">
                        <span className="text-xl font-black">{state === "expanded-chat" ? otherParticipant?.name : "채팅"}</span>
                        {state === "expanded-chat" && otherParticipant?.isPrivate && (
                            <HugeiconsIcon icon={LockIcon} size={16} className="text-foreground shrink-0 mt-0.5" />
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    {state === "expanded-list" && (
                        <>
                            <button
                                className="p-2 hover:bg-accent rounded-full transition-colors"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    alert("쪽지 설정 기능 구현 예정입니다.");
                                }}
                            >
                                <HugeiconsIcon icon={Settings01Icon} size={20} strokeWidth={2} />
                            </button>
                            <button
                                className="p-2 hover:bg-accent rounded-full transition-colors"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsNewMessageModalOpen(true);
                                }}
                            >
                                <HugeiconsIcon icon={Mail01Icon} size={20} strokeWidth={2} />
                            </button>
                        </>
                    )}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand();
                        }}
                        className="p-2 hover:bg-accent rounded-full transition-colors"
                    >
                        <HugeiconsIcon icon={ArrowDown01Icon} size={20} strokeWidth={2} />
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {state === "expanded-list" ? (
                    <>
                        {/* Search & Tabs */}
                        <div className="px-4 py-2 flex flex-col gap-3">
                            <div className="relative">
                                <HugeiconsIcon
                                    icon={Search01Icon}
                                    size={18}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                                />
                                <input
                                    type="text"
                                    placeholder="채팅 검색"
                                    className="w-full bg-secondary py-2 pl-10 pr-4 rounded-full border border-transparent focus:border-primary focus:bg-background outline-none text-sm transition-all"
                                />
                            </div>
                            <div className="flex gap-1 p-1 bg-secondary rounded-full w-fit">
                                <button
                                    onClick={() => setSelectedTab("all")}
                                    className={cn(
                                        "px-4 py-1.5 rounded-full text-sm font-bold transition-all",
                                        selectedTab === "all" ? "bg-background shadow-sm" : "hover:bg-accent"
                                    )}
                                >
                                    전체
                                </button>
                                <button
                                    onClick={() => setSelectedTab("requests")}
                                    className={cn(
                                        "px-4 py-1.5 rounded-full text-sm font-bold transition-all",
                                        selectedTab === "requests" ? "bg-background shadow-sm" : "hover:bg-accent"
                                    )}
                                >
                                    요청
                                </button>
                            </div>
                        </div>

                        {/* Conversation List */}
                        <div className="flex-1 overflow-y-auto">
                            {selectedTab === "all" ? (
                                MOCK_CONVERSATIONS.map((conv) => {
                                    const user = conv.participants[0].user;
                                    return (
                                        <div
                                            key={conv.id}
                                            onClick={() => handleConvClick(conv.id)}
                                            className="px-4 py-3 flex gap-3 hover:bg-accent/50 cursor-pointer transition-colors border-b border-border/50"
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
                                                    {conv.unreadCount > 0 && (
                                                        <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                                                    )}
                                                </div>
                                                <p className={cn(
                                                    "text-sm truncate",
                                                    conv.unreadCount > 0 ? "text-foreground font-bold" : "text-muted-foreground"
                                                )}>
                                                    {conv.lastMessage?.content}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="p-8 text-center flex flex-col items-center gap-2">
                                    <p className="text-sm text-muted-foreground">요청받은 메시지가 없습니다.</p>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    /* Chat View */
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="flex-1 overflow-y-auto p-4 space-y-6">
                            {/* Profile Info Card at the top */}
                            <div className="flex flex-col items-center text-center py-6 border-b border-border mb-4">
                                <div className="h-20 w-20 rounded-full bg-muted border border-border overflow-hidden mb-3">
                                    {otherParticipant?.image && (
                                        <img src={otherParticipant.image} alt={otherParticipant.name} className="h-full w-full object-cover" />
                                    )}
                                </div>
                                <div className="flex items-center gap-1">
                                    <h3 className="font-black text-xl">{otherParticipant?.name}</h3>
                                    {otherParticipant?.isPrivate && (
                                        <HugeiconsIcon icon={LockIcon} size={18} className="text-foreground shrink-0" />
                                    )}
                                </div>
                                <p className="text-muted-foreground text-sm">@{otherParticipant?.email.split("@")[0]}</p>
                                <p className="text-muted-foreground text-xs mt-2">{otherParticipant?.joinedAt}에 가입함 · {otherParticipant?.followerCount} 팔로워</p>
                                <button className="mt-4 px-4 py-2 bg-foreground text-background rounded-full font-bold text-sm hover:opacity-90">
                                    프로필 보기
                                </button>
                            </div>

                            {/* Messages grouped by date */}
                            <div className="space-y-4">
                                <div className="flex justify-center">
                                    <span className="text-xs text-muted-foreground bg-accent/30 px-2 py-0.5 rounded-full">2023년 7월 5일</span>
                                </div>

                                {messages.map((m) => {
                                    const isMine = m.senderId === "me"; // In real app, check against session
                                    return (
                                        <div key={m.id} className={cn(
                                            "flex flex-col",
                                            isMine ? "items-end" : "items-start"
                                        )}>
                                            <div className={cn(
                                                "max-w-[85%] px-4 py-2.5 rounded-2xl text-[15px]",
                                                isMine
                                                    ? "bg-primary text-white rounded-br-none"
                                                    : "bg-secondary text-foreground rounded-bl-none"
                                            )}>
                                                {m.content}
                                            </div>
                                            <span className="text-[11px] text-muted-foreground mt-1 px-1">
                                                {format(new Date(m.createdAt), 'aaa h:mm', { locale: ko })}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Input Bar */}
                        <div className="p-2 border-t border-border bg-background">
                            <div className="flex items-center gap-1 bg-secondary rounded-2xl px-2 py-1">
                                <button className="p-2 text-primary hover:bg-accent rounded-full transition-colors">
                                    <HugeiconsIcon icon={Add01Icon} size={20} strokeWidth={2} />
                                </button>
                                <input
                                    type="text"
                                    placeholder="복호화된 메시지"
                                    className="flex-1 bg-transparent py-2 px-1 outline-none text-[15px] placeholder:text-muted-foreground"
                                />
                                <button className="p-2 text-primary hover:bg-accent rounded-full transition-colors opacity-50 cursor-not-allowed">
                                    <HugeiconsIcon icon={SentIcon} size={20} strokeWidth={2} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <NewMessageModal
                isOpen={isNewMessageModalOpen}
                onClose={() => setIsNewMessageModalOpen(false)}
                onSelectUser={handleNewMessageSelect}
            />
        </div>
    );
}
