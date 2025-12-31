import { useState, useRef, useEffect } from "react";
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
    Cancel01Icon,
    SmileIcon,
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

    const [selectedMedia, setSelectedMedia] = useState<{ file: File; preview: string } | null>(null);
    const [reactions, setReactions] = useState<Record<string, string>>({});
    const [activeReactionPicker, setActiveReactionPicker] = useState<string | null>(null);
    const [isTyping, setIsTyping] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const commonEmojis = ["❤️", "😂", "😲", "😢", "🔥", "👍", "🙏"];

    useEffect(() => {
        // Simulate random typing indicator matching drawer behavior
        const typingInterval = setInterval(() => {
            if (Math.random() > 0.7) {
                setIsTyping(true);
                setTimeout(() => setIsTyping(false), 3000);
            }
        }, 8000);
        return () => clearInterval(typingInterval);
    }, []);

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
                        const reaction = reactions[m.id];
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
                                        {reaction && (
                                            <div className={cn(
                                                "absolute -bottom-3 px-2 py-0.5 bg-background border border-border rounded-full text-[14px] shadow-sm select-none",
                                                isMine ? "right-1" : "left-1"
                                            )}>
                                                {reaction}
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

            {/* Bottom Input Area */}
            <div className="p-3 border-t border-border bg-background">
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*,video/*"
                    onChange={handleFileChange}
                />

                {/* Media Preview */}
                {selectedMedia && (
                    <div className="mb-3 relative w-fit mx-2 px-10">
                        <div className="relative rounded-2xl overflow-hidden border border-border bg-secondary shadow-sm">
                            <img
                                src={selectedMedia.preview}
                                alt="Preview"
                                className="max-h-[250px] w-auto object-contain"
                            />
                            <button
                                onClick={removeMedia}
                                className="absolute top-2 right-2 p-1.5 bg-background/80 hover:bg-background backdrop-blur-sm rounded-full transition-colors shadow-md"
                            >
                                <HugeiconsIcon icon={Cancel01Icon} size={18} strokeWidth={2.5} />
                            </button>
                        </div>
                    </div>
                )}

                <div className="flex items-end gap-2 px-2 py-1 bg-secondary rounded-2xl">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2.5 text-primary hover:bg-accent rounded-full transition-colors mb-0.5"
                    >
                        <HugeiconsIcon icon={Image01Icon} size={20} strokeWidth={2} />
                    </button>
                    <textarea
                        rows={1}
                        placeholder="새 메시지 작성하기"
                        className="flex-1 bg-transparent py-2.5 px-1 outline-none text-[15px] placeholder:text-muted-foreground resize-none max-h-48 overflow-y-auto"
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
