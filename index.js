export const MODULE_NAME = 'PortraitBank';

jQuery(async () => {
    const { 
        extensionSettings, 
        saveSettingsDebounced, 
        characterId 
    } = SillyTavern.getContext();

    // ----- 1. ИНИЦИАЛИЗАЦИЯ НАСТРОЕК -----
    if (!extensionSettings[MODULE_NAME]) {
        extensionSettings[MODULE_NAME] = {};
    }
    // Убедимся, что у текущего персонажа есть запись
    if (!extensionSettings[MODULE_NAME][characterId]) {
        extensionSettings[MODULE_NAME][characterId] = '1girl, brown hair, blue eyes, smiling'; // Значение по умолчанию
        saveSettingsDebounced();
    }

    // ----- 2. СОЗДАНИЕ HTML-БЛОКА -----
    const blockHtml = `
        <div id="portrait_bank_block" class="flex-container">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; padding: 10px; background: var(--black30a); border-radius: 10px;">
                <span style="font-weight: bold; color: var(--white);">
                    <i class="fa-solid fa-image"></i> PortraitBank
                </span>
            </div>
            <textarea id="portrait_bank_textarea"
                style="width: 100%; min-height: 80px; margin-top: 5px; padding: 8px; border-radius: 8px; background: var(--black50a); color: var(--white); border: 1px solid var(--gray500);"
                placeholder="Введите описание внешности для генерации изображения...">${extensionSettings[MODULE_NAME][characterId] || ''}</textarea>
            <small style="display: block; color: var(--gray400); margin-top: 5px; text-align: right;">
                <i class="fa-solid fa-robot"></i> Автоматически вставляется в промпт-префикс
            </small>
        </div>
    `;

    // ----- 3. ВСТАВКА БЛОКА В ИНТЕРФЕЙС -----
    // Лучшее место — под описанием персонажа (правый сайдбар)
    function injectBlock() {
        // Ищем элемент с информацией о персонаже
        const target = $('#character_popups .character_name_prompt, .character_name_block');
        if (target.length) {
            target.after(blockHtml);
            console.log('PortraitBank: блок вставлен');
        } else {
            // Если элемент ещё не загружен — пробуем снова через 0.5 сек
            setTimeout(injectBlock, 500);
        }
    }
    injectBlock();

    // ----- 4. СОХРАНЕНИЕ ПРИ ИЗМЕНЕНИИ ТЕКСТА -----
    $(document).on('input', '#portrait_bank_textarea', function() {
        const currentCharId = SillyTavern.getContext().characterId;
        const newValue = $(this).val();
        extensionSettings[MODULE_NAME][currentCharId] = newValue;
        saveSettingsDebounced();
    });

    // ----- 5. ПЕРЕКЛЮЧЕНИЕ МЕЖДУ ПЕРСОНАЖАМИ -----
    // Если пользователь переключил персонажа — подгружаем его описание
    eventSource.on(eventTypes.CHARACTER_SWITCHED, () => {
        const newCharId = SillyTavern.getContext().characterId;
        const saved = extensionSettings[MODULE_NAME][newCharId] || '1girl, brown hair, blue eyes, smiling';
        $('#portrait_bank_textarea').val(saved);
    });

    console.log('PortraitBank загружен!');
});
// ----- 6. АВТОМАТИЧЕСКАЯ ВСТАВКА В ПРОМПТ -----
eventSource.on(eventTypes.GENERATION_STARTED, () => {
    const context = SillyTavern.getContext();
    const charId = context.characterId;
    const portraitDescription = extensionSettings[MODULE_NAME][charId] || '';
    
    if (portraitDescription) {
        // Используем официальный API для инъекции в промпт
        const { setExtensionPrompt } = SillyTavern.getContext();
        setExtensionPrompt(
            MODULE_NAME,
            `[Character appearance for image generation: ${portraitDescription}]`,
            'after_context', // Вставляем после основного контекста
            10,              // Высокий приоритет
            'system'         // В системный промпт
        );
        console.log('PortraitBank: описание вставлено в промпт');
    }
});