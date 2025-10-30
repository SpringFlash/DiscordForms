// === ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ===

// Конфигурация по умолчанию
let currentConfig = null;

// Режим работы (editor/view)
let isEditorMode = false;

// Текущая тема
let currentTheme = 'dark';

// DOM элементы
const container = document.querySelector('.container');
const editorPanel = document.getElementById('editorPanel');
const formWrapper = document.querySelector('.form-wrapper');
const formPreview = document.getElementById('formPreview');
const contactForm = document.getElementById('contactForm');
const submitBtn = document.querySelector('.submit-btn');
const btnText = document.querySelector('.btn-text');
const btnIcon = document.querySelector('.submit-btn i');
const responseMessage = document.getElementById('response');
const conditionalMessagesList = document.getElementById('conditionalMessagesList');
const addConditionalMessageBtn = document.getElementById('addConditionalMessageBtn');

// Элементы редактора
const formTitleInput = document.getElementById('formTitle');
const formDescriptionInput = document.getElementById('formDescription');
const customMessageInput = document.getElementById('customMessage');
const webhookUrlInput = document.getElementById('webhookUrl');
const webhookUsernameInput = document.getElementById('webhookUsername');
const webhookAvatarUrlInput = document.getElementById('webhookAvatarUrl');
const organizationSelect = document.getElementById('organizationSelect');
const fieldsList = document.getElementById('fieldsList');
const addFieldBtn = document.getElementById('addFieldBtn');
const generateUrlBtn = document.getElementById('generateUrlBtn');
const shareUrlDiv = document.getElementById('shareUrl');
const shareUrlInput = document.getElementById('shareUrlInput');
const copyUrlBtn = document.getElementById('copyUrlBtn');
const pageTitle = document.getElementById('pageTitle');
const orgLogoImg = document.getElementById('orgLogoImg');

// Кнопка редактирования формы и выпадающее меню
const editFormBtn = document.getElementById('editFormBtn');
const formDropdown = document.getElementById('formDropdown');
const duplicateBtn = document.getElementById('duplicateBtn');

// Элементы переключателя тем
const lightThemeBtn = document.getElementById('lightThemeBtn');
const darkThemeBtn = document.getElementById('darkThemeBtn');

// === УТИЛИТАРНЫЕ ФУНКЦИИ ===

// Функция для показа сообщений
function showMessage(message, type = 'success') {
  responseMessage.textContent = message;
  responseMessage.className = `response-message ${type} show`;

  // Автоматически скрываем сообщение через 5 секунд
  setTimeout(() => {
    responseMessage.classList.remove('show');
  }, 5000);
}

// Функция для кодирования конфига в base64
function encodeConfig(config) {
  return btoa(encodeURIComponent(JSON.stringify(config)));
}

// Функция для декодирования конфига из base64
function decodeConfig(encodedConfig) {
  try {
    return JSON.parse(decodeURIComponent(atob(encodedConfig)));
  } catch (e) {
    console.error('Ошибка декодирования конфига:', e);
    return null;
  }
}

// Функция для получения параметров URL
function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    config: params.get('config'),
    mode: params.get('mode'),
  };
}

// Функция для обновления URL без перезагрузки
function updateUrl(config = null, mode = null) {
  const url = new URL(window.location);

  if (config) {
    url.searchParams.set('config', encodeConfig(config));
  }

  if (mode !== null) {
    if (mode) {
      url.searchParams.set('mode', 'editor');
    } else {
      url.searchParams.delete('mode');
    }
  }

  window.history.pushState({}, '', url);
}

// Функция для копирования текста в буфер обмена
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Ошибка копирования:', err);
    return false;
  }
}

// Функция для генерации уникального ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// === ФУНКЦИИ РАБОТЫ С ТЕМАМИ ===

// Функция для применения темы
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  currentTheme = theme;

  // Обновляем активную кнопку в переключателе
  if (lightThemeBtn && darkThemeBtn) {
    lightThemeBtn.classList.toggle('active', theme === 'light');
    darkThemeBtn.classList.toggle('active', theme === 'dark');
  }

  // Сохраняем тему в localStorage
  localStorage.setItem('theme', theme);
}

// Функция для инициализации темы
function initTheme() {
  // Загружаем тему из localStorage или используем тёмную по умолчанию
  const savedTheme = localStorage.getItem('theme') || 'dark';
  applyTheme(savedTheme);
}

// Функция для переключения темы
function toggleTheme(theme) {
  applyTheme(theme);
}

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

// Функция для восстановления базовой структуры формы
function restoreFormStructure() {
  const formWrapper = document.querySelector('.form-wrapper');

  formWrapper.innerHTML = `
    <div id="organizationLogo" class="organization-logo">
      <img src="images/LSPD.png" alt="Organization Logo" id="orgLogoImg" />
    </div>
    <div class="vinewood-logo"></div>
    <div class="header">
      <div class="header-top">
        <h1>Связаться с нами</h1>
        <div class="form-menu">
          <button id="editFormBtn" class="edit-form-btn" title="Меню формы">
            <i class="fas fa-ellipsis-v"></i>
          </button>
          <div id="formDropdown" class="form-dropdown">
            <button class="dropdown-item" id="duplicateBtn">
              <i class="fas fa-copy"></i>
              Дублировать и настроить
            </button>
          </div>
        </div>
      </div>
      <p>Заполните форму и мы свяжемся с вами в ближайшее время</p>
    </div>

    <form id="contactForm" class="contact-form">
      <button type="submit" class="submit-btn">
        <span class="btn-text">Отправить сообщение</span>
        <i class="fas fa-arrow-right"></i>
      </button>
    </form>

    <div id="response" class="response-message"></div>
  `;
}

// Функция для показа welcome screen
function showWelcomeScreen() {
  const formWrapper = document.querySelector('.form-wrapper');

  // Обновляем title страницы
  document.title = 'Discord Forms - Создай свою форму';
  document.getElementById('pageTitle').textContent = 'Discord Forms';

  formWrapper.innerHTML = `
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
      
      <button id="createFormBtn" class="create-form-btn">
        <i class="fas fa-plus-circle"></i>
        Создать форму
      </button>
      
      <div class="welcome-info">
        <p>Создай свою форму обратной связи, анкету, опрос или любую другую форму</p>
        <p>Все данные отправляются прямо в твой Discord-канал через webhook</p>
      </div>
    </div>
  `;

  // Обработчик кнопки создания формы
  const createFormBtn = document.getElementById('createFormBtn');
  if (createFormBtn) {
    createFormBtn.addEventListener('click', () => {
      currentConfig = createEmptyConfig();
      restoreFormStructure(); // Восстанавливаем структуру формы!
      initEditor();
      toggleEditorMode(true);
      renderForm();
      initFormHandlers();
    });
  }
}

// === ФУНКЦИИ РАБОТЫ С ФОРМОЙ ===

