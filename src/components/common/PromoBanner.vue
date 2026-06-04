<template>
  <div class="promo-wrap" :class="{ collapsed }">
    <a
      class="promo"
      href="https://summer5rp.springplace.ru"
      target="_blank"
      rel="noopener"
      aria-label="Калькулятор летнего пропуска GTA 5 RP"
    >
      <span class="promo-head">
        <img class="promo-logo" :src="logo" width="52" height="52" alt="Калькулятор летнего пропуска" />
        <span class="promo-headtext">
          <span class="promo-tag">Наш проект · summer5rp</span>
          <span class="promo-title">Успеешь закрыть летний пропуск?</span>
        </span>
      </span>
      <span class="promo-sub">Калькулятор летнего сезонного пропуска GTA 5 RP — посчитай EXP, кейсы и дни x2 за пару секунд.</span>
      <span class="promo-cta">Открыть калькулятор →</span>
    </a>

    <button type="button" class="promo-close" aria-label="Свернуть" @click="collapse">×</button>

    <button
      ref="ball"
      type="button"
      class="promo-ball"
      :class="{ shake }"
      aria-label="Открыть калькулятор летнего пропуска"
      @click="expand"
    >
      <img :src="logo" width="38" height="38" alt="summer5rp" />
    </button>

    <button type="button" class="promo-bait" @click="expand">
      Безумно можно быть первым <span class="wolf">🐺<span class="auf">ауф</span></span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const KEY = 'summer5rpPromoSeen'
const logo = `${import.meta.env.BASE_URL}images/summer-pass.png`

const collapsed = ref(true)
const shake = ref(false)

function expand(): void {
  collapsed.value = false
}
function collapse(): void {
  collapsed.value = true
}

onMounted(() => {
  let seen = false
  try {
    seen = !!localStorage.getItem(KEY)
  } catch {
    /* private mode */
  }

  // Wiggle + waves on every load; auto-unfold only on the first visit.
  window.setTimeout(() => {
    shake.value = true
  }, 900)
  window.setTimeout(() => {
    shake.value = false
    if (!seen) collapsed.value = false
  }, 2700)

  if (!seen) {
    try {
      localStorage.setItem(KEY, '1')
    } catch {
      /* ignore */
    }
  }
})
</script>

<style scoped>
.promo-wrap {
  position: fixed;
  left: 1.25rem;
  bottom: 1.25rem;
  z-index: 50;
  width: 300px;
}
.promo-wrap.collapsed {
  width: auto;
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.promo-wrap.collapsed .promo,
.promo-wrap.collapsed .promo-close {
  display: none;
}
.promo-wrap:not(.collapsed) .promo-ball,
.promo-wrap:not(.collapsed) .promo-bait {
  display: none;
}

/* expanded card — DiscordForms dark glass + orange accent */
.promo {
  display: block;
  position: relative;
  overflow: hidden;
  padding: 1rem 1rem 0.9rem;
  text-decoration: none;
  border-radius: var(--radius);
  background: linear-gradient(180deg, var(--orange-mid), var(--orange-dim));
  border: 1px solid rgba(var(--c-brand-rgb), 0.45);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: var(--shadow-lg), 0 0 22px rgba(var(--c-brand-rgb), 0.18);
  transition: var(--transition-normal);
  animation: promo-pop 0.3s ease;
}
.promo:hover {
  transform: translateY(-2px);
  border-color: rgba(var(--c-brand-rgb), 0.7);
  box-shadow: var(--shadow-xl), 0 0 30px rgba(var(--c-brand-rgb), 0.32);
}
@keyframes promo-pop {
  from { opacity: 0; transform: translateY(12px) scale(0.92); }
  to { opacity: 1; transform: none; }
}
.promo-head {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.7rem;
}
.promo-logo {
  width: 52px;
  height: 52px;
  flex: none;
  border-radius: 12px;
  filter: drop-shadow(0 0 10px rgba(var(--c-brand-rgb), 0.45));
}
.promo-headtext {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}
.promo-tag {
  font-size: 0.6rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--orange-bright);
  font-weight: 600;
}
.promo-title {
  font-size: 1.02rem;
  font-weight: 700;
  color: var(--text);
  line-height: 1.2;
}
.promo-sub {
  display: block;
  font-size: 0.76rem;
  color: var(--text-2);
  line-height: 1.5;
  margin-bottom: 0.85rem;
}
.promo-cta {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.65rem 1rem;
  border-radius: var(--radius-sm);
  border: 1px solid rgba(var(--c-brand-rgb), 0.5);
  background: rgba(var(--c-brand-rgb), 0.14);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--orange-bright);
  transition: var(--transition-fast);
}
.promo:hover .promo-cta {
  background: rgba(var(--c-brand-rgb), 0.24);
  border-color: rgba(var(--c-brand-rgb), 0.8);
  color: #fff;
}

