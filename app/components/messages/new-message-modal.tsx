import { useState, useMemo, useEffect } from "react";
import { useFetcher } from "react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    Cancel01Icon,
    Search01Icon,
    LockIcon,
    TickDouble01Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "~/lib/utils";
import type { UserBasic } from "~/types/messages";

interface NewMessageModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectUser: (userId: string) => void;
}

export function NewMessageModal({ isOpen, onClose, onSelectUser }: NewMessageModalProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedUsers, setSelectedUsers] = useState<UserBasic[]>([]);
    const [users, setUsers] = useState<UserBasic[]>([]);
    const fetcher = useFetcher<any>();

    // Load initial recommendations (following) when opened
    useEffect(() => {
        if (isOpen && !searchQuery) {
            fetcher.load("/api/users/search");
        }
    }, [isOpen, searchQuery]);

    // Search with debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            if (isOpen && searchQuery.trim()) {
                fetcher.load(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
            }
        }, 300); // 300ms debounce

        return () => clearTimeout(timer);
    }, [searchQuery, isOpen]);

    // Update users list when fetcher data changes
    useEffect(() => {
        if (fetcher.data?.users) {
            setUsers(fetcher.data.users);
        }
    }, [fetcher.data]);

    const handleUserToggle = (user: UserBasic) => {
        if (selectedUsers.some((u) => u.id === user.id)) {
            setSelectedUsers(selectedUsers.filter((u) => u.id !== user.id));
        } else {
            setSelectedUsers([...selectedUsers, user]);
        }
    };

    const handleNext = () => {
        if (selectedUsers.length > 0) {
            onSelectUser(selectedUsers[0].id); // For now, handle 1:1
            onClose();
            setSelectedUsers([]);
            setSearchQuery("");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 z-[110] bg-background flex flex-col rounded-t-xl overflow-hidden animate-in slide-in-from-bottom duration-300">
            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between border-b border-border">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-accent rounded-full transition-colors"
                    >
                        <HugeiconsIcon icon={Cancel01Icon} size={20} strokeWidth={2} />
                    </button>
                    <h2 className="text-lg font-black">새 쪽지 작성</h2>
                </div>
            </div>

            {/* Search Bar */}
            <div className="px-4 pt-3 pb-2 flex flex-col gap-2 border-b border-border/50">
                <div className="relative flex items-center flex-wrap gap-2">
                    <div className="p-2 text-primary shrink-0">
                        <HugeiconsIcon icon={Search01Icon} size={18} strokeWidth={2} />
                    </div>

                    <input
                        autoFocus
                        type="text"
                        placeholder="사람 검색"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1 min-w-[120px] bg-transparent py-2 px-1 outline-none text-sm"
                    />
                </div>
            </div>

            {/* Result List */}
            <div className="flex-1 overflow-y-auto">
                {fetcher.state === "loading" ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                        검색 중...
                    </div>
                ) : users.length > 0 ? (
                    users.map((user) => {
                        return (
                            <div
                                key={user.id}
                                onClick={() => onSelectUser(user.id)}
                                className="px-4 py-3 flex items-center gap-3 hover:bg-accent/50 cursor-pointer transition-colors"
                            >
                                <div className="h-10 w-10 rounded-full bg-muted border border-border overflow-hidden shrink-0">
                                    {user.image && <img src={user.image} alt={user.name} className="h-full w-full object-cover" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1 min-w-0">
                                        <span className="font-bold truncate text-sm">{user.name}</span>
                                        {user.isPrivate && (
                                            <HugeiconsIcon icon={LockIcon} size={12} className="text-muted-foreground shrink-0" />
                                        )}
                                        <span className="text-xs text-muted-foreground truncate">@{user.email.split("@")[0]}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate font-normal">
                                        {user.isVerified ? "추천됨" : "팔로워 " + user.followerCount + "명"}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="p-8 text-center">
                        <p className="text-sm text-muted-foreground">"{searchQuery}"에 대한 검색 결과가 없습니다.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
