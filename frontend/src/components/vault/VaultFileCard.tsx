import type { VaultItem } from '../../types/vault';

function formatSize(bytes?: number): string {
  if (!bytes) return 'Unknown size';
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

interface Props {
  item: VaultItem;
  onDelete: () => void;
  onDownload: () => void;
}

export function VaultFileCard({ item, onDelete, onDownload }: Props) {
  return (
    <div className="p-3 rounded-xl bg-[#131720] border border-[#1A202C] hover:border-[#00FFFF]/40 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-lg bg-[#0D0F14] border border-[#1A202C] flex items-center justify-center text-[#00FF88] flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-semibold text-white truncate">{item.file_name || item.title}</h4>
            <p className="text-[10px] text-[#7E8B9B] font-mono">{formatSize(item.file_size)} · Encrypted</p>
          </div>
        </div>
        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
          <button
            onClick={onDownload}
            className="p-1.5 text-[#7E8B9B] hover:text-[#00FFFF] transition-colors"
            title="Decrypt & Download"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-[#7E8B9B] hover:text-red-400 transition-colors"
            title="Delete"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
      <span className="text-[9px] font-mono text-[#00FFFF]/70 mt-1.5 block">
        Zero-Knowledge · SQLite Vault
      </span>
    </div>
  );
}
