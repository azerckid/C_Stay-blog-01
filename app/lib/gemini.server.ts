import { GoogleGenerativeAI } from "@google/generative-ai";

// 지연 초기화: 함수가 호출될 때만 초기화
let genAI: GoogleGenerativeAI | null = null;
let embeddingModel: ReturnType<GoogleGenerativeAI["getGenerativeModel"]> | null = null;

function initializeGemini() {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY 환경 변수가 설정되지 않았습니다. Vercel 환경 변수 설정을 확인해주세요.");
    }
    
    if (!genAI) {
        genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
    }
    
    return embeddingModel!;
}

/**
 * Generates an embedding for the given text using Gemini.
 * Returns a 768-dimensional vector (float array).
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    try {
        const model = initializeGemini();
        const result = await model.embedContent(text);
        return result.embedding.values;
    } catch (error) {
        console.error("Error generating embedding with Gemini:", error);
        throw error;
    }
}

/**
 * Converts a float array to a Float32Array and then to a Buffer (Blob)
 * suitable for storing in a database or passing to vector functions.
 */
export function vectorToBuffer(vector: number[]): Uint8Array {
    return new Uint8Array(new Float32Array(vector).buffer);
}



/**
 * Converts a Buffer (Blob) back to a float array.
 */
export function bufferToVector(buffer: Buffer): number[] {
    const float32Array = new Float32Array(
        buffer.buffer,
        buffer.byteOffset,
        buffer.byteLength / 4
    );
    return Array.from(float32Array);
}
