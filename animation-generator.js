
/**
 * Модуль для генерации пружинных анимаций.
 * Разделен на отдельные ответственности:
 * 1. Получение данных из формы
 * 2. Расчет параметров анимации
 * 3. Генерация keyframes
 */

/**
 * Получает параметры анимации из DOM элементов
 * @returns {Object} Объект с параметрами анимации
 */

function getAnimationParameters() {
  return {
    duration: parseInt(document.getElementById("duration").value), // ms
    amplitudeThresholdPercent: parseFloat(document.getElementById("amplitudeThreshold").value), // %
    damping: parseFloat(document.getElementById("damping").value),
    frequency: parseFloat(document.getElementById("frequency").value),
    rotationMultiplier: parseInt(document.getElementById("rotation").value),
    translationMultiplier: parseInt(document.getElementById("translation").value),
    scaleMultiplier: parseFloat(document.getElementById("scale").value),
    opacityMultiplier: parseFloat(document.getElementById("opacity").value),
    transformOriginX: parseInt(document.getElementById("transformOriginX").value), // %
    transformOriginY: parseInt(document.getElementById("transformOriginY").value), // %
    // Checkbox states for enabled properties
    enabledProperties: {
      rotateX: document.getElementById("enable-rotateX").checked,
      rotateY: document.getElementById("enable-rotateY").checked,
      translateX: document.getElementById("enable-translateX").checked,
      translateY: document.getElementById("enable-translateY").checked,
      scaleX: document.getElementById("enable-scaleX").checked,
      scaleY: document.getElementById("enable-scaleY").checked,
      skewX: document.getElementById("enable-skewX").checked,
      skewY: document.getElementById("enable-skewY").checked,
      opacity: document.getElementById("enable-opacity").checked
    }
  };
}

/**
 * Рассчитывает производные параметры для генерации анимации
 * @param {Object} params - Базовые параметры анимации
 * @returns {Object} Объект с рассчитанными параметрами
 */
function calculateAnimationData(params) {
  const fps = 60; // Фиксированные 60 FPS для плавности
  // duration теперь НЕ влияет на генерацию keyframes - только на CSS animation duration
  const maxTime = 10; // Максимальное время генерации (10 секунд) - достаточно для любой пружины
  const timeStep = 1 / fps; // Шаг времени между кадрами
  const amplitudeThresholdPercent = params.amplitudeThresholdPercent; // Порог остановки в процентах
  const significantFigures = 5; // Точность округления
  const zDepth = 20; // Глубина Z-оси для 3D эффекта

  return {
    fps,
    maxTime, // Используем maxTime вместо totalTime
    timeStep,
    amplitudeThresholdPercent,
    significantFigures,
    zDepth,
    cssAnimationDuration: params.duration, // Сохраняем отдельно для CSS
    ...params // Включаем оригинальные параметры
  };
}

/**
 * Округляет значения с учетом типа свойства для лучшего восприятия
 * @param {number} value - значение для округления
 * @param {string} type - тип свойства ('px', 'deg', 'scale', 'opacity')
 * @returns {number} округленное значение
 */
function roundByType(value, type) {
  switch (type) {
    case 'px': // Пиксели до одной десятой
      return Math.round(value * 10) / 10;
    case 'deg': // Градусы до одной десятой  
      return Math.round(value * 10) / 10;
    case 'scale': // Масштаб до сотых
      return Math.round(value * 100) / 100;
    case 'opacity': // Прозрачность до сотых
      return Math.round(value * 100) / 100;
    default:
      return Math.round(value * 100) / 100;
  }
}

/**
 * Вычисляет компоненты трансформации для одного кадра
 * @param {number} time - Время кадра
 * @param {Spring} spring - Экземпляр пружины
 * @param {Object} data - Данные анимации
 * @returns {Object} Объект с компонентами трансформации
 */
