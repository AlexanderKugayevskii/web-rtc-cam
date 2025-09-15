<template>
  <section class="space-y-4">
    <h2 class="text-xl font-semibold">🖥 Viewer</h2>
    <div class="flex gap-3">
      <button @click="reconnect" class="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500">
        Reconnect
      </button>
    </div>
    <RemoteVideo ref="remote" />
    <pre class="prewrap text-xs bg-neutral-900 text-neutral-200 p-2 rounded">{{ log }}</pre>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import RemoteVideo from '../components/RemoteVideo.vue'
import { createSignaling, type Signal } from '../composables/useSignaling'
import { createPeer } from '../composables/useWebRTC'

const remote = ref<InstanceType<typeof RemoteVideo> | null>(null)
const log = ref('')
let pc: RTCPeerConnection
let sig: ReturnType<typeof createSignaling>
function append(s: string) {
  log.value += s + '\n'
}

onMounted(async () => {
  sig = createSignaling(handleSignal)
  pc = createPeer((stream) => {
    remote.value?.attach(stream)
    append('ontrack')
  })
  pc.onicecandidate = (e) => {
    if (e.candidate) sig.send({ type: 'candidate', candidate: e.candidate })
  }
  sig.onOpen(() => {
    append('WS open')
    sig.send({ type: 'viewer-ready' })
  })
})

function reconnect() {
  append('manual viewer-ready')
  sig.send({ type: 'viewer-ready' })
}

async function handleSignal(msg: Signal) {
  append('WS msg: ' + msg.type)
  if (msg.type === 'offer') {
    await pc.setRemoteDescription({ type: 'offer', sdp: msg.sdp })
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    sig.send({ type: 'answer', sdp: answer.sdp! })
    append('answer sent')
  } else if (msg.type === 'candidate') {
    try {
      await pc.addIceCandidate(msg.candidate)
      append('ice added')
    } catch (e) {
      append('ice err ' + e)
    }
  }
}
</script>
