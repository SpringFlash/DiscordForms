// === ФУНКЦИИ РАБОТЫ С КОНФИГУРАЦИЕЙ ===

// Функция для создания пустого конфига
function createEmptyConfig() {
  return {
    title: 'Моя форма',
    description: 'Описание формы',
    customMessage: '',
    webhookUrl: '',
    webhookUsername: 'Форма обратной связи',
    webhookAvatarUrl: 'https://pngimg.com/uploads/discord/discord_PNG3.png',
    organization: 'LSPD',
    conditionalMessages: [],
    showAdvancedSettings: false,
    fields: [
      {
        id: generateId(),
        type: 'text',
        label: 'Имя',
        placeholder: '',
        required: true,
        icon: 'user',
      },
      {
        id: generateId(),
        type: 'email',
        label: 'Email',
        placeholder: '',
        required: true,
        icon: 'envelope',
      },
      {
        id: generateId(),
        type: 'textarea',
        label: 'Сообщение',
        placeholder: '',
        required: true,
        icon: 'comment',
      },
    ],
  };
}

// Функция для обновления конфига из редактора
function updateConfigFromEditor() {
  currentConfig.title = formTitleInput.value || 'Форма обратной связи';
  currentConfig.description = formDescriptionInput.value || 'Заполните форму';
  currentConfig.customMessage = customMessageInput.value || '';
  currentConfig.webhookUrl = webhookUrlInput.value;
  currentConfig.webhookUsername = webhookUsernameInput.value || currentConfig.title;
  currentConfig.webhookAvatarUrl =
    webhookAvatarUrlInput.value || 'https://pngimg.com/uploads/discord/discord_PNG3.png';
  currentConfig.sendAsPlainText = sendAsPlainTextCheckbox ? sendAsPlainTextCheckbox.checked : false;

  pageTitle.textContent = currentConfig.title;
  document.querySelector('h1').textContent = currentConfig.title;
  document.querySelector('.header p').textContent = currentConfig.description;

  updateUrl(currentConfig);
}

// Функция для генерации ссылки на форму
function generateShareUrl() {
  const shareConfig = { ...currentConfig };
  const baseUrl = window.location.origin + window.location.pathname;
  return `${baseUrl}?config=${encodeConfig(shareConfig)}`;
}

