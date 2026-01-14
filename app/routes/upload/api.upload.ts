import { type ActionFunctionArgs, type LoaderFunctionArgs, data } from "react-router";
import { getSession } from "~/lib/auth-utils.server";
import { uploadToCloudinary } from "~/lib/cloudinary.server";

export async function loader({ request }: LoaderFunctionArgs) {
    return data({ message: "Upload API is active. Use POST to upload files." }, { status: 200 });
}

export async function action({ request }: ActionFunctionArgs) {
    // 1. 인증 확인
    const session = await getSession(request);
    if (!session) {
        console.error("[Upload API] Unauthorized attempt");
        return data({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. POST 요청만 허용
    if (request.method !== "POST") {
        return data({ error: "Method Not Allowed" }, { status: 405 });
    }

    try {
        // 3. FormData 파싱
        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file || !(file instanceof File)) {
            console.error("[Upload API] No file in request body");
            return data({ error: "No file provided" }, { status: 400 });
        }

        // 4. 파일 유효성 검사 (크기, 타입 등)
        const MAX_SIZE = 10 * 1024 * 1024; // 10MB
        console.log(`[Upload API] Received file: ${file.name}, size: ${file.size}, type: ${file.type}`);

        if (file.size > MAX_SIZE) {
            console.error(`[Upload API] File too large: ${file.size}`);
            return data({ error: "File too large (Max 10MB)" }, { status: 400 });
        }

        const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "video/mp4", "video/webm"];
        if (!allowedTypes.includes(file.type)) {
            console.error(`[Upload API] Unsupported type: ${file.type}`);
            return data({ error: "Unsupported file type" }, { status: 400 });
        }

        // 5. 버퍼로 변환 (서버리스 환경에서는 메모리에 주의해야 함)
        console.log(`[Upload API] Converting to buffer: ${file.name}`);
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 6. Cloudinary 업로드
        console.log(`[Upload API] Starting Cloudinary upload...`);
        const isVideo = file.type.startsWith("video/");
        const resourceType = isVideo ? "video" : "image";

        const result = await uploadToCloudinary(buffer, file.name, resourceType);
        console.log(`[Upload API] Success: ${result.url}`);

        // 7. 결과 반환
        return data({
            success: true,
            media: {
                url: result.url,
                publicId: result.publicId,
                type: result.type
            }
        });

    } catch (error: any) {
        console.error("[Upload API] Critical Error:", error.message || error);
        return data({
            error: "File upload failed",
            details: error.message || "Unknown error"
        }, { status: 500 });
    }
}
