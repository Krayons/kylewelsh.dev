<script setup lang="ts">
import { ref, nextTick, onBeforeUnmount } from 'vue'
import { mountTerminal, type TerminalDisplay } from '../terminal/remoteSession'
import { playIntro } from '../terminal/playIntro'
import { attachLocalShell } from '../terminal/localXtermShell'
import { attachV86, type V86Attach } from '../terminal/v86Session'
import {
  cachedV86Assets,
  loadV86Assets,
  type AssetProgress,
  type V86Buffers,
} from '../terminal/v86Assets'
import LoadScreen from './LoadScreen.vue'

export type PowerStatus = 'standby' | 'loading' | 'online' | 'local'

const emit = defineEmits<{
  status: [value: PowerStatus]
}>()

const powerCycles = ref(0)
const status = ref<PowerStatus>('standby')
const screenEl = ref<HTMLElement | null>(null)
const xtermHostEl = ref<HTMLElement | null>(null)

const loadFiles = ref<AssetProgress[]>([])
const loadLoaded = ref(0)
const loadTotal = ref(0)
const loadPhase = ref<'download' | 'boot' | 'fail'>('download')
const loadDetail = ref('')

let cancelled = false
let display: TerminalDisplay | null = null
let guest: V86Attach | null = null
let localShell: { dispose: () => void } | null = null
let loadAbort: AbortController | null = null

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms))

const reduceMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const finePointer =
  typeof window !== 'undefined' &&
  window.matchMedia('(pointer: fine)').matches

function setStatus(next: PowerStatus) {
  status.value = next
  emit('status', next)
}

function teardownSession() {
  localShell?.dispose()
  localShell = null
  guest?.dispose()
  guest = null
  display?.dispose()
  display = null
}

function onScreenClick() {
  if (status.value === 'standby' || status.value === 'loading') return
  const sel = window.getSelection()
  if (sel && !sel.isCollapsed) return
  if (!finePointer && !display) return
  display?.focus()
}

function dropToLocal() {
  if (!display) return
  localShell?.dispose()
  localShell = attachLocalShell(display.term, {
    onReboot: () => {
      void reboot()
    },
  })
  setStatus('local')
  if (finePointer) display.focus()
}

async function bootSession(assets: V86Buffers | null) {
  await nextTick()
  const host = xtermHostEl.value
  if (!host || cancelled) return

  try {
    display = await mountTerminal({
      host,
      autoFocus: false,
    })
  } catch {
    return
  }
  if (cancelled) {
    teardownSession()
    return
  }

  let attach: V86Attach | null = null
  if (assets) {
    try {
      attach = await attachV86({
        display,
        assets,
        onDisconnected: () => {
          if (cancelled || !display) return
          dropToLocal()
        },
      })
      guest = attach
    } catch {
      attach = null
    }
  }

  setStatus(attach ? 'online' : 'local')

  await playIntro({
    display,
    reduceMotion,
    isCancelled: () => cancelled,
  })
  if (cancelled) return

  if (attach && guest === attach) {
    await attach.ready
    if (cancelled) return
    await sleep(reduceMotion ? 0 : 120)
    if (cancelled) return
    attach.goLive()
    if (finePointer) display.focus()
    return
  }

  dropToLocal()
}

async function powerOn() {
  if (status.value !== 'standby') return
  cancelled = false
  loadPhase.value = 'download'
  loadDetail.value = ''
  loadFiles.value = []
  setStatus('loading')

  loadAbort = new AbortController()
  const started = Date.now()
  let assets: V86Buffers | null = cachedV86Assets()

  try {
    assets = await loadV86Assets({
      signal: loadAbort.signal,
      onProgress: (p) => {
        loadFiles.value = p.files
        loadLoaded.value = p.loaded
        loadTotal.value = p.total
      },
    })
  } catch (e) {
    if (loadAbort.signal.aborted || cancelled) {
      setStatus('standby')
      return
    }
    loadPhase.value = 'fail'
    loadDetail.value =
      e instanceof Error ? e.message : 'system image missing'
    await sleep(reduceMotion ? 400 : 1100)
    assets = null
  }

  const elapsed = Date.now() - started
  if (!reduceMotion && elapsed < 700) await sleep(700 - elapsed)
  if (cancelled) {
    setStatus('standby')
    return
  }

  loadPhase.value = 'boot'
  await sleep(reduceMotion ? 0 : 280)
  if (cancelled) {
    setStatus('standby')
    return
  }

  await bootSession(assets)
}