function calculateFrameTransform(time, spring, data) {
  const baseAmplitude = spring.getAmplitude(time);
  const tilt = baseAmplitude; // Используем базовую амплитуду без множителя

  // Вычисляем компоненты движения - переводы (до 0.1px)
  const translateX = roundByType(
    tilt * data.translationMultiplier / 2,
    'px'
  );
  const translateY = roundByType(
    tilt * data.translationMultiplier * -1,
    'px'
  );

  // Углы поворота для более естественного движения (до 0.1°)
  const rotateX = roundByType(
    tilt * data.rotationMultiplier * 1.5,
    'deg'
  );
  const rotateY = roundByType(
    tilt * data.rotationMultiplier,
    'deg'
  );

  // Масштабирование - легкое изменение размера (до 0.01)
  const scaleX = roundByType(
    1 + (tilt * data.scaleMultiplier), // Используем scaleMultiplier
    'scale'
  );
  const scaleY = roundByType(
    1 + (tilt * data.scaleMultiplier * 0.8), // Чуть меньше по Y для естественности
    'scale'
  );

  // Наклон - скос элемента (до 0.1°)
  const skewX = roundByType(
    tilt * data.rotationMultiplier * 0.3,
    'deg'
  );
  const skewY = roundByType(
    tilt * data.rotationMultiplier * 0.2,
    'deg'
  );

  // Прозрачность - легкое изменение opacity (до 0.01)
  const opacity = roundByType(
    Math.max(0.1, Math.min(1, 1 - Math.abs(tilt * data.opacityMultiplier))), // Используем opacityMultiplier
    'opacity'
  );

  return {
    baseAmplitude, // Добавляем базовую амплитуду для проверки порога
    // Backwards compatibility - старые названия
    horizontalOffset: translateX,
    verticalOffset: translateY,
    rotationX: rotateX,
    rotationY: rotateY,
    // Новые компоненты трансформации
    translateX,
    translateY,
    rotateX,
    rotateY,
    scaleX,
    scaleY,
    skewX,
    skewY,
    opacity
  };
}

/**
 * Создает строку комбинированной трансформации на основе выбранных свойств
 * @param {Object} transform - Объект с компонентами трансформации
 * @param {Object} data - Данные анимации с enabledProperties
 * @returns {string} CSS transform строка
 */
function createTransformString(transform, data) {
  const transformParts = [];
  const enabled = data.enabledProperties;

  // Добавляем трансформации в правильном порядке для лучшей производительности
  // Порядок: translate -> rotate -> scale -> skew

  // Translate функции
  if (enabled.translateX || enabled.translateY) {
    // Используем translate() для 2D трансформаций
    const x = enabled.translateX ? `${transform.translateX}px` : '0px';
    const y = enabled.translateY ? `${transform.translateY}px` : '0px';
    transformParts.push(`translate(${x}, ${y})`);
  }

  // Rotate функции
  if (enabled.rotateX) {
    transformParts.push(`rotateX(${transform.rotateX}deg)`);
  }
  if (enabled.rotateY) {
    transformParts.push(`rotateY(${transform.rotateY}deg)`);
  }

  // Scale функции
  if (enabled.scaleX && enabled.scaleY) {
    // Оптимизация: используем scale() если оба включены
    transformParts.push(`scale(${transform.scaleX}, ${transform.scaleY})`);
  } else {
    if (enabled.scaleX) {
      transformParts.push(`scaleX(${transform.scaleX})`);
    }
    if (enabled.scaleY) {
      transformParts.push(`scaleY(${transform.scaleY})`);
    }
  }

  // Skew функции
  if (enabled.skewX) {
    transformParts.push(`skewX(${transform.skewX}deg)`);
  }
  if (enabled.skewY) {
    transformParts.push(`skewY(${transform.skewY}deg)`);
  }

  // Если нет активных трансформаций, возвращаем none
  if (transformParts.length === 0) {
    return 'none';
  }

  return transformParts.join(' ');
}

/**
 * Генерирует CSS keyframes для анимации
 * @param {Object} data - Данные анимации
 * @returns {Object} Объект с CSS keyframes и информацией о генерации
 */
