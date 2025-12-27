import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
    index("routes/home.tsx"),
    route("api/auth/*", "routes/api.auth.ts", { id: "api-auth" }),
    route("auth/google/callback", "routes/api.auth.ts", { id: "google-callback" }),
    route("auth/kakao/callback", "routes/api.auth.ts", { id: "kakao-callback" }),
    route("login", "routes/login.tsx"),
    route("signup", "routes/signup.tsx"),
] satisfies RouteConfig;