async function powerOff() {
  cancelled = true
  loadAbort?.abort()
  loadAbort = null
  teardownSession()
  powerCycles.value++
  setStatus('standby')
  loadPhase.value = 'download'
  loadDetail.value = ''
}

function togglePower() {
  if (status.value === 'standby') void powerOn()
  else void powerOff()
}

async function reboot() {
  if (status.value === 'standby' || status.value === 'loading') return
  cancelled = true
  teardownSession()
  powerCycles.value++
  await nextTick()
  cancelled = false
  await bootSession(cachedV86Assets())
}

onBeforeUnmount(() => {
  cancelled = true
  loadAbort?.abort()
  teardownSession()
})
</script>

<template>
  <div id="monitor">
    <div id="bezel">
      <div
        class="crt"
        :class="{ standby: status === 'standby' }"
        :key="powerCycles"
        @click="onScreenClick"
      >
        <div class="scanline" aria-hidden="true"></div>
        <div class="vignette" aria-hidden="true"></div>

        <div ref="screenEl" class="screen remote" role="log">
          <div
            ref="xtermHostEl"
            class="xterm-host"
            :class="{ dimmed: status === 'loading' }"
            aria-label="terminal"
          ></div>
          <LoadScreen
            v-if="status === 'loading'"
            :files="loadFiles"
            :loaded="loadLoaded"
            :total="loadTotal"
            :phase="loadPhase"
            :detail="loadDetail"
          />
        </div>
      </div>

      <button
        type="button"
        class="power"
        :class="{ on: status !== 'standby' }"
        :aria-pressed="status !== 'standby'"
        :aria-label="status === 'standby' ? 'Power on' : 'Power off'"
        @click.stop="togglePower"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 4.5v8" />
          <path d="M8.15 7.6a6.1 6.1 0 1 0 7.7 0" />
        </svg>
      </button>

      <div class="badge" aria-hidden="true">
        <span class="led" :class="status"></span>
        <span class="brand">PHOSPHOR&nbsp;TC&minus;88</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
#monitor {
  height: 100%;
  width: 100%;
  display: flex;
  perspective: 1400px;
}

#bezel {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: linear-gradient(165deg, #2a2d2c 0%, #1b1d1c 55%, #121413 100%);
  border-radius: 22px;
  padding: clamp(12px, 2.5vw, 20px);
  padding-bottom: clamp(26px, 5vw, 34px);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.07),
    inset 0 0 0 1px rgba(0, 0, 0, 0.6),
    0 2px 0 rgba(0, 0, 0, 0.5),
    0 40px 80px -30px rgba(0, 0, 0, 0.9),
    0 0 90px -20px rgba(77, 255, 149, 0.18);
}

.crt {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  overflow: hidden;
  border-radius: 14px;
  background:
    radial-gradient(120% 130% at 50% 0%, #0a2417 0%, var(--color-screen) 60%, #020a06 100%);
  box-shadow:
    inset 0 0 60px rgba(0, 0, 0, 0.9),
    inset 0 0 6px rgba(77, 255, 149, 0.15);
  color: var(--color-phosphor);
  text-shadow: none;
  animation: turnOn 1s ease-out 1 both;
  touch-action: manipulation;
  cursor: text;
}

.crt.standby {
  animation: none;
  cursor: default;
  background: radial-gradient(120% 80% at 50% 40%, #070b09 0%, #030403 70%, #010201 100%);
  box-shadow: inset 0 0 80px rgba(0, 0, 0, 0.95);
}

.screen {
  position: relative;
  z-index: 1;
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  overscroll-behavior: contain;
  padding: clamp(14px, 3vw, 28px);
  display: flex;
  flex-direction: column;
  text-shadow: none;
}

.xterm-host {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  height: 100%;
  position: relative;
  color: var(--color-phosphor);
  text-shadow: none;
}

.xterm-host.dimmed {
  opacity: 0;
}

.xterm-host :deep(.xterm) {
  position: absolute;
  inset: 0;
  height: 100% !important;
  width: 100% !important;
  padding: 0;
  text-shadow: none;
}

.xterm-host :deep(.xterm-viewport) {
  overflow-y: auto !important;
  scrollbar-width: thin;
  scrollbar-color: rgba(47, 157, 99, 0.55) transparent;
}

.xterm-host :deep(.xterm-helpers),
.xterm-host :deep(.xterm-helper-textarea) {
  opacity: 0;
}

.scanline {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  background: linear-gradient(
    rgba(182, 255, 210, 0) 0%,
    rgba(182, 255, 210, 0.06) 50%,
    rgba(182, 255, 210, 0) 100%
  );
  height: 28%;
  animation: sweep 7.5s linear infinite;
}

.crt.standby .scanline,
.crt.standby .vignette {
  opacity: 0;
}

.crt::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  background:
    linear-gradient(rgba(8, 20, 14, 0) 50%, rgba(0, 0, 0, 0.32) 50%),
    linear-gradient(90deg, rgba(255, 0, 0, 0.05), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.05));
  background-size: 100% 3px, 4px 100%;
  mix-blend-mode: overlay;
}

