import { useParams, Link } from "react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    InformationCircleIcon,
    Add01Icon,
    SentIcon,
    ArrowLeft01Icon,
    Image01Icon,
    AiViewIcon,
    LockIcon,
} from "@hugeicons/core-free-icons";
import { cn } from "~/lib/utils";
import { MOCK_CONVERSATIONS, MOCK_MESSAGES } from "~/lib/mock-messages";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

export default function ConversationView() {
    const { conversationId } = useParams();
    const conv = MOCK_CONVERSATIONS.find(c => c.id === conversationId);
    const messages = conversationId ? MOCK_MESSAGES[conversationId] || [] : [];
    const otherParticipant = conv?.participants[0]?.user;

    if (!conv) {
        return <div className="p-8">Conversation not found</div>;
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-background relative">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-2 bg-background/80 backdrop-blur-md border-b border-border">
                <div className="flex items-center gap-3">
                    <Link to="/messages" className="sm:hidden p-2 hover:bg-accent rounded-full transition-colors">
                        <HugeiconsIcon icon={ArrowLeft01Icon} size={20} strokeWidth={2} />
                    </Link>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-1">
                            <span className="font-bold text-lg leading-tight">{otherParticipant?.name}</span>
                            {otherParticipant?.isPrivate && (
                                <HugeiconsIcon icon={LockIcon} size={16} className="text-foreground shrink-0 mt-0.5" />
                            )}
                        </div>
                        <span className="text-xs text-muted-foreground">@{otherParticipant?.email.split("@")[0]}</span>
                    </div>
                </div>
                <button className="p-2 hover:bg-accent rounded-full transition-colors">
                    <HugeiconsIcon icon={InformationCircleIcon} size={20} strokeWidth={2} />
                </button>
            </div>

            {/* Message Area */}
            <div className="flex-1 overflow-y-auto px-4 py-8 space-y-6">
                {/* Profile Header */}
                <div className="flex flex-col items-center text-center py-8 border-b border-border mb-8 group">
                    <Link to={`/user/${otherParticipant?.id}`} className="block">
                        <div className="h-20 w-20 rounded-full bg-muted border border-border overflow-hidden mb-3 hover:opacity-90 transition-opacity">
                            {otherParticipant?.image && (
                                <img src={otherParticipant.image} alt={otherParticipant.name} className="h-full w-full object-cover" />
                            )}
                        </div>
                    </Link>
                    <Link to={`/user/${otherParticipant?.id}`} className="hover:underline">
                        <div className="flex items-center gap-1">
                            <h3 className="font-black text-xl">{otherParticipant?.name}</h3>
                            {otherParticipant?.isPrivate && (
                                <HugeiconsIcon icon={LockIcon} size={20} className="text-foreground shrink-0" />
                            )}
                        </div>
                    </Link>
                    <p className="text-muted-foreground text-sm">@{otherParticipant?.email.split("@")[0]}</p>
                    <p className="text-muted-foreground text-xs mt-3">
                        {otherParticipant?.joinedAt}에 가입함 · {otherParticipant?.followerCount} 팔로워
                    </p>
                    <Link to={`/user/${otherParticipant?.id}`}>
                        <button className="mt-4 px-6 py-2 bg-foreground text-background rounded-full font-bold text-sm hover:opacity-90 transition-opacity">
                            프로필 보기
                        </button>
                    </Link>
                </div>

                {/* Message Clusters */}
                <div className="space-y-4">
                    <div className="flex justify-center my-8">
                        <span className="text-xs text-muted-foreground font-medium">2023년 7월 5일</span>
                    </div>

                    {messages.map((m, idx) => {
                        const isMine = m.senderId === "me";
                        return (
                            <div key={m.id} className={cn(
                                "flex flex-col",
                                isMine ? "items-end" : "items-start"
                            )}>
                                <div className={cn(
                                    "max-w-[75%] sm:max-w-[65%] px-4 py-3 rounded-2xl text-[15px] leading-normal",
                                    isMine
                                        ? "bg-primary text-white rounded-br-none"
                                        : "bg-secondary text-foreground rounded-bl-none"
                                )}>
                                    {m.content}
                                </div>
                                <div className="mt-1 px-1 flex items-center gap-1">
                                    <span className="text-[11px] text-muted-foreground">
                                        {format(new Date(m.createdAt), 'aaa h:mm', { locale: ko })}
                                    </span>
                                    {isMine && m.isRead && (
                                        <HugeiconsIcon icon={SentIcon} size={12} className="text-primary" />
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Bottom Input Area */}
            <div className="p-3 border-t border-border bg-background">
                <div className="flex items-end gap-2 px-2 py-1 bg-secondary rounded-2xl">
                    <button className="p-2.5 text-primary hover:bg-accent rounded-full transition-colors mb-0.5">
                        <HugeiconsIcon icon={Image01Icon} size={20} strokeWidth={2} />
                    </button>
                    <textarea
                        rows={1}
                        placeholder="새 메시지 작성하기"
                        className="flex-1 bg-transparent py-2.5 px-1 outline-none text-[15px] placeholder:text-muted-foreground resize-none max-h-32"
                        onInput={(e) => {
                            const target = e.target as HTMLTextAreaElement;
                            target.style.height = 'auto';
                            target.style.height = target.scrollHeight + 'px';
                        }}
                    />
                    <button className="p-2.5 text-primary hover:bg-accent rounded-full transition-colors mb-0.5 opacity-50 cursor-not-allowed">
                        <HugeiconsIcon icon={SentIcon} size={22} strokeWidth={2} />
                    </button>
                </div>
            </div>
        </div>
    );
}
