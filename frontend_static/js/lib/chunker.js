/**
 * File chunker and reassembly utilities (64KB chunks).
 */
export const CHUNK_SIZE = 64 * 1024; // 64KB

export function createTransferMeta(file, id) {
  return {
    id,
    name: file.name,
    size: file.size,
    mimeType: file.type || "application/octet-stream",
    totalChunks: Math.ceil(file.size / CHUNK_SIZE),
  };
}

export async function* fileToChunks(file) {
  const total = Math.ceil(file.size / CHUNK_SIZE);
  for (let i = 0; i < total; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);
    const data = await chunk.arrayBuffer();
    yield { index: i, data, total };
  }
}

export function reassembleChunks(chunks, totalChunks, mimeType) {
  const orderedChunks = [];
  for (let i = 0; i < totalChunks; i++) {
    const chunk = chunks.get(i);
    if (!chunk) throw new Error(`Missing chunk ${i}`);
    orderedChunks.push(chunk);
  }
  return new Blob(orderedChunks, { type: mimeType });
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}