import { Link } from "react-router";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { FollowButton } from "~/components/user/follow-button";

interface UserCardProps {
    user: {
        id: string;
        name: string | null;
        username: string; // derived from email or stored
        image: string | null;
        bio?: string | null;
        avatarUrl?: string | null;
    };
    isCurrentUser: boolean;
    isFollowing: boolean;
}

export function UserCard({ user, isCurrentUser, isFollowing }: UserCardProps) {
    return (
        <div className="flex items-center justify-between p-4 border-b border-border hover:bg-accent/30 transition-colors">
            <Link to={`/user/${user.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar className="w-10 h-10 border border-border">
                    <AvatarImage src={user.avatarUrl || user.image || undefined} alt={user.name || "User"} />
                    <AvatarFallback>{user.name?.[0] || "?"}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                    <span className="font-bold truncate">{user.name}</span>
                    <span className="text-muted-foreground text-sm truncate">@{user.username}</span>
                    {user.bio && (
                        <p className="text-sm mt-1 truncate text-foreground/80">{user.bio}</p>
                    )}
                </div>
            </Link>

            <div className="ml-2">
                {!isCurrentUser && (
                    <FollowButton
                        targetUserId={user.id}
                        initialIsFollowing={isFollowing}
                        size="sm"
                    />
                )}
            </div>
        </div>
    );
}
