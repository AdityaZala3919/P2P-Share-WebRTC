export type DeviceType = 'desktop' | 'mobile' | 'tablet';

export function detectDeviceType(): DeviceType {
  const ua = navigator.userAgent.toLowerCase();
  if (/tablet|ipad|playbook|silk/.test(ua)) return 'tablet';
  if (/mobile|android|iphone|ipod|blackberry|windows phone/.test(ua)) return 'mobile';
  return 'desktop';
}

export function detectDefaultDeviceName(): string {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android.*Mobile/.test(ua)) return 'Android Phone';
  if (/Android/.test(ua)) return 'Android Tablet';
  if (/Mac OS X/.test(ua) && !/iPhone|iPad/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows PC';
  if (/Linux/.test(ua)) return 'Linux PC';
  return 'Browser';
}

export function getDeviceName(roomId: string): string {
  const stored = localStorage.getItem(`nexus_device_name_${roomId}`);
  return stored || detectDefaultDeviceName();
}

export function setDeviceName(roomId: string, name: string): void {
  localStorage.setItem(`nexus_device_name_${roomId}`, name);
}

export function generatePeerId(): string {
  return crypto.randomUUID();
}

export function getOrCreatePeerId(): string {
  let id = sessionStorage.getItem('nexus_peer_id');
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem('nexus_peer_id', id);
  }
  return id;
}
