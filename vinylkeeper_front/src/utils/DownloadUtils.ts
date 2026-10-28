export function extractFilenameFromContentDisposition(
  contentDisposition: string | null
): string | null {
  if (!contentDisposition) return null;

  // filename* (RFC 5987, UTF-8) is preferred over filename when both are
  // present, regardless of which appears first in the header.
  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition);
  const quotedMatch = /filename="([^"]+)"/i.exec(contentDisposition);
  const bareMatch = /filename=([^;]+)/i.exec(contentDisposition);
  const raw = utf8Match?.[1] || quotedMatch?.[1] || bareMatch?.[1];
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

