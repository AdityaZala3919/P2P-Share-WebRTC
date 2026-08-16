import { useCallback, useRef } from 'react';
import type { PeerConnection } from '../lib/webrtc';
import { createPeerConnection, createOffer, handleOffer, handleAnswer, handleIceCandidate } from '../lib/webrtc';
import type { SignalMessage, DeviceInfo } from '../types/signaling';
import { useRoomStore } from '../stores/roomStore';
import { useChatStore } from '../stores/chatStore';
import { playConnected } from '../lib/audio';

type MessageHandler = (data: ArrayBuffer | string, peerId: string, deviceName: string) => void;

export function usePeers(onDataMessage: MessageHandler) {
  const connectionsRef = useRef<Map<string, PeerConnection>>(new Map());
  const deviceInfoRef = useRef<Map<string, DeviceInfo>>(new Map());
  const { addPeer, removePeer } = useRoomStore();
  const { addSystemMessage } = useChatStore();
  const sendSignalRef = useRef<((msg: Omit<SignalMessage, 'from_peer'>) => void) | null>(null);

  const setSendSignal = useCallback((fn: (msg: Omit<SignalMessage, 'from_peer'>) => void) => {
    sendSignalRef.current = fn;
  }, []);

  const onSignal = useCallback((msg: Omit<SignalMessage, 'from_peer'>) => {
    sendSignalRef.current?.(msg);
  }, []);

  const onStateChange = useCallback((peerId: string, connected: boolean) => {
    const info = deviceInfoRef.current.get(peerId);
    if (connected) {
      playConnected();
      addSystemMessage(`${info?.device_name || peerId} connected`);
    } else {
      addSystemMessage(`${info?.device_name || peerId} disconnected`);
    }
  }, [addPeer, addSystemMessage]);

  const handleDataMessage = useCallback((data: ArrayBuffer | string, peerId: string) => {
    const info = deviceInfoRef.current.get(peerId);
    onDataMessage(data, peerId, info?.device_name || peerId);
  }, [onDataMessage]);

  const getOrCreateConnection = useCallback((peerId: string): PeerConnection => {
    let conn = connectionsRef.current.get(peerId);
    if (!conn) {
      conn = createPeerConnection(peerId, onSignal, handleDataMessage, onStateChange);
      connectionsRef.current.set(peerId, conn);
    }
    return conn;
  }, [onSignal, handleDataMessage, onStateChange]);

  const handleSignalMessage = useCallback(async (msg: SignalMessage) => {
    switch (msg.type) {
      case 'peer-list': {
        const peers = msg.peers || [];
        for (const peer of peers) {
          deviceInfoRef.current.set(peer.peer_id, peer);
          addPeer({ ...peer, isLocal: false });
          const conn = getOrCreateConnection(peer.peer_id);
          await createOffer(conn, onSignal);
        }
        break;
      }
      case 'peer-joined': {
        if (!msg.peer) break;
        deviceInfoRef.current.set(msg.peer.peer_id, msg.peer);
        addPeer({ ...msg.peer, isLocal: false });
        // Don't initiate — they'll initiate via peer-list
        break;
      }
      case 'peer-left': {
        if (!msg.peer_id) break;
        const conn = connectionsRef.current.get(msg.peer_id);
        conn?.pc.close();
        connectionsRef.current.delete(msg.peer_id);
        deviceInfoRef.current.delete(msg.peer_id);
        removePeer(msg.peer_id);
        break;
      }
      case 'offer': {
        if (!msg.from_peer) break;
        const info = deviceInfoRef.current.get(msg.from_peer);
        if (info) addPeer({ ...info, isLocal: false });
        const conn = getOrCreateConnection(msg.from_peer);
        await handleOffer(conn, msg.payload as RTCSessionDescriptionInit, onSignal);
        // Setup message handler for newly created DC
        if (conn.dataChannel) {
          conn.dataChannel.onmessage = (e) => handleDataMessage(e.data, msg.from_peer!);
        }
        break;
      }
      case 'answer': {
        if (!msg.from_peer) break;
        const conn = connectionsRef.current.get(msg.from_peer);
        if (conn) await handleAnswer(conn, msg.payload as RTCSessionDescriptionInit);
        break;
      }
      case 'ice-candidate': {
        if (!msg.from_peer) break;
        const conn = connectionsRef.current.get(msg.from_peer);
        if (conn) await handleIceCandidate(conn, msg.payload as RTCIceCandidateInit);
        break;
      }
    }
  }, [getOrCreateConnection, onSignal, addPeer, removePeer]);

  const sendToAll = useCallback((data: string | ArrayBuffer) => {
    connectionsRef.current.forEach(conn => {
      if (conn.dataChannel?.readyState === 'open') {
        if (typeof data === 'string') conn.dataChannel.send(data);
        else conn.dataChannel.send(data);
      }
    });
  }, []);

  const sendToPeer = useCallback((peerId: string, data: string | ArrayBuffer) => {
    const conn = connectionsRef.current.get(peerId);
    if (conn?.dataChannel?.readyState === 'open') {
      if (typeof data === 'string') conn.dataChannel.send(data);
      else conn.dataChannel.send(data);
    }
  }, []);

  const disconnectAll = useCallback(() => {
    connectionsRef.current.forEach(c => c.pc.close());
    connectionsRef.current.clear();
  }, []);

  return { handleSignalMessage, setSendSignal, sendToAll, sendToPeer, disconnectAll };
}