// Функция для установки состояния загрузки
function setLoading(isLoading) {
  if (submitBtn) {
    submitBtn.disabled = isLoading;

    if (isLoading) {
      btnText.textContent = 'Отправка...';
      btnIcon.className = 'fas fa-spinner loading';
    } else {
      btnText.textContent = 'Отправить сообщение';
      btnIcon.className = 'fas fa-arrow-right';
    }
  }
}

// Функция для переключения режима редактор/просмотр
function toggleEditorMode(showEditor) {
  isEditorMode = showEditor;

  if (showEditor) {
    editorPanel.classList.add('show');

    // Включаем режим редактора для контейнера
    if (container) {
      container.classList.add('editor-mode');
    }

    // Делаем форму превью
    if (formPreview) {
      formPreview.classList.add('preview');
    }
  } else {
    editorPanel.classList.remove('show');

    // Выключаем режим редактора
    if (container) {
      container.classList.remove('editor-mode');
    }

    // Убираем превью
    if (formPreview) {
      formPreview.classList.remove('preview');
    }
  }

  updateUrl(null, showEditor);
}

// Функция для обновления логотипа организации
function updateOrganizationLogo(organization) {
  const logoImg = document.getElementById('orgLogoImg');
  if (logoImg) {
    logoImg.src = `images/${organization}.png`;
    logoImg.alt = `${organization} Logo`;
  }
}

// Функция для инициализации редактора
function initEditor() {
  // Заполняем поля редактора текущими значениями
  formTitleInput.value = currentConfig.title;
  formDescriptionInput.value = currentConfig.description;
  customMessageInput.value = currentConfig.customMessage || '';
  webhookUrlInput.value = currentConfig.webhookUrl;
  webhookUsernameInput.value = currentConfig.webhookUsername || currentConfig.title;
  webhookAvatarUrlInput.value = currentConfig.webhookAvatarUrl || '';

  // Инициализируем conditionalMessages если их нет (для обратной совместимости)
  if (!currentConfig.conditionalMessages) {
    currentConfig.conditionalMessages = [];
  }

  // Устанавливаем выбранную организацию
  if (organizationSelect) {
    organizationSelect.value = currentConfig.organization || 'LSPD';
    updateOrganizationLogo(currentConfig.organization || 'LSPD');
  }

  // Очищаем список полей и добавляем существующие
  fieldsList.innerHTML = '';
  currentConfig.fields.forEach((field) => {
    addFieldToEditor(field);
  });

  // Обработчики событий редактора
  formTitleInput.addEventListener('input', updateConfigFromEditor);
  formDescriptionInput.addEventListener('input', updateConfigFromEditor);
  customMessageInput.addEventListener('input', updateConfigFromEditor);
  webhookUrlInput.addEventListener('input', updateConfigFromEditor);
  webhookUsernameInput.addEventListener('input', updateConfigFromEditor);
  webhookAvatarUrlInput.addEventListener('input', updateConfigFromEditor);

  // Обработчик для селектора организации
  if (organizationSelect) {
    organizationSelect.addEventListener('change', (e) => {
      currentConfig.organization = e.target.value;
      updateOrganizationLogo(e.target.value);
      updateConfigFromEditor();
    });
  }

  // Обработчики переключателя тем
  if (lightThemeBtn) {
    lightThemeBtn.addEventListener('click', () => toggleTheme('light'));
  }
  if (darkThemeBtn) {
    darkThemeBtn.addEventListener('click', () => toggleTheme('dark'));
  }

  addFieldBtn.addEventListener('click', () => {
    const newField = {
      id: generateId(),
      type: 'text',
      label: 'Новое поле',
      placeholder: '',
      required: false,
      icon: 'question',
    };
    currentConfig.fields.push(newField);
    addFieldToEditor(newField);
    updateConfigFromEditor();
    renderForm();
  });

  // Инициализируем условные сообщения
  if (!currentConfig.conditionalMessages) {
    currentConfig.conditionalMessages = [];
  }
  conditionalMessagesList.innerHTML = '';
  currentConfig.conditionalMessages.forEach((condMsg) => {
    addConditionalMessageToEditor(condMsg);
  });

  addConditionalMessageBtn.addEventListener('click', () => {
    const newCondMsg = {
      id: generateId(),
      field: '',
      value: '',
      message: '',
    };
    currentConfig.conditionalMessages.push(newCondMsg);
    addConditionalMessageToEditor(newCondMsg);
    updateConfigFromEditor();
  });

  generateUrlBtn.addEventListener('click', generateShareUrl);
  copyUrlBtn.addEventListener('click', copyShareUrl);
}

// === ФУНКЦИИ РАБОТЫ С УСЛОВНЫМИ СООБЩЕНИЯМИ ===

// Функция для добавления условного сообщения в редактор
function addConditionalMessageToEditor(condMsg) {
  const condMsgItem = document.createElement('div');
  condMsgItem.className = 'conditional-message-item';
  condMsgItem.dataset.condMsgId = condMsg.id;

  condMsgItem.innerHTML = `
    <div class="condmsg-header">
      <span class="condmsg-title">💬 Условное сообщение</span>
      <button class="field-action-btn delete" title="Удалить">
        <i class="fas fa-trash"></i>
      </button>
    </div>
    <div class="condmsg-config">
      <div class="condmsg-condition">
        <label>Когда поле:</label>
        <select class="condmsg-field-select">
          <option value="">Выберите поле...</option>
        </select>
        <span>=</span>
        <div class="condmsg-value-container">
          <input type="text" class="condmsg-value-input" value="${
            condMsg.value || ''
          }" placeholder="Значение" />
        </div>
      </div>
      <div class="condmsg-message-input">
        <label>Отправить сообщение:</label>
        <textarea class="condmsg-message-textarea" rows="3" placeholder="Введите кастомное сообщение для Discord...">${
          condMsg.message || ''
        }</textarea>
      </div>
    </div>
  `;

  const deleteBtn = condMsgItem.querySelector('.delete');
  const fieldSelect = condMsgItem.querySelector('.condmsg-field-select');
  const valueContainer = condMsgItem.querySelector('.condmsg-value-container');
  const valueInput = condMsgItem.querySelector('.condmsg-value-input');
  const messageTextarea = condMsgItem.querySelector('.condmsg-message-textarea');

  // Заполняем селект полей (только select и radio)
  function populateFieldSelect() {
    fieldSelect.innerHTML = '<option value="">Выберите поле...</option>';
    currentConfig.fields.forEach((f) => {
      if (f.type === 'select' || f.type === 'radio') {
        const option = document.createElement('option');
        option.value = f.id;
        option.textContent = f.label;
        if (condMsg.field === f.id) {
          option.selected = true;
        }
        fieldSelect.appendChild(option);
      }
    });
  }

  // Обновляем варианты значений
  function updateValueOptions(selectedFieldId) {
    const selectedField = currentConfig.fields.find((f) => f.id === selectedFieldId);

    if (!selectedField || !selectedField.options || selectedField.options.length === 0) {
      // Показываем обычный input
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'condmsg-value-input';
      input.value = condMsg.value || '';
      input.placeholder = 'Значение';

      input.addEventListener('input', (e) => {
        condMsg.value = e.target.value;
        updateConfigFromEditor();
      });

      valueContainer.innerHTML = '';
      valueContainer.appendChild(input);
      return;
    }

    // Создаем select с вариантами
    const select = document.createElement('select');
    select.className = 'condmsg-value-input';

    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Выберите значение...';
    select.appendChild(defaultOption);

    selectedField.options.forEach((opt) => {
      const option = document.createElement('option');
      option.value = opt;
      option.textContent = opt;
      if (condMsg.value === opt) {
        option.selected = true;
      }
      select.appendChild(option);
    });

    select.addEventListener('change', (e) => {
      condMsg.value = e.target.value;
      updateConfigFromEditor();
    });

    valueContainer.innerHTML = '';
    valueContainer.appendChild(select);
  }

  populateFieldSelect();
  if (condMsg.field) {
    updateValueOptions(condMsg.field);
  }

  // Обработчики
  deleteBtn.addEventListener('click', () => {
    if (confirm('Удалить это условное сообщение?')) {
      currentConfig.conditionalMessages = currentConfig.conditionalMessages.filter(
        (cm) => cm.id !== condMsg.id
      );
      condMsgItem.remove();
      updateConfigFromEditor();
    }
  });

  fieldSelect.addEventListener('change', (e) => {
    condMsg.field = e.target.value;
    condMsg.value = '';
    if (e.target.value) {
      updateValueOptions(e.target.value);
    }
    updateConfigFromEditor();
  });

  valueInput.addEventListener('input', (e) => {
    condMsg.value = e.target.value;
    updateConfigFromEditor();
  });

  messageTextarea.addEventListener('input', (e) => {
    condMsg.message = e.target.value;
    updateConfigFromEditor();
  });

  conditionalMessagesList.appendChild(condMsgItem);
}

