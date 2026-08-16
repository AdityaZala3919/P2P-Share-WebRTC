import { useState } from 'react';
import type { VaultItem, DecryptedVaultNote } from '../../types/vault';
import { showToast } from '../shared/Toast';

interface Props {
  item: VaultItem;
  onDelete: () => void;
  decryptNote: (item: VaultItem) => Promise<DecryptedVaultNote>;
}

export function VaultNoteCard({ item, onDelete, decryptNote }: Props) {
  const [decrypted, setDecrypted] = useState<DecryptedVaultNote | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleExpand = async () => {
    if (!decrypted) {
      setLoading(true);
      try {
        const d = await decryptNote(item);
        setDecrypted(d);
        setExpanded(true);
      } catch {
        showToast('Decryption failed — wrong passphrase?');
      } finally {
        setLoading(false);
      }
    } else {
      setExpanded(e => !e);
    }
  };

  const handleCopy = () => {
    if (decrypted) {
      navigator.clipboard.writeText(decrypted.content);
      showToast('Copied to clipboard');
    }
  };

  return (
    <div className="p-3 rounded-xl bg-[#131720] border border-[#1A202C] hover:border-[#00FFFF]/40 transition-colors">
      <div className="flex items-center justify-between">
        <button onClick={handleExpand} className="flex-1 text-left min-w-0">
          <h4 className="text-xs font-semibold text-white truncate">{item.title}</h4>
          <p className="text-[10px] text-[#7E8B9B] font-mono mt-0.5">
            Note · {new Date(item.created_at).toLocaleDateString()}
            {loading && ' · Decrypting...'}
          </p>
        </button>
        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
          {decrypted && (
            <button
              onClick={handleCopy}
              className="p-1 text-[#7E8B9B] hover:text-[#00FFFF] transition-colors"
              title="Copy content"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          )}
          <button
            onClick={onDelete}
            className="p-1 text-[#7E8B9B] hover:text-red-400 transition-colors"
            title="Delete"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {expanded && decrypted && (
        <div className="mt-2 pt-2 border-t border-[#1A202C]">
          <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap break-words max-h-40 overflow-y-auto leading-relaxed">
            {decrypted.content}
          </pre>
        </div>
      )}

      <span className="text-[9px] font-mono text-[#00FFFF]/70 mt-1.5 block">
        AES-256-GCM · {expanded ? 'Decrypted' : 'Tap to decrypt'}
      </span>
    </div>
  );
}
