let wakeLock: unknown = null
export async function requestWakeLock() {
  try {
    const nav = navigator as Navigator
    if (nav.wakeLock) {
      wakeLock = await nav.wakeLock.request('screen')
      document.addEventListener('visibilitychange', async () => {
        if (wakeLock !== null && document.visibilityState === 'visible') {
          wakeLock = await nav.wakeLock.request('screen')
        }
      })
    }
  } catch {}
}
