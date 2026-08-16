import type { TransferMeta } from '../types/transfer';

export const CHUNK_SIZE = 64 * 1024; // 64KB

export function createTransferMeta(file: File, id: string): TransferMeta {
  return {
    id,
    name: file.name,
    size: file.size,
    mimeType: file.type || 'application/octet-stream',
    totalChunks: Math.ceil(file.size / CHUNK_SIZE),
  };
}

export async function* fileToChunks(file: File): AsyncGenerator<{ index: number; data: ArrayBuffer; total: number }> {
  const total = Math.ceil(file.size / CHUNK_SIZE);
  for (let i = 0; i < total; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);
    const data = await chunk.arrayBuffer();
    yield { index: i, data, total };
  }
}

export function reassembleChunks(chunks: Map<number, ArrayBuffer>, totalChunks: number, mimeType: string): Blob {
  const orderedChunks: ArrayBuffer[] = [];
  for (let i = 0; i < totalChunks; i++) {
    const chunk = chunks.get(i);
    if (!chunk) throw new Error(`Missing chunk ${i}`);
    orderedChunks.push(chunk);
  }
  return new Blob(orderedChunks, { type: mimeType });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
