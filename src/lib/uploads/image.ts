export async function sanitizeImage(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("이미지 파일만 업로드할 수 있습니다.");
  if (file.size > 10 * 1024 * 1024) throw new Error("이미지는 장당 10MB 이하여야 합니다.");
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const maxSide = 2000;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("이미지를 처리할 수 없습니다.");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.84));
  if (!blob) throw new Error("이미지를 압축할 수 없습니다.");
  return new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" });
}
