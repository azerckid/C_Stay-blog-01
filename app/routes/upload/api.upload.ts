import { type ActionFunctionArgs, type LoaderFunctionArgs, data } from "react-router";
import { getSession } from "~/lib/auth-utils.server";
import { getCloudinarySignature } from "~/lib/cloudinary.server";

export async function loader({ request }: LoaderFunctionArgs) {
    return data({ message: "Upload Signature API is active. Use POST to get signature." }, { status: 200 });
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
        // 3. 클라이언트로부터 업로드 파라미터 수신 (예: folder)
        let body;
        try {
            body = await request.json();
        } catch (error) {
            console.error("[Upload API] Failed to parse JSON:", error);
            return data({ error: "Invalid JSON format" }, { status: 400 });
        }

        const { folder = "staync", ...rest } = body;

        // 4. 서명 생성
        const paramsToSign = {
            folder,
            ...rest
        };

        const { signature, timestamp, apiKey, cloudName } = getCloudinarySignature(paramsToSign);

        console.log(`[Upload API] Signature generated for folder: ${folder}`);

        // 5. 결과 반환
        return data({
            success: true,
            signature,
            timestamp,
            apiKey,
            cloudName,
            folder
        });

    } catch (error: any) {
        console.error("[Upload API] Critical Error:", error.message || error);
        return data({
            error: "Failed to generate upload signature",
            details: error.message || "Unknown error"
        }, { status: 500 });
    }
}
