export function replaceUploadPreview(current, file) {
  const source = URL.createObjectURL(file);
  // Uploaded bytes are rendered only by a concrete image element.
  const image = document.createElement('img');
  image.id = current.id;
  image.alt = 'ภาพอ้างอิงที่เลือก';
  image.src = source;
  current.replaceWith(image);
  return source;
}

export function videoOutputUrl(value, apiBase) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.origin !== new URL(apiBase).origin || url.username || url.password || !url.pathname.startsWith('/storage/v1/object/sign/video-generations/') || !url.searchParams.get('token')) {
    throw new Error('ลิงก์วิดีโอไม่ถูกต้อง กรุณาตรวจสถานะงานอีกครั้ง');
  }
  return url.href;
}
