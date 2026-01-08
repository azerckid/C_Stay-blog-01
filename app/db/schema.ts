import { sqliteTable, text, integer, real, blob, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql, relations } from "drizzle-orm";

// helper for ISO strings
const timestamp = (name: string) => text(name);

// 1. User & Auth Tables
export const users = sqliteTable("User", {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    password: text("password"),
    name: text("name"),
    image: text("image"),
    provider: text("provider").default("local").notNull(),
    snsId: text("snsId"),
    createdAt: text("createdAt").default(sql`(datetime('now'))`).notNull(),
    updatedAt: text("updatedAt").notNull(),
    emailVerified: integer("emailVerified", { mode: "boolean" }).notNull(),
    avatarUrl: text("avatarUrl"),
    status: text("status").default("OFFLINE").notNull(),
    bio: text("bio"),
    coverImage: text("coverImage"),
    isPrivate: integer("isPrivate", { mode: "boolean" }),
    checkInTime: text("checkInTime"),
    pushSubscription: text("pushSubscription"),
    subscriptionTier: text("subscriptionTier").default("FREE"),
    subscriptionStatus: text("subscriptionStatus"),
    subscriptionId: text("subscriptionId"),
    currentPeriodEnd: text("currentPeriodEnd"),
    lastTokenRefillAt: text("lastTokenRefillAt"),
    credits: integer("credits").default(100).notNull(),
    role: text("role").default("USER"),
}, (table) => ({
    subscriptionIdIdx: uniqueIndex("User_subscriptionId_unique").on(table.subscriptionId),
}));

export const accounts = sqliteTable("account", {
    id: text("id").primaryKey(),
    accountId: text("accountId").notNull(),
    providerId: text("providerId").notNull(),
    userId: text("userId").notNull(),
    accessToken: text("accessToken"),
    refreshToken: text("refreshToken"),
    idToken: text("idToken"),
    accessTokenExpiresAt: text("accessTokenExpiresAt"),
    refreshTokenExpiresAt: text("refreshTokenExpiresAt"),
    scope: text("scope"),
    password: text("password"),
    createdAt: text("createdAt").notNull(),
    updatedAt: text("updatedAt").notNull(),
});

export const sessions = sqliteTable("session", {
    id: text("id").primaryKey(),
    expiresAt: text("expiresAt").notNull(),
    token: text("token").notNull(),
    createdAt: text("createdAt").notNull(),
    updatedAt: text("updatedAt").notNull(),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
    userId: text("userId").notNull(),
}, (table) => ({
    tokenIdx: uniqueIndex("session_token_unique").on(table.token),
}));

export const verifications = sqliteTable("verification", {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: text("expiresAt").notNull(),
    createdAt: text("createdAt"),
    updatedAt: text("updatedAt"),
});

// 2. Tweet & Content Tables
export const tweets = sqliteTable("Tweet", {
    id: text("id").primaryKey(),
    userId: text("userId").notNull(),
    content: text("content").notNull(),
    parentId: text("parentId"),
    isRetweet: integer("isRetweet", { mode: "boolean" }).default(false).notNull(),
    originalTweetId: text("originalTweetId"),
    deletedAt: text("deletedAt"),
    locationName: text("locationName"),
    latitude: real("latitude"),
    longitude: real("longitude"),
    address: text("address"),
    travelDate: text("travelDate"),
    country: text("country"),
    city: text("city"),
    travelPlanId: text("travelPlanId"),
    createdAt: text("createdAt").default(sql`(datetime('now'))`).notNull(),
    updatedAt: text("updatedAt").notNull(),
    visibility: text("visibility").default("PUBLIC"),
}, (table) => ({
    userIdIdx: index("Tweet_userId_idx").on(table.userId),
    parentIdIdx: index("Tweet_parentId_idx").on(table.parentId),
    createdAtIdx: index("Tweet_createdAt_idx").on(table.createdAt),
    deletedAtIdx: index("Tweet_deletedAt_idx").on(table.deletedAt),
    countryCityIdx: index("Tweet_country_city_idx").on(table.country, table.city),
    travelDateIdx: index("Tweet_travelDate_idx").on(table.travelDate),
    locationIdx: index("Tweet_location_idx").on(table.latitude, table.longitude),
}));

