CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`accountId` text NOT NULL,
	`providerId` text NOT NULL,
	`userId` text NOT NULL,
	`accessToken` text,
	`refreshToken` text,
	`idToken` text,
	`accessTokenExpiresAt` text,
	`refreshTokenExpiresAt` text,
	`scope` text,
	`password` text,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `AgentExecution` (
	`id` text PRIMARY KEY NOT NULL,
	`messageId` text NOT NULL,
	`agentName` text NOT NULL,
	`intent` text NOT NULL,
	`promptTokens` integer DEFAULT 0 NOT NULL,
	`completionTokens` integer DEFAULT 0 NOT NULL,
	`totalTokens` integer DEFAULT 0 NOT NULL,
	`rawOutput` text,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `BookmarkCollection` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`name` text NOT NULL,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `Bookmark` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`tweetId` text NOT NULL,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	`collectionId` text
);
--> statement-breakpoint
CREATE TABLE `CharacterMedia` (
	`id` text PRIMARY KEY NOT NULL,
	`characterId` text NOT NULL,
	`url` text NOT NULL,
	`type` text NOT NULL,
	`sortOrder` integer DEFAULT 0 NOT NULL,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `CharacterStat` (
	`id` text PRIMARY KEY NOT NULL,
	`characterId` text NOT NULL,
	`totalHearts` integer DEFAULT 0 NOT NULL,
	`totalUniqueGivers` integer DEFAULT 0 NOT NULL,
	`currentEmotion` text DEFAULT 'JOY',
	`emotionExpiresAt` text,
	`lastGiftAt` text,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `Character` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`bio` text NOT NULL,
	`personaPrompt` text NOT NULL,
	`greetingMessage` text,
	`isOnline` integer NOT NULL,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `Conversation` (
	`id` text PRIMARY KEY NOT NULL,
	`characterId` text DEFAULT 'chunsim' NOT NULL,
	`title` text NOT NULL,
	`userId` text,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `DirectMessage` (
	`id` text PRIMARY KEY NOT NULL,
	`conversationId` text NOT NULL,
	`senderId` text NOT NULL,
	`content` text NOT NULL,
	`isRead` integer DEFAULT false NOT NULL,
	`deletedBySender` integer DEFAULT false NOT NULL,
	`deletedByReceiver` integer DEFAULT false NOT NULL,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	`updatedAt` text NOT NULL,
	`mediaUrl` text,
	`mediaType` text
);
--> statement-breakpoint
CREATE TABLE `DMConversation` (
	`id` text PRIMARY KEY NOT NULL,
	`isGroup` integer NOT NULL,
	`groupName` text,
	`lastMessageAt` text DEFAULT (datetime('now')) NOT NULL,
	`isAccepted` integer NOT NULL,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `DMParticipant` (
	`id` text PRIMARY KEY NOT NULL,
	`conversationId` text NOT NULL,
	`userId` text NOT NULL,
	`joinedAt` text DEFAULT (datetime('now')) NOT NULL,
	`leftAt` text,
	`isAdmin` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `FanPost` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`content` text NOT NULL,
	`imageUrl` text,
	`likes` integer DEFAULT 0 NOT NULL,
	`isApproved` integer DEFAULT true NOT NULL,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `Follow` (
	`id` text PRIMARY KEY NOT NULL,
	`followerId` text NOT NULL,
	`followingId` text NOT NULL,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	`status` text DEFAULT 'ACCEPTED'
);
--> statement-breakpoint
CREATE TABLE `GiftLog` (
	`id` text PRIMARY KEY NOT NULL,
	`fromUserId` text NOT NULL,
	`toCharacterId` text NOT NULL,
	`itemId` text NOT NULL,
	`amount` integer NOT NULL,
	`message` text,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `Item` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`priceCredits` integer,
	`priceUSD` real,
	`priceKRW` real,
	`iconUrl` text,
	`description` text,
	`isActive` integer DEFAULT true NOT NULL,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `Item_isActive_idx` ON `Item` (`isActive`);--> statement-breakpoint
CREATE TABLE `Like` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`tweetId` text NOT NULL,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `Media` (
	`id` text PRIMARY KEY NOT NULL,
	`tweetId` text NOT NULL,
	`type` text NOT NULL,
	`url` text NOT NULL,
	`thumbnailUrl` text,
	`altText` text,
	`order` integer DEFAULT 0 NOT NULL,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	`publicId` text
);
--> statement-breakpoint
CREATE INDEX `Media_tweetId_idx` ON `Media` (`tweetId`);--> statement-breakpoint
CREATE INDEX `Media_tweetId_order_idx` ON `Media` (`tweetId`,`order`);--> statement-breakpoint
CREATE TABLE `MessageLike` (
	`id` text PRIMARY KEY NOT NULL,
	`messageId` text NOT NULL,
	`userId` text NOT NULL,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `Message` (
	`id` text PRIMARY KEY NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`conversationId` text NOT NULL,
	`mediaUrl` text,
	`mediaType` text,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	`type` text DEFAULT 'TEXT' NOT NULL,
	`senderId` text,
	`roomId` text,
	`read` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `Mission` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`rewardCredits` integer DEFAULT 0 NOT NULL,
	`type` text DEFAULT 'DAILY' NOT NULL,
	`isActive` integer DEFAULT true NOT NULL,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `Notice` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`type` text DEFAULT 'NOTICE' NOT NULL,
	`imageUrl` text,
	`isActive` integer DEFAULT true NOT NULL,
	`isPinned` integer NOT NULL,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `Notification` (
	`id` text PRIMARY KEY NOT NULL,
	`recipientId` text NOT NULL,
	`issuerId` text NOT NULL,
	`type` text NOT NULL,
	`tweetId` text,
	`isRead` integer DEFAULT false NOT NULL,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `Notification_recipientId_idx` ON `Notification` (`recipientId`);--> statement-breakpoint
CREATE INDEX `Notification_issuerId_idx` ON `Notification` (`issuerId`);--> statement-breakpoint
CREATE INDEX `Notification_tweetId_idx` ON `Notification` (`tweetId`);--> statement-breakpoint
CREATE TABLE `Payment` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`amount` real NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`status` text NOT NULL,
	`type` text NOT NULL,
	`provider` text NOT NULL,
	`description` text,
	`creditsGranted` integer,
	`metadata` text,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	`updatedAt` text NOT NULL,
	`transactionId` text,
	`subscriptionId` text,
	`paymentKey` text,
	`txHash` text,
	`walletAddress` text,
	`cryptoCurrency` text,
	`cryptoAmount` real,
	`exchangeRate` real,
	`blockNumber` text,
	`confirmations` integer DEFAULT 0,
	`network` text
);
--> statement-breakpoint
CREATE TABLE `Retweet` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`tweetId` text NOT NULL,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expiresAt` text NOT NULL,
	`token` text NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	`ipAddress` text,
	`userAgent` text,
	`userId` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE TABLE `SystemLog` (
	`id` text PRIMARY KEY NOT NULL,
	`level` text DEFAULT 'INFO' NOT NULL,
	`category` text DEFAULT 'SYSTEM' NOT NULL,
	`message` text NOT NULL,
	`stackTrace` text,
	`metadata` text,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `TravelPlanItem` (
	`id` text PRIMARY KEY NOT NULL,
	`travelPlanId` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`date` text,
	`time` text,
	`locationName` text,
	`latitude` real,
	`longitude` real,
	`order` integer DEFAULT 0 NOT NULL,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	`updatedAt` text NOT NULL,
	`status` text DEFAULT 'TODO'
);
--> statement-breakpoint
CREATE TABLE `TravelPlan` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`startDate` text,
	`endDate` text,
	`status` text DEFAULT 'PLANNING' NOT NULL,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `TravelTag` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `TweetEmbedding` (
	`id` text PRIMARY KEY NOT NULL,
	`tweetId` text NOT NULL,
	`vector` blob NOT NULL,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `TweetTravelTag` (
	`id` text PRIMARY KEY NOT NULL,
	`tweetId` text NOT NULL,
	`travelTagId` text NOT NULL,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `Tweet` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`content` text NOT NULL,
	`parentId` text,
	`isRetweet` integer DEFAULT false NOT NULL,
	`originalTweetId` text,
	`deletedAt` text,
	`locationName` text,
	`latitude` real,
	`longitude` real,
	`address` text,
	`travelDate` text,
	`country` text,
	`city` text,
	`travelPlanId` text,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	`updatedAt` text NOT NULL,
	`visibility` text DEFAULT 'PUBLIC'
);
--> statement-breakpoint
CREATE INDEX `Tweet_userId_idx` ON `Tweet` (`userId`);--> statement-breakpoint
CREATE INDEX `Tweet_parentId_idx` ON `Tweet` (`parentId`);--> statement-breakpoint
CREATE INDEX `Tweet_createdAt_idx` ON `Tweet` (`createdAt`);--> statement-breakpoint
CREATE INDEX `Tweet_deletedAt_idx` ON `Tweet` (`deletedAt`);--> statement-breakpoint
CREATE INDEX `Tweet_country_city_idx` ON `Tweet` (`country`,`city`);--> statement-breakpoint
CREATE INDEX `Tweet_travelDate_idx` ON `Tweet` (`travelDate`);--> statement-breakpoint
CREATE INDEX `Tweet_location_idx` ON `Tweet` (`latitude`,`longitude`);--> statement-breakpoint
CREATE TABLE `UserInventory` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`itemId` text NOT NULL,
	`quantity` integer DEFAULT 0 NOT NULL,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `UserMission` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`missionId` text NOT NULL,
	`status` text DEFAULT 'IN_PROGRESS' NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`lastUpdated` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `User` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password` text,
	`name` text,
	`image` text,
	`provider` text DEFAULT 'local' NOT NULL,
	`snsId` text,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	`updatedAt` text NOT NULL,
	`emailVerified` integer NOT NULL,
	`avatarUrl` text,
	`status` text DEFAULT 'OFFLINE' NOT NULL,
	`bio` text,
	`coverImage` text,
	`isPrivate` integer,
	`checkInTime` text,
	`pushSubscription` text,
	`subscriptionTier` text DEFAULT 'FREE',
	`subscriptionStatus` text,
	`subscriptionId` text,
	`currentPeriodEnd` text,
	`lastTokenRefillAt` text,
	`credits` integer DEFAULT 100 NOT NULL,
	`role` text DEFAULT 'USER'
);
--> statement-breakpoint
CREATE UNIQUE INDEX `User_subscriptionId_unique` ON `User` (`subscriptionId`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expiresAt` text NOT NULL,
	`createdAt` text,
	`updatedAt` text
);
