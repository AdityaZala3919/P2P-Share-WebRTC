import { useRoomStore } from '../../stores/roomStore';
import { setDeviceName } from '../../lib/device-detect';
import { showToast } from '../shared/Toast';

interface Props {
  onPairDevice: () => void;
  onToggleVault: () => void;
  vaultOpen: boolean;
}

export function Header({ onPairDevice, onToggleVault, vaultOpen }: Props) {
  const { roomId, peers, myDeviceName } = useRoomStore();
  const onlinePeers = peers.filter(p => !p.isLocal);

  const handleCopyRoomId = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId);
      showToast(`Room code copied: ${roomId}`);
    }
  };

  const handleRename = () => {
    const name = prompt('Enter device nickname:', myDeviceName);
    if (name && name.trim() && roomId) {
      const cleanName = name.trim();
      setDeviceName(roomId, cleanName);
      useRoomStore.setState({ myDeviceName: cleanName });
      showToast(`Device renamed to "${cleanName}"`);
    }
  };

  return (
    <header className="h-16 border-b border-[#1A202C] bg-[#0D0F14]/98 backdrop-blur-md px-3.5 sm:px-6 flex items-center justify-between z-30 flex-shrink-0 select-none">
      {/* Left: Branding & Room Info */}
      <div className="flex items-center space-x-3 min-w-0">
        <div className="w-10 h-10 rounded-2xl bg-[#00FFFF]/10 border border-[#00FFFF]/30 flex items-center justify-center text-[#00FFFF] flex-shrink-0 shadow-md">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>

        <div className="min-w-0">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-sm sm:text-base text-white tracking-tight truncate">
              CipherShare
            </span>
            <button
              onClick={handleCopyRoomId}
              className="flex items-center space-x-1 text-xs font-mono font-bold px-2.5 py-0.5 rounded-lg bg-[#131720] hover:bg-[#181D28] border border-[#1A202C] hover:border-[#00FFFF]/60 text-[#00FFFF] transition-all cursor-pointer shadow-xs active:scale-95"
              title="Tap to copy room code"
            >
              <span>{roomId}</span>
              <svg className="w-3.5 h-3.5 text-[#7E8B9B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-[#7E8B9B] flex items-center gap-1.5 font-mono mt-0.5">
            <span className={`w-2 h-2 rounded-full inline-block ${onlinePeers.length > 0 ? 'bg-[#00FF88] shadow-[0_0_8px_#00FF88]' : 'bg-[#7E8B9B]'}`}></span>
            <span>{onlinePeers.length} peer{onlinePeers.length !== 1 ? 's' : ''} online</span>
            <span className="text-[#1A202C]">·</span>
            <span className="text-[#7E8B9B]">E2E WebRTC</span>
          </p>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
        {/* Device Nickname Button */}
        <button
          onClick={handleRename}
          className="flex items-center space-x-1.5 bg-[#131720] hover:bg-[#181D28] border border-[#1A202C] hover:border-[#00FFFF]/50 px-2.5 sm:px-3 py-2 rounded-xl text-xs text-[#7E8B9B] hover:text-white transition-all cursor-pointer max-w-[120px] sm:max-w-[160px] active:scale-95"
          title="Change device nickname"
        >
          <span className="w-2 h-2 rounded-full bg-[#00FFFF] flex-shrink-0"></span>
          <span className="text-white font-semibold truncate text-xs">{myDeviceName || 'Me'}</span>
          <svg className="w-3 h-3 text-[#7E8B9B] flex-shrink-0 hidden sm:inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>

        {/* Vault Button */}
        <button
          onClick={onToggleVault}
          className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer active:scale-95 ${
            vaultOpen
              ? 'border-[#00FFFF] text-[#00FFFF] bg-[#00FFFF]/10 shadow-[0_0_12px_rgba(0,255,255,0.2)]'
              : 'border-[#1A202C] text-[#7E8B9B] hover:border-[#00FFFF]/50 hover:text-white bg-[#131720]'
          }`}
          title="Open Vault"
        >
          <svg className="w-4 h-4 text-[#00FFFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span className="hidden sm:inline">Vault</span>
        </button>

        {/* Pair Device Button */}
        <button
          onClick={onPairDevice}
          className="flex items-center space-x-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold bg-[#00FFFF] hover:bg-[#33FFFF] text-black transition-all cursor-pointer shadow-md shadow-cyan-950/30 active:scale-95"
          title="Pair another device"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Pair</span>
        </button>
      </div>
    </header>
  );
}
