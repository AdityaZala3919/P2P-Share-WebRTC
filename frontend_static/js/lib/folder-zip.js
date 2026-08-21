/**
 * In-browser folder to ZIP packaging using fflate from CDN.
 */
export async function folderToZipFile(items) {
  const files = {};

  async function processEntry(entry, path = '') {
    if (entry.isFile) {
      const file = await new Promise((resolve, reject) => entry.file(resolve, reject));
      const data = await file.arrayBuffer();
      files[path + file.name] = new Uint8Array(data);
    } else if (entry.isDirectory) {
      const reader = entry.createReader();
      const entries = await new Promise((resolve, reject) => {
        reader.readEntries(resolve, reject);
      });
      for (const e of entries) {
        await processEntry(e, path + entry.name + '/');
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
        const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
        if (entry) await processEntry(entry);
      }
    }
  }

  let zipFn = null;
  if (window.fflate && window.fflate.zipSync) {
    zipFn = window.fflate.zipSync;
  } else {
    const mod = await import('https://cdn.jsdelivr.net/npm/fflate@0.8.2/+esm');
    zipFn = mod.zipSync;
  }

  const zipped = zipFn(files, { level: 0 }); // level 0 for maximum speed
  return new File([zipped], 'folder_transfer.zip', { type: 'application/zip' });
}
