export async function replaceUploadPreview(current, file, isCurrent = () => true) {
  // Decode and paint pixels; uploaded documents never become DOM URLs.
  const bitmap = await createImageBitmap(file);
  try {
    if (!isCurrent()) return null;
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('แสดงภาพไม่ได้ กรุณาเลือกไฟล์ใหม่');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const source = canvas.toDataURL('image/png');
    const image = document.createElement('img');
    image.id = current.id;
    image.alt = 'ภาพอ้างอิงที่เลือก';
    image.src = source;
    current.replaceWith(image);
    return source;
  } finally { bitmap.close(); }
}

export function videoOutputUrl(value, apiBase) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.origin !== new URL(apiBase).origin || url.username || url.password || !url.pathname.startsWith('/storage/v1/object/sign/video-generations/') || !url.searchParams.get('token')) {
    throw new Error('ลิงก์วิดีโอไม่ถูกต้อง กรุณาตรวจสถานะงานอีกครั้ง');
  }
  return url.href;
}
