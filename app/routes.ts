import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
    // Layout & Pages
    layout("routes/_app.tsx", [
        // Main Pages
        index("routes/home.tsx"),
        route("profile", "routes/profile.tsx"),
        route("search", "routes/search.tsx"),
        route("bookmarks", "routes/bookmarks.tsx"),
        route("notifications", "routes/notifications.tsx"),
        
        // Content Pages
        route("tweet/:tweetId", "routes/tweet.$tweetId.tsx"),
        route("tags/:slug", "routes/tags.$slug.tsx"),
        
        // User Pages
        route("user/:userId", "routes/user.$userId.tsx"),
        route("user/:userId/follows", "routes/user.$userId.follows.tsx"),
        
        // Travel Pages
        route("travel-plans", "routes/travel-plans.tsx"),
        route("travel-plans/:id", "routes/travel-plans.$id.tsx"),
        
        // Messages
        route("messages", "routes/messages.tsx", [
            index("routes/messages.index.tsx"),
            route(":conversationId", "routes/messages.$conversationId.tsx"),
        ]),
    ]),
    
    // Authentication Pages
    route("login", "routes/login.tsx"),
    route("signup", "routes/signup.tsx"),
    
    // API Routes - Auth
    route("api/auth/*", "routes/api.auth.ts", { id: "api-auth" }),
    route("auth/google/callback", "routes/api.auth.ts", { id: "google-callback" }),
    route("auth/kakao/callback", "routes/api.auth.ts", { id: "kakao-callback" }),
    
    // API Routes - Users
    route("api/users", "routes/api.users.ts"),
    route("api/users/search", "routes/api.users.search.ts"),
    
    // API Routes - Content (Tweets)
    route("api/tweets", "routes/api.tweets.ts"),
    route("api/likes", "routes/api.likes.ts"),
    route("api/retweets", "routes/api.retweets.ts"),
    
    // API Routes - Bookmarks
    route("api/bookmarks", "routes/api.bookmarks.ts"),
    route("api/bookmarks/collections", "routes/api.bookmarks.collections.ts"),
    
    // API Routes - Follows
    route("api/follows", "routes/api.follows.ts"),
    
    // API Routes - Messages
    route("api/messages", "routes/api.messages.ts"),
    route("api/messages/:id/read", "routes/api.messages.$id.read.ts"),
    route("api/messages/conversations", "routes/api.messages.conversations.ts"),
    route("api/messages/conversations/:id", "routes/api.messages.conversations.$id.ts"),
    route("api/messages/conversations/:id/read", "routes/api.messages.conversations.$id.read.ts"),
    route("api/messages/conversations/:id/typing", "routes/api.messages.conversations.$id.typing.ts"),
    
    // API Routes - Notifications
    route("api/notifications", "routes/api.notifications.ts"),
    
    // API Routes - Travel
    route("api/travel-plans", "routes/api.travel-plans.ts"),
    route("api/travel-plans/:id", "routes/api.travel-plans.$id.ts"),
    route("api/travel-plan-items", "routes/api.travel-plan-items.ts"),
    route("api/travel-plan-items/:id", "routes/api.travel-plan-items.$id.ts"),
    route("api/travel-stats/:userId", "routes/api.travel-stats.$userId.ts"),
    
    // API Routes - Tags
    route("api/tags", "routes/api.tags.ts"),
    
    // API Routes - AI
    route("api/ai-travel-log", "routes/api.ai-travel-log.ts"),
    
    // API Routes - Upload
    route("api/upload", "routes/api.upload.ts"),
] satisfies RouteConfig;
