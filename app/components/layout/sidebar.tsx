import { NavLink, useNavigate, Link } from "react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    Home01Icon,
    Search01Icon as SearchIcon,
    Notification01Icon as NotificationIcon,
    Mail01Icon as MailIcon,
    Bookmark02Icon,
    UserIcon,
    MoreHorizontalIcon,
    AiViewIcon
} from "@hugeicons/core-free-icons";
import { useSession, signOut } from "~/lib/auth-client";
import { cn } from "~/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Button } from "~/components/ui/button";
import { toast } from "sonner";

const NAV_ITEMS = [
    { label: "홈", href: "/", icon: Home01Icon },
    { label: "탐색", href: "/search", icon: SearchIcon },
    { label: "알림", href: "/notifications", icon: NotificationIcon },
    { label: "쪽지", href: "/messages", icon: MailIcon },
    { label: "북마크", href: "/bookmarks", icon: Bookmark02Icon },
    { label: "프로필", href: "/profile", icon: UserIcon },
];

interface SidebarProps {
    onAiLogOpen?: () => void;
    isMobileMenu?: boolean;
    onClose?: () => void;
    unreadCount?: number;
}

export function Sidebar({ onAiLogOpen, isMobileMenu, onClose, unreadCount = 0 }: SidebarProps) {
    const { data: session } = useSession();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            console.log("Logout initiated...");
            await signOut({
                fetchOptions: {
                    onSuccess: () => {
                        console.log("Logout success. Redirecting...");
                        // useNavigate를 사용하여 SPA 내 전환으로 알림 유실 방지
                        navigate(`/login?toast=${encodeURIComponent("성공적으로 로그아웃되었습니다.")}`);
                    },
                    onError: (ctx) => {
                        console.error("Logout error context:", ctx);
                        toast.error("로그아웃에 실패했습니다.");
                    }
                }
            });
        } catch (error) {
            console.error("SignOut Exception:", error);
            toast.error("로그아웃 중 오류가 발생했습니다.");
        }
    };

    return (
        <aside className={cn(
            "sticky top-0 h-screen flex flex-col justify-between py-4 px-2 xl:px-4 border-r border-border bg-background",
            isMobileMenu ? "w-full border-none" : "w-fit xl:w-64"
        )}>
            <div className="flex flex-col gap-2">
                {/* Logo */}
                <NavLink to="/" className="p-3 w-fit hover:bg-accent rounded-full mb-2">
                    <svg viewBox="0 0 24 24" className="h-8 w-8 text-primary fill-current" aria-hidden="true">
                        <g><path d="M23.643 4.937c-.835.37-1.732.62-2.675.733.962-.576 1.7-1.49 2.048-2.578-.9.534-1.897.922-2.958 1.13-.85-.904-2.06-1.47-3.4-1.47-2.572 0-4.658 2.086-4.658 4.66 0 .364.042.718.12 1.06-3.873-.195-7.304-2.05-9.602-4.868-.4.69-.63 1.49-.63 2.342 0 1.616.823 3.043 2.072 3.878-.764-.025-1.482-.234-2.11-.583v.06c0 2.257 1.605 4.14 3.737 4.568-.392.106-.803.162-1.227.162-.3 0-.593-.028-.877-.082.593 1.85 2.313 3.198 4.352 3.234-1.595 1.25-3.604 1.995-5.786 1.995-.376 0-.747-.022-1.112-.065 2.062 1.323 4.51 2.093 7.14 2.093 8.57 0 13.255-7.098 13.255-13.254 0-.2-.005-.402-.014-.602.91-.658 1.7-1.477 2.323-2.41z"></path></g>
                    </svg>
                </NavLink>

                {/* Navigation Items */}
                <nav className="flex flex-col gap-1">
                    {NAV_ITEMS.map((item) => (
                        <NavLink
                            key={item.href}
                            to={item.href}
                            onClick={onClose}
                            className={({ isActive }) =>
                                cn(
                                    "flex items-center gap-4 p-3 rounded-full transition-colors hover:bg-accent group",
                                    (isMobileMenu || "xl:w-full"),
                                    isActive ? "font-bold text-primary" : "font-normal"
                                )
                            }
                        >
                            <div className="relative">
                                <HugeiconsIcon icon={item.icon} strokeWidth={2} className="h-7 w-7" />
                                {item.label === "알림" && unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-primary text-white text-[10px] flex items-center justify-center rounded-full border-2 border-background">
                                        {unreadCount > 99 ? "9+" : unreadCount}
                                    </span>
                                )}
                            </div>
                            <span className={cn("text-xl", isMobileMenu ? "block" : "hidden xl:block")}>{item.label}</span>
                        </NavLink>
                    ))}

                    {/* More Menu */}
                    <button className={cn("flex items-center gap-4 p-3 rounded-full transition-colors hover:bg-accent group w-fit text-left", (isMobileMenu || "xl:w-full"))}>
                        <HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} className="h-7 w-7" />
                        <span className={cn("text-xl", isMobileMenu ? "block" : "hidden xl:block")}>더 보기</span>
                    </button>
                </nav>

                {/* AI Log Button (Repurposed from Post) */}
                <button
                    onClick={onAiLogOpen}
                    className={cn(
                        "bg-primary text-white rounded-full font-bold hover:bg-primary/90 transition-all mt-6 flex items-center justify-center shadow-lg",
                        isMobileMenu ? "h-14 w-14 ml-2" : "p-4 h-14 w-14 xl:h-auto xl:w-full xl:py-4 xl:px-8"
                    )}
                >
                    <HugeiconsIcon icon={AiViewIcon} strokeWidth={2.5} className={cn("h-7 w-7", (!isMobileMenu && "xl:mr-2"))} />
                    {!isMobileMenu && <span className="text-lg hidden xl:block">AI 여행 일지</span>}
                </button>
            </div>

            {/* User Session Nav */}
            {session?.user ? (
                <div className={cn("flex items-center gap-3 p-3 rounded-full hover:bg-accent transition-colors mt-auto group", isMobileMenu ? "w-full" : "w-fit xl:w-full")}>
                    <Link
                        to={`/user/${session.user.id}`}
                        onClick={onClose}
                        className="flex items-center gap-3 flex-1 min-w-0"
                    >
                        <div className="h-10 w-10 shrink-0 rounded-full bg-secondary flex items-center justify-center overflow-hidden border border-border">
                            {session.user.image ? (
                                <img src={session.user.image} alt={session.user.name ?? ""} className="h-full w-full object-cover" />
                            ) : (
                                <HugeiconsIcon icon={UserIcon} strokeWidth={2} className="h-6 w-6 text-muted-foreground" />
                            )}
                        </div>
                        <div className={cn("flex-col text-left overflow-hidden", isMobileMenu ? "flex" : "hidden xl:flex")}>
                            <span className="text-sm font-bold truncate">{session.user.name}</span>
                            <span className="text-xs text-muted-foreground truncate">@{session.user.email?.split("@")[0]}</span>
                        </div>
                    </Link>

                    <DropdownMenu>
                        <DropdownMenuTrigger className="p-1 hover:bg-accent rounded-full transition-colors outline-none h-8 w-8 flex items-center justify-center">
                            <HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} className={cn("h-5 w-5 text-muted-foreground", isMobileMenu ? "block" : "hidden xl:block")} />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64 mb-2 p-2">
                            <DropdownMenuItem className="p-0 cursor-pointer rounded-lg font-medium">
                                <NavLink to={`/user/${session.user.id}`} className="flex items-center w-full p-3 h-full" onClick={onClose}>
                                    <HugeiconsIcon icon={UserIcon} className="mr-2 h-5 w-5 block" />
                                    <span className="truncate block">프로필 보기</span>
                                </NavLink>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                variant="destructive"
                                className="p-3 cursor-pointer rounded-lg font-medium"
                                onClick={handleLogout}
                            >
                                <HugeiconsIcon icon={NotificationIcon} className="mr-2 h-5 w-5 opacity-0" />
                                <span className="truncate">@{session.user.email?.split("@")[0]} 계정에서 로그아웃</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            ) : (
                <div className={cn("mt-auto p-3", isMobileMenu ? "w-full" : "w-fit xl:w-full")}>
                    <Link to="/login" onClick={onClose} className="block w-full">
                        <Button className="w-full rounded-full font-bold h-12 text-base">
                            로그인
                        </Button>
                    </Link>
                </div>
            )}
        </aside>
    );
}
