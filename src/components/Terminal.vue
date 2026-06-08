<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import TypeIt from 'typeit'

type Boot = { label: string; status: string }

const BOOT: Boot[] = [
  { label: 'power-on self test', status: 'ok' },
  { label: 'mount /home/kyle', status: 'ok' },
  { label: 'init curiosity subsystem', status: 'ok' },
  { label: 'calibrate phosphor @ 60hz', status: 'ok' },
  { label: 'load personality.cfg', status: 'ok' },
]

const INTRO =
  "Kyle. I build things that mostly work. Nothing to see here yet — but you " +
  'already knew that, or you wouldn\'t be looking.'

const LINKS = [
  { key: 'twitter', handle: '@kylewelshlive', url: 'https://x.com/kylewelshlive' },
  { key: 'linkedin', handle: 'kyle-ian-bransby-welsh', url: 'https://www.linkedin.com/in/kyle-ian-bransby-welsh/' },
  { key: 'instagram', handle: '@kylewelshlive', url: 'https://www.instagram.com/kylewelshlive/' },
]

const bootShown = ref(0)
const visibleBoot = computed(() => BOOT.slice(0, bootShown.value))
const showWhoami = ref(false)
const introStarted = ref(false)
const introDone = ref(false)
const showLinks = ref(false)
const introEl = ref<HTMLElement | null>(null)

let cancelled = false
let typeit: InstanceType<typeof TypeIt> | null = null

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms))

const reduceMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

function typeIntro() {
  return new Promise<void>((resolve) => {
    if (!introEl.value) return resolve()
    if (reduceMotion) {
      introEl.value.textContent = INTRO
      return resolve()
    }
    typeit = new TypeIt(introEl.value, {
      speed: 28,
      lifeLike: true,
      cursor: false,
      afterComplete: () => resolve(),
    })
      .type(INTRO)
      .go()
  })
}

onMounted(async () => {
  // power-on settle before anything prints
  await sleep(reduceMotion ? 0 : 950)

  for (let i = 0; i < BOOT.length; i++) {
    if (cancelled) return
    bootShown.value = i + 1
    await sleep(reduceMotion ? 0 : 150)
  }

  await sleep(reduceMotion ? 0 : 350)
  if (cancelled) return
  showWhoami.value = true

  await sleep(reduceMotion ? 0 : 550)
  if (cancelled) return
  introStarted.value = true

  await sleep(reduceMotion ? 0 : 250)
  await typeIntro()
  if (cancelled) return
  introDone.value = true

  await sleep(reduceMotion ? 0 : 300)
  if (cancelled) return
  showLinks.value = true
})

onBeforeUnmount(() => {
  cancelled = true
  typeit?.destroy?.()
})
</script>

<template>
  <div id="monitor">
    <div id="bezel">
      <div class="crt">
        <div class="scanline" aria-hidden="true"></div>
        <div class="vignette" aria-hidden="true"></div>

        <div class="screen" role="document">
          <p class="head">kylewelsh.dev — tty1 · phosphor display</p>
          <p class="rule" aria-hidden="true">────────────────────────────────────</p>

          <!-- boot sequence -->
          <ul class="boot" aria-label="boot sequence">
            <li
              v-for="b in visibleBoot"
              :key="b.label"
              class="ln boot-line"
            >
              <span class="bullet">·</span>
              <span class="boot-label">{{ b.label }}</span>
              <span class="leader" aria-hidden="true"></span>
              <span class="status">[ {{ b.status }} ]</span>
            </li>
          </ul>

          <!-- whoami -->
          <template v-if="showWhoami">
            <p class="ln prompt-line">
              <span class="prompt">kyle@crt:~$</span> whoami
            </p>
            <div class="ln whoami">
              <h1 class="name">kyle welsh</h1>
              <p class="tagline">
                software engineer — the bits don't do what i want them to do.
              </p>
            </div>
          </template>

          <!-- intro.txt -->
          <template v-if="introStarted">
            <p class="ln prompt-line">
              <span class="prompt">kyle@crt:~$</span> cat intro.txt
            </p>
            <p class="ln intro"><span ref="introEl"></span></p>
          </template>

          <!-- links -->
          <template v-if="showLinks">
            <p class="ln prompt-line">
              <span class="prompt">kyle@crt:~$</span> links --social
            </p>
            <ul class="ln links" aria-label="social links">
              <li v-for="l in LINKS" :key="l.key">
                <span class="arrow" aria-hidden="true">→</span>
                <span class="link-key">{{ l.key }}</span>
                <a :href="l.url" target="_blank" rel="noopener noreferrer">{{ l.handle }}</a>
              </li>
            </ul>
          </template>

          <!-- live prompt -->
          <p v-if="introDone" class="ln prompt-line final">
            <span class="prompt">kyle@crt:~$</span>
            <span class="caret" aria-hidden="true">█</span>
          </p>
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
  width: 100%;
  perspective: 1400px;
}