export const media = sqliteTable("Media", {
    id: text("id").primaryKey(),
    tweetId: text("tweetId").notNull(),
    type: text("type").notNull(),
    url: text("url").notNull(),
    thumbnailUrl: text("thumbnailUrl"),
    altText: text("altText"),
    order: integer("order").default(0).notNull(),
    createdAt: text("createdAt").default(sql`(datetime('now'))`).notNull(),
    publicId: text("publicId"),
}, (table) => ({
    tweetIdIdx: index("Media_tweetId_idx").on(table.tweetId),
    tweetIdOrderIdx: index("Media_tweetId_order_idx").on(table.tweetId, table.order),
}));

export const likes = sqliteTable("Like", {
    id: text("id").primaryKey(),
    userId: text("userId").notNull(),
    tweetId: text("tweetId").notNull(),
    createdAt: text("createdAt").default(sql`(datetime('now'))`).notNull(),
});

export const retweets = sqliteTable("Retweet", {
    id: text("id").primaryKey(),
    userId: text("userId").notNull(),
    tweetId: text("tweetId").notNull(),
    createdAt: text("createdAt").default(sql`(datetime('now'))`).notNull(),
});

export const follows = sqliteTable("Follow", {
    id: text("id").primaryKey(),
    followerId: text("followerId").notNull(),
    followingId: text("followingId").notNull(),
    createdAt: text("createdAt").default(sql`(datetime('now'))`).notNull(),
    status: text("status").default('ACCEPTED'),
});

export const giftLogs = sqliteTable("GiftLog", {
    id: text("id").primaryKey(),
    fromUserId: text("fromUserId").notNull(),
    toCharacterId: text("toCharacterId").notNull(),
    itemId: text("itemId").notNull(),
    amount: integer("amount").notNull(),
    message: text("message"),
    createdAt: text("createdAt").default(sql`(datetime('now'))`).notNull(),
});

export const bookmarks = sqliteTable("Bookmark", {
    id: text("id").primaryKey(),
    userId: text("userId").notNull(),
    tweetId: text("tweetId").notNull(),
    createdAt: text("createdAt").default(sql`(datetime('now'))`).notNull(),
    collectionId: text("collectionId"),
});

export const bookmarkCollections = sqliteTable("BookmarkCollection", {
    id: text("id").primaryKey(),
    userId: text("userId").notNull(),
    name: text("name").notNull(),
    createdAt: text("createdAt").default(sql`(datetime('now'))`).notNull(),
    updatedAt: text("updatedAt").notNull(),
});

// 3. AI & Character Tables
export const characters = sqliteTable("Character", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    role: text("role").notNull(),
    bio: text("bio").notNull(),
    personaPrompt: text("personaPrompt").notNull(),
    greetingMessage: text("greetingMessage"),
    isOnline: integer("isOnline", { mode: "boolean" }).notNull(),
    createdAt: text("createdAt").default(sql`(datetime('now'))`).notNull(),
    updatedAt: text("updatedAt").notNull(),
});

export const characterMedia = sqliteTable("CharacterMedia", {
    id: text("id").primaryKey(),
    characterId: text("characterId").notNull(),
    url: text("url").notNull(),
    type: text("type").notNull(),
    sortOrder: integer("sortOrder").default(0).notNull(),
    createdAt: text("createdAt").default(sql`(datetime('now'))`).notNull(),
});

