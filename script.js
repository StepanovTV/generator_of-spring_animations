// === ВСТРОЕННАЯ ФУНКЦИОНАЛЬНОСТЬ ИЗ BAKE.JS ===

/**
 * Функция для округления числа до указанного количества значащих цифр
 * @param {number} num - число для округления
 * @param {number} n - количество значащих цифр 
 * @returns {number} округленное число
 */
const roundToSignificantFigures = (num, n) => {
  // Обработка специальных случаев
  if (num === 0) return 0;
  if (!isFinite(num)) return num;
  
  const d = Math.ceil(Math.log10(num < 0 ? -num : num));
  const power = n - d;
  const magnitude = Math.pow(10, power);
  const shifted = Math.round(num * magnitude);
  return shifted / magnitude;
};

/**
 * Класс для моделирования физической пружины с затуханием
 * Используется для создания естественных колебательных движений
 */
class Spring {
  constructor(dampingConstant, naturalFrequency) {
    this.dampingConstant = dampingConstant; // Коэффициент затухания
    this.naturalFrequency = naturalFrequency; // Собственная частота колебаний
  }

  /**
   * Вычисляет амплитуду колебаний в заданный момент времени
   * Формула: e^(-dampingConstant * time) * cos(naturalFrequency * time)
   * @param {number} time - время в секундах
   * @returns {number} амплитуда колебаний
   */
  getAmplitude(time) {
    return (
      Math.pow(Math.E, -this.dampingConstant * time) *
      Math.cos(this.naturalFrequency * time)
    );
  }
}

/**
 * Класс для управления временной последовательностью кадров
 * Позволяет итерироваться по времени с заданным шагом
 */
class Marcher {
  constructor(step, cutOff) {
    this.time = 0; // Текущее время
    this.frame = 0; // Номер текущего кадра
    this.step = step; // Шаг времени между кадрами
    this.cutOff = cutOff; // Функция условия остановки
  }

  /**
   * Запускает итерацию по кадрам с вызовом callback функции
   * @param {Function} callback - функция, вызываемая для каждого кадра
   */
  march(callback) {
    while (!this.cutOff(this.time, this.frame)) {
      callback(this.time, this.frame);
      this.time += this.step;
      this.frame++;
    }
  }
}

// === СИСТЕМА ГЕНЕРАЦИИ АНИМАЦИИ ===

let generatedCSS = "";
let generatedJS = "";
let cssAnimationDuration = 0; // CSS анимация duration
let keyframesDuration = 0; // Реальная длительность keyframes

/**
 * Генерирует единую анимацию используя модульную систему
 * Новая упрощенная функция, которая делегирует работу animation-generator.js
 */
function generateAnimation() {
  // Используем модульную функцию генерации
  const result = generateSpringAnimation();
  
  if (!result.success) {
    console.error("❌ Ошибка генерации анимации:", result.error);
    alert("Ошибка при генерации анимации. Проверьте консоль для деталей.");
    return;
  }
  
  // Обновляем глобальные переменные
  generatedCSS = result.cssKeyframes;
  generatedJS = result.jsKeyframes;
  cssAnimationDuration = result.cssAnimationDuration; // CSS duration из слайдера
  keyframesDuration = result.keyframesDuration; // Реальная длительность

  // Обновляем вывод в интерфейсе
  updateOutput();

  // Обновляем динамические стили для демо
  updateDynamicStyles();

  console.log(
    `✅ Анимация сгенерирована: ${result.totalFrames} кадров, CSS duration: ${result.cssAnimationDuration}ms, keyframes duration: ${result.keyframesDuration}ms, порог остановки ${result.amplitudeThresholdPercent}%${result.stoppedEarly ? ' (остановлена досрочно)' : ''}`
  );
}

/**
 * Обновляет вывод сгенерированного кода в интерфейсе
 */
function updateOutput() {
  const cssOutput =
    generatedCSS || '/* Нажмите "Генерировать" для создания CSS keyframes */';
  const jsOutput =
    generatedJS ||
    '// Нажмите "Генерировать" для создания JavaScript keyframes';

  document.getElementById("css-output").textContent = cssOutput;
  document.getElementById("js-output").textContent = jsOutput;
}

/**
 * Обновляет динамические стили для демонстрации
 */
function updateDynamicStyles() {
  const dynamicStyles = document.getElementById("dynamicStyles");
  dynamicStyles.textContent =
    generatedCSS +
    `
        .animating .body-square {
            animation: spring-animation ${cssAnimationDuration}ms linear;
        }
    `;
}

