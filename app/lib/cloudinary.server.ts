import { v2 as cloudinary } from "cloudinary";

// Actually, we can just use standard node streams.

// Cloudinary Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadToCloudinary(
    data: AsyncIterable<Uint8Array> | Buffer,
    filename?: string
): Promise<{ url: string; publicId: string; type: "image" | "video" }> {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                resource_type: "auto", // Automatically detect image or video
                folder: "staync", // Folder name in Cloudinary
                public_id: filename ? filename.split(".")[0] : undefined,
            },
            (error, result) => {
                if (error) {
                    console.error("Cloudinary upload error:", error);
                    reject(error);
                    return;
                }
                if (!result) {
                    reject(new Error("Upload result is undefined"));
                    return;
                }
                resolve({
                    url: result.secure_url,
                    publicId: result.public_id,
                    type: result.resource_type === "video" ? "video" : "image",
                });
            }
        );

        // If data is Buffer
        if (Buffer.isBuffer(data)) {
            uploadStream.end(data);
            return;
        }

        // If data is AsyncIterable (Stream)
        // We need to convert Web Stream to Node Stream or pipe it.
        // But simpler approach for standard usage:
        // The caller will usually pass a Buffer from `await file.arrayBuffer()`.
        // Let's stick to Buffer for simplicity with React Router v7 standard Request.formData().
        reject(new Error("Only Buffer input is currently supported"));
    });
}

export async function deleteFromCloudinary(publicId: string, type: "image" | "video" = "image") {
    return cloudinary.uploader.destroy(publicId, { resource_type: type });
}