export const characterStats = sqliteTable("CharacterStat", {
    id: text("id").primaryKey(),
    characterId: text("characterId").notNull(),
    totalHearts: integer("totalHearts").default(0).notNull(),
    totalUniqueGivers: integer("totalUniqueGivers").default(0).notNull(),
    currentEmotion: text("currentEmotion").default('JOY'),
    emotionExpiresAt: text("emotionExpiresAt"),
    lastGiftAt: text("lastGiftAt"),
    createdAt: text("createdAt").default(sql`(datetime('now'))`).notNull(),
    updatedAt: text("updatedAt").notNull(),
});

export const conversations = sqliteTable("Conversation", {
    id: text("id").primaryKey(),
    characterId: text("characterId").default('chunsim').notNull(),
    title: text("title").notNull(),
    userId: text("userId"),
    createdAt: text("createdAt").default(sql`(datetime('now'))`).notNull(),
    updatedAt: text("updatedAt").notNull(),
});

export const messages = sqliteTable("Message", {
    id: text("id").primaryKey(),
    role: text("role").notNull(),
    content: text("content").notNull(),
    conversationId: text("conversationId").notNull(),
    mediaUrl: text("mediaUrl"),
    mediaType: text("mediaType"),
    createdAt: text("createdAt").default(sql`(datetime('now'))`).notNull(),
    type: text("type").default('TEXT').notNull(),
    senderId: text("senderId"),
    roomId: text("roomId"),
    read: integer("read", { mode: "boolean" }).default(false).notNull(),
});

// 4. Messaging & Interaction
export const dmConversations = sqliteTable("DMConversation", {
    id: text("id").primaryKey(),
    isGroup: integer("isGroup", { mode: "boolean" }).notNull(),
    groupName: text("groupName"),
    lastMessageAt: text("lastMessageAt").default(sql`(datetime('now'))`).notNull(),
    isAccepted: integer("isAccepted", { mode: "boolean" }).notNull(),
    createdAt: text("createdAt").default(sql`(datetime('now'))`).notNull(),
    updatedAt: text("updatedAt").notNull(),
});

export const dmParticipants = sqliteTable("DMParticipant", {
    id: text("id").primaryKey(),
    conversationId: text("conversationId").notNull(),
    userId: text("userId").notNull(),
    joinedAt: text("joinedAt").default(sql`(datetime('now'))`).notNull(),
    leftAt: text("leftAt"),
    isAdmin: integer("isAdmin", { mode: "boolean" }).default(false).notNull(),
});

export const directMessages = sqliteTable("DirectMessage", {
    id: text("id").primaryKey(),
    conversationId: text("conversationId").notNull(),
    senderId: text("senderId").notNull(),
    content: text("content").notNull(),
    isRead: integer("isRead", { mode: "boolean" }).default(false).notNull(),
    deletedBySender: integer("deletedBySender", { mode: "boolean" }).default(false).notNull(),
    deletedByReceiver: integer("deletedByReceiver", { mode: "boolean" }).default(false).notNull(),
    createdAt: text("createdAt").default(sql`(datetime('now'))`).notNull(),
    updatedAt: text("updatedAt").notNull(),
    mediaUrl: text("mediaUrl"),
    mediaType: text("mediaType"),
});

// 5. Travel & Tools
export const travelPlans = sqliteTable("TravelPlan", {
    id: text("id").primaryKey(),
    userId: text("userId").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    startDate: text("startDate"),
    endDate: text("endDate"),
    status: text("status").default('PLANNING').notNull(),
    createdAt: text("createdAt").default(sql`(datetime('now'))`).notNull(),
    updatedAt: text("updatedAt").notNull(),
});

export const travelPlanItems = sqliteTable("TravelPlanItem", {
    id: text("id").primaryKey(),
    travelPlanId: text("travelPlanId").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    date: text("date"),
    time: text("time"),
    locationName: text("locationName"),
    latitude: real("latitude"),
    longitude: real("longitude"),
    order: integer("order").default(0).notNull(),
    createdAt: text("createdAt").default(sql`(datetime('now'))`).notNull(),
    updatedAt: text("updatedAt").notNull(),
    status: text("status").default('TODO'),
});