// === УПРАВЛЕНИЕ ИНТЕРФЕЙСОМ ===

const bodyContainer = document.getElementById("animationDemo");
const playBtn = document.getElementById("playBtn");
const resetBtn = document.getElementById("resetBtn");
const generateBtn = document.getElementById("generateBtn");

let isAnimating = false;
let animationTimeout;

/**
 * Запускает CSS анимацию
 */
function playAnimation() {
  if (isAnimating) return;

  // Проверяем, была ли сгенерирована анимация
  if (!generatedCSS) {
    alert('Сначала нажмите "Генерировать" для создания анимации!');
    return;
  }

  isAnimating = true;
  playBtn.disabled = true;
  playBtn.textContent = "⏸ Анимация...";

  bodyContainer.classList.add("animating");

  animationTimeout = setTimeout(() => {
    resetAnimation();
  }, cssAnimationDuration || 800);
}

/**
 * Сбрасывает анимацию
 */
function resetAnimation() {
  isAnimating = false;
  playBtn.disabled = false;
  playBtn.textContent = "▶ Запуск";

  bodyContainer.classList.remove("animating");

  if (animationTimeout) {
    clearTimeout(animationTimeout);
    animationTimeout = null;
  }
}

/**
 * Копирует текст в буфер обмена
 */
async function copyToClipboard(elementId) {
  const element = document.getElementById(elementId);
  const text = element.textContent;

  try {
    await navigator.clipboard.writeText(text);
    console.log("✅ Код скопирован в буфер обмена");

    // Временно меняем текст кнопки
    const button = event.target;
    const originalText = button.textContent;
    button.textContent = "✅ Скопировано!";
    setTimeout(() => {
      button.textContent = originalText;
    }, 2000);
  } catch (err) {
    console.error("❌ Ошибка копирования:", err);
  }
}

// === ПАРАМЕТРЫ ПО УМОЛЧАНИЮ ===
const DEFAULT_PARAMETERS = {
  duration: 800,     // ms - длительность анимации
  amplitudeThreshold: 0.2,    // % - порог остановки генерации кадров
  damping: 3,
  frequency: 20,
  rotation: 20,
  translation: 3,
  scale: 0.2,        // множитель для scale эффектов
  opacity: 0.3,      // множитель для opacity эффектов
  transformOriginX: 50,  // % - точка трансформации по X
  transformOriginY: 50,  // % - точка трансформации по Y
  // Состояния чекбоксов по умолчанию
  enabledProperties: {
    rotateX: true,
    rotateY: true,
    translateX: true,
    translateY: true,
    scaleX: false,
    scaleY: false,
    skewX: false,
    skewY: false,
    opacity: false
  }
};

/**
 * Обновляет отображение значения слайдера
 * @param {string} sliderId - ID слайдера
 * @param {string} valueDisplayId - ID элемента для отображения значения
 * @param {string} unit - единица измерения (необязательно)
 */
function updateSliderValue(sliderId, valueDisplayId, unit = '') {
  const slider = document.getElementById(sliderId);
  const display = document.getElementById(valueDisplayId);
  
  if (!slider) {
    console.error(`❌ Не найден слайдер с id: ${sliderId}`);
    return false;
  }
  
  if (!display) {
    console.error(`❌ Не найден элемент отображения с id: ${valueDisplayId}`);
    return false;
  }
  
  display.textContent = slider.value + unit;
  console.log(`✅ Обновлено ${sliderId}: ${slider.value}${unit}`);
  return true;
}

/**
 * Сбрасывает все параметры к значениям по умолчанию
 */
function resetToDefaults() {
  // Сбрасываем значения слайдеров
  Object.keys(DEFAULT_PARAMETERS).forEach(param => {
    if (param !== 'enabledProperties') {
      const slider = document.getElementById(param);
      if (slider) {
        slider.value = DEFAULT_PARAMETERS[param];
      }
    }
  });
  
  // Сбрасываем состояния чекбоксов
  Object.keys(DEFAULT_PARAMETERS.enabledProperties).forEach(property => {
    const checkbox = document.getElementById(`enable-${property}`);
    if (checkbox) {
      checkbox.checked = DEFAULT_PARAMETERS.enabledProperties[property];
    }
  });
  
  // Обновляем отображаемые значения
  updateAllSliderValues();
  
  // Сбрасываем анимацию
  resetAnimation();
  
  // Очищаем сгенерированный код
  generatedCSS = ""; 
  generatedJS = "";
  updateOutput();
  
  console.log("🔄 Параметры сброшены к значениям по умолчанию");
}

