export type Quality = '480p' | '720p'

export function qualityToConstraints(q: Quality, deviceId?: string | null) {
  const base = q === '480p'
    ? { width: { ideal: 640 },  height: { ideal: 480 } }
    : { width: { ideal: 1280 }, height: { ideal: 720 } }

  return {
    audio: false,
    video: deviceId
      ? { deviceId: { exact: deviceId }, ...base }
      : { facingMode: 'user', ...base }
  } as MediaStreamConstraints
}

export async function listVideoInputs(): Promise<MediaDeviceInfo[]> {
  const all = await navigator.mediaDevices.enumerateDevices()
  return all.filter(d => d.kind === 'videoinput')
}