// === ФУНКЦИИ РАБОТЫ С ПОЛЯМИ ===

// Функция для добавления поля в редактор
function addFieldToEditor(field) {
  const fieldItem = document.createElement('div');
  fieldItem.className = 'field-item';
  fieldItem.dataset.fieldId = field.id;

  const iconMap = {
    user: '👤',
    envelope: '📧',
    tag: '🏷️',
    'exclamation-triangle': '⚡',
    comment: '💬',
    newspaper: '📰',
    question: '❓',
    calculator: '🧮',
  };

  fieldItem.innerHTML = `
    <div class="field-header">
      <span class="field-title">${iconMap[field.icon] || '❓'} ${field.label}</span>
      <div class="field-actions">
        <button class="field-action-btn move-up" title="Переместить вверх">
          <i class="fas fa-arrow-up"></i>
        </button>
        <button class="field-action-btn move-down" title="Переместить вниз">
          <i class="fas fa-arrow-down"></i>
        </button>
        <button class="field-action-btn edit" title="Редактировать">
          <i class="fas fa-edit"></i>
        </button>
        <button class="field-action-btn delete" title="Удалить">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
    <div class="field-config">
      <div class="field-config-item">
        <label>Тип поля</label>
        <select class="field-type">
          <option value="text" ${field.type === 'text' ? 'selected' : ''}>Текст</option>
          <option value="email" ${field.type === 'email' ? 'selected' : ''}>Email</option>
          <option value="textarea" ${
            field.type === 'textarea' ? 'selected' : ''
          }>Текстовая область</option>
          <option value="select" ${
            field.type === 'select' ? 'selected' : ''
          }>Выпадающий список</option>
          <option value="radio" ${field.type === 'radio' ? 'selected' : ''}>Радиокнопки</option>
          <option value="checkbox" ${field.type === 'checkbox' ? 'selected' : ''}>Чекбокс</option>
          <option value="computed" ${
            field.type === 'computed' ? 'selected' : ''
          }>Вычисляемое поле</option>
        </select>
      </div>
      <div class="field-config-item">
        <label>Иконка</label>
        <select class="field-icon">
          <option value="user" ${field.icon === 'user' ? 'selected' : ''}>Пользователь</option>
          <option value="envelope" ${field.icon === 'envelope' ? 'selected' : ''}>Email</option>
          <option value="tag" ${field.icon === 'tag' ? 'selected' : ''}>Тег</option>
          <option value="exclamation-triangle" ${
            field.icon === 'exclamation-triangle' ? 'selected' : ''
          }>Приоритет</option>
          <option value="comment" ${field.icon === 'comment' ? 'selected' : ''}>Сообщение</option>
          <option value="newspaper" ${field.icon === 'newspaper' ? 'selected' : ''}>Новости</option>
          <option value="question" ${field.icon === 'question' ? 'selected' : ''}>Вопрос</option>
          <option value="calculator" ${
            field.icon === 'calculator' ? 'selected' : ''
          }>Калькулятор</option>
        </select>
      </div>
      <div class="field-config-item">
        <label>Название поля</label>
        <input type="text" class="field-label" value="${field.label}" />
      </div>
      <div class="field-config-item">
        <label>Placeholder</label>
        <input type="text" class="field-placeholder" value="${field.placeholder || ''}" />
      </div>
      <div class="field-config-item">
        <label>Обязательное</label>
        <input type="checkbox" class="field-required" ${field.required ? 'checked' : ''} />
      </div>
      <div class="field-config-item field-options" style="display: ${
        field.type === 'select' || field.type === 'radio' ? 'block' : 'none'
      };">
        <label>Варианты (через запятую)</label>
        <input type="text" class="field-options-input" value="${
          field.options ? field.options.join(', ') : ''
        }" />
      </div>
      <div class="field-config-item field-formula-container" style="display: ${
        field.type === 'computed' ? 'block' : 'none'
      }; grid-column: 1 / -1;">
        <label>Формула</label>
        <div class="formula-editor">
          <input type="text" class="field-formula-input" value="${
            field.formula || ''
          }" placeholder="Пример: Заявка от {name} - {email,0,3}" />
          <button type="button" class="add-field-variable-btn" title="Добавить переменную">
            <i class="fas fa-plus"></i> Поле
          </button>
        </div>
        <div class="formula-hint">Используйте {id_поля}, {id_поля,start} или {id_поля,start,end} для substring</div>
      </div>
      <div class="field-config-item field-conditional-container" style="grid-column: 1 / -1;">
        <label>
          <input type="checkbox" class="field-conditional-enabled" ${
            field.conditional && field.conditional.enabled ? 'checked' : ''
          } />
          Условная видимость
        </label>
        <div class="conditional-config" style="display: ${
          field.conditional && field.conditional.enabled ? 'block' : 'none'
        };">
          <div class="conditional-hint">Показывать это поле только если:</div>
          <div class="conditional-row">
            <select class="conditional-field-select">
              <option value="">Выберите поле...</option>
            </select>
            <span>=</span>
            <input type="text" class="conditional-value-input" value="${
              field.conditional ? field.conditional.value || '' : ''
            }" placeholder="Значение" />
          </div>
        </div>
      </div>
    </div>
  `;

  // Обработчики событий для поля
  const editBtn = fieldItem.querySelector('.edit');
  const deleteBtn = fieldItem.querySelector('.delete');
  const moveUpBtn = fieldItem.querySelector('.move-up');
  const moveDownBtn = fieldItem.querySelector('.move-down');
  const typeSelect = fieldItem.querySelector('.field-type');
  const labelInput = fieldItem.querySelector('.field-label');
  const placeholderInput = fieldItem.querySelector('.field-placeholder');
  const iconSelect = fieldItem.querySelector('.field-icon');
  const requiredCheckbox = fieldItem.querySelector('.field-required');
  const optionsContainer = fieldItem.querySelector('.field-options');
  const optionsInput = fieldItem.querySelector('.field-options-input');
  const formulaContainer = fieldItem.querySelector('.field-formula-container');
  const formulaInput = fieldItem.querySelector('.field-formula-input');
  const addVariableBtn = fieldItem.querySelector('.add-field-variable-btn');
  const conditionalEnabledCheckbox = fieldItem.querySelector('.field-conditional-enabled');
  const conditionalConfig = fieldItem.querySelector('.conditional-config');
  const conditionalFieldSelect = fieldItem.querySelector('.conditional-field-select');
  const conditionalValueInput = fieldItem.querySelector('.conditional-value-input');

  // Заполняем селект условных полей
  function populateConditionalFieldSelect() {
    conditionalFieldSelect.innerHTML = '<option value="">Выберите поле...</option>';

    // Добавляем только поля с типом select или radio, которые идут до текущего поля
    currentConfig.fields.forEach((f) => {
      if (f.id !== field.id && (f.type === 'select' || f.type === 'radio')) {
        const option = document.createElement('option');
        option.value = f.id;
        option.textContent = f.label;
        if (field.conditional && field.conditional.field === f.id) {
          option.selected = true;
        }
        conditionalFieldSelect.appendChild(option);
      }
    });
  }

  // Функция для обновления списка значений в зависимости от выбранного поля
  function updateConditionalValueOptions(selectedFieldId) {
    const selectedField = currentConfig.fields.find((f) => f.id === selectedFieldId);

    if (!selectedField || !selectedField.options || selectedField.options.length === 0) {
      // Если у поля нет вариантов, показываем обычный input
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'conditional-value-input';
      input.value = field.conditional ? field.conditional.value || '' : '';
      input.placeholder = 'Значение';

      input.addEventListener('input', (e) => {
        if (!field.conditional) {
          field.conditional = { enabled: true };
        }
        field.conditional.value = e.target.value;
        updateConfigFromEditor();
        renderForm();
      });

      conditionalValueInput.replaceWith(input);
      return;
    }

    // Создаем select с вариантами из выбранного поля
    const select = document.createElement('select');
    select.className = 'conditional-value-input';

    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Выберите значение...';
    select.appendChild(defaultOption);

    selectedField.options.forEach((opt) => {
      const option = document.createElement('option');
      option.value = opt;
      option.textContent = opt;
      if (field.conditional && field.conditional.value === opt) {
        option.selected = true;
      }
      select.appendChild(option);
    });

    select.addEventListener('change', (e) => {
      if (!field.conditional) {
        field.conditional = { enabled: true };
      }
      field.conditional.value = e.target.value;
      updateConfigFromEditor();
      renderForm();
    });

    conditionalValueInput.replaceWith(select);
  }

  // Инициализируем селект
  populateConditionalFieldSelect();

  // Если уже есть выбранное поле, обновляем варианты значений
  if (field.conditional && field.conditional.field) {
    updateConditionalValueOptions(field.conditional.field);
  }

  editBtn.addEventListener('click', () => {
    const config = fieldItem.querySelector('.field-config');
    config.style.display = config.style.display === 'none' ? 'grid' : 'none';
  });

  deleteBtn.addEventListener('click', () => {
    if (confirm('Удалить это поле?')) {
      currentConfig.fields = currentConfig.fields.filter((f) => f.id !== field.id);
      fieldItem.remove();
      updateConfigFromEditor();
      renderForm();
    }
  });

  // Перемещение поля вверх
  moveUpBtn.addEventListener('click', () => {
    const currentIndex = currentConfig.fields.findIndex((f) => f.id === field.id);
    if (currentIndex > 0) {
      // Меняем местами с предыдущим элементом
      [currentConfig.fields[currentIndex - 1], currentConfig.fields[currentIndex]] = [
        currentConfig.fields[currentIndex],
        currentConfig.fields[currentIndex - 1],
      ];

      // Перерисовываем список полей
      rebuildFieldsList();
      updateConfigFromEditor();
      renderForm();
    }
  });

  // Перемещение поля вниз
  moveDownBtn.addEventListener('click', () => {
    const currentIndex = currentConfig.fields.findIndex((f) => f.id === field.id);
    if (currentIndex < currentConfig.fields.length - 1) {
      // Меняем местами со следующим элементом
      [currentConfig.fields[currentIndex], currentConfig.fields[currentIndex + 1]] = [
        currentConfig.fields[currentIndex + 1],
        currentConfig.fields[currentIndex],
      ];

      // Перерисовываем список полей
      rebuildFieldsList();
      updateConfigFromEditor();
      renderForm();
    }
  });

  typeSelect.addEventListener('change', (e) => {
    const newType = e.target.value;
    field.type = newType;
    optionsContainer.style.display = newType === 'select' || newType === 'radio' ? 'block' : 'none';
    if (formulaContainer) {
      formulaContainer.style.display = newType === 'computed' ? 'block' : 'none';
    }
    updateConfigFromEditor();
    renderForm();
  });

  labelInput.addEventListener('input', (e) => {
    field.label = e.target.value;
    fieldItem.querySelector('.field-title').textContent = `${iconMap[field.icon] || '❓'} ${
      field.label
    }`;
    updateConfigFromEditor();
    renderForm();
  });

  placeholderInput.addEventListener('input', (e) => {
    field.placeholder = e.target.value;
    updateConfigFromEditor();
    renderForm();
  });

  iconSelect.addEventListener('change', (e) => {
    field.icon = e.target.value;
    fieldItem.querySelector('.field-title').textContent = `${iconMap[field.icon] || '❓'} ${
      field.label
    }`;
    updateConfigFromEditor();
    renderForm();
  });

  requiredCheckbox.addEventListener('change', (e) => {
    field.required = e.target.checked;
    updateConfigFromEditor();
    renderForm();
  });

  optionsInput.addEventListener('input', (e) => {
    field.options = e.target.value
      .split(',')
      .map((opt) => opt.trim())
      .filter((opt) => opt);

    updateConfigFromEditor();
    renderForm();
  });

  // Обновляем conditional selects только когда пользователь закончил редактировать
  optionsInput.addEventListener('blur', () => {
    // Обновляем conditional selects для всех полей, которые зависят от текущего
    rebuildConditionalSelects(field.id);
  });

  // Обработчик для формулы
  if (formulaInput) {
    formulaInput.addEventListener('input', (e) => {
      field.formula = e.target.value;
      updateConfigFromEditor();
      renderForm();
    });
  }

  // Обработчики для условной видимости
  conditionalEnabledCheckbox.addEventListener('change', (e) => {
    const isEnabled = e.target.checked;
    conditionalConfig.style.display = isEnabled ? 'block' : 'none';

    if (isEnabled) {
      field.conditional = {
        enabled: true,
        field: conditionalFieldSelect.value || '',
        value: conditionalValueInput.value || '',
      };
    } else {
      field.conditional = { enabled: false };
    }

    updateConfigFromEditor();
    renderForm();
  });

  conditionalFieldSelect.addEventListener('change', (e) => {
    if (!field.conditional) {
      field.conditional = { enabled: true };
    }
    field.conditional.field = e.target.value;
    field.conditional.value = ''; // Сбрасываем значение при смене поля

    // Обновляем варианты значений для нового поля
    if (e.target.value) {
      updateConditionalValueOptions(e.target.value);
    }

    updateConfigFromEditor();
    renderForm();
  });

  conditionalValueInput.addEventListener('input', (e) => {
    if (!field.conditional) {
      field.conditional = { enabled: true };
    }
    field.conditional.value = e.target.value;
    updateConfigFromEditor();
    renderForm();
  });

  // Обработчик для кнопки добавления переменной
  if (addVariableBtn) {
    addVariableBtn.addEventListener('click', () => {
      // Создаем выпадающий список с доступными полями
      const availableFields = currentConfig.fields.filter(
        (f) => f.id !== field.id && f.type !== 'computed'
      );

      if (availableFields.length === 0) {
        alert('Нет доступных полей для вставки. Создайте сначала другие поля.');
        return;
      }

      // Создаем временный селект
      const fieldSelect = document.createElement('select');
      fieldSelect.className = 'temp-field-select';

      const defaultOption = document.createElement('option');
      defaultOption.value = '';
      defaultOption.textContent = 'Выберите поле...';
      fieldSelect.appendChild(defaultOption);

      availableFields.forEach((f) => {
        const option = document.createElement('option');
        option.value = f.id;
        option.textContent = f.label;
        fieldSelect.appendChild(option);
      });

      // Показываем как popup/dropdown
      const popup = document.createElement('div');
      popup.className = 'field-variable-popup';
      popup.innerHTML = `
        <div class="popup-content">
          <label>Выберите поле для вставки:</label>
          <div class="popup-select-container"></div>
          <div class="substring-options">
            <div class="substring-hint">Substring (необязательно):</div>
            <div class="substring-inputs">
              <div class="substring-input-group">
                <label>Начало (start):</label>
                <input type="number" class="start-index-input" placeholder="Не указано" min="0" />
              </div>
              <div class="substring-input-group">
                <label>Конец (end):</label>
                <input type="number" class="end-index-input" placeholder="Не указано (до конца)" min="0" />
              </div>
            </div>
          </div>
          <div class="popup-buttons">
            <button type="button" class="popup-btn insert-btn">Вставить</button>
            <button type="button" class="popup-btn cancel-btn">Отмена</button>
          </div>
        </div>
      `;

      popup.querySelector('.popup-select-container').appendChild(fieldSelect);
      document.body.appendChild(popup);

      const insertBtn = popup.querySelector('.insert-btn');
      const cancelBtn = popup.querySelector('.cancel-btn');
      const startIndexInput = popup.querySelector('.start-index-input');
      const endIndexInput = popup.querySelector('.end-index-input');

      insertBtn.addEventListener('click', () => {
        const selectedFieldId = fieldSelect.value;
        if (selectedFieldId) {
          const selectedField = availableFields.find((f) => f.id === selectedFieldId);
          if (selectedField) {
            // Формируем placeholder
            let placeholder = `{${selectedField.id}`;

            // Добавляем substring параметры если указаны
            const start = startIndexInput.value;
            const end = endIndexInput.value;

            if (start !== '') {
              placeholder += `,${start}`;
              if (end !== '') {
                placeholder += `,${end}`;
              }
            }

            placeholder += '}';

            // Вставляем в текущую позицию курсора
            const cursorPos = formulaInput.selectionStart;
            const textBefore = formulaInput.value.substring(0, cursorPos);
            const textAfter = formulaInput.value.substring(cursorPos);

            formulaInput.value = textBefore + placeholder + textAfter;
            formulaInput.focus();
            formulaInput.selectionStart = formulaInput.selectionEnd =
              cursorPos + placeholder.length;

            field.formula = formulaInput.value;
            updateConfigFromEditor();
            renderForm();
          }
        }
        popup.remove();
      });

      cancelBtn.addEventListener('click', () => {
        popup.remove();
      });

      // Закрытие по клику вне попапа
      popup.addEventListener('click', (e) => {
        if (e.target === popup) {
          popup.remove();
        }
      });
    });
  }

  fieldsList.appendChild(fieldItem);
}

