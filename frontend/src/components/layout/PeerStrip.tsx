import { useRoomStore } from '../../stores/roomStore';

function getDeviceIcon(type?: string) {
  if (type === 'mobile') return '📱';
  if (type === 'tablet') return '📟';
  return '💻';
}

export function PeerStrip() {
  const { peers, myDeviceName } = useRoomStore();
  const remotePeers = peers.filter(p => !p.isLocal);

  return (
    <div className="px-3.5 sm:px-6 py-2.5 border-b border-[#1A202C]/80 bg-[#0D0F14]/70 flex items-center justify-between flex-shrink-0 select-none">
      <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar py-0.5 max-w-full">
        <span className="text-xs text-[#7E8B9B] font-mono uppercase tracking-wider flex-shrink-0 font-bold mr-1">
          Mesh:
        </span>

        {/* Local device pill */}
        <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#131720] border border-[#00FFFF]/40 text-white text-xs font-mono flex-shrink-0 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-[#00FFFF] shadow-[0_0_6px_#00FFFF]"></span>
          <span className="font-semibold">{myDeviceName || 'You'}</span>
          <span className="text-[11px] text-[#7E8B9B]">(Local)</span>
        </div>

        {/* Remote peers */}
        {remotePeers.map(peer => (
          <div
            key={peer.peer_id}
            className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#131720] border border-[#1A202C] text-slate-200 text-xs font-mono flex-shrink-0 animate-fade-in"
          >
            <span className="w-2 h-2 rounded-full bg-[#00FF88] shadow-[0_0_6px_#00FF88]"></span>
            <span>{getDeviceIcon(peer.device_type)} {peer.device_name}</span>
          </div>
        ))}

        {remotePeers.length === 0 && (
          <span className="text-xs text-[#7E8B9B] font-mono italic flex-shrink-0 pl-1">
            Waiting for other devices to join...
          </span>
        )}
      </div>

      <span className="text-xs text-[#7E8B9B] font-mono hidden md:inline flex-shrink-0 pl-3">
        🔒 Direct DataChannels
      </span>
    </div>
  );
}
