import { useEffect, useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { PeerStrip } from '../components/layout/PeerStrip';
import { ChatView } from '../components/chat/ChatView';
import { InputBar } from '../components/layout/InputBar';
import { VaultDrawer } from '../components/vault/VaultDrawer';
import { PairDeviceModal } from '../components/modals/PairDeviceModal';
import { useRoomStore } from '../stores/roomStore';
import { useChatStore } from '../stores/chatStore';
import { useSignaling } from '../hooks/useSignaling';
import { usePeers } from '../hooks/usePeers';
import { useTransfer } from '../hooks/useTransfer';
import { getOrCreatePeerId, getDeviceName, detectDeviceType } from '../lib/device-detect';
import { playMessage } from '../lib/audio';
import { showToast } from '../components/shared/Toast';
import type { SignalMessage } from '../types/signaling';

export function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  
  const [vaultOpen, setVaultOpen] = useState(false);
  const [pairOpen, setPairOpen] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [promptPass, setPromptPass] = useState('');
  const [joining, setJoining] = useState(false);

  const { setRoom, clearRoom, myPeerId, myDeviceName } = useRoomStore();
  const { addMessage, addSystemMessage, clearMessages } = useChatStore();
  const { handleIncomingData, sendFile, setSendToAll } = useTransfer();

  // Handle all incoming data channel messages
  const handleDataMessage = useCallback((data: ArrayBuffer | string, peerId: string, deviceName: string) => {
    if (typeof data === 'string') {
      try {
        const msg = JSON.parse(data);
        if (msg.type === 'chat') {
          addMessage({
            type: 'text',
            content: msg.text,
            fromPeerId: peerId,
            fromDeviceName: deviceName,
            isLocal: false,
          });
          playMessage();
          return;
        }
        if (msg.type === 'clipboard') {
          addMessage({
            type: 'clipboard',
            content: msg.text,
            fromPeerId: peerId,
            fromDeviceName: deviceName,
            isLocal: false,
          });
          playMessage();
          return;
        }
      } catch {
        // Not JSON, fall through to transfer handler
      }
    }
    // File transfer chunks or meta
    handleIncomingData(data, peerId, deviceName);
  }, [addMessage, handleIncomingData]);

  const { handleSignalMessage, setSendSignal, sendToAll, disconnectAll } = usePeers(handleDataMessage);

  // Wire sendToAll into transfer hook
  useEffect(() => {
    setSendToAll(sendToAll);
  }, [sendToAll, setSendToAll]);

  // Stable signal handler
  const handleSignal = useCallback(async (msg: SignalMessage) => {
    await handleSignalMessage(msg);
  }, [handleSignalMessage]);

  const peerId = getOrCreatePeerId();
  const deviceName = roomId ? getDeviceName(roomId) : 'Browser';
  const deviceType = detectDeviceType();

  // Only connect WebSocket signaling when authenticated/unlocked
  const { send } = useSignaling(unlocked && roomId ? roomId : null, peerId, deviceName, deviceType, handleSignal);

  // Wire send into peers hook
  useEffect(() => {
    setSendSignal(send);
  }, [send, setSendSignal]);

  const authenticateRoom = useCallback(async (pass: string) => {
    if (!roomId) return false;
    try {
      const res = await fetch(`/api/rooms/${roomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passphrase: pass }),
      });
      if (res.ok) {
        sessionStorage.setItem(`nexus_pass_${roomId}`, pass);
        setRoom(roomId, pass, peerId, deviceName);
        setUnlocked(true);
        addSystemMessage(`Joined room ${roomId}`);
        return true;
      }
    } catch {
      // ignore
    }
    return false;
  }, [roomId, peerId, deviceName, setRoom, addSystemMessage]);

  // Check stored passphrase or URL hash on load
  useEffect(() => {
    if (!roomId) {
      navigate('/');
      return;
    }

    const checkAuth = async () => {
      // 1. Check session storage
      const storedPass = sessionStorage.getItem(`nexus_pass_${roomId}`);
      if (storedPass) {
        const ok = await authenticateRoom(storedPass);
        if (ok) return;
      }

      // 2. Check URL hash fragment
      if (window.location.hash) {
        const hashPass = decodeURIComponent(window.location.hash.substring(1));
        if (hashPass) {
          const ok = await authenticateRoom(hashPass);
          if (ok) {
            // Remove hash from address bar for privacy
            history.replaceState(null, '', window.location.pathname + window.location.search);
            return;
          }
        }
      }
    };

    checkAuth();

    return () => {
      disconnectAll();
      clearRoom();
      clearMessages();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const handleManualUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptPass.trim() || !roomId) return;
    setJoining(true);
    try {
      const ok = await authenticateRoom(promptPass.trim());
      if (!ok) {
        showToast('Invalid room passphrase');
      }
    } catch {
      showToast('Connection error');
    } finally {
      setJoining(false);
    }
  };

  const handleSendText = useCallback((text: string) => {
    if (!myPeerId) return;
    const isClipboard = text.startsWith('📋 ');
    sendToAll(JSON.stringify({
      type: isClipboard ? 'clipboard' : 'chat',
      text: isClipboard ? text.replace(/^📋 /, '') : text,
      deviceName: myDeviceName,
    }));
    addMessage({
      type: isClipboard ? 'clipboard' : 'text',
      content: isClipboard ? text.replace(/^📋 /, '') : text,
      fromPeerId: myPeerId,
      fromDeviceName: myDeviceName,
      isLocal: true,
    });
  }, [myPeerId, myDeviceName, sendToAll, addMessage]);

  if (!roomId) return null;

  // Render password prompt if room not unlocked yet
  if (!unlocked) {
    return (
      <div className="h-screen flex items-center justify-center p-4 bg-[#08090C]">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-[#00FFFF]/10 border border-[#00FFFF]/30 flex items-center justify-center text-[#00FFFF] mx-auto mb-3 shadow-lg">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">Unlock Room {roomId}</h2>
            <p className="text-xs text-[#7E8B9B] mt-1 font-mono">Enter passphrase to connect to P2P mesh</p>
          </div>

          <form onSubmit={handleManualUnlock} className="bg-[#131720] border border-[#1A202C] rounded-2xl p-6 shadow-xl space-y-4">
            <div>
              <label className="text-[11px] text-[#7E8B9B] font-mono block mb-1">PASSPHRASE</label>
              <input
                type="password"
                value={promptPass}
                onChange={e => setPromptPass(e.target.value)}
                placeholder="Enter room passphrase..."
                className="w-full bg-[#0D0F14] border border-[#1A202C] focus:border-[#00FFFF] text-white text-sm rounded-xl px-4 py-2.5 outline-none transition-colors"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="flex-1 py-2.5 bg-[#0D0F14] border border-[#1A202C] hover:text-white text-[#7E8B9B] text-xs font-semibold rounded-xl transition-all"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={joining}
                className="flex-2 py-2.5 bg-[#00FFFF] hover:bg-[#33FFFF] text-black text-xs font-semibold rounded-xl disabled:opacity-50 transition-all cursor-pointer"
              >
                {joining ? 'Verifying...' : 'Unlock & Join'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#08090C] overflow-hidden">
      <Header
        onPairDevice={() => setPairOpen(true)}
        onToggleVault={() => setVaultOpen(o => !o)}
        vaultOpen={vaultOpen}
      />
      <PeerStrip />

      <div className="flex-1 flex overflow-hidden relative">
        <main className="flex-1 flex flex-col overflow-hidden">
          <ChatView />
          <InputBar onSendText={handleSendText} onSendFile={sendFile} />
        </main>
        <VaultDrawer open={vaultOpen} onClose={() => setVaultOpen(false)} />
      </div>

      <PairDeviceModal open={pairOpen} onClose={() => setPairOpen(false)} />
    </div>
  );
}
