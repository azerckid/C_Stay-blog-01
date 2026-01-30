import { type ActionFunctionArgs, data } from "react-router";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSession } from "~/lib/auth-utils.server";

export async function action({ request }: ActionFunctionArgs) {
    const session = await getSession(request);
    if (!session) {
        return data({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const image = formData.get("image") as string;
    const voiceText = formData.get("voiceText") as string;
    const style = formData.get("style") as string;
    const location = formData.get("location") as string;

    if (!image || !voiceText) {
        return data({ error: "Missing required fields" }, { status: 400 });
    }

    try {
        const apiKey = process.env.GEMINI_API_KEY!;
        console.log(`[AI Diagnostic] Using API Key starting with: ${apiKey.substring(0, 6)}...`);

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const stylePrompts = {
            emotional: "따뜻하고 감성적인 분위기로, 풍부한 표현을 사용하여 100자 내외로 작성해줘. 독백하듯 깊은 여운을 주는 문체여야 해.",
            information: "장소의 특징과 유용한 정보를 포함하여 100자 내외로 명확하게 작성해줘. 여행자에게 도움이 되는 실용적인 문체여야 해.",
            witty: "재치 있고 유머러스한 시선으로 100자 내외로 즐겁게 작성해줘. 읽는 사람이 미소 지을 수 있는 통통 튀는 문체여야 해.",
            auto: "사진 속 인물들의 표정, 구성, 배경을 스스로 분석하여 가장 잘 어울리는 감상을 100자 내외로 자유롭게 작성해줘. 특히 단체 사진이라면 함께하는 즐거움을 강조해줘."
        };

        const targetStyle = stylePrompts[style as keyof typeof stylePrompts] || stylePrompts.emotional;

        const isAuto = style === "auto" || !voiceText.trim();

        const response = await model.generateContent([
            `당신은 여행 사진을 보고 멋진 로그를 작성하는 작가입니다.
             
             [작성 지침]
             ${isAuto ?
                `1. **상황 분석**: 사용자의 설명이 없으므로, 사진 속 시각적 정보와 위치(${location})를 토대로 가장 어울리는 주제를 스스로 선정하세요.
                 2. **인물 감지**: 사진에 여러 명이 있다면 그들의 관계나 분위기를 따뜻하게 묘사하세요.` :
                `1. **주제 고정**: 사용자의 음성 감상("${voiceText}")에 담긴 주제를 문장의 주인공으로 삼으세요.
                 2. **보조 활용**: 사진과 위치(${location}) 정보는 주제를 뒷받침하는 배경으로만 활용하세요.`
            }
             3. **문체 및 분량**: ${targetStyle}에 맞춰 100자 내외로 정교하게 작성해줘.
             
             결과물에는 오직 완성된 한글 문장만 포함하세요.`,
            {
                inlineData: {
                    data: image.split(",")[1],
                    mimeType: "image/jpeg"
                }
            }
        ]);

        const resultText = response.response.text();

        return data({
            success: true,
            content: resultText,
            image: image // 캡처된 원본 이미지 반환
        });

    } catch (error: any) {
        console.error("AI Travel Log Generation Error:", error);

        if (error.status === 404) {
            return data({
                error: "AI 모델 연결에 실패했습니다. (404 Not Found). API 키의 권한 설정을 확인하거나 유료 플랜 전환을 고려해 보세요."
            }, { status: 404 });
        }

        return data({ error: "AI 생성 중 오류가 발생했습니다." }, { status: 500 });
    }
}