// Функция для перестроения списка полей в редакторе
function rebuildFieldsList() {
  fieldsList.innerHTML = '';
  currentConfig.fields.forEach((field) => {
    addFieldToEditor(field);
  });
}

// Функция для обновления только условных селектов (без пересоздания всех полей)
function rebuildConditionalSelects(changedFieldId) {
  // Обновляем условные селекты в полях
  currentConfig.fields.forEach((field) => {
    if (
      field.conditional &&
      field.conditional.enabled &&
      field.conditional.field === changedFieldId
    ) {
      // Находим этот field-item в DOM
      const fieldItem = fieldsList.querySelector(`[data-field-id="${field.id}"]`);
      if (fieldItem) {
        const conditionalValueInput = fieldItem.querySelector('.conditional-value-input');
        if (conditionalValueInput) {
          // Пересоздаем input/select для значения
          const changedField = currentConfig.fields.find((f) => f.id === changedFieldId);
          if (changedField && changedField.options && changedField.options.length > 0) {
            // Создаем select с новыми вариантами
            const select = document.createElement('select');
            select.className = 'conditional-value-input';

            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'Выберите значение...';
            select.appendChild(defaultOption);

            changedField.options.forEach((opt) => {
              const option = document.createElement('option');
              option.value = opt;
              option.textContent = opt;
              if (field.conditional.value === opt) {
                option.selected = true;
              }
              select.appendChild(option);
            });

            select.addEventListener('change', (e) => {
              field.conditional.value = e.target.value;
              updateConfigFromEditor();
              renderForm();
            });

            conditionalValueInput.replaceWith(select);
          }
        }
      }
    }
  });

  // Обновляем условные селекты в условных сообщениях
  currentConfig.conditionalMessages.forEach((condMsg) => {
    if (condMsg.field === changedFieldId) {
      const condMsgItem = conditionalMessagesList.querySelector(
        `[data-cond-msg-id="${condMsg.id}"]`
      );
      if (condMsgItem) {
        const valueContainer = condMsgItem.querySelector('.condmsg-value-container');
        if (valueContainer) {
          const changedField = currentConfig.fields.find((f) => f.id === changedFieldId);
          if (changedField && changedField.options && changedField.options.length > 0) {
            // Создаем select с новыми вариантами
            const select = document.createElement('select');
            select.className = 'condmsg-value-input';

            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'Выберите значение...';
            select.appendChild(defaultOption);

            changedField.options.forEach((opt) => {
              const option = document.createElement('option');
              option.value = opt;
              option.textContent = opt;
              if (condMsg.value === opt) {
                option.selected = true;
              }
              select.appendChild(option);
            });

            select.addEventListener('change', (e) => {
              condMsg.value = e.target.value;
              updateConfigFromEditor();
            });

            valueContainer.innerHTML = '';
            valueContainer.appendChild(select);
          }
        }
      }
    }
  });
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

  // Обновляем заголовок страницы
  pageTitle.textContent = currentConfig.title;
  document.querySelector('h1').textContent = currentConfig.title;
  document.querySelector('.header p').textContent = currentConfig.description;

  updateUrl(currentConfig);
}

