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

  const handleRename = () => {
    const name = prompt('Enter device nickname:', myDeviceName);
    if (name && roomId) {
      setDeviceName(roomId, name);
      useRoomStore.setState({ myDeviceName: name });
      showToast(`Device renamed to "${name}"`);
    }
  };

  return (
    <header className="h-14 border-b border-[#1A202C] bg-[#0D0F14]/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between z-30 flex-shrink-0">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 rounded-lg bg-[#00FFFF]/10 border border-[#00FFFF]/30 flex items-center justify-center text-[#00FFFF]">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-sm text-white">Encrypted Room</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#131720] border border-[#1A202C] text-[#00FFFF]">
              {roomId}
            </span>
          </div>
          <p className="text-[11px] text-[#7E8B9B] flex items-center gap-1.5 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00FF88] inline-block"></span>
            {onlinePeers.length} peer{onlinePeers.length !== 1 ? 's' : ''} connected · E2E Encrypted WebRTC
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={onToggleVault}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
            vaultOpen
              ? 'border-[#00FFFF] text-[#00FFFF] bg-[#00FFFF]/10'
              : 'border-[#1A202C] text-[#7E8B9B] hover:border-[#00FFFF] hover:text-white bg-[#131720]'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span>Vault</span>
        </button>

        <button
          onClick={onPairDevice}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#00FFFF] text-black hover:bg-[#33FFFF] transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Pair Device</span>
        </button>

        <button
          onClick={handleRename}
          className="hidden sm:flex items-center space-x-1.5 bg-[#131720] border border-[#1A202C] px-2.5 py-1.5 rounded-lg text-xs text-[#7E8B9B] hover:text-white transition-colors"
        >
          <svg className="w-3.5 h-3.5 text-[#00FFFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span className="text-white font-medium">{myDeviceName}</span>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      </div>
    </header>
  );
}
