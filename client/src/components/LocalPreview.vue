<template>
  <video ref="vid" autoplay playsinline muted class="w-full max-h-[70vh] bg-black"></video>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const vid = ref<HTMLVideoElement|null>(null)
defineExpose({
  setStream(stream: MediaStream) {
    if (vid.value) vid.value.srcObject = stream
  }
})
</script>