.crt.standby::before,
.crt.standby::after {
  opacity: 0;
}

.crt::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 4;
  pointer-events: none;
  background: rgba(120, 255, 180, 0.02);
  animation: flicker 4.5s steps(2, end) infinite;
}

.vignette {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  background:
    radial-gradient(130% 130% at 50% 0%, transparent 60%, rgba(0, 0, 0, 0.55) 100%),
    radial-gradient(80% 60% at 30% 8%, rgba(255, 255, 255, 0.05), transparent 50%);
  border-radius: 14px;
}

.power {
  position: absolute;
  left: 26px;
  bottom: 8px;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  cursor: pointer;
  color: #6a706c;
  background:
    radial-gradient(circle at 35% 30%, #3a3e3c 0%, #1c1e1d 62%, #0e0f0e 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.14),
    inset 0 -2px 3px rgba(0, 0, 0, 0.7),
    0 0 0 1px rgba(0, 0, 0, 0.55),
    0 2px 3px rgba(0, 0, 0, 0.45);
  display: grid;
  place-items: center;
  transition:
    color 0.2s ease,
    box-shadow 0.2s ease;
}

.power svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.85;
  stroke-linecap: round;
}

.power:hover {
  color: #9aa39c;
}

.power.on {
  color: var(--color-phosphor);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.14),
    inset 0 -2px 3px rgba(0, 0, 0, 0.7),
    0 0 0 1px rgba(0, 0, 0, 0.55),
    0 0 10px rgba(77, 255, 149, 0.35);
}

.power:not(.on) {
  animation: powerHint 2.8s ease-in-out infinite;
}

.power:focus-visible {
  outline: 1px solid var(--color-phosphor-dim);
  outline-offset: 3px;
}

.badge {
  position: absolute;
  right: 26px;
  bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 10px;
  letter-spacing: 0.22em;
  color: #5b605d;
}

.led {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--color-phosphor);
  box-shadow: 0 0 8px 1px rgba(77, 255, 149, 0.8);
  animation: ledPulse 3.5s ease-in-out infinite;
}

.led.standby {
  background: #4a2a22;
  box-shadow: none;
  animation: none;
}

.led.loading {
  background: #ffb15a;
  box-shadow: 0 0 8px 1px rgba(255, 177, 90, 0.7);
}

@keyframes turnOn {
  0% {
    transform: scaleY(0.0025);
    filter: brightness(3.4);
    opacity: 0.9;
  }
  18% {
    transform: scaleY(0.0025);
    filter: brightness(2.6);
    opacity: 1;
  }
  60% {
    transform: scaleY(1);
    filter: brightness(1.5);
  }
  100% {
    transform: scaleY(1);
    filter: brightness(1);
  }
}

@keyframes sweep {
  from {
    transform: translateY(-120%);
  }
  to {
    transform: translateY(420%);
  }
}

@keyframes flicker {
  0%,
  100% {
    opacity: 0.18;
  }
  50% {
    opacity: 0.42;
  }
}

@keyframes ledPulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.55;
  }
}

@keyframes powerHint {
  0%,
  100% {
    color: #6a706c;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.14),
      inset 0 -2px 3px rgba(0, 0, 0, 0.7),
      0 0 0 1px rgba(0, 0, 0, 0.55),
      0 2px 3px rgba(0, 0, 0, 0.45);
  }
  50% {
    color: #8d9a90;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.14),
      inset 0 -2px 3px rgba(0, 0, 0, 0.7),
      0 0 0 1px rgba(0, 0, 0, 0.55),
      0 0 8px rgba(77, 255, 149, 0.18);
  }
}

@media (prefers-reduced-motion: reduce) {
  .crt {
    animation: none;
  }
  .scanline,
  .crt::after,
  .led,
  .power:not(.on) {
    animation: none;
  }
}
</style>
