<script setup lang="ts">
import { formatBytes, type AssetProgress } from '../terminal/v86Assets'

defineProps<{
  files: AssetProgress[]
  loaded: number
  total: number
  phase: 'download' | 'boot' | 'fail'
  detail?: string
}>()

function pct(file: AssetProgress): number {
  if (file.status === 'done' || file.status === 'cached') return 100
  if (file.total <= 0) return file.status === 'loading' ? 8 : 0
  return Math.min(100, Math.round((file.loaded / file.total) * 100))
}

function mark(file: AssetProgress): string {
  if (file.status === 'cached') return 'cached'
  if (file.status === 'done') return 'ok'
  if (file.status === 'error') return 'fail'
  if (file.status === 'loading') return `${pct(file)}%`
  return 'wait'
}
</script>

<template>
  <div class="load" role="status" aria-live="polite">
    <p class="brand">PHOSPHOR TC-88</p>
    <p class="sub">i386 firmware load</p>
    <p class="rule">────────────────────────────────</p>

    <ul class="files">
      <li v-for="f in files" :key="f.id" :class="f.status">
        <span class="name">{{ f.label }}</span>
        <span class="bar" aria-hidden="true">
          <span class="fill" :style="{ width: `${pct(f)}%` }"></span>
        </span>
        <span class="size">{{ formatBytes(f.total || f.loaded) }}</span>
        <span class="mark">{{ mark(f) }}</span>
      </li>
    </ul>

    <p class="sum">
      <template v-if="phase === 'fail'">
        {{ detail || 'load failed' }}
      </template>
      <template v-else-if="phase === 'boot'">starting virtual machine …</template>
      <template v-else>
        {{ formatBytes(loaded) }}
        <template v-if="total"> / {{ formatBytes(total) }}</template>
      </template>
    </p>
  </div>
</template>

<style scoped>
.load {
  position: absolute;
  inset: 0;
  z-index: 2;
  padding: clamp(14px, 3vw, 28px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: clamp(12px, 2.1vw, 14px);
  line-height: 1.55;
  color: var(--color-phosphor);
  text-shadow: var(--glow);
  user-select: none;
  background: var(--color-screen);
}

.brand {
  margin: 0;
  font-weight: 600;
  letter-spacing: 0.22em;
  color: var(--color-phosphor-bright);
}

.sub,
.rule,
.sum {
  margin: 0;
  color: var(--color-phosphor-dim);
  text-shadow: none;
}

.sub {
  margin-top: 2px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-size: 0.78em;
}

.rule {
  margin: 10px 0 16px;
  letter-spacing: 0.04em;
}

.files {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}

.files li {
  display: grid;
  grid-template-columns: 11ch minmax(48px, 1fr) 8ch 6ch;
  gap: 10px;
  align-items: center;
}

.name {
  color: var(--color-phosphor-dim);
}

.bar {
  display: block;
  height: 6px;
  border-radius: 999px;
  background: rgba(47, 157, 99, 0.22);
  overflow: hidden;
  box-shadow: inset 0 0 0 1px rgba(77, 255, 149, 0.12);
}

.fill {
  display: block;
  height: 100%;
  width: 0;
  border-radius: inherit;
  background: var(--color-phosphor);
  box-shadow: 0 0 8px rgba(77, 255, 149, 0.55);
  transition: width 0.16s linear;
}

.size,
.mark {
  font-size: 0.86em;
  text-align: right;
  color: var(--color-phosphor-dim);
  text-shadow: none;
}

.cached .mark,
.done .mark {
  color: var(--color-phosphor-bright);
}

.loading .name {
  color: var(--color-phosphor);
}

.error .name,
.error .mark {
  color: #ffb19a;
}

.error .fill {
  background: #ffb19a;
  box-shadow: none;
}

.sum {
  margin-top: 18px;
  letter-spacing: 0.06em;
}

@media (max-width: 520px) {
  .files li {
    grid-template-columns: 11ch minmax(32px, 1fr) 5.5ch;
  }
  .size {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .fill {
    transition: none;
  }
}
</style>
