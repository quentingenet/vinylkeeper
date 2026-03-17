export function extractFilenameFromContentDisposition(
  contentDisposition: string | null
): string | null {
  if (!contentDisposition) return null;

  const match = /filename\*=UTF-8''([^;]+)|filename="([^"]+)"|filename=([^;]+)/i.exec(
    contentDisposition
  );
  const raw = match?.[1] || match?.[2] || match?.[3];
  if (!raw) return null;

  try {
    return decodeURIComponent(raw.trim());
  } catch {
    return raw.trim();
  }
}

export function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    // Some browsers need a tick before revoking
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export function triggerBrowserDownloadFromUrl(url: string): void {
  const a = document.createElement("a");
  a.href = url;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

