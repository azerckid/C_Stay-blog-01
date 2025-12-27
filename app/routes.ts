import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
    layout("routes/_app.tsx", [
        index("routes/home.tsx"),
    ]),
    route("api/auth/*", "routes/api.auth.ts", { id: "api-auth" }),
    route("api/tweets", "routes/api.tweets.ts"),
    route("auth/google/callback", "routes/api.auth.ts", { id: "google-callback" }),
    route("auth/kakao/callback", "routes/api.auth.ts", { id: "kakao-callback" }),
    route("login", "routes/login.tsx"),
    route("signup", "routes/signup.tsx"),
] satisfies RouteConfig;