// Функция для генерации URL для шаринга
function generateShareUrl() {
  if (!currentConfig.webhookUrl.trim()) {
    showMessage('Укажите Discord Webhook URL перед генерацией ссылки', 'error');
    return;
  }

  const shareConfig = { ...currentConfig };
  const baseUrl = window.location.origin + window.location.pathname;
  const shareUrl = `${baseUrl}?config=${encodeConfig(shareConfig)}`;

  shareUrlInput.value = shareUrl;
  shareUrlDiv.style.display = 'block';

  showMessage('Ссылка для шаринга сгенерирована!', 'success');
}

// Функция для копирования URL
async function copyShareUrl() {
  const url = shareUrlInput.value;
  const success = await copyToClipboard(url);

  if (success) {
    copyUrlBtn.classList.add('copied');
    copyUrlBtn.innerHTML = '<i class="fas fa-check"></i> Скопировано!';

    setTimeout(() => {
      copyUrlBtn.classList.remove('copied');
      copyUrlBtn.innerHTML = '<i class="fas fa-copy"></i> Копировать';
    }, 2000);

    showMessage('Ссылка скопирована в буфер обмена!', 'success');
  } else {
    showMessage('Не удалось скопировать ссылку', 'error');
  }
}

// Функция для рендеринга формы на основе конфига
function renderForm() {
  const formHeader = formWrapper.querySelector('.header h1');
  const formDescription = formWrapper.querySelector('.header p');
  const formFields = formWrapper.querySelector('.contact-form');

  // Обновляем заголовок и описание
  formHeader.textContent = currentConfig.title;
  formDescription.textContent = currentConfig.description;

  // Очищаем форму, оставляя кнопку отправки
  const submitBtn = formFields.querySelector('.submit-btn');
  formFields.innerHTML = '';
  formFields.appendChild(submitBtn);

  // Добавляем поля
  currentConfig.fields.forEach((field) => {
    const fieldGroup = document.createElement('div');
    fieldGroup.className = 'form-group';
    fieldGroup.dataset.fieldId = field.id;

    // Устанавливаем атрибуты для условной видимости
    if (field.conditional && field.conditional.enabled) {
      fieldGroup.dataset.conditionalField = field.conditional.field;
      fieldGroup.dataset.conditionalValue = field.conditional.value;
      fieldGroup.classList.add('conditional-field');
      // По умолчанию скрываем условные поля
      fieldGroup.style.display = 'none';
    }

    const label = document.createElement('label');
    label.setAttribute('for', field.id);
    label.innerHTML = `<i class="fas fa-${field.icon}"></i> ${field.label}${
      field.required ? ' *' : ''
    }`;

    let inputElement;

    switch (field.type) {
      case 'textarea':
        inputElement = document.createElement('textarea');
        inputElement.rows = 5;
        break;

      case 'select':
        inputElement = document.createElement('select');
        if (field.options) {
          const defaultOption = document.createElement('option');
          defaultOption.value = '';
          defaultOption.textContent = 'Выберите вариант';
          inputElement.appendChild(defaultOption);

          field.options.forEach((option) => {
            const optionElement = document.createElement('option');
            optionElement.value = option;
            optionElement.textContent = option;
            inputElement.appendChild(optionElement);
          });
        }
        break;

      case 'radio':
        const radioGroup = document.createElement('div');
        radioGroup.className = 'radio-group';

        if (field.options) {
          field.options.forEach((option, index) => {
            const radioLabel = document.createElement('label');
            radioLabel.className = 'radio-label';

            radioLabel.innerHTML = `
              <input type="radio" name="${field.id}" value="${option}" ${
              index === 0 && field.defaultValue === option ? 'checked' : ''
            } />
              <span class="radio-custom"></span>
              ${option}
            `;

            radioGroup.appendChild(radioLabel);
          });
        }

        inputElement = radioGroup;
        break;

      case 'checkbox':
        const checkboxLabel = document.createElement('label');
        checkboxLabel.className = 'checkbox-label';

        checkboxLabel.innerHTML = `
          <input type="checkbox" id="${field.id}" name="${field.id}" />
          <span class="checkbox-custom"></span>
          ${field.label}
        `;

        fieldGroup.appendChild(checkboxLabel);
        break;

      case 'computed':
        inputElement = document.createElement('input');
        inputElement.type = 'text';
        inputElement.readOnly = true;
        inputElement.className = 'computed-field';
        inputElement.dataset.formula = field.formula || '';
        inputElement.tabIndex = -1; // Убираем из tab навигации
        break;

      default: // text, email
        inputElement = document.createElement('input');
        inputElement.type = field.type;
    }

    if (inputElement && inputElement.tagName !== 'DIV') {
      inputElement.id = field.id;
      inputElement.name = field.id;
      if (field.placeholder) inputElement.placeholder = field.placeholder;
      if (field.required) inputElement.required = true;

      fieldGroup.appendChild(label);
      fieldGroup.appendChild(inputElement);

      if (inputElement.type !== 'checkbox') {
        const inputLine = document.createElement('div');
        inputLine.className = 'input-line';
        fieldGroup.appendChild(inputLine);
      }
    } else if (inputElement && inputElement.tagName === 'DIV') {
      fieldGroup.appendChild(label);
      fieldGroup.appendChild(inputElement);
    }

    formFields.insertBefore(fieldGroup, submitBtn);
  });

  // Инициализируем обработчики для автоматического вычисления
  initComputedFields();

  // Инициализируем обработчики для условной видимости
  initConditionalFields();
}