.promo-close {
  position: absolute;
  top: 0.4rem;
  right: 0.4rem;
  z-index: 2;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1px solid var(--border-3);
  background: rgba(0, 0, 0, 0.4);
  color: var(--text-2);
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  transition: var(--transition-fast);
}
.promo-close:hover {
  color: var(--text);
  background: rgba(0, 0, 0, 0.65);
}

/* collapsed ball */
.promo-ball {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  padding: 0;
  border-radius: 50%;
  cursor: pointer;
  border: 1px solid rgba(var(--c-brand-rgb), 0.55);
  background: rgba(36, 36, 38, 0.7);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: 0 0 22px rgba(var(--c-brand-rgb), 0.28), var(--shadow-md);
  transition: var(--transition-fast);
}
.promo-ball img {
  width: 38px;
  height: 38px;
  border-radius: 9px;
  filter: drop-shadow(0 0 8px rgba(var(--c-brand-rgb), 0.5));
}
.promo-ball:hover {
  transform: scale(1.08);
  box-shadow: 0 0 32px rgba(var(--c-brand-rgb), 0.5), var(--shadow-md);
}
.promo-ball.shake {
  animation: promo-shake 0.8s ease-in-out 2;
}
.promo-ball::before,
.promo-ball::after {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 50%;
  border: 1.5px solid rgba(var(--c-brand-rgb), 0.65);
  opacity: 0;
  pointer-events: none;
}
.promo-ball.shake::before { animation: promo-wave 0.9s ease-out 2; }
.promo-ball.shake::after { animation: promo-wave 0.9s ease-out 2 0.45s; }
@keyframes promo-shake {
  0%, 100% { transform: rotate(0); }
  15% { transform: rotate(-12deg); }
  30% { transform: rotate(10deg); }
  45% { transform: rotate(-8deg); }
  60% { transform: rotate(6deg); }
  75% { transform: rotate(-3deg); }
}
@keyframes promo-wave {
  0% { transform: scale(1); opacity: 0.75; }
  100% { transform: scale(2.2); opacity: 0; }
}

/* bait bubble */
.promo-bait {
  display: inline-flex;
  align-items: center;
  padding: 0.55rem 0.8rem;
  border-radius: var(--radius-sm);
  border: 1px solid rgba(var(--c-brand-rgb), 0.4);
  background: rgba(36, 36, 38, 0.7);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: var(--orange-bright);
  font-family: inherit;
  font-size: 0.76rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: var(--shadow-md), 0 0 16px rgba(var(--c-brand-rgb), 0.15);
  animation: bait-bob 2.6s ease-in-out infinite;
  transition: var(--transition-fast);
}
.promo-bait:hover {
  color: #fff;
  border-color: rgba(var(--c-brand-rgb), 0.7);
}
@keyframes bait-bob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}
.promo-bait .wolf {
  position: relative;
  display: inline-block;
  margin-left: 4px;
  transition: transform 0.2s;
}
.promo-bait:hover .wolf {
  transform: rotate(-16deg) scale(1.3);
}
.promo-bait .auf {
  position: absolute;
  left: 50%;
  bottom: 100%;
  transform: translateX(-50%);
  opacity: 0;
  pointer-events: none;
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--orange-bright);
  text-shadow: 0 0 10px rgba(var(--c-brand-rgb), 0.9);
}
.promo-bait:hover .auf {
  animation: auf-float 1s ease-out infinite;
}
@keyframes auf-float {
  0% { opacity: 0; transform: translate(-50%, 4px) scale(0.7) rotate(0); }
  25% { opacity: 1; }
  100% { opacity: 0; transform: translate(-50%, -16px) scale(1.2) rotate(10deg); }
}

@media (max-width: 600px) {
  .promo-wrap { left: 0.75rem; right: 0.75rem; bottom: 0.75rem; width: auto; }
  .promo-wrap.collapsed { justify-content: flex-start; }
}
</style>
