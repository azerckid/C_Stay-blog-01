import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
    // Layout & Pages
    layout("routes/_app.tsx", [
        // Main Pages
        index("routes/tweets/home.tsx"),
        route("profile", "routes/users/profile.tsx"),
        route("search", "routes/search/search.tsx"),
        route("bookmarks", "routes/bookmarks/bookmarks.tsx"),
        route("notifications", "routes/notifications/notifications.tsx"),

        // Content Pages
        route("tweet/:tweetId", "routes/tweets/tweet.$tweetId.tsx"),
        route("tags/:slug", "routes/tweets/tags.$slug.tsx"),

        // User Pages
        route("user/:userId", "routes/users/user.$userId.tsx"),
        route("user/:userId/follows", "routes/users/user.$userId.follows.tsx"),

        // Travel Pages
        route("travel-plans", "routes/travel/travel-plans.tsx"),
        route("travel-plans/:id", "routes/travel/travel-plans.$id.tsx"),

        // Messages
        route("messages", "routes/messages/messages.tsx", [
            index("routes/messages/messages.index.tsx"),
            route(":conversationId", "routes/messages/messages.$conversationId.tsx"),
        ]),
    ]),

    // Authentication Pages
    route("login", "routes/auth/login.tsx"),
    route("signup", "routes/auth/signup.tsx"),

    // API Routes - Auth (Better Auth handles all /auth/* routes)
    route("auth/*", "routes/auth/api.auth.ts", { id: "auth" }),

    // API Routes - Users
    route("api/users", "routes/users/api.users.ts"),
    route("api/users/search", "routes/users/api.users.search.ts"),

    // API Routes - Content (Tweets)
    route("api/tweets", "routes/tweets/api.tweets.ts"),
    route("api/likes", "routes/tweets/api.likes.ts"),
    route("api/retweets", "routes/tweets/api.retweets.ts"),

    // API Routes - Bookmarks
    route("api/bookmarks", "routes/bookmarks/api.bookmarks.ts"),
    route("api/bookmarks/collections", "routes/bookmarks/api.bookmarks.collections.ts"),

    // API Routes - Follows
    route("api/follows", "routes/users/api.follows.ts"),

    // API Routes - Messages
    route("api/messages", "routes/messages/api.messages.ts"),
    route("api/messages/:id/read", "routes/messages/api.messages.$id.read.ts"),
    route("api/messages/conversations", "routes/messages/api.messages.conversations.ts"),
    route("api/messages/conversations/:id", "routes/messages/api.messages.conversations.$id.ts"),
    route("api/messages/conversations/:id/read", "routes/messages/api.messages.conversations.$id.read.ts"),
    route("api/messages/conversations/:id/typing", "routes/messages/api.messages.conversations.$id.typing.ts"),

    // API Routes - Notifications
    route("api/notifications", "routes/notifications/api.notifications.ts"),

    // API Routes - Travel
    route("api/travel-plans", "routes/travel/api.travel-plans.ts"),
    route("api/travel-plans/:id", "routes/travel/api.travel-plans.$id.ts"),
    route("api/travel-plan-items", "routes/travel/api.travel-plan-items.ts"),
    route("api/travel-plan-items/:id", "routes/travel/api.travel-plan-items.$id.ts"),
    route("api/travel-stats/:userId", "routes/travel/api.travel-stats.$userId.ts"),

    // API Routes - Tags
    route("api/tags", "routes/tweets/api.tags.ts"),

    // API Routes - AI
    route("api/ai-travel-log", "routes/travel/api.ai-travel-log.ts"),

    // API Routes - Upload
    route("api/upload", "routes/upload/api.upload.ts"),
] satisfies RouteConfig;
