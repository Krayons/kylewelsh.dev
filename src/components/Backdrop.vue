<script setup lang="ts">
// the dark room behind the monitor: a retro-vector Cape Town nightscape.
// stars: [x%, y%, size px, twinkle delay s, base opacity]
const STARS: Array<[number, number, number, number, number]> = [
  [3, 18, 1, 0, 0.5], [7, 42, 1.4, 2.1, 0.7], [11, 9, 1, 4.3, 0.45],
  [16, 30, 1, 1.2, 0.6], [21, 14, 1.6, 3.4, 0.75], [24, 52, 1, 5.6, 0.4],
  [29, 24, 1, 2.8, 0.55], [33, 8, 1.4, 0.9, 0.7], [37, 38, 1, 4.9, 0.5],
  [42, 17, 1, 1.7, 0.6], [46, 46, 1.4, 3.1, 0.65], [51, 11, 1, 5.2, 0.45],
  [55, 29, 1.6, 0.4, 0.8], [59, 49, 1, 2.4, 0.5], [63, 20, 1, 4.6, 0.6],
  [67, 36, 1.4, 1.4, 0.7], [71, 7, 1, 3.7, 0.5], [75, 27, 1, 5.9, 0.55],
  [79, 44, 1.4, 2.2, 0.65], [83, 15, 1, 4.1, 0.5], [88, 33, 1, 0.7, 0.6],
  [92, 10, 1.4, 3.3, 0.7], [95, 48, 1, 1.9, 0.45], [13, 60, 1, 2.6, 0.4],
  [44, 58, 1, 5.1, 0.42], [68, 56, 1.2, 3.9, 0.5], [90, 60, 1, 1.1, 0.4],
  [26, 68, 1, 4.4, 0.35], [58, 66, 1, 0.2, 0.38], [6, 74, 1, 2.9, 0.3],
  [36, 76, 1, 5.4, 0.32], [80, 72, 1, 1.6, 0.35],
]

function starStyle(s: [number, number, number, number, number]) {
  return {
    left: `${s[0]}%`,
    top: `${s[1]}%`,
    width: `${s[2]}px`,
    height: `${s[2]}px`,
    '--d': `${s[3]}s`,
    '--o': `${s[4]}`,
  } as Record<string, string>
}

// table mountain ridge, postcard view from table bay:
// devil's peak (left) — the table — lion's head — signal hill (right)
const RIDGE =
  'M0 302 ' +
  'C 80 292 150 268 205 218 C 250 178 280 120 302 98 ' +
  'C 318 116 352 158 384 172 C 408 182 430 170 452 150 ' +
  'C 478 126 506 106 538 102 L 596 99 L 668 103 L 758 100 L 826 102 L 854 106 ' +
  'C 876 122 900 152 918 170 C 938 190 962 206 992 212 ' +
  'C 1018 217 1040 206 1058 184 C 1078 158 1094 136 1106 126 ' +
  'C 1120 140 1140 178 1158 210 C 1172 236 1196 248 1228 244 ' +
  'C 1270 238 1310 246 1352 264 C 1390 280 1420 292 1440 296'

const MASS = `M0 320 L0 302 ${RIDGE.slice('M0 302 '.length)} L1440 320 Z`

// city bowl lights at the mountain's foot: [x, y, r, twinkle delay s]
const LAMPS: Array<[number, number, number, number]> = [
  [120, 306, 1.2, 0.4], [205, 302, 1, 2.8], [292, 304, 1.4, 1.3],
  [368, 300, 1, 4.6], [448, 305, 1.2, 0.9], [524, 301, 1, 3.5],
  [610, 304, 1.4, 5.2], [688, 300, 1, 1.9], [772, 305, 1.2, 4.1],
  [852, 302, 1, 0.2], [938, 304, 1.4, 2.4], [1024, 300, 1, 5.7],
  [1112, 305, 1.2, 3.1], [1196, 302, 1, 1.6], [1296, 306, 1.2, 4.8],
]
</script>

<template>
  <div class="backdrop" aria-hidden="true">
    <!-- southern sky -->
    <div class="sky">
      <span
        v-for="(s, i) in STARS"
        :key="i"
        class="star"
        :style="starStyle(s)"
      ></span>

      <!-- crux + the pointers (alpha & beta centauri) -->
      <svg class="crux" viewBox="0 0 200 170">
        <circle cx="18" cy="150" r="3" class="cstar bright" style="--d: 1.3s" />
        <circle cx="52" cy="126" r="2.4" class="cstar" style="--d: 3.8s" />
        <g class="lines">
          <line x1="128" y1="22" x2="118" y2="118" />
          <line x1="86" y1="84" x2="156" y2="62" />
        </g>
        <circle cx="128" cy="22" r="2.4" class="cstar" style="--d: 0.6s" />
        <circle cx="118" cy="118" r="3" class="cstar bright" style="--d: 2.9s" />
        <circle cx="86" cy="84" r="2.6" class="cstar" style="--d: 4.4s" />
        <circle cx="156" cy="62" r="1.9" class="cstar" style="--d: 1.8s" />
        <circle cx="118" cy="92" r="1.2" class="cstar dim" style="--d: 3.2s" />
      </svg>

      <div class="meteor"></div>
    </div>

    <!-- table mountain on the horizon -->
    <div class="range">
      <svg class="skyline" viewBox="0 0 1440 320" preserveAspectRatio="xMidYMax slice">
        <defs>
          <linearGradient id="mtn" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#07190f" />
            <stop offset="1" stop-color="#020a06" />
          </linearGradient>
          <linearGradient id="cityglow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="rgba(255, 180, 94, 0)" />
            <stop offset="1" stop-color="rgba(255, 180, 94, 0.07)" />
          </linearGradient>
        </defs>

        <path class="mass" :d="MASS" fill="url(#mtn)" />
        <path class="ridge" :d="RIDGE" />
        <ellipse class="tablecloth" cx="690" cy="94" rx="230" ry="20" />

        <rect x="0" y="276" width="1440" height="44" fill="url(#cityglow)" />
        <g class="lamps">
          <circle
            v-for="(l, i) in LAMPS"
            :key="i"
            class="lamp"
            :cx="l[0]"
            :cy="l[1]"
            :r="l[2]"
            :style="{ '--d': l[3] + 's' }"
          />
        </g>
      </svg>
      <div class="horizon"></div>
    </div>

    <!-- vector grid floor -->
    <div class="floor">
      <div class="grid"></div>
    </div>
  </div>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

