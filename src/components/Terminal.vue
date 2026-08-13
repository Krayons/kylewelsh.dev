<script setup lang="ts">
import { ref, nextTick, onMounted, onBeforeUnmount } from 'vue'
import {
  mountTerminal,
  probeTerminalBackend,
  attachPty,
  type TerminalDisplay,
  type PtyAttach,
} from '../terminal/remoteSession'
import { playIntro } from '../terminal/playIntro'
import { attachLocalShell } from '../terminal/localXtermShell'

const powerCycles = ref(0)
const screenEl = ref<HTMLElement | null>(null)
const xtermHostEl = ref<HTMLElement | null>(null)

let cancelled = false
let display: TerminalDisplay | null = null
let pty: PtyAttach | null = null
let localShell: { dispose: () => void } | null = null

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms))

const reduceMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const finePointer =
  typeof window !== 'undefined' &&
  window.matchMedia('(pointer: fine)').matches

function teardownSession() {
  localShell?.dispose()
  localShell = null
  pty?.dispose()
  pty = null
  display?.dispose()
  display = null
}

function onScreenClick() {
  const sel = window.getSelection()
  if (sel && !sel.isCollapsed) return
  if (!finePointer && !display) return
  display?.focus()
}

/**
 * Start container attach in the background while the intro plays.
 * PTY output is buffered until goLive() so the shell prompt continues
 * the same stream the intro wrote.
 */
function beginPreconnect(
  healthPromise?: ReturnType<typeof probeTerminalBackend>,
): { ready: Promise<boolean> } {
  if (!display) return { ready: Promise.resolve(false) }

  const ready = (async () => {
    const health = await (healthPromise ?? probeTerminalBackend())
    if (cancelled || !health.ok || !display) return false

    const attach = attachPty({
      display,
      onDisconnected: () => {
        if (cancelled || !display) return
        // Stay on the same xterm — drop into local line editor
        localShell?.dispose()
        localShell = attachLocalShell(display.term, {
          onReboot: () => {
            void reboot()
          },
        })
      },
    })
    pty = attach
    try {
      await attach.ready
      return !cancelled
    } catch {
      attach.dispose()
      if (pty === attach) pty = null
      return false
    }
  })()

  return { ready }
}

async function powerOn() {
  cancelled = false
  teardownSession()

  // Health check starts during CRT settle so the container is often ready
  // by the time the intro finishes — handoff is just goLive().
  const earlyHealth = probeTerminalBackend()

  await sleep(reduceMotion ? 0 : 900)
  if (cancelled) return

  await nextTick()
  const host = xtermHostEl.value
  if (!host) return

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

  const pre = beginPreconnect(earlyHealth)

  await playIntro({
    display,
    reduceMotion,
    isCancelled: () => cancelled,
  })
  if (cancelled) return

  const ok = await pre.ready
  if (cancelled) return

  if (ok && pty) {
    // Tiny beat so the last intro line settles, then PTY continues on-screen
    await sleep(reduceMotion ? 0 : 120)
    if (cancelled) return
    pty.goLive()
    if (finePointer) display.focus()
    return
  }

  // Offline path: same xterm, local commands — no layout swap
  localShell = attachLocalShell(display.term, {
    onReboot: () => {
      void reboot()
    },
  })
  if (finePointer) display.focus()
}

async function reboot() {
  cancelled = true
  teardownSession()
  powerCycles.value++
  await nextTick()
  cancelled = false
  await powerOn()
}

onMounted(powerOn)

onBeforeUnmount(() => {
  cancelled = true
  teardownSession()
})
</script>

<template>
  <div id="monitor">
    <div id="bezel">
      <div class="crt" :key="powerCycles" @click="onScreenClick">
        <div class="scanline" aria-hidden="true"></div>
        <div class="vignette" aria-hidden="true"></div>

        <div ref="screenEl" class="screen remote" role="log">
          <div
            ref="xtermHostEl"
            class="xterm-host"
            aria-label="terminal"
          ></div>
        </div>
      </div>

      <div class="badge" aria-hidden="true">
        <span class="led"></span>
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

@media (prefers-reduced-motion: reduce) {
  .crt {
    animation: none;
  }
  .scanline,
  .crt::after,
  .led {
    animation: none;
  }
}
</style>
