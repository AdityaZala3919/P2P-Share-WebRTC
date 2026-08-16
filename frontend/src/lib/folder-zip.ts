import { zipSync, type Zippable } from 'fflate';

export async function folderToZipFile(items: DataTransferItemList | FileList): Promise<File> {
  const files: Zippable = {};
  
  async function processEntry(entry: FileSystemEntry, path = ''): Promise<void> {
    if (entry.isFile) {
      const fileEntry = entry as FileSystemFileEntry;
      const file = await new Promise<File>((resolve, reject) => fileEntry.file(resolve, reject));
      const data = await file.arrayBuffer();
      files[path + file.name] = new Uint8Array(data);
    } else if (entry.isDirectory) {
      const dirEntry = entry as FileSystemDirectoryEntry;
      const reader = dirEntry.createReader();
      const entries = await new Promise<FileSystemEntry[]>((resolve, reject) => {
        reader.readEntries(resolve, reject);
      });
      for (const e of entries) {
        await processEntry(e, path + dirEntry.name + '/');
      }
    }
  }

  if (items instanceof FileList) {
    for (const file of Array.from(items)) {
      const data = await file.arrayBuffer();
      files[file.name] = new Uint8Array(data);
    }
  } else {
    for (const item of Array.from(items)) {
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry();
        if (entry) await processEntry(entry);
      }
    }
  }

  const zipped = zipSync(files, { level: 0 }); // no compression for speed
  return new File([zipped], 'folder_transfer.zip', { type: 'application/zip' });
}