/* ---------- sky ---------- */
.sky {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 66%;
}

.star {
  position: absolute;
  border-radius: 50%;
  background: #bfffd9;
  opacity: var(--o, 0.5);
  box-shadow: 0 0 6px rgba(140, 255, 190, 0.8);
  animation: twinkle 5.2s ease-in-out infinite;
  animation-delay: var(--d, 0s);
}

.crux {
  position: absolute;
  top: 7%;
  right: 5%;
  width: clamp(90px, 12vw, 160px);
  overflow: visible;
}

.cstar {
  fill: #cfffe2;
  opacity: 0.75;
  filter: drop-shadow(0 0 4px rgba(140, 255, 190, 0.9));
  animation: twinkle 5.2s ease-in-out infinite;
  animation-delay: var(--d, 0s);
  --o: 0.75;
}

.cstar.bright {
  opacity: 0.95;
  --o: 0.95;
}

.cstar.dim {
  opacity: 0.45;
  --o: 0.45;
}

.lines line {
  stroke: rgba(140, 255, 190, 0.1);
  stroke-width: 1;
}

.meteor {
  position: absolute;
  top: 10%;
  left: -10%;
  width: 130px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(182, 255, 210, 0.75));
  opacity: 0;
  transform: rotate(14deg);
  animation: meteor 13s linear infinite;
  animation-delay: 5s;
}

/* ---------- mountain ---------- */
.range {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 24%;
  height: clamp(140px, 32vh, 320px);
}

.skyline {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.ridge {
  fill: none;
  stroke: rgba(77, 255, 149, 0.32);
  stroke-width: 1.5;
  filter: drop-shadow(0 0 7px rgba(77, 255, 149, 0.35));
}

/* the famous cloud spilling over the table */
.tablecloth {
  fill: rgba(190, 255, 220, 0.07);
  filter: blur(14px);
  animation: drift 26s ease-in-out infinite alternate;
}

.lamp {
  fill: #ffb45e;
  opacity: 0.32;
  --o: 0.32;
  filter: drop-shadow(0 0 3px rgba(255, 180, 94, 0.7));
  animation: twinkle 4.4s ease-in-out infinite;
  animation-delay: var(--d, 0s);
}

.horizon {
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 2px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(77, 255, 149, 0.28) 18%,
    rgba(77, 255, 149, 0.45) 50%,
    rgba(77, 255, 149, 0.28) 82%,
    transparent
  );
  box-shadow: 0 0 14px rgba(77, 255, 149, 0.3);
}

/* ---------- grid floor ---------- */
.floor {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 24%;
  perspective: 340px;
  overflow: hidden;
  mask-image: linear-gradient(to bottom, transparent, black 26%);
  -webkit-mask-image: linear-gradient(to bottom, transparent, black 26%);
}

.grid {
  position: absolute;
  left: -60%;
  right: -60%;
  top: 0;
  bottom: -80%;
  transform-origin: top center;
  transform: rotateX(61deg);
  background-image:
    linear-gradient(rgba(77, 255, 149, 0.17) 1px, transparent 1px),
    linear-gradient(90deg, rgba(77, 255, 149, 0.12) 1px, transparent 1px);
  background-size: 56px 56px;
  animation: gridScroll 3.6s linear infinite;
}

@keyframes twinkle {
  0%,
  100% {
    opacity: var(--o, 0.5);
  }
  50% {
    opacity: calc(var(--o, 0.5) * 0.3);
  }
}

@keyframes drift {
  from {
    transform: translateX(-26px);
  }
  to {
    transform: translateX(30px);
  }
}

@keyframes meteor {
  0% {
    transform: translate(0, 0) rotate(14deg);
    opacity: 0;
  }
  1% {
    opacity: 0.8;
  }
  6% {
    transform: translate(72vw, 18vh) rotate(14deg);
    opacity: 0;
  }
  100% {
    transform: translate(72vw, 18vh) rotate(14deg);
    opacity: 0;
  }
}

@keyframes gridScroll {
  from {
    background-position-y: 0, 0;
  }
  to {
    background-position-y: 56px, 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .star,
  .cstar,
  .lamp,
  .tablecloth,
  .grid {
    animation: none;
  }
  .meteor {
    display: none;
  }
}
</style>