function generateCSSKeyframes(data) {
  const spring = new Spring(data.damping, data.frequency);
  let time = 0;
  let frame = 0;
  let actualFrameCount = 0;
  
  // Первый проход: собираем все кадры до достижения порога
  const frames = [];
  
  while (time < data.maxTime) {
    const transform = calculateFrameTransform(time, spring, data);
    
    // Проверяем, достигли ли порога остановки
    const currentAmplitudePercent = Math.abs(transform.baseAmplitude) * 100;
    if (currentAmplitudePercent <= data.amplitudeThresholdPercent) {
      console.log(`🛑 Остановка генерации: амплитуда ${currentAmplitudePercent.toFixed(2)}% <= порог ${data.amplitudeThresholdPercent}%`);
      break;
    }
    
    frames.push({
      time,
      transform,
      frame
    });
    
    actualFrameCount++;
    time += data.timeStep;
    frame++;
  }
  
  const lastValidTime = frames.length > 0 ? frames[frames.length - 1].time : 0;
  
  // Второй проход: генерируем CSS с правильными процентами
  const keyframes = [`@keyframes spring-animation {`];
  
  frames.forEach((frameData, index) => {
    let percentage;
    if (index === 0) {
      percentage = 0;
    } else {
      // Процент рассчитывается относительно реального времени остановки (до 0.01%)
      percentage = roundByType(100 * (frameData.time / lastValidTime), 'opacity');
    }
    
    const transformString = createTransformString(frameData.transform, data);
    
    // Создаем CSS правило с transform и opacity (если включена)
    const cssRules = [];
    
    // Добавляем transform только если есть активные трансформации
    if (transformString !== 'none') {
      cssRules.push(`transform: ${transformString}`);
    }
    
    // Добавляем opacity если включена
    if (data.enabledProperties.opacity) {
      cssRules.push(`opacity: ${frameData.transform.opacity}`);
    }
    
    // Добавляем keyframe только если есть CSS правила
    if (cssRules.length > 0) {
      const cssRule = cssRules.join('; ') + ';';
      keyframes.push(`  ${percentage}% { ${cssRule} }`);
    }
  });

  // Проверяем, нужно ли добавлять финальный keyframe на 100%
  if (frames.length === 0) {
    const finalRules = [];
    const enabled = data.enabledProperties;
    
    // Добавляем финальные значения только для включенных свойств
    if (enabled.translateX || enabled.translateY ||
        enabled.rotateX || enabled.rotateY ||
        enabled.scaleX || enabled.scaleY || enabled.skewX || enabled.skewY) {
      finalRules.push('transform: none');
    }
    
    if (enabled.opacity) {
      finalRules.push('opacity: 1');
    }
    
    if (finalRules.length > 0) {
      keyframes.push(`  100% { ${finalRules.join('; ')}; }`);
    }
  }
  
  keyframes.push(`}`);

  // Генерируем CSS стиль с transform-origin и summary
  const enabledProps = [];
  if (data.enabledProperties.translateX || data.enabledProperties.translateY) {
    enabledProps.push('translate');
  }
  if (data.enabledProperties.rotateX || data.enabledProperties.rotateY) {
    enabledProps.push('rotate');
  }
  if (data.enabledProperties.scaleX || data.enabledProperties.scaleY) {
    enabledProps.push('scale');
  }
  if (data.enabledProperties.skewX || data.enabledProperties.skewY) {
    enabledProps.push('skew');
  }
  if (data.enabledProperties.opacity) {
    enabledProps.push('opacity');
  }

  const cssStyle = `/* Spring Animation Summary:
 * Frames: ${actualFrameCount}
 * Duration: ${Math.ceil(lastValidTime * 1000)}ms
 * Properties: ${enabledProps.join(', ')}
 * Transform Origin: ${data.transformOriginX}% ${data.transformOriginY}%
 */
.animating .body-square {
  animation: spring-animation ${Math.ceil(lastValidTime * 1000)}ms linear;
  transform-origin: ${data.transformOriginX}% ${data.transformOriginY}%;
}`;

  const fullCSS = keyframes.join("\n") + "\n\n" + cssStyle;

  return {
    css: fullCSS,
    actualFrameCount,
    actualDuration: Math.ceil(lastValidTime * 1000), // Реальная длительность в ms
    stoppedEarly: time < data.maxTime
  };
}

/**
 * Генерирует JavaScript keyframes для Web Animations API
 * @param {Object} data - Данные анимации
 * @returns {Object} Объект с JS keyframes и информацией о генерации
 */
