export const MODULE_NAME = 'PortraitBank';

jQuery(async () => {
    // ----- 1. ПОЛУЧАЕМ ВСЁ НЕОБХОДИМОЕ ИЗ КОНТЕКСТА -----
    const context = SillyTavern.getContext();
    const { 
        extensionSettings, 
        saveSettingsDebounced, 
        eventSource, 
        eventTypes,
        characterId 
    } = context;

    // ----- 2. ИНИЦИАЛИЗАЦИЯ НАСТРОЕК -----
    if (!extensionSettings[MODULE_NAME]) {
        extensionSettings[MODULE_NAME] = {};
    }

    // Убедимся, что у текущего персонажа есть запись
    if (!extensionSettings[MODULE_NAME][characterId]) {
        extensionSettings[MODULE_NAME][characterId] = '1girl, brown hair, blue eyes, smiling'; // Значение по умолчанию
        saveSettingsDebounced();
    }

    // ----- 3. ФУНКЦИЯ ОБНОВЛЕНИЯ UI -----
    function updateUI() {
        const currentCharId = SillyTavern.getContext().characterId;
        const savedText = extensionSettings[MODULE_NAME][currentCharId] || '';
        $('#portrait_bank_textarea').val(savedText);
    }

    // ----- 4. СОЗДАЁМ HTML-БЛОК -----
    const blockHtml = `
        <div id="portrait_bank_block" class="flex-container" style="margin: 10px 0; padding: 10px; background: var(--black30a); border-radius: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: bold; color: var(--white);">
                    <i class="fa-solid fa-image"></i> PortraitBank
                </span>
            </div>
            <textarea id="portrait_bank_textarea"
                style="width: 100%; min-height: 80px; margin-top: 8px; padding: 8px; border-radius: 8px; background: var(--black50a); color: var(--white); border: 1px solid var(--gray500);"
                placeholder="Внешность персонажа для AI art (например: 1girl, silver hair, red eyes, fantasy dress)..."></textarea>
            <small style="display: block; color: var(--gray400); margin-top: 4px;">
                ⚡ Автоматически добавляется в промпт при генерации
            </small>
        </div>
    `;

    // ----- 5. ВСТАВЛЯЕМ БЛОК В ИНТЕРФЕЙС -----
    function injectBlock() {
        // Если блок уже есть — не вставляем повторно
        if ($('#portrait_bank_block').length) return;

        // Ищем область под именем персонажа (в правой панели)
        const target = $('.character_name_block, .character_name_prompt').first();
        if (target.length) {
            target.after(blockHtml);
            updateUI();
            console.log('PortraitBank: блок вставлен');
        } else {
            // Если элемент ещё не загрузился — пробуем через 0.3 сек
            setTimeout(injectBlock, 300);
        }
    }
    injectBlock();

    // ----- 6. СОХРАНЕНИЕ ТЕКСТА ПРИ ИЗМЕНЕНИИ -----
    $(document).on('input', '#portrait_bank_textarea', function() {
        const currentCharId = SillyTavern.getContext().characterId;
        const newValue = $(this).val();
        extensionSettings[MODULE_NAME][currentCharId] = newValue;
        saveSettingsDebounced(); // автосохранение с задержкой
    });

    // ----- 7. ПЕРЕКЛЮЧЕНИЕ ПЕРСОНАЖА — ОБНОВЛЯЕМ ТЕКСТ -----
    eventSource.on(eventTypes.CHARACTER_SWITCHED, updateUI);

    // ----- 8. ИНЪЕКЦИЯ В ПРОМПТ ПРИ ГЕНЕРАЦИИ -----
    eventSource.on(eventTypes.GENERATION_STARTED, () => {
        const ctx = SillyTavern.getContext();
        const charId = ctx.characterId;
        const description = extensionSettings[MODULE_NAME][charId] || '';

        if (description.trim()) {
            // Используем официальный API для добавления текста в системный промпт
            ctx.setExtensionPrompt(
                MODULE_NAME,
                `[Character appearance for image: ${description.trim()}]`,
                'after_context', // после основного контекста
                15,              // приоритет (выше = раньше)
                'system'         // роль: system, user, assistant
            );
            console.log('PortraitBank: промпт внедрён');
        }
    });

    console.log('✅ PortraitBank успешно загружен');
});