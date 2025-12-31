import Pusher from "pusher";

/**
 * Pusher 서버 인스턴스
 * 메시지 전송 시 실시간 이벤트를 트리거하기 위해 사용
 */
export const pusher = new Pusher({
    appId: process.env.PUSHER_APP_ID || "",
    key: process.env.PUSHER_KEY || "",
    secret: process.env.PUSHER_SECRET || "",
    cluster: process.env.PUSHER_CLUSTER || "ap3",
    useTLS: true,
});