export const travelTags = sqliteTable("TravelTag", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    createdAt: text("createdAt").default(sql`(datetime('now'))`).notNull(),
});

export const tweetTravelTags = sqliteTable("TweetTravelTag", {
    id: text("id").primaryKey(),
    tweetId: text("tweetId").notNull(),
    travelTagId: text("travelTagId").notNull(),
    createdAt: text("createdAt").default(sql`(datetime('now'))`).notNull(),
});

export const tweetEmbeddings = sqliteTable("TweetEmbedding", {
    id: text("id").primaryKey(),
    tweetId: text("tweetId").notNull(),
    vector: blob("vector").notNull(),
    createdAt: text("createdAt").default(sql`(datetime('now'))`).notNull(),
    updatedAt: text("updatedAt").notNull(),
});

// 6. Systems & Financial
export const payments = sqliteTable("Payment", {
    id: text("id").primaryKey(),
    userId: text("userId").notNull(),
    amount: real("amount").notNull(),
    currency: text("currency").default('USD').notNull(),
    status: text("status").notNull(),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    description: text("description"),
    creditsGranted: integer("creditsGranted"),
    metadata: text("metadata"),
    createdAt: text("createdAt").default(sql`(datetime('now'))`).notNull(),
    updatedAt: text("updatedAt").notNull(),
    transactionId: text("transactionId"),
    subscriptionId: text("subscriptionId"),
    paymentKey: text("paymentKey"),
    txHash: text("txHash"),
    walletAddress: text("walletAddress"),
    cryptoCurrency: text("cryptoCurrency"),
    cryptoAmount: real("cryptoAmount"),
    exchangeRate: real("exchangeRate"),
    blockNumber: text("blockNumber"),
    confirmations: integer("confirmations").default(0),
    network: text("network"),
});

export const agentExecutions = sqliteTable("AgentExecution", {
    id: text("id").primaryKey(),
    messageId: text("messageId").notNull(),
    agentName: text("agentName").notNull(),
    intent: text("intent").notNull(),
    promptTokens: integer("promptTokens").default(0).notNull(),
    completionTokens: integer("completionTokens").default(0).notNull(),
    totalTokens: integer("totalTokens").default(0).notNull(),
    rawOutput: text("rawOutput"),
    createdAt: text("createdAt").default(sql`(datetime('now'))`).notNull(),
});

export const items = sqliteTable("Item", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    type: text("type").notNull(),
    priceCredits: integer("priceCredits"),
    priceUSD: real("priceUSD"),
    priceKRW: real("priceKRW"),
    iconUrl: text("iconUrl"),
    description: text("description"),
    isActive: integer("isActive", { mode: "boolean" }).default(true).notNull(),
    createdAt: text("createdAt").default(sql`(datetime('now'))`).notNull(),
    updatedAt: text("updatedAt").notNull(),
}, (table) => ({
    isActiveIdx: index("Item_isActive_idx").on(table.isActive),
}));

export const userInventories = sqliteTable("UserInventory", {
    id: text("id").primaryKey(),
    userId: text("userId").notNull(),
    itemId: text("itemId").notNull(),
    quantity: integer("quantity").default(0).notNull(),
    createdAt: text("createdAt").default(sql`(datetime('now'))`).notNull(),
    updatedAt: text("updatedAt").notNull(),
});

export const missions = sqliteTable("Mission", {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    rewardCredits: integer("rewardCredits").default(0).notNull(),
    type: text("type").default('DAILY').notNull(),
    isActive: integer("isActive", { mode: "boolean" }).default(true).notNull(),
    createdAt: text("createdAt").default(sql`(datetime('now'))`).notNull(),
    updatedAt: text("updatedAt").notNull(),
});