// Функция для вычисления значения по формуле
function calculateFormula(formula, formElement) {
  if (!formula) return '';

  let result = formula;
  const formData = new FormData(formElement);

  // Заменяем все {field_id} или {field_id,start,end} на значения полей
  const matches = formula.match(/\{([^}]+)\}/g);
  if (matches) {
    matches.forEach((match) => {
      const content = match.slice(1, -1); // Убираем { и }
      const parts = content.split(',').map((p) => p.trim());

      const fieldId = parts[0];
      const startIndex = parts.length > 1 ? parseInt(parts[1]) : null;
      const endIndex = parts.length > 2 ? parseInt(parts[2]) : null;

      let value = '';

      // Получаем значение поля
      const fieldElement = formElement.querySelector(`[name="${fieldId}"]`);
      if (fieldElement) {
        if (fieldElement.type === 'checkbox') {
          value = fieldElement.checked ? 'Да' : 'Нет';
        } else if (fieldElement.type === 'radio') {
          const checkedRadio = formElement.querySelector(`[name="${fieldId}"]:checked`);
          value = checkedRadio ? checkedRadio.value : '';
        } else {
          value = fieldElement.value || '';
        }

        // Применяем substring если указаны индексы
        if (value && startIndex !== null) {
          if (endIndex !== null) {
            // {field_id,start,end} - substring(start, end)
            value = value.substring(startIndex, endIndex);
          } else {
            // {field_id,start} - substring(start) до конца
            value = value.substring(startIndex);
          }
        }
      }

      result = result.replace(match, value);
    });
  }

  return result;
}

