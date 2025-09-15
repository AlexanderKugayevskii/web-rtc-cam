<template>
  <section class="space-y-4">
    <h2 class="text-xl font-semibold">📱 Sender</h2>

    <div class="flex flex-wrap items-center gap-3">
      <label class="text-sm">Камера:</label>
      <select
        id="selectDevice"
        v-model="selectedDeviceId"
        @change="applyNewStream"
        class="px-2 py-1 rounded border bg-emerald-600 text-neutral-200"
      >
        <option :value="null" class="text-white">Авто (front)</option>
        <option v-for="d in devices" :key="d.deviceId" :value="d.deviceId">
          {{ d.label || 'Камера' }}
        </option>
      </select>

      <label class="text-sm ml-2">Качество:</label>
      <select
        id="selectQuality"
        v-model="quality"
        @change="applyNewStream"
        class="px-2 py-1 rounded border bg-emerald-600 text-neutral-200"
      >
        <option value="480p">480p</option>
        <option value="720p">720p</option>
      </select>

      <button @click="switchFacing" class="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500">
        front/back
      </button>
      <button @click="reconnect" class="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500">
        Reconnect
      </button>
    </div>

    <LocalPreview ref="preview" />
    <p class="text-sm text-neutral-400">{{ status }}</p>
    <pre class="prewrap text-xs bg-neutral-900 text-neutral-200 p-2 rounded">{{ log }}</pre>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LocalPreview from '../components/LocalPreview.vue'
import { createSignaling, type Signal } from '../composables/useSignaling'
import { createPeer } from '../composables/useWebRTC'
import { requestWakeLock } from '../composables/useWakeLock'
import { listVideoInputs, qualityToConstraints, type Quality } from '../composables/useMedia'

const status = ref('init…')
const log = ref('')
const preview = ref<InstanceType<typeof LocalPreview> | null>(null)

const devices = ref<MediaDeviceInfo[]>([])
const selectedDeviceId = ref<string | null>(null)
const quality = ref<Quality>('720p')
let useFacing: 'user' | 'environment' = 'user'

let stream: MediaStream
let pc: RTCPeerConnection | undefined
let sig: ReturnType<typeof createSignaling>

function append(s: string) {
  log.value += s + '\n'
}

onMounted(async () => {
  sig = createSignaling(handleSignal)
  sig.onOpen(() => {
    status.value = 'WS connected'
    append('WS connected')
  })

  await refreshDevices()
  await applyNewStream()
  requestWakeLock()
  await makeOffer(true)
})

async function refreshDevices() {
  try {
    const t = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
    t.getTracks().forEach((x) => x.stop())
  } catch {}
  devices.value = await listVideoInputs()
}

async function getStream() {
  const c = qualityToConstraints(quality.value, selectedDeviceId.value)
  if (!selectedDeviceId.value) {
    // ensure c.video is an object before assigning facingMode (qualityToConstraints may return boolean)
    c.video = { ...(typeof c.video === 'object' && c.video ? c.video : {}), facingMode: useFacing }
  }
  return await navigator.mediaDevices.getUserMedia(c)
}

async function applyNewStream() {
  append(`applyStream: ${quality.value} ${selectedDeviceId.value ?? useFacing}`)
  const newStream = await getStream()
  preview.value?.setStream(newStream)

  if (pc) {
    const senders = pc.getSenders().filter((s) => s.track?.kind === 'video')
    const newTrack = newStream.getVideoTracks()[0]
    if (senders[0]) await senders[0].replaceTrack(newTrack)
    else pc.addTrack(newTrack, newStream)
    stream?.getTracks().forEach((t) => t.stop())
  }
  stream = newStream
  await makeOffer(true)
}

async function switchFacing() {
  selectedDeviceId.value = null
  useFacing = useFacing === 'user' ? 'environment' : 'user'
  await applyNewStream()
}

async function reconnect() {
  append('manual reconnect')
  await makeOffer(true)
}

async function makeOffer(forceNew = false) {
  if (forceNew && pc) {
    try {
      pc.close()
    } catch {}
    pc = undefined
  }
  if (!pc) {
    pc = createPeer(() => {})
    stream.getTracks().forEach((t) => pc!.addTrack(t, stream))
    pc.onicecandidate = (e) => {
      if (e.candidate) sig.send({ type: 'candidate', candidate: e.candidate })
    }
    pc.onconnectionstatechange = () => append('pc.state=' + pc!.connectionState)
  }
  const offer = await pc!.createOffer({ iceRestart: true })
  await pc!.setLocalDescription(offer)
  sig.send({ type: 'offer', sdp: offer.sdp! })
  append('offer sent')
}

async function handleSignal(msg: Signal) {
  append('WS msg: ' + msg.type)
  if (msg.type === 'viewer-ready') {
    await makeOffer(true)
  } else if (msg.type === 'answer' && pc && !pc.currentRemoteDescription) {
    await pc.setRemoteDescription({ type: 'answer', sdp: msg.sdp })
    append('answer set')
  } else if (msg.type === 'candidate' && pc) {
    try {
      await pc.addIceCandidate(msg.candidate)
      append('ice added')
    } catch (e) {
      append('ice err ' + e)
    }
  }
}
</script>
