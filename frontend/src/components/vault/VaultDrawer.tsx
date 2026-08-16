import { useEffect, useState } from 'react';
import { useVault } from '../../hooks/useVault';
import { useRoomStore } from '../../stores/roomStore';
import { VaultNoteCard } from './VaultNoteCard';
import { VaultFileCard } from './VaultFileCard';
import { showToast } from '../shared/Toast';
import type { VaultItem } from '../../types/vault';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function VaultDrawer({ open, onClose }: Props) {
  const { roomId, passphrase } = useRoomStore();
  const {
    items, loading, fetchItems,
    createNote, createFile,
    deleteItem, decryptNote, decryptFile,
  } = useVault(roomId, passphrase);

  const [addingNote, setAddingNote] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) fetchItems();
  }, [open, fetchItems]);

  const handleAddNote = async () => {
    if (!noteTitle.trim() || !noteContent.trim()) return;
    setSaving(true);
    try {
      await createNote(noteTitle.trim(), noteContent.trim());
      setNoteTitle('');
      setNoteContent('');
      setAddingNote(false);
      showToast('Encrypted note saved to vault');
    } catch {
      showToast('Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  const handleAddFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await createFile(file);
      showToast(`"${file.name}" encrypted and stored in vault`);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to store file');
    }
    e.target.value = '';
  };

  const handleDownloadFile = async (item: VaultItem) => {
    try {
      const f = await decryptFile(item);
      const blob = new Blob([f.data]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = f.file_name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
      showToast(`Decrypted "${f.file_name}" — downloading`);
    } catch {
      showToast('Decryption failed — wrong passphrase?');
    }
  };

  const notes = items.filter(i => i.type === 'note');
  const files = items.filter(i => i.type === 'file');

  return (
    <>
      {/* Backdrop overlay on mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-30 sm:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      <aside
        className={`w-full sm:w-96 border-l border-[#1A202C] bg-[#0D0F14] flex flex-col fixed sm:absolute right-0 top-0 bottom-0 z-40 shadow-2xl transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-[#1A202C] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-[#00FFFF]/10 border border-[#00FFFF]/30 flex items-center justify-center text-[#00FFFF]">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                Encrypted Vault
              </h3>
              <span className="text-[10px] text-[#7E8B9B] font-mono">
                {items.length} item{items.length !== 1 ? 's' : ''} in SQLite
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#131720] border border-[#1A202C] text-[#7E8B9B] hover:text-white transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Info banner */}
        <div className="px-4 py-2 bg-[#131720]/80 border-b border-[#1A202C] text-[10px] text-[#7E8B9B] font-mono flex-shrink-0">
          🔒 Zero-knowledge AES-256-GCM · Client-side decrypted
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setAddingNote(true)}
              className="py-2.5 px-3 bg-[#00FFFF] text-black font-bold text-xs rounded-xl hover:bg-[#33FFFF] transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              New Note
            </button>
            <label className="py-2.5 px-3 bg-[#131720] border border-[#1A202C] text-slate-200 hover:text-white text-xs font-semibold rounded-xl hover:border-[#00FFFF] transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]">
              <input type="file" className="hidden" onChange={handleAddFile} />
              <svg className="w-3.5 h-3.5 text-[#00FFFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              Store File (≤10MB)
            </label>
          </div>

          {/* New note form */}
          {addingNote && (
            <div className="p-3.5 bg-[#131720] border border-[#00FFFF]/40 rounded-2xl space-y-2.5 shadow-lg animate-fade-in">
              <input
                placeholder="Note title (e.g. Wi-Fi Password)..."
                value={noteTitle}
                onChange={e => setNoteTitle(e.target.value)}
                className="w-full bg-[#0D0F14] border border-[#1A202C] focus:border-[#00FFFF] text-white text-xs sm:text-sm rounded-xl px-3.5 py-2.5 outline-none transition-colors"
                autoFocus
              />
              <textarea
                placeholder="Write secret text or code snippet..."
                value={noteContent}
                onChange={e => setNoteContent(e.target.value)}
                rows={4}
                className="w-full bg-[#0D0F14] border border-[#1A202C] focus:border-[#00FFFF] text-white text-xs sm:text-sm rounded-xl px-3.5 py-2.5 outline-none resize-none font-mono transition-colors"
              />
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleAddNote}
                  disabled={saving}
                  className="flex-1 py-2 bg-[#00FFFF] text-black font-bold text-xs rounded-xl hover:bg-[#33FFFF] disabled:opacity-50 transition-all cursor-pointer"
                >
                  {saving ? 'Encrypting...' : 'Save Encrypted'}
                </button>
                <button
                  onClick={() => { setAddingNote(false); setNoteTitle(''); setNoteContent(''); }}
                  className="flex-1 py-2 bg-[#0D0F14] border border-[#1A202C] text-slate-300 text-xs rounded-xl hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {loading && (
            <div className="text-center text-xs text-[#7E8B9B] font-mono py-6">
              Loading vault items...
            </div>
          )}

          {!loading && items.length === 0 && !addingNote && (
            <div className="text-center text-xs text-[#7E8B9B] font-mono py-12 leading-relaxed">
              🔒 Vault is empty.<br />Add private notes or files that stay encrypted in SQLite.
            </div>
          )}

          {notes.length > 0 && (
            <div className="space-y-2 pt-1">
              <p className="text-[10px] font-mono text-[#7E8B9B] uppercase tracking-wider px-1">Notes ({notes.length})</p>
              {notes.map(item => (
                <VaultNoteCard
                  key={item.id}
                  item={item}
                  onDelete={() => { deleteItem(item.id); showToast('Note deleted'); }}
                  decryptNote={decryptNote}
                />
              ))}
            </div>
          )}

          {files.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-[10px] font-mono text-[#7E8B9B] uppercase tracking-wider px-1">Files ({files.length})</p>
              {files.map(item => (
                <VaultFileCard
                  key={item.id}
                  item={item}
                  onDelete={() => { deleteItem(item.id); showToast('File deleted'); }}
                  onDownload={() => handleDownloadFile(item)}
                />
              ))}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
