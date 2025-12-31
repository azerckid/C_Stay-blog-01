import type { DMConversation, DirectMessage, UserBasic } from "~/types/messages";

export const MOCK_USERS: Record<string, UserBasic> = {
    u1: {
        id: "u1",
        name: "SHINIGAMI",
        email: "shinigami@example.com",
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=shinigami",
        isVerified: true,
        isPrivate: false,
        joinedAt: "2020년 9월",
        followerCount: 1250,
    },
    u2: {
        id: "u2",
        name: "Rashidkhan",
        email: "rashid@example.com",
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=rashid",
        isVerified: false,
        isPrivate: false,
        joinedAt: "2021년 3월",
        followerCount: 450,
    },
    u3: {
        id: "u3",
        name: "D P",
        email: "dp@example.com",
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=dp",
        isVerified: false,
        isPrivate: true,
        joinedAt: "2019년 11월",
        followerCount: 89,
    },
    u4: {
        id: "u4",
        name: "xavier martin",
        email: "xavier@example.com",
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=xavier",
        isVerified: false,
        isPrivate: false,
        joinedAt: "2022년 5월",
        followerCount: 320,
    },
};

export const MOCK_CONVERSATIONS: DMConversation[] = [
    {
        id: "c1",
        isGroup: false,
        isAccepted: true,
        lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7 * 21).toISOString(), // 21주 전
        unreadCount: 1,
        participants: [
            { id: "p1", conversationId: "c1", userId: "u1", joinedAt: "", isAdmin: false, user: MOCK_USERS.u1 },
        ],
        lastMessage: {
            id: "m1",
            conversationId: "c1",
            senderId: "u1",
            content: "is it alright to send a business inquiry...",
            isRead: false,
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7 * 21).toISOString(),
            updatedAt: "",
        },
    },
    {
        id: "c2",
        isGroup: false,
        isAccepted: true,
        lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7 * 83).toISOString(), // 83주 전
        unreadCount: 0,
        participants: [
            { id: "p2", conversationId: "c2", userId: "u2", joinedAt: "", isAdmin: false, user: MOCK_USERS.u2 },
        ],
        lastMessage: {
            id: "m2",
            conversationId: "c2",
            senderId: "u2",
            content: "Hii 👋",
            isRead: true,
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7 * 83).toISOString(),
            updatedAt: "",
        },
    },
    {
        id: "c3",
        isGroup: false,
        isAccepted: true,
        lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7 * 97).toISOString(), // 97주 전
        unreadCount: 0,
        participants: [
            { id: "p3", conversationId: "c3", userId: "u3", joinedAt: "", isAdmin: false, user: MOCK_USERS.u3 },
        ],
        lastMessage: {
            id: "m3",
            conversationId: "c3",
            senderId: "u3",
            content: "Hi my dearest sweetheart, you're looking ...",
            isRead: true,
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7 * 97).toISOString(),
            updatedAt: "",
        },
    },
];

export const MOCK_MESSAGES: Record<string, DirectMessage[]> = {
    c2: [
        {
            id: "m2-1",
            conversationId: "c2",
            senderId: "u2",
            content: "Hii 👋",
            isRead: true,
            createdAt: "2023-07-05T18:57:00Z",
            updatedAt: "",
        },
        {
            id: "m2-2",
            conversationId: "c2",
            senderId: "u2",
            content: "Hii",
            isRead: true,
            createdAt: "2024-05-25T02:04:00Z",
            updatedAt: "",
        },
        {
            id: "m2-3",
            conversationId: "c2",
            senderId: "me",
            content: "Hello! How can I help you today?",
            isRead: true,
            createdAt: "2024-05-25T02:05:00Z",
            updatedAt: "",
        },
    ],
};
