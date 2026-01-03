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
    LockIcon,
    SmileIcon,
    Time01Icon,
    Tick02Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "~/lib/utils";
import { MOCK_CONVERSATIONS, MOCK_MESSAGES, MOCK_USERS } from "~/lib/mock-messages";
import type { DMConversation, DirectMessage } from "~/types/messages";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { toast } from "sonner";
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
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const fetcher = useFetcher<any>();
    const messagesFetcher = useFetcher<any>();
    const createConvFetcher = useFetcher<any>();
    const rootData = useRouteLoaderData("root") as any;
    const user = rootData?.user;
    const ENV = rootData?.ENV;

    const [conversations, setConversations] = useState<any[]>([]);
    const [messages, setMessages] = useState<any[]>([]); // Current conversation messages
    const [nextCursor, setNextCursor] = useState<string | null>(null); // For pagination
    const [newMessage, setNewMessage] = useState("");
    const [pusherClient, setPusherClient] = useState<Pusher | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const selectedTabRef = useRef(selectedTab);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const loadMoreRef = useRef<HTMLDivElement>(null);
    const loadMoreFetcher = useFetcher<any>();

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
        if (fetcher.data?.error) {
            toast.error(fetcher.data.error);
            return;
        }

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

    // 타이핑 인디케이터 전송 함수
    const sendTypingIndicator = async (isTyping: boolean) => {
        const convId = selectedConvId;
        if (!convId) return;

        try {
            await fetch(`/api/messages/conversations/${convId}/typing`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isTyping }),
            });
        } catch (error) {
            console.error("Failed to send typing indicator:", error);
        }
    };

    // 타이핑 감지 및 인디케이터 전송
    const handleTyping = () => {
        if (!selectedConvId) return;

        // 타이핑 시작 이벤트 전송
        sendTypingIndicator(true);

        // 기존 타이머 취소
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // 2초 후 타이핑 중지 이벤트 전송
        typingTimeoutRef.current = setTimeout(() => {
            sendTypingIndicator(false);
        }, 2000);
    };

    // Load messages when a conversation is selected
    useEffect(() => {
        if (selectedConvId) {
            messagesFetcher.load(`/api/messages/conversations/${selectedConvId}`);
            setNextCursor(null); // Reset cursor when switching conversations
            setIsTyping(false); // Reset typing indicator

            // 채팅방 진입 시 모든 읽지 않은 메시지를 읽음 처리
            fetch(`/api/messages/conversations/${selectedConvId}/read`, {
                method: "POST",
            }).catch((error) => {
                console.error("Failed to mark messages as read:", error);
            });
        } else {
            setMessages([]);
            setNextCursor(null);
            setIsTyping(false);
        }

        // Cleanup: 타이핑 타이머 정리 및 타이핑 중지 이벤트 전송
        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
            if (selectedConvId) {
                sendTypingIndicator(false);
            }
        };
    }, [selectedConvId]);

    // Update messages from fetcher (Initial Load or Revalidation)
    useEffect(() => {
        if (messagesFetcher.data?.error) {
            toast.error(messagesFetcher.data.error);
            // Remove optimistic message on error
            setMessages(prev => prev.filter(m => !m.isOptimistic || m.senderId !== user?.id));
            return;
        }

        if (messagesFetcher.data?.messages) {
            setMessages(messagesFetcher.data.messages);
            setNextCursor(messagesFetcher.data.nextCursor || null);
        } else if (messagesFetcher.data?.success && messagesFetcher.data?.message) {
            // Handle successful send response: Replace optimistic message
            const sentMessage = messagesFetcher.data.message;

            // 디버깅: API 응답으로 받은 메시지 확인
            if (sentMessage.mediaUrl) {
                console.log("[Client] Received message from API:", {
                    messageId: sentMessage.id,
                    mediaUrl: sentMessage.mediaUrl,
                    mediaType: sentMessage.mediaType,
                });
            }

            setMessages(prev => {
                // Find the most recent optimistic message from the current user (search from end)
                let optimisticIndex = -1;
                for (let i = prev.length - 1; i >= 0; i--) {
                    const m = prev[i];
                    if (m.isOptimistic && m.senderId === sentMessage.senderId) {
                        optimisticIndex = i;
                        break;
                    }
                }

                if (optimisticIndex !== -1) {
                    // Replace the optimistic message with the actual message
                    const newMessages = [...prev];
                    newMessages[optimisticIndex] = sentMessage;
                    return newMessages;
                }

                // If no optimistic message found, just add the new message
                return [...prev, sentMessage];
            });
        }
    }, [messagesFetcher.data, user?.id]);

    // Load more messages (pagination) when scrolling up
    useEffect(() => {
        if (loadMoreFetcher.data?.error) {
            toast.error(loadMoreFetcher.data.error);
            return;
        }

        if (loadMoreFetcher.data?.messages) {
            const previousScrollHeight = messagesContainerRef.current?.scrollHeight || 0;

            setMessages(prev => [...loadMoreFetcher.data.messages, ...prev]);
            setNextCursor(loadMoreFetcher.data.nextCursor || null);

            // Restore scroll position after loading older messages
            requestAnimationFrame(() => {
                if (messagesContainerRef.current) {
                    const newScrollHeight = messagesContainerRef.current.scrollHeight;
                    const scrollDifference = newScrollHeight - previousScrollHeight;
                    messagesContainerRef.current.scrollTop = scrollDifference;
                }
            });
        }
    }, [loadMoreFetcher.data]);

    // Intersection Observer for infinite scroll (load older messages)
    useEffect(() => {
        if (!loadMoreRef.current || !nextCursor || loadMoreFetcher.state !== "idle") return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && nextCursor && selectedConvId) {
                    loadMoreFetcher.load(`/api/messages/conversations/${selectedConvId}?cursor=${encodeURIComponent(nextCursor)}`);
                }
            },
            { threshold: 0.1 } // 요소가 10%만 보여도 트리거하여 더 자연스러운 스크롤 경험 제공
        );

        observer.observe(loadMoreRef.current);
        return () => observer.disconnect();
    }, [nextCursor, selectedConvId, loadMoreFetcher.state]);

    // Auto-scroll to bottom
    const messagesEndRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

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

                // 디버깅: Pusher로 받은 메시지 확인
                if (data.message.mediaUrl) {
                    console.log("[Pusher] Received message with media:", {
                        messageId: data.message.id,
                        mediaUrl: data.message.mediaUrl,
                        mediaType: data.message.mediaType,
                    });
                }

                // Ensure mediaUrl and mediaType are preserved
                const messageWithMedia = {
                    ...data.message,
                    mediaUrl: data.message.mediaUrl || null,
                    mediaType: data.message.mediaType || null,
                };
                setMessages((prev) => [...prev, messageWithMedia]);
            }
        });

        // 실시간 읽음 처리: 상대방이 메시지를 읽었을 때 UI 업데이트
        channel.bind("message-read", (data: any) => {
            if (data.conversationId === selectedConvId && data.readBy !== user?.id) {
                console.log("[Pusher] Received message-read event:", data);

                // 상대방이 읽은 메시지들을 읽음 상태로 업데이트
                setMessages((prev) => {
                    const updated = prev.map((msg) => {
                        // 내가 보낸 메시지이고, 아직 읽지 않은 상태면 읽음으로 변경
                        // messageIds가 있으면 해당 메시지만, 없으면 모든 메시지를 읽음 처리
                        if (msg.senderId === user?.id && !msg.isRead) {
                            if (data.messageIds && Array.isArray(data.messageIds)) {
                                // 특정 메시지 ID 목록이 있으면 해당 메시지만 읽음 처리
                                if (data.messageIds.includes(msg.id)) {
                                    return { ...msg, isRead: true };
                                }
                            } else {
                                // messageIds가 없으면 모든 내가 보낸 메시지를 읽음 처리
                                return { ...msg, isRead: true };
                            }
                        }
                        return msg;
                    });

                    console.log("[Pusher] Updated messages:", {
                        before: prev.filter(m => m.senderId === user?.id && !m.isRead).length,
                        after: updated.filter(m => m.senderId === user?.id && !m.isRead).length,
                    });

                    return updated;
                });
            }
        });

        channel.bind("conversation-accepted", (data: any) => {
            // Refresh conversation list to show accepted status if needed
            fetcher.load(`/api/messages/conversations?tab=${selectedTabRef.current}`);
        });

        // 타이핑 인디케이터 수신
        channel.bind("typing", (data: any) => {
            if (data.conversationId === selectedConvId && data.userId !== user?.id) {
                setIsTyping(data.isTyping);

                // 타이핑이 시작되면 3초 후 자동으로 숨김
                if (data.isTyping) {
                    setTimeout(() => {
                        setIsTyping(false);
                    }, 3000);
                }
            }
        });

        return () => {
            channel.unbind_all();
            pusherClient.unsubscribe(channelName);
        };
    }, [pusherClient, selectedConvId, user?.id]);

    // Handle new conversation creation/finding result
    useEffect(() => {
        if (createConvFetcher.data?.error) {
            toast.error(createConvFetcher.data.error);
            return;
        }

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

    const handleSendMessage = async () => {
        if ((!newMessage.trim() && !selectedMedia) || !selectedConvId) return;

        const content = newMessage;
        const tempId = `temp-${Date.now()}`;
        const mediaPreview = selectedMedia?.preview;
        const mediaType = selectedMedia?.file.type.startsWith('video') ? 'VIDEO' : 'IMAGE';

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
            isOptimistic: true,
            mediaUrl: mediaPreview, // Show preview immediately
            mediaType: selectedMedia ? mediaType : undefined,
        };

        setMessages(prev => [...prev, optimisticMessage]);
        setNewMessage("");
        setSelectedMedia(null); // Clear selection immediately for UX
        if (fileInputRef.current) fileInputRef.current.value = "";

        let uploadedMediaUrl = undefined;

        // If media is selected, upload it first
        if (selectedMedia) {
            try {
                const formData = new FormData();
                formData.append("file", selectedMedia.file);

                const response = await fetch("/api/upload", {
                    method: "POST",
                    body: formData,
                });

                if (response.ok) {
                    const data = await response.json();
                    uploadedMediaUrl = data.media?.url || data.url; // Handle both response formats
                } else {
                    console.error("Failed to upload media");
                    // Remove optimistic message on upload failure
                    setMessages(prev => prev.filter(m => m.id !== tempId));
                    toast.error("미디어 업로드에 실패했습니다. 다시 시도해주세요.");
                    return;
                }
            } catch (error) {
                console.error("Error uploading media:", error);
                // Remove optimistic message on upload failure
                setMessages(prev => prev.filter(m => m.id !== tempId));
                toast.error("미디어 업로드 중 오류가 발생했습니다. 다시 시도해주세요.");
                return;
            }
        }

        const messagePayload: any = {
            conversationId: selectedConvId,
            content: content || "",
        };

        // mediaUrl과 mediaType은 있을 때만 추가
        if (uploadedMediaUrl) {
            messagePayload.mediaUrl = uploadedMediaUrl;
            messagePayload.mediaType = mediaType;
        }

        // 디버깅: 전송하는 메시지 확인
        console.log("[Client] Sending message:", {
            conversationId: messagePayload.conversationId,
            content: messagePayload.content || "(empty)",
            mediaUrl: messagePayload.mediaUrl || "(none)",
            mediaType: messagePayload.mediaType || "(none)",
        });

        messagesFetcher.submit(
            JSON.stringify(messagePayload),
            {
                method: "post",
                action: "/api/messages",
                encType: "application/json",
                headers: {
                    "Content-Type": "application/json",
                }
            }
        );
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            if (e.nativeEvent.isComposing) return;
            e.preventDefault();
            handleSendMessage();
        }
    };


    useEffect(() => {
        const handleToggle = () => {
            // 편지봉투 아이콘 클릭 시 채팅 목록 화면 열기
            setState((prev) => (prev === "hidden" ? "expanded-list" : "hidden"));
        };

        window.addEventListener('toggle-message-drawer', handleToggle);
        return () => {
            window.removeEventListener('toggle-message-drawer', handleToggle);
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
                "fixed bottom-0 right-0 sm:right-4 w-full sm:w-[400px] bg-background border border-border shadow-2xl rounded-t-xl transition-all duration-300 ease-in-out z-[100] flex flex-col",
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
                        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-6">
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

                                {/* Load More Trigger (top) */}
                                <div ref={loadMoreRef} className="py-2 flex justify-center">
                                    {loadMoreFetcher.state === "loading" && (
                                        <p className="text-xs text-muted-foreground">과거 메시지 불러오는 중...</p>
                                    )}
                                    {loadMoreFetcher.state === "idle" && !nextCursor && messages.length > 0 && (
                                        <p className="text-xs text-muted-foreground">첫 번째 메시지입니다</p>
                                    )}
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
                                                    "px-4 py-1 rounded-2xl text-[15px] leading-normal relative",
                                                    isMine
                                                        ? "bg-primary text-white rounded-br-none"
                                                        : "bg-secondary text-foreground rounded-bl-none"
                                                )}>
                                                    {m.mediaUrl && (
                                                        <div className="mb-2 rounded-lg overflow-hidden max-w-full">
                                                            {m.mediaType === 'VIDEO' ? (
                                                                <video src={m.mediaUrl} controls className="max-w-full h-auto max-h-[300px]" />
                                                            ) : (
                                                                <img src={m.mediaUrl} alt="attachment" className="max-w-full h-auto max-h-[300px] object-cover" />
                                                            )}
                                                        </div>
                                                    )}
                                                    {m.content && <div className="whitespace-pre-wrap">{m.content}</div>}

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
                                                        ) : m.isRead ? (
                                                            <HugeiconsIcon
                                                                icon={Tick02Icon}
                                                                size={14}
                                                                className="text-green-500 transition-colors"
                                                            />
                                                        ) : (
                                                            <HugeiconsIcon
                                                                icon={Tick02Icon}
                                                                size={14}
                                                                className="text-muted-foreground transition-colors"
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
                                <div ref={messagesEndRef} />
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
                                        {selectedMedia.file.type.startsWith('video') ? (
                                            <video src={selectedMedia.preview} controls className="max-h-[200px] w-auto object-contain" />
                                        ) : (
                                            <img
                                                src={selectedMedia.preview}
                                                alt="Preview"
                                                className="max-h-[200px] w-auto object-contain"
                                            />
                                        )}
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
                                    onChange={(e) => {
                                        setNewMessage(e.target.value);
                                        handleTyping();
                                    }}
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
                                    disabled={!newMessage.trim() && !selectedMedia}
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
