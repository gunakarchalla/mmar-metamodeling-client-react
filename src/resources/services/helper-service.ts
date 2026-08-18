/**
 * Conversions between the three shapes a file takes in this client: the bytes
 * the server stores, the browser `File` an upload or download deals in, and the
 * base64 data URL an <img> can display.
 */

/**
 * Build a `File` from `url`, which may be either a data URL (decoded in place)
 * or an ordinary URL (fetched).
 */
export async function dataUrlToFile(
  url: string,
  filename: string,
  mimeType?: string,
): Promise<File> {
  if (url.startsWith("data:")) {
    const [header, ...rest] = url.split(",");
    const mime = header.match(/:(.*?);/)?.[1];
    const binary = atob(rest[rest.length - 1]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new File([bytes], filename, { type: mime || mimeType });
  }

  const buffer = await (await fetch(url)).arrayBuffer();
  return new File([buffer], filename, { type: mimeType });
}

/**
 * Base64-encode a file's bytes. The result carries no `data:` prefix — callers
 * add the media type they want to present it as.
 */
export async function fileToBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}