export const userMissions = sqliteTable("UserMission", {
    id: text("id").primaryKey(),
    userId: text("userId").notNull(),
    missionId: text("missionId").notNull(),
    status: text("status").default('IN_PROGRESS').notNull(),
    progress: integer("progress").default(0).notNull(),
    lastUpdated: text("lastUpdated").default(sql`(datetime('now'))`).notNull(),
});

export const notices = sqliteTable("Notice", {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    type: text("type").default('NOTICE').notNull(),
    imageUrl: text("imageUrl"),
    isActive: integer("isActive", { mode: "boolean" }).default(true).notNull(),
    isPinned: integer("isPinned", { mode: "boolean" }).notNull(),
    createdAt: text("createdAt").default(sql`(datetime('now'))`).notNull(),
    updatedAt: text("updatedAt").notNull(),
});

export const fanPosts = sqliteTable("FanPost", {
    id: text("id").primaryKey(),
    userId: text("userId").notNull(),
    content: text("content").notNull(),
    imageUrl: text("imageUrl"),
    likes: integer("likes").default(0).notNull(),
    isApproved: integer("isApproved", { mode: "boolean" }).default(true).notNull(),
    createdAt: text("createdAt").default(sql`(datetime('now'))`).notNull(),
    updatedAt: text("updatedAt").notNull(),
});

export const systemLogs = sqliteTable("SystemLog", {
    id: text("id").primaryKey(),
    level: text("level").default('INFO').notNull(),
    category: text("category").default('SYSTEM').notNull(),
    message: text("message").notNull(),
    stackTrace: text("stackTrace"),
    metadata: text("metadata"),
    createdAt: text("createdAt").default(sql`(datetime('now'))`).notNull(),
});

export const messageLikes = sqliteTable("MessageLike", {
    id: text("id").primaryKey(),
    messageId: text("messageId").notNull(),
    userId: text("userId").notNull(),
    createdAt: text("createdAt").default(sql`(datetime('now'))`).notNull(),
});

export const notifications = sqliteTable("Notification", {
    id: text("id").primaryKey(),
    recipientId: text("recipientId").notNull(),
    issuerId: text("issuerId").notNull(),
    type: text("type").notNull(),
    tweetId: text("tweetId"),
    isRead: integer("isRead", { mode: "boolean" }).default(false).notNull(),
    createdAt: text("createdAt").default(sql`(datetime('now'))`).notNull(),
}, (table) => ({
    recipientIdIdx: index("Notification_recipientId_idx").on(table.recipientId),
    issuerIdIdx: index("Notification_issuerId_idx").on(table.issuerId),
    tweetIdIdx: index("Notification_tweetId_idx").on(table.tweetId),
}));

// Relations
export const usersRelations = relations(users, ({ many }) => ({
    tweets: many(tweets),
    accounts: many(accounts),
    sessions: many(sessions),
    followedBy: many(follows, { relationName: "following" }),
    following: many(follows, { relationName: "follower" }),
    likes: many(likes),
    retweets: many(retweets),
    bookmarks: many(bookmarks),
    bookmarkCollections: many(bookmarkCollections),
    userInventories: many(userInventories),
    userMissions: many(userMissions),
    fanPosts: many(fanPosts),
    receivedNotifications: many(notifications, { relationName: "recipient" }),
    issuedNotifications: many(notifications, { relationName: "issuer" }),
}));

export const tweetsRelations = relations(tweets, ({ one, many }) => ({
    user: one(users, { fields: [tweets.userId], references: [users.id] }),
    media: many(media),
    likes: many(likes),
    retweets: many(retweets),
    replies: many(tweets, { relationName: "replies" }),
    parent: one(tweets, { fields: [tweets.parentId], references: [tweets.id], relationName: "replies" }),
    tags: many(tweetTravelTags),
    bookmarks: many(bookmarks),
    travelPlan: one(travelPlans, { fields: [tweets.travelPlanId], references: [travelPlans.id] }),
    embedding: one(tweetEmbeddings),
    notifications: many(notifications),
}));

