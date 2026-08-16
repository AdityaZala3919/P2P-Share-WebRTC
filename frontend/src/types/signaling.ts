export interface DeviceInfo {
  peer_id: string;
  device_name: string;
  device_type: 'desktop' | 'mobile' | 'tablet';
}

export interface SignalMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'peer-joined' | 'peer-left' | 'peer-list' | 'chat' | 'clipboard' | 'ping' | 'pong';
  from_peer?: string;
  to_peer?: string;
  payload?: unknown;
  peer?: DeviceInfo;
  peer_id?: string;
  peers?: DeviceInfo[];
}