function generateJSKeyframes(data) {
  const spring = new Spring(data.damping, data.frequency);
  let time = 0;
  let frame = 0;
  let actualFrameCount = 0;
  
  // Первый проход: собираем все кадры до достижения порога
  const frames = [];
  
  while (time < data.maxTime) {
    const transform = calculateFrameTransform(time, spring, data);
    
    // Проверяем, достигли ли порога остановки
    const currentAmplitudePercent = Math.abs(transform.baseAmplitude) * 100;
    if (currentAmplitudePercent <= data.amplitudeThresholdPercent) {
      console.log(`🛑 JS: Остановка генерации: амплитуда ${currentAmplitudePercent.toFixed(2)}% <= порог ${data.amplitudeThresholdPercent}%`);
      break;
    }
    
    frames.push({
      time,
      transform,
      frame
    });
    
    actualFrameCount++;
    time += data.timeStep;
    frame++;
  }
  
  const lastValidTime = frames.length > 0 ? frames[frames.length - 1].time : 0;
  
  // Второй проход: генерируем JS keyframes с правильными offset значениями
  const keyframes = [];
  
  frames.forEach((frameData, index) => {
    let offset;
    if (index === 0) {
      offset = 0;
    } else {
      // Offset рассчитывается относительно реального времени остановки (до 0.0001)
      offset = Math.round(frameData.time / lastValidTime * 10000) / 10000;
    }
    
    const transformString = createTransformString(frameData.transform, data);
    
    // Создаем JS keyframe объект с условным включением свойств
    const keyframeProps = [];
    
    // Добавляем transform только если есть активные трансформации
    if (transformString !== 'none') {
      keyframeProps.push(`transform: '${transformString}'`);
    }
    
    // Добавляем opacity если включена
    if (data.enabledProperties.opacity) {
      keyframeProps.push(`opacity: ${frameData.transform.opacity}`);
    }
    
    // Добавляем keyframe только если есть свойства для анимации
    if (keyframeProps.length > 0) {
      keyframes.push(`  { offset: ${offset}, ${keyframeProps.join(', ')} },`);
    }
  });

  // Добавляем финальный keyframe только если последний кадр не имеет offset: 1
  const lastOffset = frames.length > 0 ? 
    Math.round(frames[frames.length - 1].time / lastValidTime * 10000) / 10000 : 0;
  
  if (frames.length === 0 || lastOffset < 1) {
    const finalProps = [];
    const enabled = data.enabledProperties;
    
    // Проверяем, нужно ли добавлять финальные значения
    if (enabled.translateX || enabled.translateY ||
        enabled.rotateX || enabled.rotateY ||
        enabled.scaleX || enabled.scaleY || enabled.skewX || enabled.skewY) {
      finalProps.push(`transform: 'none'`);
    }
    
    if (enabled.opacity) {
      finalProps.push(`opacity: 1`);
    }
    
    if (finalProps.length > 0) {
      keyframes.push(`  { offset: 1, ${finalProps.join(', ')} },`);
    }
  }

  // Генерируем список включенных свойств для summary
  const enabledProps = [];
  if (data.enabledProperties.translateX || data.enabledProperties.translateY) {
    enabledProps.push('translate');
  }
  if (data.enabledProperties.rotateX || data.enabledProperties.rotateY) {
    enabledProps.push('rotate');
  }
  if (data.enabledProperties.scaleX || data.enabledProperties.scaleY) {
    enabledProps.push('scale');
  }
  if (data.enabledProperties.skewX || data.enabledProperties.skewY) {
    enabledProps.push('skew');
  }
  if (data.enabledProperties.opacity) {
    enabledProps.push('opacity');
  }

  const jsCode = `/* Spring Animation Summary:
 * Frames: ${actualFrameCount}
 * Duration: ${Math.ceil(lastValidTime * 1000)}ms
 * Properties: ${enabledProps.join(', ')}
 * Transform Origin: ${data.transformOriginX}% ${data.transformOriginY}%
 */

const springKeyframes = [
${keyframes.join("\n")}
];

// Пример использования:
// const element = document.querySelector('.body-square');
// element.style.transformOrigin = '${data.transformOriginX}% ${data.transformOriginY}%';
// element.animate(springKeyframes, {
//   duration: ${Math.ceil(lastValidTime * 1000)},
//   easing: 'linear',
//   fill: 'forwards'
// });`;

  return {
    js: jsCode,
    actualFrameCount,
    actualDuration: Math.ceil(lastValidTime * 1000),
    stoppedEarly: time < data.maxTime
  };
}

/**
 * Главная функция генерации анимации
 * Объединяет все этапы: получение данных, расчеты и генерацию
 * @returns {Object} Объект с результатами генерации
 */
function generateSpringAnimation() {
  try {
    // 1. Получаем параметры из формы
    const parameters = getAnimationParameters();
    
    // Логируем включенные свойства для отладки
    const enabledProps = Object.keys(parameters.enabledProperties)
      .filter(prop => parameters.enabledProperties[prop]);
    console.log(`🎯 Включенные свойства: ${enabledProps.join(', ')}`);
    
    // Проверяем, что хотя бы одно свойство включено
    if (enabledProps.length === 0) {
      throw new Error('Необходимо выбрать хотя бы одно свойство анимации');
    }
    
    // 2. Рассчитываем производные данные
    const animationData = calculateAnimationData(parameters);
    
    // 3. Генерируем keyframes с новой логикой остановки
    const cssResult = generateCSSKeyframes(animationData);
    const jsResult = generateJSKeyframes(animationData);
    
    // 4. Возвращаем результат с разделением CSS duration и keyframe duration
    return {
      success: true,
      cssKeyframes: cssResult.css,
      jsKeyframes: jsResult.js,
      cssAnimationDuration: animationData.cssAnimationDuration, // CSS анимация duration из слайдера
      keyframesDuration: cssResult.actualDuration, // Реальная длительность keyframes
      totalFrames: cssResult.actualFrameCount,
      amplitudeThresholdPercent: animationData.amplitudeThresholdPercent,
      stoppedEarly: cssResult.stoppedEarly,
      data: animationData
    };
  } catch (error) {
    console.error("❌ Ошибка генерации анимации:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getAnimationParameters,
    calculateAnimationData,
    calculateFrameTransform,
    createTransformString,
    generateCSSKeyframes,
    generateJSKeyframes,
    generateSpringAnimation
  };
}
