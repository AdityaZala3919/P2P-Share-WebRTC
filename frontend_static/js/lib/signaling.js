/**
 * WebSocket signaling client with auto-reconnection and exponential backoff.
 */
export class SignalingClient {
  constructor(roomId, peerId, deviceName, deviceType) {
    this.roomId = roomId;
    this.peerId = peerId;
    this.deviceName = deviceName;
    this.deviceType = deviceType;
    this.ws = null;
    this.handlers = [];
    this.reconnectAttempts = 0;
    this.maxReconnects = 5;
    this.reconnectTimer = null;
    this.shouldReconnect = true;
  }

  connect() {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const host = window.location.host;
    const url = `${protocol}://${host}/ws/${this.roomId}?peer_id=${encodeURIComponent(this.peerId)}&device_name=${encodeURIComponent(this.deviceName)}&device_type=${encodeURIComponent(this.deviceType)}`;
    
    this.ws = new WebSocket(url);
    
    this.ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        this.handlers.forEach(h => h(msg));
      } catch (err) {
        console.error("Malformed signaling message received:", err);
      }
    };

    this.ws.onclose = () => {
      if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnects) {
        this.reconnectAttempts++;
        const delay = Math.min(1000 * (2 ** this.reconnectAttempts), 30000);
        this.reconnectTimer = setTimeout(() => this.connect(), delay);
      }
    };

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
    };
  }

  send(msg) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ ...msg, from_peer: this.peerId }));
    }
  }

  onMessage(handler) {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter(h => h !== handler);
    };
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) this.ws.close();
  }
}