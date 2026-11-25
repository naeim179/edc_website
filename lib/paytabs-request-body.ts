// PayTabs callbacks carry a small JSON or form payload. Limit both declared
// and streamed lengths before parsing so missing length headers are safe too.
export const PAYTABS_BODY_LIMIT = 64 * 1024;

export async function readPayTabsBody(request: Request): Promise<ArrayBuffer | null> {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null && Number(declaredLength) > PAYTABS_BODY_LIMIT) return null;
  if (!request.body) return new ArrayBuffer(0);

  const reader = request.body.getReader();
  try {
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > PAYTABS_BODY_LIMIT) {
        void reader.cancel().catch(() => {});
        return null;
      }
      chunks.push(value);
    }

    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return bytes.buffer;
  } finally {
    reader.releaseLock();
  }
}