export const mediaRelations = relations(media, ({ one }) => ({
    tweet: one(tweets, { fields: [media.tweetId], references: [tweets.id] }),
}));

export const tweetTravelTagsRelations = relations(tweetTravelTags, ({ one }) => ({
    tweet: one(tweets, { fields: [tweetTravelTags.tweetId], references: [tweets.id] }),
    travelTag: one(travelTags, { fields: [tweetTravelTags.travelTagId], references: [travelTags.id] }),
}));

export const travelTagsRelations = relations(travelTags, ({ many }) => ({
    tweets: many(tweetTravelTags),
}));

export const likesRelations = relations(likes, ({ one }) => ({
    tweet: one(tweets, { fields: [likes.tweetId], references: [tweets.id] }),
    user: one(users, { fields: [likes.userId], references: [users.id] }),
}));

export const retweetsRelations = relations(retweets, ({ one }) => ({
    tweet: one(tweets, { fields: [retweets.tweetId], references: [tweets.id] }),
    user: one(users, { fields: [retweets.userId], references: [users.id] }),
}));

export const followsRelations = relations(follows, ({ one }) => ({
    follower: one(users, { fields: [follows.followerId], references: [users.id], relationName: "follower" }),
    following: one(users, { fields: [follows.followingId], references: [users.id], relationName: "following" }),
}));

export const bookmarksRelations = relations(bookmarks, ({ one }) => ({
    tweet: one(tweets, { fields: [bookmarks.tweetId], references: [tweets.id] }),
    user: one(users, { fields: [bookmarks.userId], references: [users.id] }),
    collection: one(bookmarkCollections, { fields: [bookmarks.collectionId], references: [bookmarkCollections.id] }),
}));

export const travelPlansRelations = relations(travelPlans, ({ one, many }) => ({
    user: one(users, { fields: [travelPlans.userId], references: [users.id] }),
    items: many(travelPlanItems),
    tweets: many(tweets),
}));

export const travelPlanItemsRelations = relations(travelPlanItems, ({ one }) => ({
    travelPlan: one(travelPlans, { fields: [travelPlanItems.travelPlanId], references: [travelPlans.id] }),
}));

export const charactersRelations = relations(characters, ({ many }) => ({
    media: many(characterMedia),
    stats: many(characterStats),
    conversations: many(conversations),
}));

export const characterMediaRelations = relations(characterMedia, ({ one }) => ({
    character: one(characters, { fields: [characterMedia.characterId], references: [characters.id] }),
}));

export const characterStatsRelations = relations(characterStats, ({ one }) => ({
    character: one(characters, { fields: [characterStats.characterId], references: [characters.id] }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
    user: one(users, { fields: [conversations.userId], references: [users.id] }),
    character: one(characters, { fields: [conversations.characterId], references: [characters.id] }),
    messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
    conversation: one(conversations, { fields: [messages.conversationId], references: [conversations.id] }),
    likes: many(messageLikes),
}));

export const dmConversationsRelations = relations(dmConversations, ({ many }) => ({
    participants: many(dmParticipants),
    messages: many(directMessages),
}));

export const dmParticipantsRelations = relations(dmParticipants, ({ one }) => ({
    conversation: one(dmConversations, { fields: [dmParticipants.conversationId], references: [dmConversations.id] }),
    user: one(users, { fields: [dmParticipants.userId], references: [users.id] }),
}));

export const directMessagesRelations = relations(directMessages, ({ one }) => ({
    conversation: one(dmConversations, { fields: [directMessages.conversationId], references: [dmConversations.id] }),
    sender: one(users, { fields: [directMessages.senderId], references: [users.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
    recipient: one(users, { fields: [notifications.recipientId], references: [users.id], relationName: "recipient" }),
    issuer: one(users, { fields: [notifications.issuerId], references: [users.id], relationName: "issuer" }),
    tweet: one(tweets, { fields: [notifications.tweetId], references: [tweets.id] }),
}));
