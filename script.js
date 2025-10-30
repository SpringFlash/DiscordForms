// === ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ===

// Конфигурация по умолчанию
let currentConfig = null;

// Режим работы (editor/view)
let isEditorMode = false;

// DOM элементы
const container = document.querySelector(".container");
const editorPanel = document.getElementById("editorPanel");
const formWrapper = document.querySelector(".form-wrapper");
const formPreview = document.getElementById("formPreview");
const contactForm = document.getElementById("contactForm");
const submitBtn = document.querySelector(".submit-btn");
const btnText = document.querySelector(".btn-text");
const btnIcon = document.querySelector(".submit-btn i");
const responseMessage = document.getElementById("response");

// Элементы редактора
const formTitleInput = document.getElementById("formTitle");
const formDescriptionInput = document.getElementById("formDescription");
const customMessageInput = document.getElementById("customMessage");
const webhookUrlInput = document.getElementById("webhookUrl");
const webhookUsernameInput = document.getElementById("webhookUsername");
const webhookAvatarUrlInput = document.getElementById("webhookAvatarUrl");
const fieldsList = document.getElementById("fieldsList");
const addFieldBtn = document.getElementById("addFieldBtn");
const generateUrlBtn = document.getElementById("generateUrlBtn");
const shareUrlDiv = document.getElementById("shareUrl");
const shareUrlInput = document.getElementById("shareUrlInput");
const copyUrlBtn = document.getElementById("copyUrlBtn");
const pageTitle = document.getElementById("pageTitle");

// Кнопка редактирования формы и выпадающее меню
const editFormBtn = document.getElementById("editFormBtn");
const formDropdown = document.getElementById("formDropdown");
const duplicateBtn = document.getElementById("duplicateBtn");

// === УТИЛИТАРНЫЕ ФУНКЦИИ ===

// Функция для показа сообщений
function showMessage(message, type = "success") {
  responseMessage.textContent = message;
  responseMessage.className = `response-message ${type} show`;

  // Автоматически скрываем сообщение через 5 секунд
  setTimeout(() => {
    responseMessage.classList.remove("show");
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
    console.error("Ошибка декодирования конфига:", e);
    return null;
  }
}

// Функция для получения параметров URL
function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    config: params.get("config"),
    mode: params.get("mode"),
  };
}

// Функция для обновления URL без перезагрузки
function updateUrl(config = null, mode = null) {
  const url = new URL(window.location);

  if (config) {
    url.searchParams.set("config", encodeConfig(config));
  }

  if (mode !== null) {
    if (mode) {
      url.searchParams.set("mode", "editor");
    } else {
      url.searchParams.delete("mode");
    }
  }

  window.history.pushState({}, "", url);
}

// Функция для копирования текста в буфер обмена
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error("Ошибка копирования:", err);
    return false;
  }
}

// Функция для генерации уникального ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Функция для создания пустого конфига
function createEmptyConfig() {
  return {
    title: "Моя форма",
    description: "Описание формы",
    customMessage: "",
    webhookUrl: "",
    webhookUsername: "Форма обратной связи",
    webhookAvatarUrl: "https://pngimg.com/uploads/discord/discord_PNG3.png",
    fields: [
      {
        id: generateId(),
        type: "text",
        label: "Имя",
        placeholder: "",
        required: true,
        icon: "user",
      },
      {
        id: generateId(),
        type: "email",
        label: "Email",
        placeholder: "",
        required: true,
        icon: "envelope",
      },
      {
        id: generateId(),
        type: "textarea",
        label: "Сообщение",
        placeholder: "",
        required: true,
        icon: "comment",
      },
    ],
  };
}

