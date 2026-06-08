<script setup lang="ts">
import Terminal from './components/Terminal.vue'
</script>

<template>
  <main class="room">
    <div class="stage">
      <Terminal />

      <div class="statusbar">
        <span class="seg on">● ONLINE</span>
        <span class="seg">kyle welsh</span>
        <span class="seg grow">the bits don't do what i want them to do</span>
        <span class="seg">© 2026</span>
      </div>
    </div>
  </main>
</template>

<style scoped>
.room {
  position: relative;
  z-index: 1;
  min-height: 100svh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(16px, 4vw, 56px);
}

.stage {
  width: 100%;
  max-width: 920px;
}

.statusbar {
  margin-top: 14px;
  display: flex;
  align-items: center;
  gap: 1.6ch;
  flex-wrap: wrap;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #5d6360;
}

.seg.grow {
  flex: 1;
  min-width: 0;
  color: #474c4a;
  text-transform: none;
  letter-spacing: 0.04em;
}

.seg.on {
  color: var(--color-phosphor-dim);
  text-shadow: 0 0 8px rgba(77, 255, 149, 0.35);
}
</style>
