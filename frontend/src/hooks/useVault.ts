import { useState, useCallback } from 'react';
import { encryptText, decryptText, encryptBinary, decryptBinary } from '../lib/crypto';
import type { VaultItem, DecryptedVaultNote, DecryptedVaultFile } from '../types/vault';

export function useVault(roomId: string | null, passphrase: string | null) {
  const [items, setItems] = useState<VaultItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchItems = useCallback(async () => {
    if (!roomId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/rooms/${roomId}/vault`);
      const data: VaultItem[] = await res.json();
      setItems(data);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  const createNote = useCallback(async (title: string, content: string): Promise<void> => {
    if (!roomId || !passphrase) return;
    const { ciphertext, iv, salt } = await encryptText(content, passphrase);
    await fetch(`/api/rooms/${roomId}/vault`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'note', title, encrypted_data: ciphertext, iv, salt }),
    });
    await fetchItems();
  }, [roomId, passphrase, fetchItems]);

  const createFile = useCallback(async (file: File): Promise<void> => {
    if (!roomId || !passphrase) return;
    if (file.size > 10 * 1024 * 1024) throw new Error('File exceeds 10MB limit');
    const buffer = await file.arrayBuffer();
    const { ciphertext, iv, salt } = await encryptBinary(buffer, passphrase);
    await fetch(`/api/rooms/${roomId}/vault`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'file', title: file.name, encrypted_data: ciphertext, iv, salt, file_size: file.size, file_name: file.name }),
    });
    await fetchItems();
  }, [roomId, passphrase, fetchItems]);

  const decryptNote = useCallback(async (item: VaultItem): Promise<DecryptedVaultNote> => {
    if (!passphrase) throw new Error('No passphrase');
    const content = await decryptText(item.encrypted_data, item.iv, item.salt, passphrase);
    return { id: item.id, title: item.title, content, created_at: item.created_at, updated_at: item.updated_at };
  }, [passphrase]);

  const decryptFile = useCallback(async (item: VaultItem): Promise<DecryptedVaultFile> => {
    if (!passphrase) throw new Error('No passphrase');
    const data = await decryptBinary(item.encrypted_data, item.iv, item.salt, passphrase);
    return { id: item.id, title: item.title, file_name: item.file_name || item.title, file_size: item.file_size || 0, data, created_at: item.created_at };
  }, [passphrase]);

  const deleteItem = useCallback(async (itemId: string): Promise<void> => {
    if (!roomId) return;
    await fetch(`/api/rooms/${roomId}/vault/${itemId}`, { method: 'DELETE' });
    await fetchItems();
  }, [roomId, fetchItems]);

  const updateNote = useCallback(async (itemId: string, title: string, content: string): Promise<void> => {
    if (!roomId || !passphrase) return;
    const { ciphertext, iv } = await encryptText(content, passphrase);
    await fetch(`/api/rooms/${roomId}/vault/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, encrypted_data: ciphertext, iv }),
    });
    await fetchItems();
  }, [roomId, passphrase, fetchItems]);

  return { items, loading, fetchItems, createNote, createFile, decryptNote, decryptFile, deleteItem, updateNote };
}
