import { useCallback, useRef } from 'react';
import { useChatStore } from '../stores/chatStore';
import { useRoomStore } from '../stores/roomStore';
import { fileToChunks, createTransferMeta, reassembleChunks, CHUNK_SIZE } from '../lib/chunker';
import type { ActiveTransfer, TransferMeta } from '../types/transfer';
import { playTransferComplete, haptic } from '../lib/audio';


export function useTransfer() {
  const { addMessage, upsertTransfer, getTransfer } = useChatStore();
  const { myPeerId, myDeviceName } = useRoomStore();
  const sendToAllRef = useRef<((data: string | ArrayBuffer) => void) | null>(null);

  const setSendToAll = (fn: (data: string | ArrayBuffer) => void) => {
    sendToAllRef.current = fn;
  };

  const sendFile = useCallback(async (file: File) => {
    const id = crypto.randomUUID();
    const meta = createTransferMeta(file, id);
    const transfer: ActiveTransfer = {
      meta,
      direction: 'sending',
      status: 'transferring',
      bytesTransferred: 0,
      speed: 0,
      eta: 0,
      startTime: Date.now(),
      chunks: new Map(),
    };
    upsertTransfer(transfer);
    addMessage({
      type: 'transfer',
      content: '',
      fromPeerId: myPeerId || '',
      fromDeviceName: myDeviceName,
      isLocal: true,
      transferId: id,
    });

    // Send meta
    sendToAllRef.current?.(JSON.stringify({ type: 'file-meta', ...meta }));

    // Send chunks with backpressure
    for await (const chunk of fileToChunks(file)) {
      const header = JSON.stringify({ type: 'file-chunk', id, index: chunk.index, total: chunk.total });
      const headerBytes = new TextEncoder().encode(header);
      const headerLen = new Uint32Array([headerBytes.length]);
      const combined = new Uint8Array(4 + headerBytes.length + chunk.data.byteLength);
      combined.set(new Uint8Array(headerLen.buffer), 0);
      combined.set(headerBytes, 4);
      combined.set(new Uint8Array(chunk.data), 4 + headerBytes.length);

      sendToAllRef.current?.(combined.buffer);

      const elapsed = (Date.now() - transfer.startTime) / 1000;
      const bytes = (chunk.index + 1) * CHUNK_SIZE;
      const speed = bytes / elapsed;
      const remaining = meta.size - bytes;
      upsertTransfer({ ...transfer, bytesTransferred: bytes, speed, eta: remaining / speed });
    }

    sendToAllRef.current?.(JSON.stringify({ type: 'file-complete', id }));
    upsertTransfer({ ...transfer, status: 'complete', bytesTransferred: meta.size });
    playTransferComplete();
    haptic([50, 50, 100]);
  }, [myPeerId, myDeviceName, addMessage, upsertTransfer]);

  const handleIncomingData = useCallback((data: ArrayBuffer | string, fromPeerId: string, fromDeviceName: string) => {
    if (typeof data === 'string') {
      // JSON text messages
      try {
        const msg = JSON.parse(data);
        if (msg.type === 'chat') {
          addMessage({ type: 'text', content: msg.text, fromPeerId, fromDeviceName, isLocal: false });
          playTransferComplete();
        } else if (msg.type === 'clipboard') {
          addMessage({ type: 'clipboard', content: msg.text, fromPeerId, fromDeviceName, isLocal: false });
        } else if (msg.type === 'file-meta') {
          const meta: TransferMeta = { id: msg.id, name: msg.name, size: msg.size, mimeType: msg.mimeType, totalChunks: msg.totalChunks, fromPeerId, fromDeviceName };
          const transfer: ActiveTransfer = { meta, direction: 'receiving', status: 'transferring', bytesTransferred: 0, speed: 0, eta: 0, startTime: Date.now(), chunks: new Map() };
          upsertTransfer(transfer);
          addMessage({ type: 'transfer', content: '', fromPeerId, fromDeviceName, isLocal: false, transferId: msg.id });
        } else if (msg.type === 'file-complete') {
          const transfer = getTransfer(msg.id);
          if (transfer) {
            const blob = reassembleChunks(transfer.chunks, transfer.meta.totalChunks, transfer.meta.mimeType);
            const url = URL.createObjectURL(blob);
            upsertTransfer({ ...transfer, status: 'complete', bytesTransferred: transfer.meta.size, blobUrl: url });
            playTransferComplete();
            haptic([50, 50, 100]);
          }
        }
      } catch { /* not JSON */ }
    } else {
      // Binary chunk
      const view = new DataView(data);
      const headerLen = view.getUint32(0);
      const headerBytes = new Uint8Array(data, 4, headerLen);
      const header = JSON.parse(new TextDecoder().decode(headerBytes)) as { type: string; id: string; index: number; total: number };
      if (header.type === 'file-chunk') {
        const chunkData = data.slice(4 + headerLen);
        const transfer = getTransfer(header.id);
        if (transfer) {
          transfer.chunks.set(header.index, chunkData);
          const bytes = transfer.chunks.size * CHUNK_SIZE;
          const elapsed = (Date.now() - transfer.startTime) / 1000;
          const speed = bytes / elapsed;
          upsertTransfer({ ...transfer, bytesTransferred: Math.min(bytes, transfer.meta.size), speed, eta: (transfer.meta.size - bytes) / speed });
        }
      }
    }
  }, [addMessage, upsertTransfer, getTransfer]);

  return { sendFile, handleIncomingData, setSendToAll };
}
