import { useState, useEffect, useRef } from "react";
import { useFetcher, useRouteLoaderData } from "react-router";
import Pusher from "pusher-js";
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
    SmileIcon,
    Time01Icon,
    Tick02Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "~/lib/utils";
import { MOCK_CONVERSATIONS, MOCK_MESSAGES, MOCK_USERS } from "~/lib/mock-messages";
import type { DMConversation, DirectMessage } from "~/types/messages";
import { formatRelative, format } from "date-fns";
import { ko } from "date-fns/locale";
import { NewMessageModal } from "./new-message-modal";
import { MessageSettingsModal } from "./message-settings-modal";

type DrawerState = "hidden" | "expanded-list" | "expanded-chat";

export function MessageDrawer() {
    const [state, setState] = useState<DrawerState>("hidden");
    const [selectedTab, setSelectedTab] = useState<"all" | "requests">("all");
    const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
    const [isNewMessageModalOpen, setIsNewMessageModalOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [selectedMedia, setSelectedMedia] = useState<{ file: File; preview: string } | null>(null);
    const [reactions, setReactions] = useState<Record<string, string>>({});
    const [activeReactionPicker, setActiveReactionPicker] = useState<string | null>(null);
    const [isTyping, setIsTyping] = useState(false);
    const fetcher = useFetcher<any>();
    const messagesFetcher = useFetcher<any>();
    const createConvFetcher = useFetcher<any>();
    const rootData = useRouteLoaderData("root") as any;
    const user = rootData?.user;
    const ENV = rootData?.ENV;

    const [conversations, setConversations] = useState<any[]>([]);
    const [messages, setMessages] = useState<any[]>([]); // Current conversation messages
    const [newMessage, setNewMessage] = useState("");
    const [pusherClient, setPusherClient] = useState<Pusher | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const selectedTabRef = useRef(selectedTab);

    useEffect(() => {
        selectedTabRef.current = selectedTab;
    }, [selectedTab]);

    const commonEmojis = ["❤️", "😂", "😲", "😢", "🔥", "👍", "🙏"];

    // Load conversations when drawer opens or tab changes
    useEffect(() => {
        if (state === "expanded-list") {
            fetcher.load(`/api/messages/conversations?tab=${selectedTab}`);
        }
    }, [state, selectedTab]);

    // Update conversations from fetcher
    useEffect(() => {
        if (fetcher.data?.conversations) {
            setConversations((prev) => {
                const newConvs = fetcher.data.conversations;
                // If we have a selected conversation that is NOT in the new list (e.g. newly created but not yet in backend list query),
                // we should keep it temporarily to avoid profile flickering.
                if (selectedConvId) {
                    const currentSelected = Array.isArray(prev) ? prev.find(c => c.id === selectedConvId) : null;
                    const existsInNew = newConvs.find((c: any) => c.id === selectedConvId);

                    if (currentSelected && !existsInNew) {
                        return [currentSelected, ...newConvs];
                    }
                }
                return newConvs;
            });
        }
    }, [fetcher.data, selectedConvId]);

    // Load messages when a conversation is selected
    useEffect(() => {
        if (selectedConvId) {
            messagesFetcher.load(`/api/messages/conversations/${selectedConvId}`);
        } else {
            setMessages([]);
        }
    }, [selectedConvId]);

    // Update messages from fetcher (Initial Load or Revalidation)
    useEffect(() => {
        if (messagesFetcher.data?.messages) {
            setMessages(messagesFetcher.data.messages);
        } else if (messagesFetcher.data?.success && messagesFetcher.data?.message) {
            // Handle successful send response: Replace optimistic message
            const sentMessage = messagesFetcher.data.message;
            setMessages(prev => prev.map(m => (m.isOptimistic && m.content === sentMessage.content) ? sentMessage : m));
        }
    }, [messagesFetcher.data]);

    // Initialize Pusher & User Channel
    useEffect(() => {
        if (!user || !ENV?.PUSHER_KEY) return;

        const pusher = new Pusher(ENV.PUSHER_KEY, {
            cluster: ENV.PUSHER_CLUSTER || "ap3",
        });
        setPusherClient(pusher);

        const channelName = `user-${user.id}`;
        const channel = pusher.subscribe(channelName);

        // Global notifications (update list)
        const handleListUpdate = () => {
            fetcher.load(`/api/messages/conversations?tab=${selectedTabRef.current}`);
        };

        channel.bind("new-message-notification", handleListUpdate);
        channel.bind("new-conversation", handleListUpdate);
        channel.bind("conversation-accepted-notification", handleListUpdate);

        return () => {
            channel.unbind_all();
            pusher.unsubscribe(channelName);
            pusher.disconnect();
        };
    }, [user, ENV]);

    // Conversation Channel Subscription
    useEffect(() => {
        if (!pusherClient || !selectedConvId) return;

        const channelName = `conversation-${selectedConvId}`;
        const channel = pusherClient.subscribe(channelName);

        channel.bind("new-message", (data: any) => {
            if (data.conversationId === selectedConvId) {
                // If I am the sender, ignore this Pusher event to avoid duplication (Optimistic UI handles it)
                if (data.message.senderId === user?.id) return;

                setMessages((prev) => [...prev, data.message]);
            }
        });

        channel.bind("conversation-accepted", (data: any) => {
            // Refresh conversation list to show accepted status if needed
            fetcher.load(`/api/messages/conversations?tab=${selectedTabRef.current}`);
        });

        return () => {
            channel.unbind_all();
            pusherClient.unsubscribe(channelName);
        };
    }, [pusherClient, selectedConvId, user?.id]);

    // Handle new conversation creation/finding result
    useEffect(() => {
        if (createConvFetcher.data?.success && createConvFetcher.data?.conversation) {
            const conv = createConvFetcher.data.conversation;
            // Add to conversation list if not exists (though Pusher should handle this, optimistic/immediate feedback is good)
            setConversations((prev) => {
                const current = Array.isArray(prev) ? prev : [];
                if (current.find((c: any) => c.id === conv.id)) return current;
                return [conv, ...current];
            });
            handleConvClick(conv.id);
            setIsNewMessageModalOpen(false);
        }
    }, [createConvFetcher.data]);

    const handleSendMessage = () => {
        if (!newMessage.trim() || !selectedConvId) return;

        const content = newMessage;
        const tempId = `temp-${Date.now()}`;

        // Optimistic UI Update
        const optimisticMessage = {
            id: tempId,
            content,
            senderId: user?.id || "me",
            sender: {
                id: user?.id,
                name: user?.name,
                username: user?.email?.split("@")[0],
                image: user?.image || user?.avatarUrl,
            },
            isRead: false,
            createdAt: new Date().toISOString(),
            isOptimistic: true
        };

        setMessages(prev => [...prev, optimisticMessage]);
        setNewMessage("");

        messagesFetcher.submit(
            { conversationId: selectedConvId, content },
            { method: "post", action: "/api/messages", encType: "application/json" }
        );
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    useEffect(() => {
        const handleToggle = () => {
            setState((prev) => (prev === "hidden" ? "expanded-list" : "hidden"));
        };

        // Simulate random typing indicator
        const typingInterval = setInterval(() => {
            if (Math.random() > 0.7) {
                setIsTyping(true);
                setTimeout(() => setIsTyping(false), 3000);
            }
        }, 8000);

        window.addEventListener('toggle-message-drawer', handleToggle);
        return () => {
            window.removeEventListener('toggle-message-drawer', handleToggle);
            clearInterval(typingInterval);
        };
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
        createConvFetcher.submit(
            { userIds: [userId] },
            { method: "post", action: "/api/messages/conversations", encType: "application/json" }
        );
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const preview = URL.createObjectURL(file);
            setSelectedMedia({ file, preview });
        }
    };

    const removeMedia = () => {
        if (selectedMedia) {
            URL.revokeObjectURL(selectedMedia.preview);
            setSelectedMedia(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const safeConversations = Array.isArray(conversations) ? conversations : [];
    const selectedConv = safeConversations.find((c) => c.id === selectedConvId);

    // Derived state for other participant (assuming 1:1 mostly for now)
    // The API structure is participants: { user: UserBasic, ... }[]
    const otherParticipant = selectedConv?.participants?.find((p: any) => p.user.id !== user?.id)?.user || selectedConv?.participants?.[0]?.user;

    // Filter logic is now handled by API based on tab
    const filteredConversations = conversations;

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
                                    setIsSettingsModalOpen(true);
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
                                filteredConversations.length > 0 ? (
                                    filteredConversations.map((conv) => {
                                        const partner = conv.participants?.find((p: any) => p.user.id !== user?.id)?.user || conv.participants?.[0]?.user || { name: "알 수 없음", email: "unknown@staync.com" };
                                        const displayUser = partner;
                                        return (
                                            <div
                                                key={conv.id}
                                                onClick={() => handleConvClick(conv.id)}
                                                className="px-4 py-3 flex gap-3 hover:bg-accent/50 cursor-pointer transition-colors border-b border-border/50"
                                            >
                                                <div className="h-12 w-12 rounded-full bg-muted border border-border overflow-hidden shrink-0">
                                                    {displayUser.image && <img src={displayUser.image} alt={displayUser.name} className="h-full w-full object-cover" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-1">
                                                        <div className="flex items-center gap-1 min-w-0">
                                                            <span className="font-bold truncate">{displayUser.name}</span>
                                                            {displayUser.isPrivate && (
                                                                <HugeiconsIcon icon={LockIcon} size={14} className="text-muted-foreground shrink-0" />
                                                            )}
                                                            <span className="text-sm text-muted-foreground truncate">@{displayUser.email.split("@")[0]}</span>
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
                                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300 h-full">
                                        <div className="text-3xl font-extrabold mb-2">쪽지가 없네요</div>
                                        <p className="text-muted-foreground text-[15px] mb-8 max-w-[280px] break-keep leading-relaxed">
                                            하고 싶은 말이 있다면, 지금 바로 쪽지를 보내보세요!
                                        </p>
                                        <button
                                            onClick={() => setIsNewMessageModalOpen(true)}
                                            className="px-8 py-3 bg-primary text-primary-foreground font-bold text-[15px] rounded-full hover:bg-primary/90 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/20"
                                        >
                                            쪽지 쓰기
                                        </button>
                                    </div>
                                )
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
                                    const isMine = m.senderId === user?.id;
                                    return (
                                        <div key={m.id} className={cn(
                                            "flex flex-col group relative",
                                            isMine ? "items-end" : "items-start"
                                        )}>
                                            <div className="flex items-center gap-2 max-w-[75%] sm:max-w-[65%] relative group/bubble">
                                                {isMine && !activeReactionPicker && (
                                                    <button
                                                        onClick={() => setActiveReactionPicker(m.id)}
                                                        className="opacity-0 group-hover/bubble:opacity-100 p-2 hover:bg-accent rounded-full text-muted-foreground transition-all duration-200"
                                                    >
                                                        <HugeiconsIcon icon={SmileIcon} size={18} />
                                                    </button>
                                                )}

                                                <div className={cn(
                                                    "px-4 py-3 rounded-2xl text-[15px] leading-normal relative",
                                                    isMine
                                                        ? "bg-primary text-white rounded-br-none"
                                                        : "bg-secondary text-foreground rounded-bl-none"
                                                )}>
                                                    {m.content}

                                                    {/* Reaction Badge */}
                                                    {reactions[m.id] && (
                                                        <div className={cn(
                                                            "absolute -bottom-3 px-2 py-0.5 bg-background border border-border rounded-full text-[14px] shadow-sm select-none",
                                                            isMine ? "right-1" : "left-1"
                                                        )}>
                                                            {reactions[m.id]}
                                                        </div>
                                                    )}

                                                    {/* Emoji Picker Popover */}
                                                    {activeReactionPicker === m.id && (
                                                        <div className={cn(
                                                            "absolute bottom-full mb-2 z-[20] bg-background border border-border rounded-full shadow-2xl flex gap-1 p-1.5 animate-in zoom-in-95 duration-150",
                                                            isMine ? "right-0" : "left-0"
                                                        )}>
                                                            {commonEmojis.map(emoji => (
                                                                <button
                                                                    key={emoji}
                                                                    onClick={() => {
                                                                        setReactions(prev => ({ ...prev, [m.id]: emoji }));
                                                                        setActiveReactionPicker(null);
                                                                    }}
                                                                    className="hover:scale-125 transition-transform px-1.5 text-lg"
                                                                >
                                                                    {emoji}
                                                                </button>
                                                            ))}
                                                            <button
                                                                onClick={() => setActiveReactionPicker(null)}
                                                                className="ml-1 p-1.5 hover:bg-accent rounded-full"
                                                            >
                                                                <HugeiconsIcon icon={Cancel01Icon} size={14} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                {!isMine && !activeReactionPicker && (
                                                    <button
                                                        onClick={() => setActiveReactionPicker(m.id)}
                                                        className="opacity-0 group-hover/bubble:opacity-100 p-2 hover:bg-accent rounded-full text-muted-foreground transition-all duration-200"
                                                    >
                                                        <HugeiconsIcon icon={SmileIcon} size={18} />
                                                    </button>
                                                )}
                                            </div>
                                            <div className="mt-1 px-1 flex items-center gap-1">
                                                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                                    {(() => {
                                                        const date = new Date(m.createdAt);
                                                        return !isNaN(date.getTime())
                                                            ? format(date, 'aaa h:mm', { locale: ko })
                                                            : "";
                                                    })()}
                                                    {isMine && (
                                                        m.isOptimistic ? (
                                                            <HugeiconsIcon icon={Time01Icon} size={12} className="text-muted-foreground animate-pulse" />
                                                        ) : (
                                                            <HugeiconsIcon
                                                                icon={Tick02Icon}
                                                                size={14}
                                                                className={cn(
                                                                    "transition-colors",
                                                                    m.isRead ? "text-primary" : "text-muted-foreground"
                                                                )}
                                                            />
                                                        )
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}

                                {isTyping && (
                                    <div className="flex flex-col items-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <div className="bg-secondary px-4 py-3 rounded-2xl rounded-bl-none flex gap-1 items-center h-[42px]">
                                            <div className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                            <div className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                            <div className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Input Bar */}
                        <div className="p-2 border-t border-border bg-background">
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*,video/*"
                                onChange={handleFileChange}
                            />

                            {/* Media Preview */}
                            {selectedMedia && (
                                <div className="mb-2 relative w-fit mx-2">
                                    <div className="relative rounded-xl overflow-hidden border border-border bg-secondary">
                                        <img
                                            src={selectedMedia.preview}
                                            alt="Preview"
                                            className="max-h-[200px] w-auto object-contain"
                                        />
                                        <button
                                            onClick={removeMedia}
                                            className="absolute top-1 right-1 p-1.5 bg-background/80 hover:bg-background backdrop-blur-sm rounded-full transition-colors shadow-sm"
                                        >
                                            <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={2.5} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-end gap-1 bg-secondary rounded-2xl px-2 py-1">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-2 text-primary hover:bg-accent rounded-full transition-colors mb-0.5"
                                >
                                    <HugeiconsIcon icon={Add01Icon} size={20} strokeWidth={2} />
                                </button>
                                <textarea
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    rows={1}
                                    placeholder="쪽지 보내기"
                                    className="flex-1 bg-transparent py-2 px-1 outline-none text-[15px] placeholder:text-muted-foreground resize-none max-h-[120px] overflow-y-auto"
                                    onInput={(e) => {
                                        const target = e.target as HTMLTextAreaElement;
                                        target.style.height = 'auto';
                                        target.style.height = target.scrollHeight + 'px';
                                    }}
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={!newMessage.trim()}
                                    className={cn(
                                        "p-2 text-primary hover:bg-accent rounded-full transition-colors mb-0.5",
                                        !newMessage.trim() && "opacity-50 cursor-not-allowed"
                                    )}
                                >
                                    <HugeiconsIcon icon={SentIcon} size={20} strokeWidth={2} />
                                </button>
                            </div>
                        </div>
                    </div>
                )
                }
            </div >

            <NewMessageModal
                isOpen={isNewMessageModalOpen}
                onClose={() => setIsNewMessageModalOpen(false)}
                onSelectUser={handleNewMessageSelect}
            />

            <MessageSettingsModal
                isOpen={isSettingsModalOpen}
                onClose={() => setIsSettingsModalOpen(false)}
            />
        </div >
    );
}
