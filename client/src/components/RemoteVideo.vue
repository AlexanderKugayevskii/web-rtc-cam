<template>
  <video ref="vid" autoplay playsinline muted controls class="w-full h-[80vh] object-contain bg-black"></video>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const vid = ref<HTMLVideoElement|null>(null)
defineExpose({
  attach(stream: MediaStream) {
    if (vid.value) { vid.value.srcObject = stream; vid.value.play().catch(()=>{}) }
  }
})
</script>