// Функция для показа welcome screen
function showWelcomeScreen() {
  const formWrapper = document.querySelector(".form-wrapper");

  // Обновляем title страницы
  document.title = "Discord Forms - Создай свою форму";
  document.getElementById("pageTitle").textContent = "Discord Forms";

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
  const createFormBtn = document.getElementById("createFormBtn");
  if (createFormBtn) {
    createFormBtn.addEventListener("click", () => {
      currentConfig = createEmptyConfig();
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
      btnText.textContent = "Отправка...";
      btnIcon.className = "fas fa-spinner loading";
    } else {
      btnText.textContent = "Отправить сообщение";
      btnIcon.className = "fas fa-arrow-right";
    }
  }
}

// Функция для переключения режима редактор/просмотр
function toggleEditorMode(showEditor) {
  isEditorMode = showEditor;

  if (showEditor) {
    editorPanel.classList.add("show");

    // Включаем режим редактора для контейнера
    if (container) {
      container.classList.add("editor-mode");
    }

    // Делаем форму превью
    if (formPreview) {
      formPreview.classList.add("preview");
    }
  } else {
    editorPanel.classList.remove("show");

    // Выключаем режим редактора
    if (container) {
      container.classList.remove("editor-mode");
    }

    // Убираем превью
    if (formPreview) {
      formPreview.classList.remove("preview");
    }
  }

  updateUrl(null, showEditor);
}

// Функция для инициализации редактора
function initEditor() {
  // Заполняем поля редактора текущими значениями
  formTitleInput.value = currentConfig.title;
  formDescriptionInput.value = currentConfig.description;
  customMessageInput.value = currentConfig.customMessage || "";
  webhookUrlInput.value = currentConfig.webhookUrl;
  webhookUsernameInput.value =
    currentConfig.webhookUsername || currentConfig.title;
  webhookAvatarUrlInput.value = currentConfig.webhookAvatarUrl || "";

  // Очищаем список полей и добавляем существующие
  fieldsList.innerHTML = "";
  currentConfig.fields.forEach((field) => {
    addFieldToEditor(field);
  });

  // Обработчики событий редактора
  formTitleInput.addEventListener("input", updateConfigFromEditor);
  formDescriptionInput.addEventListener("input", updateConfigFromEditor);
  customMessageInput.addEventListener("input", updateConfigFromEditor);
  webhookUrlInput.addEventListener("input", updateConfigFromEditor);
  webhookUsernameInput.addEventListener("input", updateConfigFromEditor);
  webhookAvatarUrlInput.addEventListener("input", updateConfigFromEditor);

  addFieldBtn.addEventListener("click", () => {
    const newField = {
      id: generateId(),
      type: "text",
      label: "Новое поле",
      placeholder: "",
      required: false,
      icon: "question",
    };
    currentConfig.fields.push(newField);
    addFieldToEditor(newField);
    updateConfigFromEditor();
    renderForm();
  });

  generateUrlBtn.addEventListener("click", generateShareUrl);
  copyUrlBtn.addEventListener("click", copyShareUrl);
}

// === ФУНКЦИИ РАБОТЫ С ПОЛЯМИ ===

// Функция для добавления поля в редактор
function addFieldToEditor(field) {
  const fieldItem = document.createElement("div");
  fieldItem.className = "field-item";
  fieldItem.dataset.fieldId = field.id;

  const iconMap = {
    user: "👤",
    envelope: "📧",
    tag: "🏷️",
    "exclamation-triangle": "⚡",
    comment: "💬",
    newspaper: "📰",
    question: "❓",
  };

  fieldItem.innerHTML = `
    <div class="field-header">
      <span class="field-title">${iconMap[field.icon] || "❓"} ${
    field.label
  }</span>
      <div class="field-actions">
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
          <option value="text" ${
            field.type === "text" ? "selected" : ""
          }>Текст</option>
          <option value="email" ${
            field.type === "email" ? "selected" : ""
          }>Email</option>
          <option value="textarea" ${
            field.type === "textarea" ? "selected" : ""
          }>Текстовая область</option>
          <option value="select" ${
            field.type === "select" ? "selected" : ""
          }>Выпадающий список</option>
          <option value="radio" ${
            field.type === "radio" ? "selected" : ""
          }>Радиокнопки</option>
          <option value="checkbox" ${
            field.type === "checkbox" ? "selected" : ""
          }>Чекбокс</option>
        </select>
      </div>
      <div class="field-config-item">
        <label>Иконка</label>
        <select class="field-icon">
          <option value="user" ${
            field.icon === "user" ? "selected" : ""
          }>Пользователь</option>
          <option value="envelope" ${
            field.icon === "envelope" ? "selected" : ""
          }>Email</option>
          <option value="tag" ${
            field.icon === "tag" ? "selected" : ""
          }>Тег</option>
          <option value="exclamation-triangle" ${
            field.icon === "exclamation-triangle" ? "selected" : ""
          }>Приоритет</option>
          <option value="comment" ${
            field.icon === "comment" ? "selected" : ""
          }>Сообщение</option>
          <option value="newspaper" ${
            field.icon === "newspaper" ? "selected" : ""
          }>Новости</option>
          <option value="question" ${
            field.icon === "question" ? "selected" : ""
          }>Вопрос</option>
        </select>
      </div>
      <div class="field-config-item">
        <label>Название поля</label>
        <input type="text" class="field-label" value="${field.label}" />
      </div>
      <div class="field-config-item">
        <label>Placeholder</label>
        <input type="text" class="field-placeholder" value="${
          field.placeholder || ""
        }" />
      </div>
      <div class="field-config-item">
        <label>Обязательное</label>
        <input type="checkbox" class="field-required" ${
          field.required ? "checked" : ""
        } />
      </div>
      <div class="field-config-item field-options" style="display: ${
        field.type === "select" || field.type === "radio" ? "block" : "none"
      };">
        <label>Варианты (через запятую)</label>
        <input type="text" class="field-options-input" value="${
          field.options ? field.options.join(", ") : ""
        }" />
      </div>
    </div>
  `;

  // Обработчики событий для поля
  const editBtn = fieldItem.querySelector(".edit");
  const deleteBtn = fieldItem.querySelector(".delete");
  const typeSelect = fieldItem.querySelector(".field-type");
  const labelInput = fieldItem.querySelector(".field-label");
  const placeholderInput = fieldItem.querySelector(".field-placeholder");
  const iconSelect = fieldItem.querySelector(".field-icon");
  const requiredCheckbox = fieldItem.querySelector(".field-required");
  const optionsContainer = fieldItem.querySelector(".field-options");
  const optionsInput = fieldItem.querySelector(".field-options-input");

  editBtn.addEventListener("click", () => {
    const config = fieldItem.querySelector(".field-config");
    config.style.display = config.style.display === "none" ? "grid" : "none";
  });

  deleteBtn.addEventListener("click", () => {
    if (confirm("Удалить это поле?")) {
      currentConfig.fields = currentConfig.fields.filter(
        (f) => f.id !== field.id
      );
      fieldItem.remove();
      updateConfigFromEditor();
      renderForm();
    }
  });

  typeSelect.addEventListener("change", (e) => {
    const newType = e.target.value;
    field.type = newType;
    optionsContainer.style.display =
      newType === "select" || newType === "radio" ? "block" : "none";
    updateConfigFromEditor();
    renderForm();
  });

  labelInput.addEventListener("input", (e) => {
    field.label = e.target.value;
    fieldItem.querySelector(".field-title").textContent = `${
      iconMap[field.icon] || "❓"
    } ${field.label}`;
    updateConfigFromEditor();
    renderForm();
  });

  placeholderInput.addEventListener("input", (e) => {
    field.placeholder = e.target.value;
    updateConfigFromEditor();
    renderForm();
  });

  iconSelect.addEventListener("change", (e) => {
    field.icon = e.target.value;
    fieldItem.querySelector(".field-title").textContent = `${
      iconMap[field.icon] || "❓"
    } ${field.label}`;
    updateConfigFromEditor();
    renderForm();
  });

  requiredCheckbox.addEventListener("change", (e) => {
    field.required = e.target.checked;
    updateConfigFromEditor();
    renderForm();
  });

  optionsInput.addEventListener("input", (e) => {
    field.options = e.target.value
      .split(",")
      .map((opt) => opt.trim())
      .filter((opt) => opt);
    updateConfigFromEditor();
    renderForm();
  });

  fieldsList.appendChild(fieldItem);
}

// Функция для обновления конфига из редактора
function updateConfigFromEditor() {
  currentConfig.title = formTitleInput.value || "Форма обратной связи";
  currentConfig.description = formDescriptionInput.value || "Заполните форму";
  currentConfig.customMessage = customMessageInput.value || "";
  currentConfig.webhookUrl = webhookUrlInput.value;
  currentConfig.webhookUsername =
    webhookUsernameInput.value || currentConfig.title;
  currentConfig.webhookAvatarUrl =
    webhookAvatarUrlInput.value ||
    "https://pngimg.com/uploads/discord/discord_PNG3.png";

  // Обновляем заголовок страницы
  pageTitle.textContent = currentConfig.title;
  document.querySelector("h1").textContent = currentConfig.title;
  document.querySelector(".header p").textContent = currentConfig.description;

  updateUrl(currentConfig);
}

// Функция для генерации URL для шаринга
function generateShareUrl() {
  if (!currentConfig.webhookUrl.trim()) {
    showMessage("Укажите Discord Webhook URL перед генерацией ссылки", "error");
    return;
  }

  const shareConfig = { ...currentConfig };
  const baseUrl = window.location.origin + window.location.pathname;
  const shareUrl = `${baseUrl}?config=${encodeConfig(shareConfig)}`;

  shareUrlInput.value = shareUrl;
  shareUrlDiv.style.display = "block";

  showMessage("Ссылка для шаринга сгенерирована!", "success");
}

// Функция для копирования URL
async function copyShareUrl() {
  const url = shareUrlInput.value;
  const success = await copyToClipboard(url);

  if (success) {
    copyUrlBtn.classList.add("copied");
    copyUrlBtn.innerHTML = '<i class="fas fa-check"></i> Скопировано!';

    setTimeout(() => {
      copyUrlBtn.classList.remove("copied");
      copyUrlBtn.innerHTML = '<i class="fas fa-copy"></i> Копировать';
    }, 2000);

    showMessage("Ссылка скопирована в буфер обмена!", "success");
  } else {
    showMessage("Не удалось скопировать ссылку", "error");
  }
}

// Функция для рендеринга формы на основе конфига
function renderForm() {
  const formHeader = formWrapper.querySelector(".header h1");
  const formDescription = formWrapper.querySelector(".header p");
  const formFields = formWrapper.querySelector(".contact-form");

  // Обновляем заголовок и описание
  formHeader.textContent = currentConfig.title;
  formDescription.textContent = currentConfig.description;

  // Очищаем форму, оставляя кнопку отправки
  const submitBtn = formFields.querySelector(".submit-btn");
  formFields.innerHTML = "";
  formFields.appendChild(submitBtn);

  // Добавляем поля
  currentConfig.fields.forEach((field) => {
    const fieldGroup = document.createElement("div");
    fieldGroup.className = "form-group";

    const label = document.createElement("label");
    label.setAttribute("for", field.id);
    label.innerHTML = `<i class="fas fa-${field.icon}"></i> ${field.label}${
      field.required ? " *" : ""
    }`;

    let inputElement;

    switch (field.type) {
      case "textarea":
        inputElement = document.createElement("textarea");
        inputElement.rows = 5;
        break;

      case "select":
        inputElement = document.createElement("select");
        if (field.options) {
          const defaultOption = document.createElement("option");
          defaultOption.value = "";
          defaultOption.textContent = "Выберите вариант";
          inputElement.appendChild(defaultOption);

          field.options.forEach((option) => {
            const optionElement = document.createElement("option");
            optionElement.value = option;
            optionElement.textContent = option;
            inputElement.appendChild(optionElement);
          });
        }
        break;

      case "radio":
        const radioGroup = document.createElement("div");
        radioGroup.className = "radio-group";

        if (field.options) {
          field.options.forEach((option, index) => {
            const radioLabel = document.createElement("label");
            radioLabel.className = "radio-label";

            radioLabel.innerHTML = `
              <input type="radio" name="${field.id}" value="${option}" ${
              index === 0 && field.defaultValue === option ? "checked" : ""
            } />
              <span class="radio-custom"></span>
              ${option}
            `;

            radioGroup.appendChild(radioLabel);
          });
        }

        inputElement = radioGroup;
        break;

      case "checkbox":
        const checkboxLabel = document.createElement("label");
        checkboxLabel.className = "checkbox-label";

        checkboxLabel.innerHTML = `
          <input type="checkbox" id="${field.id}" name="${field.id}" />
          <span class="checkbox-custom"></span>
          ${field.label}
        `;

        fieldGroup.appendChild(checkboxLabel);
        break;

      default: // text, email
        inputElement = document.createElement("input");
        inputElement.type = field.type;
    }

    if (inputElement && inputElement.tagName !== "DIV") {
      inputElement.id = field.id;
      inputElement.name = field.id;
      if (field.placeholder) inputElement.placeholder = field.placeholder;
      if (field.required) inputElement.required = true;

      fieldGroup.appendChild(label);
      fieldGroup.appendChild(inputElement);

      if (inputElement.type !== "checkbox") {
        const inputLine = document.createElement("div");
        inputLine.className = "input-line";
        fieldGroup.appendChild(inputLine);
      }
    } else if (inputElement && inputElement.tagName === "DIV") {
      fieldGroup.appendChild(label);
      fieldGroup.appendChild(inputElement);
    }

    formFields.insertBefore(fieldGroup, submitBtn);
  });
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
        currentConfig.webhookAvatarUrl ||
        "https://pngimg.com/uploads/discord/discord_PNG3.png",
    },
  };

  // Добавляем поля из конфига
  currentConfig.fields.forEach((field, index) => {
    const value = formData[field.id];
    if (value !== undefined && value !== "") {
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
      if (field.type === "checkbox") {
        displayValue = value === "on" ? "✅ Да" : "❌ Нет";
      }

      // Ограничиваем длину для Discord
      if (typeof displayValue === "string" && displayValue.length > 1024) {
        displayValue = displayValue.substring(0, 1021) + "...";
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

// Функция для отправки данных в Discord
async function sendToDiscord(formData) {
  if (!currentConfig.webhookUrl) {
    return { success: false, message: "Webhook URL не настроен" };
  }

  const embed = createDiscordEmbed(formData);

  const payload = {
    content: currentConfig.customMessage || null,
    embeds: [embed],
    username: currentConfig.webhookUsername || currentConfig.title,
    avatar_url:
      currentConfig.webhookAvatarUrl ||
      "https://pngimg.com/uploads/discord/discord_PNG3.png",
  };

  try {
    const response = await fetch(currentConfig.webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      return { success: true, message: "Сообщение успешно отправлено! 🎉" };
    } else {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `HTTP ${response.status}: ${errorData.message || "Неизвестная ошибка"}`
      );
    }
  } catch (error) {
    console.error("Ошибка отправки в Discord:", error);
    return {
      success: false,
      message: `Ошибка при отправке: ${error.message}. Попробуйте еще раз.`,
    };
  }
}

// Функция валидации формы
function validateForm(formData) {
  const errors = [];

  // Проверяем обязательные поля из конфига
  currentConfig.fields.forEach((field) => {
    if (field.required) {
      const value = formData[field.id];
      if (!value || (typeof value === "string" && !value.trim())) {
        errors.push(`Поле "${field.label}" обязательно для заполнения`);
      }
    }

    // Специальная валидация для email
    if (field.type === "email" && formData[field.id]) {
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

  // Если есть конфиг в URL, загружаем его
  if (urlParams.config) {
    const loadedConfig = decodeConfig(urlParams.config);
    if (loadedConfig) {
      currentConfig = loadedConfig;
      isEditorMode = urlParams.mode === "editor";
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

  // Инициализируем обработчики формы
  initFormHandlers();
}

// Обработчик отправки формы
function initFormHandlers() {
  if (!contactForm) return;

  // Обработчик кнопки меню (три точки)
  if (editFormBtn && formDropdown) {
    editFormBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      formDropdown.classList.toggle("show");
    });

    // Закрытие меню при клике вне его
    document.addEventListener("click", () => {
      if (formDropdown.classList.contains("show")) {
        formDropdown.classList.remove("show");
      }
    });

    // Обработчик кнопки "Дублировать и настроить"
    if (duplicateBtn) {
      duplicateBtn.addEventListener("click", () => {
        formDropdown.classList.remove("show");

        // Если редактор не инициализирован, инициализируем его
        if (!isEditorMode) {
          initEditor();
          // Очищаем webhook URL при дублировании
          if (webhookUrlInput) {
            webhookUrlInput.value = "";
            currentConfig.webhookUrl = "";
          }
        }
        // Переключаем режим редактора
        toggleEditorMode(!isEditorMode);
      });
    }
  }

  contactForm.addEventListener("submit", async (e) => {
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
      showMessage(errors.join(". "), "error");
      return;
    }

    // Устанавливаем состояние загрузки
    setLoading(true);

    try {
      // Отправляем в Discord
      const result = await sendToDiscord(data);

      if (result.success) {
        showMessage(result.message, "success");
        contactForm.reset(); // Очищаем форму после успешной отправки

        // Анимация успеха
        if (submitBtn) {
          submitBtn.style.background =
            "linear-gradient(135deg, #10b981, #059669)";
          setTimeout(() => {
            submitBtn.style.background =
              "linear-gradient(135deg, #6366f1, #4f46e5)";
          }, 3000);
        }
      } else {
        showMessage(result.message, "error");
      }
    } catch (error) {
      console.error("Неожиданная ошибка:", error);
      showMessage("Произошла неожиданная ошибка. Попробуйте еще раз.", "error");
    } finally {
      setLoading(false);
    }
  });
}

// Анимации для интерактивности
document.addEventListener("DOMContentLoaded", () => {
  // Анимация появления формы
  const formWrapper = document.querySelector(".form-wrapper");
  if (formWrapper) {
    formWrapper.style.opacity = "0";
    formWrapper.style.transform = "translateY(30px)";

    setTimeout(() => {
      formWrapper.style.transition = "all 0.8s ease-out";
      formWrapper.style.opacity = "1";
      formWrapper.style.transform = "translateY(0)";
    }, 100);
  }

  // Инициализируем приложение
  initApp();
});

// Обработчик изменения истории браузера (для работы кнопок назад/вперёд)
window.addEventListener("popstate", () => {
  // Перезагружаем страницу при изменении URL
  window.location.reload();
});
