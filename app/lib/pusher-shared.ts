/**
 * 채널명 생성 헬퍼 함수
 * 클라이언트와 서버 양쪽에서 채널명을 일치시키기 위해 사용합니다.
 */

export function getConversationChannelId(conversationId: string): string {
    return `conversation-${conversationId}`;
}

export function getUserChannelId(userId: string): string {
    return `user-${userId}`;
}
