import type { SignalMessage } from '../types/signaling';

export type SignalHandler = (msg: SignalMessage) => void;

export class SignalingClient {
  private ws: WebSocket | null = null;
  private roomId: string;
  private peerId: string;
  private deviceName: string;
  private deviceType: string;
  private handlers: SignalHandler[] = [];
  private reconnectAttempts = 0;
  private maxReconnects = 5;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = true;

  constructor(roomId: string, peerId: string, deviceName: string, deviceType: string) {
    this.roomId = roomId;
    this.peerId = peerId;
    this.deviceName = deviceName;
    this.deviceType = deviceType;
  }

  connect(): void {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = window.location.host;
    const url = `${protocol}://${host}/ws/${this.roomId}?peer_id=${encodeURIComponent(this.peerId)}&device_name=${encodeURIComponent(this.deviceName)}&device_type=${encodeURIComponent(this.deviceType)}`;
    this.ws = new WebSocket(url);
    this.ws.onmessage = (e) => {
      try {
        const msg: SignalMessage = JSON.parse(e.data);
        this.handlers.forEach(h => h(msg));
      } catch { /* ignore malformed */ }
    };
    this.ws.onclose = () => {
      if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnects) {
        this.reconnectAttempts++;
        const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30000);
        this.reconnectTimer = setTimeout(() => this.connect(), delay);
      }
    };
    this.ws.onopen = () => { this.reconnectAttempts = 0; };
  }

  send(msg: Omit<SignalMessage, 'from_peer'>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ ...msg, from_peer: this.peerId }));
    }
  }

  onMessage(handler: SignalHandler): () => void {
    this.handlers.push(handler);
    return () => { this.handlers = this.handlers.filter(h => h !== handler); };
  }

  disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
  }
}
