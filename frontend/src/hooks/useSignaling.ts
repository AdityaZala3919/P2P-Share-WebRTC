import { useEffect, useRef } from 'react';
import { SignalingClient } from '../lib/signaling';
import type { SignalMessage } from '../types/signaling';

export function useSignaling(
  roomId: string | null,
  peerId: string | null,
  deviceName: string,
  deviceType: string,
  onMessage: (msg: SignalMessage) => void
) {
  const clientRef = useRef<SignalingClient | null>(null);

  useEffect(() => {
    if (!roomId || !peerId) return;
    const client = new SignalingClient(roomId, peerId, deviceName, deviceType);
    client.connect();
    clientRef.current = client;
    const unsub = client.onMessage(onMessage);
    return () => {
      unsub();
      client.disconnect();
    };
  }, [roomId, peerId, deviceName, deviceType]);

  const send = (msg: Omit<SignalMessage, 'from_peer'>) => {
    clientRef.current?.send(msg);
  };

  return { send };
}
