export function createPeer(onTrack: (stream: MediaStream)=>void) {
  const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] })
  pc.ontrack = (e) => onTrack(e.streams[0])
  return pc
}
