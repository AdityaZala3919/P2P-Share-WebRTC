import { useRoomStore } from '../../stores/roomStore';

export function PeerStrip() {
  const { peers, myDeviceName } = useRoomStore();

  return (
    <div className="px-4 sm:px-6 py-2 border-b border-[#1A202C]/60 bg-[#0D0F14]/40 flex items-center justify-between flex-shrink-0 overflow-x-auto gap-3">
      <div className="flex items-center space-x-2 min-w-0">
        <span className="text-[11px] text-[#7E8B9B] font-mono uppercase tracking-wider flex-shrink-0">Peers:</span>

        <span className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-[#131720] border border-[#00FFFF]/30 text-white text-[11px] flex-shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00FFFF]"></span>
          <span>{myDeviceName} (You)</span>
        </span>

        {peers.filter(p => !p.isLocal).map(peer => (
          <span
            key={peer.peer_id}
            className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-[#131720] border border-[#1A202C] text-slate-300 text-[11px] flex-shrink-0"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#00FF88]"></span>
            <span>{peer.device_name}</span>
          </span>
        ))}
      </div>
      <span className="text-[11px] text-[#7E8B9B] font-mono hidden md:inline flex-shrink-0">
        WebRTC DataChannel
      </span>
    </div>
  );
}
