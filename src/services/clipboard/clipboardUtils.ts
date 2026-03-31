import { PasteItem } from "../../types";

/** Copy a PasteItem to the clipboard (handles image blobs + text) */
export async function copyItemToClipboard(item: PasteItem): Promise<void> {
  try {
    if (item.type === "image") {
      const response = await fetch(item.content);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ]);
    } else {
      await navigator.clipboard.writeText(item.content);
    }
  } catch (err) {
    // Fallback to text copy if image copy fails
    navigator.clipboard.writeText(item.content);
  }
}

/** Trigger browser download for a PasteItem */
export function downloadItem(item: PasteItem): void {
  const link = document.createElement("a");
  let url = "";
  let extension = "";

  if (item.type === "image" || item.type === "video") {
    url = item.content;
    extension = item.mimeType.split("/")[1] || (item.type === "image" ? "png" : "mp4");
  } else {
    const blob = new Blob([item.content], { type: item.mimeType });
    url = URL.createObjectURL(blob);
    extension = item.type === "url" ? "url" : "txt";
  }

  link.href = url;
  link.download = `${item.suggestedName}.${extension}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  if (item.type !== "image" && item.type !== "video") {
    URL.revokeObjectURL(url);
  }
}
