import { GoogleGenerativeAI } from "@google/generative-ai";

if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not defined in .env");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });

/**
 * Generates an embedding for the given text using Gemini.
 * Returns a 768-dimensional vector (float array).
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    try {
        const result = await embeddingModel.embedContent(text);
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
