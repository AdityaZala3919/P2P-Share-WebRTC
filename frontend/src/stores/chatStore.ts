import { create } from 'zustand';
import type { ActiveTransfer } from '../types/transfer';

export type MessageType = 'text' | 'clipboard' | 'transfer' | 'system';

export interface ChatMessage {
  id: string;
  type: MessageType;
  content: string;
  fromPeerId: string;
  fromDeviceName: string;
  isLocal: boolean;
  timestamp: number;
  transferId?: string; // links to activeTransfers
}

interface ChatState {
  messages: ChatMessage[];
  activeTransfers: Map<string, ActiveTransfer>;
  addMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => string;
  addSystemMessage: (text: string) => void;
  upsertTransfer: (transfer: ActiveTransfer) => void;
  getTransfer: (id: string) => ActiveTransfer | undefined;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  activeTransfers: new Map(),
  addMessage: (msg) => {
    const id = crypto.randomUUID();
    set(s => ({ messages: [...s.messages, { ...msg, id, timestamp: Date.now() }] }));
    return id;
  },
  addSystemMessage: (text) => {
    const id = crypto.randomUUID();
    set(s => ({ messages: [...s.messages, { id, type: 'system', content: text, fromPeerId: 'system', fromDeviceName: 'System', isLocal: false, timestamp: Date.now() }] }));
  },
  upsertTransfer: (transfer) => {
    set(s => {
      const next = new Map(s.activeTransfers);
      next.set(transfer.meta.id, transfer);
      return { activeTransfers: next };
    });
  },
  getTransfer: (id) => get().activeTransfers.get(id),
  clearMessages: () => set({ messages: [], activeTransfers: new Map() }),
}));
