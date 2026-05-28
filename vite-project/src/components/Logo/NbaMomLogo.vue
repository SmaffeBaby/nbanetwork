<template>
  <span
    class="nba-mom-logo"
    :class="{ 'is-active': isTapActive }"
    role="img"
    :aria-label="alt"
    @pointerdown="showActiveOnTap"
  >
    <img
      class="nba-mom-logo__image nba-mom-logo__image--base"
      :src="baseLogoSrc"
      alt=""
      aria-hidden="true"
      draggable="false"
    />
    <img
      class="nba-mom-logo__image nba-mom-logo__image--active"
      :src="activeLogoSrc"
      alt=""
      aria-hidden="true"
      draggable="false"
    />
  </span>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'

const props = defineProps({
  alt: {
    type: String,
    default: 'NBA MOM Logo'
  },
  src: {
    type: String,
    default: '/logos/logo-nba-mom.svg'
  },
  activeSrc: {
    type: String,
    default: '/logos/logo-nba-mom-active.svg'
  }
})

const TAP_ACTIVE_DURATION = 1200
const LOGO_VERSION = '20260528-smooth-swap'

const isTapActive = ref(false)
let activeTimer: ReturnType<typeof window.setTimeout> | undefined

function versionedSrc(src: string) {
  const separator = src.includes('?') ? '&' : '?'
  return `${src}${separator}v=${LOGO_VERSION}`
}

const baseLogoSrc = computed(() => versionedSrc(props.src))
const activeLogoSrc = computed(() => versionedSrc(props.activeSrc))

function showActiveOnTap() {
  isTapActive.value = true

  if (activeTimer) {
    window.clearTimeout(activeTimer)
  }

  activeTimer = window.setTimeout(() => {
    isTapActive.value = false
  }, TAP_ACTIVE_DURATION)
}

onBeforeUnmount(() => {
  if (activeTimer) {
    window.clearTimeout(activeTimer)
  }
})
</script>

<style scoped>
.nba-mom-logo {
  aspect-ratio: 765 / 418;
  cursor: pointer;
  display: inline-block;
  flex: 0 0 auto;
  line-height: 0;
  max-width: 100%;
  overflow: visible;
  position: relative;
}

.nba-mom-logo__image {
  display: block;
  height: 100%;
  inset: 0;
  object-fit: contain;
  pointer-events: none;
  position: absolute;
  transition:
    opacity 520ms cubic-bezier(0.22, 1, 0.36, 1),
    filter 760ms cubic-bezier(0.16, 1, 0.3, 1);
  transform-origin: center;
  user-select: none;
  width: 100%;
  will-change: opacity, filter;
}

.nba-mom-logo__image--base {
  opacity: 1;
}

.nba-mom-logo__image--active {
  filter: saturate(0.92);
  opacity: 0;
}

.nba-mom-logo.is-active .nba-mom-logo__image--base {
  opacity: 0;
}

.nba-mom-logo.is-active .nba-mom-logo__image--active {
  filter: saturate(1);
  opacity: 1;
}

.nba-mom-logo.is-active .nba-mom-logo__image {
  animation: nba-mom-logo-blink 560ms ease-in-out 1;
}

@media (hover: hover) and (pointer: fine) {
  .nba-mom-logo:hover .nba-mom-logo__image--base {
    opacity: 0;
  }

  .nba-mom-logo:hover .nba-mom-logo__image--active {
    filter: saturate(1);
    opacity: 1;
  }

  .nba-mom-logo:hover .nba-mom-logo__image {
    animation: nba-mom-logo-blink 560ms ease-in-out 1;
  }
}

@keyframes nba-mom-logo-blink {
  0%,
  100% {
    transform: scaleY(1);
  }

  42% {
    transform: scaleY(0.08);
  }

  58% {
    transform: scaleY(1);
  }
}
</style>