// Функция для получения состояния TinyURL (включая captcha_token)
async function getTinyUrlState() {
  try {
    const response = await fetch('https://tinyurl.com/app/api/state', {
      method: 'GET',
      headers: {
        Accept: '*/*',
        'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3',
        'X-Requested-With': 'XMLHttpRequest',
        Priority: 'u=1, i',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
        Referer: 'https://tinyurl.com/',
        'Sec-GPC': '1',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Ошибка получения состояния TinyURL:', error);
    throw error;
  }
}

// Функция для генерации captcha_token через Cloudflare Turnstile
async function generateCaptchaToken(siteKey) {
  return new Promise((resolve, reject) => {
    // Проверяем, загружен ли Turnstile
    if (typeof window.turnstile === 'undefined') {
      // Загружаем скрипт Turnstile
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      script.defer = true;

      script.onload = () => {
        // После загрузки скрипта рендерим виджет
        renderTurnstile(siteKey, resolve, reject);
      };

      script.onerror = () => {
        reject(new Error('Не удалось загрузить Turnstile'));
      };

      document.head.appendChild(script);
    } else {
      // Если уже загружен, сразу рендерим
      renderTurnstile(siteKey, resolve, reject);
    }
  });
}

// Вспомогательная функция для рендеринга Turnstile виджета
function renderTurnstile(siteKey, resolve, reject) {
  // Создаем временный контейнер для виджета
  const container = document.createElement('div');
  container.style.display = 'none';
  document.body.appendChild(container);

  try {
    window.turnstile.render(container, {
      sitekey: siteKey,
      callback: (token) => {
        // Удаляем контейнер после получения токена
        document.body.removeChild(container);
        resolve(token);
      },
      'error-callback': () => {
        document.body.removeChild(container);
        reject(new Error('Ошибка генерации Turnstile токена'));
      },
    });
  } catch (error) {
    document.body.removeChild(container);
    reject(error);
  }
}

// Функция для сокращения ссылки через TinyURL API
async function shortenUrlWithTinyUrl(longUrl) {
  try {
    // Получаем актуальное состояние
    const state = await getTinyUrlState();

    // Извлекаем site_key из ответа state
    const siteKey = state?.captcha?.site_key || '0x4AAAAAAAWaftO6M9nMBXRA';

    // Генерируем captcha_token через Turnstile
    const captchaToken = await generateCaptchaToken(siteKey);

    const response = await fetch('https://tinyurl.com/app/api/url/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: '*/*',
        'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3',
        'X-Requested-With': 'XMLHttpRequest',
        Priority: 'u=1, i',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
        Referer: 'https://tinyurl.com/',
        'Sec-GPC': '1',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
      },
      body: JSON.stringify({
        url: longUrl,
        domain: 'tinyurl.com',
        alias: '',
        description: '',
        team: null,
        tags: [],
        captcha_token: captchaToken,
        expires_at: null,
        errors: { errors: {} },
        busy: true,
        successful: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Проверяем на ошибки в ответе
    if (data.errors && Object.keys(data.errors).length > 0) {
      const errorMessages = Object.values(data.errors).join(', ');
      throw new Error(`Ошибка TinyURL: ${errorMessages}`);
    }

    // Проверяем структуру ответа TinyURL
    if (data.data && data.data[0] && data.data[0].aliases && data.data[0].aliases[0]) {
      return data.data[0].aliases[0].tiny_url;
    } else if (data.message) {
      throw new Error(`TinyURL API: ${data.message}`);
    } else {
      throw new Error('Некорректный ответ от TinyURL API');
    }
  } catch (error) {
    console.error('Ошибка TinyURL API:', error);
    throw error;
  }
}

// Функция для генерации и копирования ссылки на форму
async function generateAndCopyShareUrl() {
  if (!currentConfig.webhookUrl.trim()) {
    showMessage('Укажите Discord Webhook URL перед копированием ссылки', 'error');
    return;
  }

  const shareUrl = generateShareUrl();
  const success = await copyToClipboard(shareUrl);

  if (success) {
    generateUrlBtn.classList.add('copied');
    generateUrlBtn.innerHTML = '<i class="fas fa-check"></i> Ссылка скопирована!';

    setTimeout(() => {
      generateUrlBtn.classList.remove('copied');
      generateUrlBtn.innerHTML = '<i class="fas fa-copy"></i> Скопировать ссылку на форму';
    }, 2000);

    showMessage('Ссылка на форму скопирована в буфер обмена!', 'success');
  } else {
    showMessage('Не удалось скопировать ссылку', 'error');
  }
}

// Функция для генерации и копирования короткой ссылки
async function generateAndCopyShortUrl() {
  if (!currentConfig.webhookUrl.trim()) {
    showMessage('Укажите Discord Webhook URL перед копированием ссылки', 'error');
    return;
  }

  // Показываем состояние загрузки
  shortenUrlBtn.disabled = true;
  shortenUrlBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Сокращение...';

  try {
    const shareUrl = generateShareUrl();
    const shortUrl = await shortenUrlWithTinyUrl(shareUrl);

    const success = await copyToClipboard(shortUrl);

    if (success) {
      shortenUrlBtn.classList.add('copied');
      shortenUrlBtn.innerHTML = '<i class="fas fa-check"></i> Короткая ссылка скопирована!';

      setTimeout(() => {
        shortenUrlBtn.classList.remove('copied');
        shortenUrlBtn.disabled = false;
        shortenUrlBtn.innerHTML = '<i class="fas fa-compress-alt"></i> Сократить ссылку';
      }, 2000);

      showMessage(`Короткая ссылка скопирована: ${shortUrl}`, 'success');
    } else {
      throw new Error('Не удалось скопировать ссылку');
    }
  } catch (error) {
    shortenUrlBtn.disabled = false;
    shortenUrlBtn.innerHTML = '<i class="fas fa-compress-alt"></i> Сократить ссылку';

    let errorMsg = 'Не удалось сократить ссылку';
    if (error.message.includes('rate limit')) {
      errorMsg = 'Превышен лимит запросов. Попробуйте через минуту';
    } else if (error.message) {
      errorMsg = error.message;
    }

    showMessage(errorMsg, 'error');
  }
}
