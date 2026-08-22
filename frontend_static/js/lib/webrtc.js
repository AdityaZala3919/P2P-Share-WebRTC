/**
 * WebRTC peer connection management and DataChannel establishment.
 */
export const ICE_SERVERS = [
  { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }
];

export function createPeerConnection(peerId, onSignal, onMessage, onStateChange) {
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  const conn = {
    peerId,
    deviceInfo: { peer_id: peerId, device_name: "", device_type: "desktop" },
    pc,
    dataChannel: null,
    isConnected: false,
    onMessage: onMessage
  };

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      onSignal({ type: "ice-candidate", to_peer: peerId, payload: event.candidate.toJSON() });
    }
  };

  pc.onconnectionstatechange = () => {
    const connected = pc.connectionState === "connected";
    conn.isConnected = connected;
    onStateChange(peerId, connected);
  };

  pc.ondatachannel = (event) => {
    conn.dataChannel = event.channel;
    setupDataChannel(conn.dataChannel, peerId, onMessage);
  };

  return conn;
}

export function setupDataChannel(dc, peerId, onMessage) {
  dc.binaryType = "arraybuffer";
  if (onMessage) {
    dc.onmessage = (event) => onMessage(event.data, peerId);
  }
}

export async function createOffer(conn, onSignal, onMessage) {
  const dc = conn.pc.createDataChannel("ciphershare", { ordered: true });
  conn.dataChannel = dc;
  const msgHandler = onMessage || conn.onMessage;
  setupDataChannel(dc, conn.peerId, msgHandler);

  const offer = await conn.pc.createOffer();
  await conn.pc.setLocalDescription(offer);
  onSignal({ type: "offer", to_peer: conn.peerId, payload: offer });
}

export async function handleOffer(conn, offer, onSignal) {
  await conn.pc.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await conn.pc.createAnswer();
  await conn.pc.setLocalDescription(answer);
  onSignal({ type: "answer", to_peer: conn.peerId, payload: answer });
}

export async function handleAnswer(conn, answer) {
  await conn.pc.setRemoteDescription(new RTCSessionDescription(answer));
}

export async function handleIceCandidate(conn, candidate) {
  await conn.pc.addIceCandidate(new RTCIceCandidate(candidate));
}