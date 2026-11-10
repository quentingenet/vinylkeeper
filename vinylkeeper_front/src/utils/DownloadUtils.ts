import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { isCapacitorPlatform } from "./CapacitorUtils";

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

/** The bytes of a blob as base64, which is what the file plugin writes. */
const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("File unreadable"));
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.readAsDataURL(blob);
  });

/** A name that stays in the cache folder, whatever the server sent. */
const safeFileName = (filename: string): string => filename.replace(/[^\w.-]+/g, "_").replace(/^\.+/, "") || "export";

/**
 * Gives the user their file. A browser downloads it. The Android app has no download manager for a
 * blob, so the file is written to its private cache and handed to the share sheet (save to Files or
 * Drive, send by mail...), then removed.
 */
export async function deliverFile(blob: Blob, filename: string): Promise<void> {
  if (!isCapacitorPlatform()) {
    triggerBrowserDownload(blob, filename);
    return;
  }
  const path = `exports/${safeFileName(filename)}`;
  const { uri } = await Filesystem.writeFile({
    path,
    data: await blobToBase64(blob),
    directory: Directory.Cache,
    recursive: true,
  });
  try {
    await Share.share({ title: filename, url: uri, dialogTitle: "Save or send your export" });
  } catch (error) {
    // Closing the share sheet is not a failure
    if (!/cancel/i.test(error instanceof Error ? error.message : String(error))) throw error;
  } finally {
    await Filesystem.deleteFile({ path, directory: Directory.Cache }).catch(() => undefined);
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

