import { NavLink, useNavigate } from "react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    Home01Icon,
    Search01Icon as SearchIcon,
    Notification01Icon as NotificationIcon,
    Mail01Icon as MailIcon,
    Bookmark02Icon,
    UserIcon,
    MoreHorizontalIcon,
    QuillWrite01Icon
} from "@hugeicons/core-free-icons";
import { useSession, signOut } from "~/lib/auth-client";
import { cn } from "~/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { toast } from "sonner";

const NAV_ITEMS = [
    { label: "홈", href: "/", icon: Home01Icon },
    { label: "탐색", href: "/explore", icon: SearchIcon },
    { label: "알림", href: "/notifications", icon: NotificationIcon },
    { label: "쪽지", href: "/messages", icon: MailIcon },
    { label: "북마크", href: "/bookmarks", icon: Bookmark02Icon },
    { label: "프로필", href: "/profile", icon: UserIcon },
];

export function Sidebar() {
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
        <aside className="sticky top-0 h-screen flex flex-col justify-between py-4 px-2 xl:px-4 w-fit xl:w-64 border-r border-border bg-background">
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
                            className={({ isActive }) =>
                                cn(
                                    "flex items-center gap-4 p-3 rounded-full transition-colors hover:bg-accent group w-fit xl:w-full",
                                    isActive ? "font-bold text-primary" : "font-normal"
                                )
                            }
                        >
                            <HugeiconsIcon icon={item.icon} strokeWidth={2} className="h-7 w-7" />
                            <span className="text-xl hidden xl:block">{item.label}</span>
                        </NavLink>
                    ))}

                    {/* More Menu */}
                    <button className="flex items-center gap-4 p-3 rounded-full transition-colors hover:bg-accent group w-fit xl:w-full text-left">
                        <HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} className="h-7 w-7" />
                        <span className="text-xl hidden xl:block">더 보기</span>
                    </button>
                </nav>

                {/* Post Button */}
                <button className="bg-primary text-white p-3 xl:py-4 xl:px-8 rounded-full font-bold hover:bg-primary/90 transition-all mt-4 w-fit xl:w-full flex items-center justify-center shadow-lg">
                    <HugeiconsIcon icon={QuillWrite01Icon} strokeWidth={2.5} className="h-7 w-7 xl:hidden" />
                    <span className="text-lg hidden xl:block">게시하기</span>
                </button>
            </div>

            {/* User Session Nav */}
            {session?.user && (
                <DropdownMenu>
                    <DropdownMenuTrigger
                        render={
                            <button className="flex items-center gap-3 p-3 rounded-full hover:bg-accent transition-colors w-fit xl:w-full mt-auto outline-none" />
                        }
                    >
                        <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden border border-border pointer-events-none">
                            {session.user.image ? (
                                <img src={session.user.image} alt={session.user.name ?? ""} className="h-full w-full object-cover" />
                            ) : (
                                <HugeiconsIcon icon={UserIcon} strokeWidth={2} className="h-6 w-6 text-muted-foreground" />
                            )}
                        </div>
                        <div className="hidden xl:flex flex-col text-left overflow-hidden pointer-events-none">
                            <span className="text-sm font-bold truncate">{session.user.name}</span>
                            <span className="text-xs text-muted-foreground truncate">@{session.user.email?.split("@")[0]}</span>
                        </div>
                        <HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} className="h-5 w-5 ml-auto hidden xl:block text-muted-foreground pointer-events-none" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64 mb-2 p-2">
                        <DropdownMenuItem
                            variant="destructive"
                            className="p-3 cursor-pointer rounded-lg font-bold"
                            onSelect={handleLogout}
                            onClick={handleLogout}
                        >
                            <span className="truncate">@{session.user.email?.split("@")[0]} 계정에서 로그아웃</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </aside>
    );
}
