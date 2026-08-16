import type { DeviceInfo, SignalMessage } from '../types/signaling';

export const ICE_SERVERS = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }
];

export type DataChannelMessageHandler = (data: ArrayBuffer | string, peerId: string) => void;

export interface PeerConnection {
  peerId: string;
  deviceInfo: DeviceInfo;
  pc: RTCPeerConnection;
  dataChannel: RTCDataChannel | null;
  isConnected: boolean;
}

export function createPeerConnection(
  peerId: string,
  onSignal: (msg: Omit<SignalMessage, 'from_peer'>) => void,
  onMessage: DataChannelMessageHandler,
  onStateChange: (peerId: string, connected: boolean) => void
): PeerConnection {
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  const conn: PeerConnection = { peerId, deviceInfo: { peer_id: peerId, device_name: '', device_type: 'desktop' }, pc, dataChannel: null, isConnected: false };

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      onSignal({ type: 'ice-candidate', to_peer: peerId, payload: event.candidate.toJSON() });
    }
  };

  pc.onconnectionstatechange = () => {
    const connected = pc.connectionState === 'connected';
    conn.isConnected = connected;
    onStateChange(peerId, connected);
  };

  pc.ondatachannel = (event) => {
    conn.dataChannel = event.channel;
    setupDataChannel(conn.dataChannel, peerId, onMessage);
  };

  return conn;
}

export function setupDataChannel(
  dc: RTCDataChannel,
  peerId: string,
  onMessage: DataChannelMessageHandler
): void {
  dc.binaryType = 'arraybuffer';
  dc.onmessage = (event) => onMessage(event.data, peerId);
}

export async function createOffer(conn: PeerConnection, onSignal: (msg: Omit<SignalMessage, 'from_peer'>) => void): Promise<void> {
  const dc = conn.pc.createDataChannel('nexus', { ordered: true });
  conn.dataChannel = dc;
  setupDataChannel(dc, conn.peerId, () => {});

  const offer = await conn.pc.createOffer();
  await conn.pc.setLocalDescription(offer);
  onSignal({ type: 'offer', to_peer: conn.peerId, payload: offer });
}

export async function handleOffer(conn: PeerConnection, offer: RTCSessionDescriptionInit, onSignal: (msg: Omit<SignalMessage, 'from_peer'>) => void): Promise<void> {
  await conn.pc.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await conn.pc.createAnswer();
  await conn.pc.setLocalDescription(answer);
  onSignal({ type: 'answer', to_peer: conn.peerId, payload: answer });
}

export async function handleAnswer(conn: PeerConnection, answer: RTCSessionDescriptionInit): Promise<void> {
  await conn.pc.setRemoteDescription(new RTCSessionDescription(answer));
}

export async function handleIceCandidate(conn: PeerConnection, candidate: RTCIceCandidateInit): Promise<void> {
  await conn.pc.addIceCandidate(new RTCIceCandidate(candidate));
}