// Функция для инициализации автоматического обновления вычисляемых полей
function initComputedFields() {
  const form = document.getElementById('contactForm');
  if (!form) return;

  // Находим все вычисляемые поля
  const computedFields = form.querySelectorAll('.computed-field');
  if (computedFields.length === 0) return;

  // Функция для обновления всех вычисляемых полей
  const updateComputedFields = () => {
    computedFields.forEach((field) => {
      const formula = field.dataset.formula;
      if (formula) {
        field.value = calculateFormula(formula, form);
      }
    });
  };

  // Добавляем обработчики на все поля формы
  const allInputs = form.querySelectorAll('input:not(.computed-field), select, textarea');
  allInputs.forEach((input) => {
    input.addEventListener('input', updateComputedFields);
    input.addEventListener('change', updateComputedFields);
  });

  // Первичное вычисление
  updateComputedFields();
}

// Функция для инициализации условной видимости полей
function initConditionalFields() {
  const form = document.getElementById('contactForm');
  if (!form) return;

  // Находим все условные поля
  const conditionalFields = form.querySelectorAll('.conditional-field');
  if (conditionalFields.length === 0) return;

  // Функция для проверки и обновления видимости условных полей
  const updateConditionalVisibility = () => {
    conditionalFields.forEach((fieldGroup) => {
      const dependsOnFieldId = fieldGroup.dataset.conditionalField;
      const requiredValue = fieldGroup.dataset.conditionalValue;

      // Находим поле, от которого зависит видимость
      const dependsOnField = form.querySelector(`[name="${dependsOnFieldId}"]`);

      if (!dependsOnField) return;

      let currentValue = '';

      // Получаем текущее значение поля
      if (dependsOnField.type === 'radio') {
        const checkedRadio = form.querySelector(`[name="${dependsOnFieldId}"]:checked`);
        currentValue = checkedRadio ? checkedRadio.value : '';
      } else {
        currentValue = dependsOnField.value;
      }

      // Показываем или скрываем поле в зависимости от условия
      if (currentValue === requiredValue) {
        fieldGroup.style.display = 'block';
        // Анимация появления
        fieldGroup.style.opacity = '0';
        fieldGroup.style.transform = 'translateY(-10px)';
        setTimeout(() => {
          fieldGroup.style.transition = 'all 0.3s ease';
          fieldGroup.style.opacity = '1';
          fieldGroup.style.transform = 'translateY(0)';
        }, 10);
      } else {
        fieldGroup.style.display = 'none';
        // Очищаем значение скрытого поля
        const input = fieldGroup.querySelector('input, select, textarea');
        if (input && input.type !== 'radio' && input.type !== 'checkbox') {
          input.value = '';
        }
      }
    });
  };

  // Добавляем обработчики на все поля, от которых зависит видимость других
  const triggerFields = new Set();
  conditionalFields.forEach((fieldGroup) => {
    const dependsOnFieldId = fieldGroup.dataset.conditionalField;
    if (dependsOnFieldId) {
      triggerFields.add(dependsOnFieldId);
    }
  });

  triggerFields.forEach((fieldId) => {
    const field = form.querySelector(`[name="${fieldId}"]`);
    if (field) {
      // Для radio кнопок обрабатываем все радио с таким именем
      if (field.type === 'radio') {
        const allRadios = form.querySelectorAll(`[name="${fieldId}"]`);
        allRadios.forEach((radio) => {
          radio.addEventListener('change', updateConditionalVisibility);
        });
      } else {
        field.addEventListener('change', updateConditionalVisibility);
        field.addEventListener('input', updateConditionalVisibility);
      }
    }
  });

  // Первичная проверка видимости
  updateConditionalVisibility();
}

// Функция для создания Discord embed
function createDiscordEmbed(formData) {
  const priorityColors = {
    Низкий: 0x10b981, // Зеленый
    Средний: 0xf59e0b, // Желтый
    Высокий: 0xef4444, // Красный
  };

  // Определяем цвет на основе приоритета или используем дефолтный
  let embedColor = 0x6366f1; // Синий по умолчанию
  if (formData.priority && priorityColors[formData.priority]) {
    embedColor = priorityColors[formData.priority];
  }

  const embed = {
    title: `📝 ${currentConfig.title}`,
    color: embedColor,
    fields: [],
    timestamp: new Date().toISOString(),
    footer: {
      text: `${currentConfig.webhookUsername || currentConfig.title}`,
      icon_url:
        currentConfig.webhookAvatarUrl || 'https://pngimg.com/uploads/discord/discord_PNG3.png',
    },
  };

  // Добавляем поля из конфига
  currentConfig.fields.forEach((field, index) => {
    const value = formData[field.id];
    if (value !== undefined && value !== '') {
      let displayValue = value;
      let fieldName = field.label;

      // // Добавляем эмодзи к названию поля
      // const iconMap = {
      //   user: "👤",
      //   envelope: "📧",
      //   tag: "🏷️",
      //   "exclamation-triangle": "⚡",
      //   comment: "💬",
      //   newspaper: "📰",
      //   question: "❓",
      // };

      fieldName = `${index + 1}) ${fieldName}:`;

      // Обрабатываем разные типы полей
      if (field.type === 'checkbox') {
        displayValue = value === 'on' ? '✅ Да' : '❌ Нет';
      }

      // Ограничиваем длину для Discord
      if (typeof displayValue === 'string' && displayValue.length > 1024) {
        displayValue = displayValue.substring(0, 1021) + '...';
      }

      embed.fields.push({
        name: fieldName,
        value: displayValue,
        inline: false,
      });
    }
  });

  return embed;
}

