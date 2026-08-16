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
  if (name.match(/\.(js|ts|py|rs|go|java|cpp|c|h|json|yaml|toml)$/)) return '📝';
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
  const percent = meta.size > 0 ? (bytesTransferred / meta.size) * 100 : 0;
  const icon = getFileIcon(meta.name, meta.mimeType);

  const handleDownload = () => {
    if (blobUrl) {
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = meta.name;
      a.click();
      showToast(`Saving ${meta.name}`);
    }
  };

  return (
    <div className={`flex items-start space-x-2.5 ${isLocal ? 'ml-auto flex-row-reverse space-x-reverse' : ''} w-full sm:w-[380px] max-w-full`}>
      {!isLocal && (
        <div className="w-7 h-7 rounded-full bg-[#131720] border border-[#1A202C] flex items-center justify-center text-[#00FF88] flex-shrink-0 mt-5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
      )}
      <div className={`flex flex-col w-full ${isLocal ? 'items-end' : 'items-start'}`}>
        <span className={`text-[11px] font-medium mb-1 mx-1 ${isLocal ? 'text-[#00FFFF]' : 'text-[#7E8B9B]'}`}>
          {fromDeviceName}
        </span>
        <div className={`w-full p-3.5 rounded-2xl shadow-sm border ${
          isLocal
            ? 'bg-[#131720] border-[#00FFFF]/40 rounded-tr-sm'
            : status === 'transferring'
            ? 'bg-[#131720] border-[#00FFFF]/40 rounded-tl-sm'
            : 'bg-[#131720] border-[#1A202C] rounded-tl-sm'
        }`}>
          <div className="flex items-center space-x-3 mb-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#0D0F14] border border-[#1A202C] flex items-center justify-center text-xl flex-shrink-0">
              {icon}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-semibold text-white truncate">{meta.name}</h4>
              <p className="text-[11px] text-[#7E8B9B] font-mono">
                {formatSize(bytesTransferred)} / {formatSize(meta.size)}
                {status === 'transferring' && speed > 0 && (
                  <span className="text-[#00FFFF] font-bold"> · {formatSpeed(speed)}</span>
                )}
              </p>
            </div>
            {status === 'complete' && !isLocal && blobUrl && (
              <button
                onClick={handleDownload}
                className="px-2.5 py-1 bg-[#0D0F14] hover:bg-[#00FFFF] hover:text-black border border-[#1A202C] text-xs font-mono text-white rounded-lg transition-all flex items-center gap-1 flex-shrink-0"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Save
              </button>
            )}
          </div>

          {status === 'transferring' && (
            <>
              <ProgressBar percent={percent} />
              <div className="flex items-center justify-between mt-2 text-[11px] font-mono text-[#7E8B9B]">
                <span className="text-[#00FF88]">
                  {isLocal ? 'Sending' : 'Receiving'} ({Math.round(percent)}%)
                </span>
                {eta > 0 && <span>ETA: {eta < 60 ? `${Math.round(eta)}s` : `${Math.round(eta / 60)}m`}</span>}
              </div>
            </>
          )}

          {status === 'complete' && (
            <div className="flex items-center justify-between mt-1 text-[11px] font-mono">
              <span className="text-[#00FF88]">✓ {isLocal ? 'Sent' : 'Received'}</span>
              <span className="text-[#7E8B9B]">{time}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
