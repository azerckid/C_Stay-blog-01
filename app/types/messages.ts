export type MessagePrivacy = 'EVERYONE' | 'VERIFIED_USERS' | 'NONE';

export interface UserBasic {
    id: string;
    name: string;
    email: string;
    image?: string;
    isVerified?: boolean;
    isPrivate?: boolean;
    joinedAt?: string;
    followerCount?: number;
}

export interface DirectMessage {
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
    isRead: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface DMConversation {
    id: string;
    isGroup: boolean;
    groupName?: string;
    lastMessageAt: string;
    isAccepted: boolean;
    participants: DMParticipant[];
    lastMessage?: DirectMessage;
    unreadCount: number;
}

export interface DMParticipant {
    id: string;
    conversationId: string;
    userId: string;
    joinedAt: string;
    isAdmin: boolean;
    user: UserBasic;
}
