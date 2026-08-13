<script setup lang="ts">
import { ref } from 'vue'
import Terminal, { type PowerStatus } from './components/Terminal.vue'
import Backdrop from './components/Backdrop.vue'

const power = ref<PowerStatus>('standby')

const POWER_LABEL: Record<PowerStatus, string> = {
  standby: '○ STANDBY',
  loading: '◐ LOADING',
  online: '● ONLINE',
  local: '● LOCAL',
}
</script>

<template>
  <main class="room">
    <Backdrop />

    <div class="stage">
      <Terminal @status="power = $event" />

      <div class="statusbar">
        <span class="seg" :class="{ on: power !== 'standby' }">{{
          POWER_LABEL[power]
        }}</span>
        <span class="seg">kyle welsh</span>
        <span class="seg grow">the bits don't do what i want them to do</span>
        <span class="seg">cape town, za</span>
        <span class="seg">© 2026</span>
      </div>
    </div>
  </main>
</template>

<style scoped>
.room {
  position: relative;
  z-index: 1;
  height: 100svh;
  height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(12px, 3vw, 48px);
  overflow: hidden;
}

.stage {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 960px;
  height: 100%;
  max-height: 820px;
  display: flex;
  flex-direction: column;
}

/* the monitor takes all height the statusbar doesn't need */
.stage > :first-child {
  flex: 1;
  min-height: 0;
}

.statusbar {
  flex: none;
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

@media (max-width: 560px) {
  .statusbar {
    font-size: 10px;
    gap: 1.2ch;
  }

  .seg.grow {
    display: none;
  }
}
</style>