// === ОСНОВНАЯ ЛОГИКА ПРИЛОЖЕНИЯ ===

// Функция для выбора кастомного сообщения на основе условий
function getConditionalMessage(formData) {
  if (!currentConfig.conditionalMessages || currentConfig.conditionalMessages.length === 0) {
    return currentConfig.customMessage || null;
  }

  // Проверяем каждое условное сообщение
  for (const condMsg of currentConfig.conditionalMessages) {
    if (condMsg.field && condMsg.value && condMsg.message) {
      const fieldValue = formData[condMsg.field];

      // Если значение поля совпадает с условием, используем это сообщение
      if (fieldValue === condMsg.value) {
        return condMsg.message;
      }
    }
  }

  // Если ни одно условие не сработало, возвращаем дефолтное сообщение
  return currentConfig.customMessage || null;
}

// Функция для отправки данных в Discord
async function sendToDiscord(formData) {
  if (!currentConfig.webhookUrl) {
    return { success: false, message: 'Webhook URL не настроен' };
  }

  const embed = createDiscordEmbed(formData);

  // Выбираем правильное кастомное сообщение на основе условий
  const customMessage = getConditionalMessage(formData);

  const payload = {
    content: customMessage,
    embeds: [embed],
    username: currentConfig.webhookUsername || currentConfig.title,
    avatar_url:
      currentConfig.webhookAvatarUrl || 'https://pngimg.com/uploads/discord/discord_PNG3.png',
  };

  try {
    const response = await fetch(currentConfig.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      return { success: true, message: 'Сообщение успешно отправлено! 🎉' };
    } else {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`HTTP ${response.status}: ${errorData.message || 'Неизвестная ошибка'}`);
    }
  } catch (error) {
    console.error('Ошибка отправки в Discord:', error);
    return {
      success: false,
      message: `Ошибка при отправке: ${error.message}. Попробуйте еще раз.`,
    };
  }
}

// Функция валидации формы
function validateForm(formData) {
  const errors = [];
  const form = document.getElementById('contactForm');

  // Проверяем обязательные поля из конфига
  currentConfig.fields.forEach((field) => {
    // Пропускаем вычисляемые поля при валидации - они заполняются автоматически
    if (field.type === 'computed') {
      return;
    }

    // Проверяем, видимо ли поле (для условных полей)
    const fieldGroup = form.querySelector(`[data-field-id="${field.id}"]`);
    const isVisible = !fieldGroup || fieldGroup.style.display !== 'none';

    // Пропускаем скрытые условные поля
    if (!isVisible) {
      return;
    }

    if (field.required) {
      const value = formData[field.id];
      if (!value || (typeof value === 'string' && !value.trim())) {
        errors.push(`Поле "${field.label}" обязательно для заполнения`);
      }
    }

    // Специальная валидация для email
    if (field.type === 'email' && formData[field.id]) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData[field.id])) {
        errors.push(`Введите корректный email адрес в поле "${field.label}"`);
      }
    }
  });

  return errors;
}

// Функция инициализации приложения
function initApp() {
  const urlParams = getUrlParams();

  // Инициализируем тему
  initTheme();

  // Если есть конфиг в URL, загружаем его
  if (urlParams.config) {
    const loadedConfig = decodeConfig(urlParams.config);
    if (loadedConfig) {
      currentConfig = loadedConfig;
      isEditorMode = urlParams.mode === 'editor';

      // Очищаем webhook URL в режиме editor для безопасности
      if (isEditorMode) {
        currentConfig.webhookUrl = '';
      }
    }
  }

  // Если нет конфига - показываем welcome screen
  if (!currentConfig) {
    showWelcomeScreen();
    return;
  }

  // Инициализируем интерфейс
  if (isEditorMode) {
    initEditor();
  }

  // Устанавливаем начальное состояние кнопок
  toggleEditorMode(isEditorMode);

  // Рендерим форму
  renderForm();

  // Устанавливаем логотип организации
  updateOrganizationLogo(currentConfig.organization || 'LSPD');

  // Инициализируем обработчики формы
  initFormHandlers();
}

// Обработчик отправки формы
function initFormHandlers() {
  if (!contactForm) return;

  // Обработчик кнопки меню (три точки)
  if (editFormBtn && formDropdown) {
    editFormBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      formDropdown.classList.toggle('show');
    });

    // Закрытие меню при клике вне его
    document.addEventListener('click', () => {
      if (formDropdown.classList.contains('show')) {
        formDropdown.classList.remove('show');
      }
    });

    // Обработчик кнопки "Дублировать и настроить"
    if (duplicateBtn) {
      duplicateBtn.addEventListener('click', () => {
        formDropdown.classList.remove('show');

        // Если редактор не инициализирован, инициализируем его
        if (!isEditorMode) {
          initEditor();
          // Очищаем webhook URL при дублировании
          if (webhookUrlInput) {
            webhookUrlInput.value = '';
            currentConfig.webhookUrl = '';
          }
        }
        // Переключаем режим редактора
        toggleEditorMode(!isEditorMode);
      });
    }
  }

  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Получаем данные формы
    const formData = new FormData(contactForm);
    const data = {};

    // Конвертируем FormData в объект
    for (let [key, value] of formData.entries()) {
      data[key] = value;
    }

    // Валидация
    const errors = validateForm(data);
    if (errors.length > 0) {
      showMessage(errors.join('. '), 'error');
      return;
    }

    // Устанавливаем состояние загрузки
    setLoading(true);

    try {
      // Отправляем в Discord
      const result = await sendToDiscord(data);

      if (result.success) {
        showMessage(result.message, 'success');
        contactForm.reset(); // Очищаем форму после успешной отправки

        // Анимация успеха
        if (submitBtn) {
          submitBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
          setTimeout(() => {
            submitBtn.style.background = 'linear-gradient(135deg, #6366f1, #4f46e5)';
          }, 3000);
        }
      } else {
        showMessage(result.message, 'error');
      }
    } catch (error) {
      console.error('Неожиданная ошибка:', error);
      showMessage('Произошла неожиданная ошибка. Попробуйте еще раз.', 'error');
    } finally {
      setLoading(false);
    }
  });
}

// Анимации для интерактивности
document.addEventListener('DOMContentLoaded', () => {
  // Анимация появления формы
  const formWrapper = document.querySelector('.form-wrapper');
  if (formWrapper) {
    formWrapper.style.opacity = '0';
    formWrapper.style.transform = 'translateY(30px)';

    setTimeout(() => {
      formWrapper.style.transition = 'all 0.8s ease-out';
      formWrapper.style.opacity = '1';
      formWrapper.style.transform = 'translateY(0)';
    }, 100);
  }

  // Инициализируем приложение
  initApp();
});

// Обработчик изменения истории браузера (для работы кнопок назад/вперёд)
window.addEventListener('popstate', () => {
  // Перезагружаем страницу при изменении URL
  window.location.reload();
});
