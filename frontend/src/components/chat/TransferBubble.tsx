import { useChatStore } from '../../stores/chatStore';
import { ProgressBar } from '../shared/ProgressBar';
import { showToast } from '../shared/Toast';

interface Props {
  transferId: string;
  fromDeviceName: string;
  isLocal: boolean;
  timestamp: number;
}

function getFileIcon(name: string, mime: string): string {
  if (mime.startsWith('image/')) return '🖼️';
  if (mime.startsWith('video/')) return '🎬';
  if (mime.startsWith('audio/')) return '🎵';
  if (name.endsWith('.pdf')) return '📄';
  if (name.match(/\.(zip|tar|gz|7z|rar)$/)) return '📦';
  if (name.match(/\.(js|ts|py|rs|go|java|cpp|c|h|json|yaml|toml|html|css)$/)) return '📝';
  return '📎';
}

function formatSize(bytes: number): string {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function formatSpeed(bps: number): string {
  if (bps >= 1048576) return `${(bps / 1048576).toFixed(1)} MB/s`;
  if (bps >= 1024) return `${(bps / 1024).toFixed(1)} KB/s`;
  return `${bps} B/s`;
}

export function TransferBubble({ transferId, fromDeviceName, isLocal, timestamp }: Props) {
  const { activeTransfers } = useChatStore();
  const transfer = activeTransfers.get(transferId);
  const time = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (!transfer) return null;

  const { meta, status, bytesTransferred, speed, eta, blobUrl } = transfer;
  const percent = meta.size > 0 ? Math.min((bytesTransferred / meta.size) * 100, 100) : 0;
  const icon = getFileIcon(meta.name, meta.mimeType);

  const handleDownload = () => {
    if (blobUrl) {
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = meta.name;
      a.click();
      showToast(`Saving "${meta.name}"`);
    }
  };

  return (
    <div className={`flex items-start space-x-2.5 w-full ${isLocal ? 'justify-end flex-row-reverse space-x-reverse' : 'justify-start'}`}>
      {!isLocal && (
        <div className="w-8 h-8 rounded-full bg-[#131720] border border-[#1A202C] flex items-center justify-center text-[#00FF88] flex-shrink-0 mt-5 text-sm font-mono shadow-xs">
          <span>●</span>
        </div>
      )}

      <div className={`flex flex-col w-full max-w-[88%] sm:max-w-sm ${isLocal ? 'items-end' : 'items-start'}`}>
        <span className={`text-xs font-semibold mb-1 px-1 font-mono ${isLocal ? 'text-[#00FFFF]' : 'text-[#7E8B9B]'}`}>
          {fromDeviceName} {isLocal && '(You)'}
        </span>

        <div className={`w-full p-4 rounded-2xl shadow-sm border transition-all ${
          isLocal
            ? 'bg-[#131720] border-[#00FFFF]/30 rounded-tr-xs'
            : status === 'transferring'
            ? 'bg-[#131720] border-[#00FFFF]/60 rounded-tl-xs shadow-[0_0_20px_rgba(0,255,255,0.15)]'
            : 'bg-[#131720] border-[#1A202C] rounded-tl-xs'
        }`}>
          {/* File Meta Header */}
          <div className="flex items-center space-x-3.5 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-[#08090C] border border-[#1A202C] flex items-center justify-center text-2xl flex-shrink-0 shadow-inner">
              {icon}
            </div>

            <div className="min-w-0 flex-1">
              <h4 className="text-sm sm:text-base font-bold text-white truncate" title={meta.name}>
                {meta.name}
              </h4>
              <p className="text-xs text-[#7E8B9B] font-mono mt-0.5">
                {formatSize(bytesTransferred)} / {formatSize(meta.size)}
                {status === 'transferring' && speed > 0 && (
                  <span className="text-[#00FFFF] font-bold"> · {formatSpeed(speed)}</span>
                )}
              </p>
            </div>

            {status === 'complete' && !isLocal && blobUrl && (
              <button
                onClick={handleDownload}
                className="px-3.5 py-2 bg-[#00FFFF] hover:bg-[#33FFFF] text-black text-xs font-bold font-mono rounded-xl transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer shadow-md shadow-cyan-950/30 active:scale-95"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Save
              </button>
            )}
          </div>

          {/* Progress Bar during transfer */}
          {status === 'transferring' && (
            <div className="space-y-2 pt-1">
              <ProgressBar percent={percent} />
              <div className="flex items-center justify-between text-xs font-mono text-[#7E8B9B]">
                <span className="text-[#00FF88] flex items-center gap-1.5 font-bold">
                  <span className="w-2 h-2 rounded-full bg-[#00FF88] animate-pulse"></span>
                  {isLocal ? 'Sending' : 'Receiving'} ({Math.round(percent)}%)
                </span>
                {eta > 0 && <span>ETA: {eta < 60 ? `${Math.round(eta)}s` : `${Math.round(eta / 60)}m`}</span>}
              </div>
            </div>
          )}

          {/* Completed footer */}
          {status === 'complete' && (
            <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-[#1A202C]/80 text-xs font-mono">
              <span className="text-[#00FF88] flex items-center gap-1.5 font-semibold">
                ✓ {isLocal ? 'Sent via WebRTC' : 'Received Complete'}
              </span>
              <span className="text-[#7E8B9B]">{time}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
