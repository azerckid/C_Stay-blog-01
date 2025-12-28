import { type ActionFunctionArgs, data } from "react-router";
import { getSession } from "~/lib/auth-utils.server";
import { uploadToCloudinary } from "~/lib/cloudinary.server";

export async function action({ request }: ActionFunctionArgs) {
    // 1. 인증 확인
    const session = await getSession(request);
    if (!session) {
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
            return data({ error: "No file provided" }, { status: 400 });
        }

        // 4. 파일 유효성 검사 (크기, 타입 등)
        const MAX_SIZE = 10 * 1024 * 1024; // 10MB
        if (file.size > MAX_SIZE) {
            return data({ error: "File too large (Max 10MB)" }, { status: 400 });
        }

        const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "video/mp4", "video/webm"];
        if (!allowedTypes.includes(file.type)) {
            return data({ error: "Unsupported file type" }, { status: 400 });
        }

        // 5. 버퍼로 변환
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 6. Cloudinary 업로드
        const result = await uploadToCloudinary(buffer, file.name);

        // 7. 결과 반환
        return data({
            success: true,
            media: {
                url: result.url,
                publicId: result.publicId,
                type: result.type
            }
        });

    } catch (error) {
        console.error("Upload Error:", error);
        return data({ error: "File upload failed" }, { status: 500 });
    }
}
