export type Signal =
  | { type: 'viewer-ready' }
  | { type: 'offer'; sdp: string }
  | { type: 'answer'; sdp: string }
  | { type: 'candidate'; candidate: RTCIceCandidateInit }

export function createSignaling(onMessage: (msg: Signal)=>void) {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws'
  const ws = new WebSocket(`${proto}://${location.host}/ws`)
  ws.binaryType = 'arraybuffer'

  ws.onmessage = async (ev: MessageEvent<string | Blob | ArrayBuffer>) => {
    let raw: string | Blob | ArrayBuffer = ev.data
    if (raw instanceof Blob) raw = await raw.text()
    if (raw instanceof ArrayBuffer) raw = new TextDecoder().decode(raw)
    try { onMessage(JSON.parse(raw as string)) } catch {}
  }

  return {
    send(msg: Signal) {
      const s = JSON.stringify(msg)
      if (ws.readyState === WebSocket.OPEN) ws.send(s)
      else ws.addEventListener('open', () => ws.send(s), { once: true })
    },
    onOpen(cb: ()=>void) { ws.addEventListener('open', cb) }
  }
}
