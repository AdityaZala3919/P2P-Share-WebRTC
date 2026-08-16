export type TransferDirection = 'sending' | 'receiving';
export type TransferStatus = 'pending' | 'transferring' | 'complete' | 'cancelled' | 'error';

export interface TransferMeta {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  totalChunks: number;
  fromPeerId?: string;
  fromDeviceName?: string;
}

export interface ActiveTransfer {
  meta: TransferMeta;
  direction: TransferDirection;
  status: TransferStatus;
  bytesTransferred: number;
  speed: number; // bytes/s
  eta: number; // seconds
  startTime: number;
  chunks: Map<number, ArrayBuffer>; // for receiving
  blobUrl?: string;
}
