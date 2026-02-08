<template>
  <div class="welcome-screen">
    <div class="welcome-icon">
      <i class="fas fa-clipboard-list"></i>
    </div>
    <h1 class="welcome-title">Discord Forms</h1>
    <p class="welcome-subtitle">Создавай кастомные формы с отправкой в Discord</p>

    <div class="welcome-features">
      <div class="welcome-feature">
        <i class="fas fa-magic"></i>
        <span>Конструктор форм</span>
      </div>
      <div class="welcome-feature">
        <i class="fas fa-share-alt"></i>
        <span>Генерация ссылок</span>
      </div>
      <div class="welcome-feature">
        <i class="fab fa-discord"></i>
        <span>Интеграция с Discord</span>
      </div>
    </div>

    <button class="create-form-btn" @click="$emit('create')">
      <i class="fas fa-plus-circle"></i>
      Создать форму
    </button>

    <div class="welcome-info">
      <p>Создай свою форму обратной связи, анкету, опрос или любую другую форму</p>
      <p>Все данные отправляются прямо в твой Discord-канал через webhook</p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineEmits<{
  create: []
}>()
</script>