#bezel {
  position: relative;
  background: linear-gradient(165deg, #2a2d2c 0%, #1b1d1c 55%, #121413 100%);
  border-radius: 22px;
  padding: 20px 20px 34px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.07),
    inset 0 0 0 1px rgba(0, 0, 0, 0.6),
    0 2px 0 rgba(0, 0, 0, 0.5),
    0 40px 80px -30px rgba(0, 0, 0, 0.9),
    0 0 90px -20px rgba(77, 255, 149, 0.18);
}

.crt {
  position: relative;
  overflow: hidden;
  border-radius: 14px;
  background:
    radial-gradient(120% 130% at 50% 0%, #0a2417 0%, var(--color-screen) 60%, #020a06 100%);
  box-shadow:
    inset 0 0 60px rgba(0, 0, 0, 0.9),
    inset 0 0 6px rgba(77, 255, 149, 0.15);
  color: var(--color-phosphor);
  text-shadow: var(--glow);
  animation: turnOn 1s ease-out 1 both;
}

/* the readable terminal content */
.screen {
  position: relative;
  z-index: 1;
  /* size to content so the full session is always visible; the page
     scrolls (centered) only when the viewport is shorter than the screen */
  min-height: clamp(360px, 52vh, 560px);
  padding: clamp(18px, 4vw, 40px);
  font-size: clamp(13px, 1.05vw + 9px, 17px);
  line-height: 1.65;
  letter-spacing: 0.02em;
}

.head {
  margin: 0;
  color: var(--color-phosphor-dim);
  font-size: 0.82em;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.rule {
  margin: 0.1em 0 1.2em;
  color: var(--color-phosphor-dim);
  overflow: hidden;
  white-space: nowrap;
  opacity: 0.6;
}

/* generic line reveal */
.ln {
  animation: lnIn 0.32s ease-out both;
}

.boot {
  list-style: none;
  margin: 0 0 1.4em;
  padding: 0;
}

.boot-line {
  display: flex;
  align-items: baseline;
  gap: 0.5ch;
  color: var(--color-phosphor-dim);
}

.bullet {
  color: var(--color-phosphor);
}

.leader {
  flex: 1;
  margin: 0 0.4ch;
  transform: translateY(-0.28em);
  border-bottom: 1px dotted currentColor;
  opacity: 0.5;
}

.status {
  color: var(--color-phosphor-bright);
  text-shadow: var(--glow);
}

.prompt-line {
  margin: 1.3em 0 0.2em;
}

.prompt {
  color: var(--color-phosphor-bright);
  font-weight: 600;
  margin-right: 0.8ch;
}

.whoami {
  margin: 0.4em 0 0.2em;
}

.name {
  margin: 0.15em 0 0.05em;
  font-size: clamp(2.1rem, 7vw, 3.6rem);
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.01em;
  color: var(--color-phosphor-bright);
  text-shadow:
    0 0 2px rgba(182, 255, 210, 0.9),
    0 0 14px rgba(77, 255, 149, 0.6),
    0 0 40px rgba(77, 255, 149, 0.35);
}

.tagline {
  margin: 0;
  color: var(--color-phosphor);
  opacity: 0.9;
}

.intro {
  margin: 0.4em 0 0.2em;
  max-width: 62ch;
}

.links {
  list-style: none;
  margin: 0.5em 0 0;
  padding: 0;
}

.links li {
  display: grid;
  grid-template-columns: 2ch 11ch 1fr;
  align-items: baseline;
  gap: 0.5ch;
  padding: 0.12em 0;
}

.arrow {
  color: var(--color-phosphor-dim);
}

.link-key {
  color: var(--color-phosphor-dim);
}

.links a {
  color: var(--color-phosphor);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: color 0.18s ease, border-color 0.18s ease, text-shadow 0.18s ease;
  width: fit-content;
}

.links a:hover,
.links a:focus-visible {
  color: var(--color-phosphor-bright);
  border-bottom-color: var(--color-phosphor-bright);
  text-shadow: var(--glow);
  outline: none;
}

.final {
  margin-top: 1.3em;
}

.caret {
  display: inline-block;
  margin-left: 0.4ch;
  color: var(--color-phosphor-bright);
  animation: blink 1.06s steps(1) infinite;
}

/* moving scan band */
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

/* static scanlines + rgb shadow-mask + soft flicker */
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

/* inner screen vignette + glass highlight */
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

/* power LED + model badge on the bezel */
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

@keyframes lnIn {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
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

@keyframes blink {
  0%,
  50% {
    opacity: 1;
  }
  50.01%,
  100% {
    opacity: 0;
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
  .ln {
    animation: none;
  }
  .caret {
    animation: blink 1.06s steps(1) infinite;
  }
}
</style>
