import fs from "fs";
import path from "path";

export function getGalleryFiles() {
  const galleryDir = path.join(process.cwd(), "public/gallery");

  const files = fs.readdirSync(galleryDir);

  return files
    .filter((file) =>
      [".jpg", ".jpeg", ".png", ".webp", ".mp4", ".mov"].some((ext) =>
        file.toLowerCase().endsWith(ext)
      )
    )
    .map((file) => ({
      src: `/gallery/${file}`,
      type:
        file.toLowerCase().endsWith(".mp4") ||
        file.toLowerCase().endsWith(".mov")
          ? "video"
          : "image",
    }));
}