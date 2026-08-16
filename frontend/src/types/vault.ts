export type VaultItemType = 'note' | 'file';

export interface VaultItem {
  id: string;
  room_id: string;
  type: VaultItemType;
  title: string;
  encrypted_data: string;
  iv: string;
  salt: string;
  file_size?: number;
  file_name?: string;
  created_at: string;
  updated_at: string;
}

export interface DecryptedVaultNote {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface DecryptedVaultFile {
  id: string;
  title: string;
  file_name: string;
  file_size: number;
  data: ArrayBuffer;
  created_at: string;
}
