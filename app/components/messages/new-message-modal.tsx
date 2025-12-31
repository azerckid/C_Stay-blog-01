import { useState, useMemo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    Cancel01Icon,
    Search01Icon,
    LockIcon,
    TickDouble01Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "~/lib/utils";
import { MOCK_USERS } from "~/lib/mock-messages";
import type { UserBasic } from "~/types/messages";

interface NewMessageModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectUser: (userId: string) => void;
}

export function NewMessageModal({ isOpen, onClose, onSelectUser }: NewMessageModalProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedUsers, setSelectedUsers] = useState<UserBasic[]>([]);

    const filteredUsers = useMemo(() => {
        if (!searchQuery.trim()) return Object.values(MOCK_USERS);
        const query = searchQuery.toLowerCase();
        return Object.values(MOCK_USERS).filter(
            (user) =>
                user.name.toLowerCase().includes(query) ||
                user.email.toLowerCase().includes(query)
        );
    }, [searchQuery]);

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
                <button
                    onClick={handleNext}
                    disabled={selectedUsers.length === 0}
                    className="px-4 py-1.5 bg-foreground text-background rounded-full font-bold text-sm disabled:opacity-50 transition-all"
                >
                    다음
                </button>
            </div>

            {/* Search Bar */}
            <div className="px-4 pt-3 pb-2 flex flex-col gap-2 border-b border-border/50">
                <div className="relative flex items-center flex-wrap gap-2">
                    <div className="p-2 text-primary shrink-0">
                        <HugeiconsIcon icon={Search01Icon} size={18} strokeWidth={2} />
                    </div>

                    {/* Selected Users Chips */}
                    {selectedUsers.map((user) => (
                        <div
                            key={user.id}
                            className="flex items-center gap-1.5 px-2 py-1 bg-background border border-border rounded-full group"
                        >
                            <div className="h-5 w-5 rounded-full bg-muted overflow-hidden">
                                {user.image && <img src={user.image} alt={user.name} className="h-full w-full object-cover" />}
                            </div>
                            <span className="text-xs font-bold">{user.name}</span>
                            <button
                                onClick={() => handleUserToggle(user)}
                                className="text-primary hover:text-primary/70"
                            >
                                <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={2.5} />
                            </button>
                        </div>
                    ))}

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
                {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => {
                        const isSelected = selectedUsers.some((u) => u.id === user.id);
                        return (
                            <div
                                key={user.id}
                                onClick={() => handleUserToggle(user)}
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
                                {isSelected && (
                                    <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                                        <HugeiconsIcon icon={TickDouble01Icon} size={12} className="text-white" />
                                    </div>
                                )}
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