/**
 * Обновляет все отображаемые значения слайдеров
 */
function updateAllSliderValues() {
  updateSliderValue('duration', 'duration-value', 'ms');
  updateSliderValue('amplitudeThreshold', 'amplitudeThreshold-value', '%');
  updateSliderValue('damping', 'damping-value');
  updateSliderValue('frequency', 'frequency-value');
  updateSliderValue('rotation', 'rotation-value', '°');
  updateSliderValue('translation', 'translation-value', 'px');
  updateSliderValue('scale', 'scale-value');
  updateSliderValue('opacity', 'opacity-value');
  updateSliderValue('transformOriginX', 'transformOriginX-value', '%');
  updateSliderValue('transformOriginY', 'transformOriginY-value', '%');
}

// === ОБРАБОТЧИКИ СОБЫТИЙ ===

// Кнопки управления
playBtn.addEventListener("click", playAnimation);
resetBtn.addEventListener("click", resetToDefaults);
generateBtn.addEventListener("click", generateAnimation);

// Обработчики для слайдеров
document.getElementById('duration').addEventListener('input', () => updateSliderValue('duration', 'duration-value', 'ms'));
document.getElementById('amplitudeThreshold').addEventListener('input', () => updateSliderValue('amplitudeThreshold', 'amplitudeThreshold-value', '%'));
document.getElementById('damping').addEventListener('input', () => updateSliderValue('damping', 'damping-value'));
document.getElementById('frequency').addEventListener('input', () => updateSliderValue('frequency', 'frequency-value'));
document.getElementById('rotation').addEventListener('input', () => updateSliderValue('rotation', 'rotation-value', '°'));
document.getElementById('translation').addEventListener('input', () => updateSliderValue('translation', 'translation-value', 'px'));
document.getElementById('scale').addEventListener('input', () => updateSliderValue('scale', 'scale-value'));
document.getElementById('opacity').addEventListener('input', () => updateSliderValue('opacity', 'opacity-value'));
document.getElementById('transformOriginX').addEventListener('input', () => updateSliderValue('transformOriginX', 'transformOriginX-value', '%'));
document.getElementById('transformOriginY').addEventListener('input', () => updateSliderValue('transformOriginY', 'transformOriginY-value', '%'));

// Обработчики для чекбоксов свойств анимации
const propertyCheckboxes = ['rotateX', 'rotateY', 'translateX', 'translateY', 'scaleX', 'scaleY', 'skewX', 'skewY', 'opacity'];
propertyCheckboxes.forEach(property => {
  const checkbox = document.getElementById(`enable-${property}`);
  if (checkbox) {
    checkbox.addEventListener('change', () => {
      console.log(`✅ Свойство ${property}: ${checkbox.checked ? 'включено' : 'выключено'}`);
    });
  }
});

// Переключение вкладок
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", (e) => {
    const tabName = e.target.dataset.tab;

    // Убираем активный класс со всех вкладок и контента
    document
      .querySelectorAll(".tab")
      .forEach((t) => t.classList.remove("active"));
    document
      .querySelectorAll(".tab-content")
      .forEach((tc) => tc.classList.remove("active"));

    // Добавляем активный класс к выбранной вкладке
    e.target.classList.add("active");
    document.getElementById(`${tabName}-tab`).classList.add("active");
  });
});

// Горячие клавиши
document.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    if (!isAnimating) {
      playAnimation();
    }
  } else if (e.code === "Escape") {
    resetAnimation();
  } else if (e.code === "KeyG" && e.ctrlKey) {
    e.preventDefault();
    generateAnimation();
  }
});

// === ИНИЦИАЛИЗАЦИЯ ===

// Инициализация при загрузке страницы
document.addEventListener("DOMContentLoaded", () => {
  // Обновляем отображение всех значений слайдеров
  updateAllSliderValues();
  
  // Устанавливаем пустые значения по умолчанию для кода
  updateOutput();

  console.log("🎮 Управление:");
  console.log("Пробел - запустить анимацию");
  console.log("Escape - сбросить анимацию");
  console.log("Ctrl+G - сгенерировать заново");
  console.log("🔄 Кнопка 'Сброс' восстанавливает параметры по умолчанию");
});
