<template>
  <div class="legends" :class="{ 'legends--tucked': isAtPageBottom }" aria-hidden="true">
    <figure
      v-for="legend in legends"
      :key="legend.image"
      class="legend"
      :class="`legend--${legend.side}`"
    >
      <figcaption class="legend__name">
        <span class="legend__first">{{ legend.firstName }}</span>
        <span class="legend__last">{{ legend.lastName }}</span>
      </figcaption>
      <img class="legend__image" :src="imageSrc(legend.image)" :alt="`${legend.firstName} ${legend.lastName}`" />
    </figure>
    <div class="legends__haze legends__haze--back"></div>
    <div class="legends__haze legends__haze--front"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

interface Legend {
  firstName: string
  lastName: string
  image: string
  side: 'left' | 'right'
}

const legends: Legend[] = [
  { firstName: 'DMITRIY', lastName: 'WHITER', image: 'dmitriy.webp', side: 'left' },
  { firstName: 'DANIEL', lastName: 'ZYUGO', image: 'daniel.webp', side: 'right' },
]

const PAGE_BOTTOM_THRESHOLD_PX = 40

const isAtPageBottom = ref(false)

function updatePageBottom(): void {
  const scrolledTo = window.scrollY + window.innerHeight
  isAtPageBottom.value = scrolledTo >= document.documentElement.scrollHeight - PAGE_BOTTOM_THRESHOLD_PX
}

const resizeObserver = new ResizeObserver(updatePageBottom)

onMounted(() => {
  updatePageBottom()
  window.addEventListener('scroll', updatePageBottom, { passive: true })
  window.addEventListener('resize', updatePageBottom)
  resizeObserver.observe(document.body)
})

onUnmounted(() => {
  window.removeEventListener('scroll', updatePageBottom)
  window.removeEventListener('resize', updatePageBottom)
  resizeObserver.disconnect()
})

function imageSrc(file: string): string {
  return `${import.meta.env.BASE_URL}images/legends/${file}`
}
</script>

<style scoped>
.legends {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}

.legend {
  position: absolute;
  bottom: 0;
  width: min(30vw, 520px);
  height: 92vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  margin: 0;
  opacity: 0.55;
  filter: grayscale(0.35) contrast(1.05);
  mask-image: linear-gradient(to bottom, #000 55%, transparent 98%);
}

.legend--left {
  left: max(1vw, calc(50% - 340px - min(30vw, 520px) - 1rem));
}

.legend--right {
  right: max(1vw, calc(50% - 340px - min(30vw, 520px) - 1rem));
}

.legend__name {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-family: 'Bebas Neue', 'Oswald', Impact, sans-serif;
  line-height: 0.85;
  text-align: center;
  margin-bottom: 1rem;
  color: #fff;
  text-shadow:
    0 0 18px rgba(var(--c-brand-rgb), 0.55),
    0 4px 24px rgba(0, 0, 0, 0.8);
}

.legend__first {
  font-size: clamp(1.25rem, 2vw, 2rem);
  letter-spacing: 0.5em;
  margin-right: -0.5em;
  color: rgba(var(--c-brand-rgb), 0.95);
}

.legend__last {
  font-size: clamp(3rem, 6vw, 6.5rem);
  letter-spacing: 0.06em;
  background: linear-gradient(180deg, #fff 30%, rgba(255, 255, 255, 0.35));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.legend__image {
  display: block;
  min-height: 0;
  max-width: 100%;
  flex: 1 1 auto;
  object-fit: contain;
  object-position: bottom;
}

.legends__haze {
  position: absolute;
  inset: -20%;
}

.legends__haze--back {
  background:
    radial-gradient(ellipse 45% 35% at 20% 75%, rgba(255, 255, 255, 0.07), transparent 70%),
    radial-gradient(ellipse 40% 30% at 80% 65%, rgba(255, 255, 255, 0.06), transparent 70%),
    radial-gradient(ellipse 60% 25% at 50% 100%, rgba(var(--c-brand-rgb), 0.12), transparent 70%);
  filter: blur(30px);
  animation: haze-drift 28s ease-in-out infinite alternate;
}

.legends__haze--front {
  background:
    linear-gradient(to top, var(--bg) 0%, transparent 35%),
    radial-gradient(ellipse 35% 20% at 30% 90%, rgba(200, 210, 230, 0.10), transparent 70%),
    radial-gradient(ellipse 35% 20% at 70% 85%, rgba(200, 210, 230, 0.08), transparent 70%);
  filter: blur(20px);
  animation: haze-drift 36s ease-in-out infinite alternate-reverse;
}

@keyframes haze-drift {
  from {
    transform: translate3d(-3%, 0, 0) scale(1);
  }
  to {
    transform: translate3d(3%, -2%, 0) scale(1.08);
  }
}

@media (prefers-reduced-motion: reduce) {
  .legends__haze {
    animation: none;
  }
}

@media (max-width: 1100px) {
  .legends {
    z-index: 2;
  }

  .legends__haze {
    display: none;
  }

  .legend {
    --tilt: 22deg;
    --peek-offset: 46%;
    width: clamp(150px, 38vw, 260px);
    height: auto;
    bottom: 0;
    opacity: 0.95;
    filter: drop-shadow(0 0 24px rgba(0, 0, 0, 0.7));
    mask-image: none;
    transform: translateY(var(--peek-offset)) rotate(var(--tilt));
    transition: transform 0.45s cubic-bezier(0.34, 1.3, 0.64, 1);
  }

  .legend--left {
    bottom: -2vh;
    left: -22vw;
    transform-origin: bottom left;
  }

  .legend--right {
    --tilt: -22deg;
    right: -21vw;
    transform-origin: bottom right;
  }

  .legends--tucked .legend {
    --peek-offset: 110%;
    transition-timing-function: cubic-bezier(0.55, 0, 0.75, 0.3);
  }

  .legend__name {
    position: absolute;
    top: 4%;
    z-index: 0;
    margin: 0;
    writing-mode: vertical-rl;
    transform: rotate(203deg);
    opacity: 0.85;
  }

  .legend--left .legend__name {
    left: 6%;
  }

  .legend--right .legend__name {
    right: 13%;
    transform: rotate(-16deg);
  }

  .legend__first {
    display: none;
  }

  .legend__last {
    font-size: clamp(2rem, 9.5vw, 3.5rem);
    letter-spacing: 0.04em;
  }

  .legend__image {
    position: relative;
    z-index: 1;
    flex: none;
    width: 100%;
    height: auto;
  }
}
</style>
