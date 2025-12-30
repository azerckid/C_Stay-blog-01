import { NavLink } from "react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    Home01Icon,
    Search01Icon as SearchIcon,
    Notification01Icon as NotificationIcon,
    Mail01Icon as MailIcon,
} from "@hugeicons/core-free-icons";
import { cn } from "~/lib/utils";

const MOBILE_NAV_ITEMS = [
    { label: "홈", href: "/", icon: Home01Icon },
    { label: "탐색", href: "/search", icon: SearchIcon },
    { label: "알림", href: "/notifications", icon: NotificationIcon },
    { label: "쪽지", href: "/messages", icon: MailIcon },
];

export function BottomNav() {
    return (
        <nav className="sm:hidden fixed bottom-0 left-0 right-0 h-14 bg-background border-t border-border flex items-center justify-around z-50">
            {MOBILE_NAV_ITEMS.map((item) => (
                <NavLink
                    key={item.href}
                    to={item.href}
                    className={({ isActive }) =>
                        cn(
                            "flex flex-col items-center justify-center w-full h-full transition-colors group",
                            isActive ? "text-primary" : "text-muted-foreground"
                        )
                    }
                >
                    <HugeiconsIcon
                        icon={item.icon}
                        strokeWidth={2}
                        className={cn("h-7 w-7 transition-all group-active:scale-95")}
                    />
                    <span className="sr-only">{item.label}</span>
                </NavLink>
            ))}
        </nav>
    );
}
