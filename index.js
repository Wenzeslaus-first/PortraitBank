export const MODULE_NAME = 'PortraitBank';

jQuery(async () => {
    const context = SillyTavern.getContext();
    const { extensionSettings, saveSettingsDebounced, eventSource, eventTypes } = context;

    // ----- 1. НАСТРОЙКИ -----
    if (!extensionSettings[MODULE_NAME]) {
        extensionSettings[MODULE_NAME] = {};
    }

    function getDescription(charId) {
        return extensionSettings[MODULE_NAME][charId] || '';
    }

    function setDescription(charId, text) {
        extensionSettings[MODULE_NAME][charId] = text;
        saveSettingsDebounced();
    }

    // ----- 2. ФУНКЦИЯ ОБНОВЛЕНИЯ ТЕКСТА В БЛОКЕ -----
    function updateUI() {
        const charId = context.characterId;
        const savedText = getDescription(charId);
        $('#portraitbank_textarea').val(savedText);
    }

    // ----- 3. СОЗДАНИЕ БЛОКА -----
    const blockId = 'portraitbank_block';
    const blockHtml = `
        <div id="${blockId}" style="margin: 10px 10px 15px 10px; padding: 12px; background: var(--black30a); border-radius: 10px; border-left: 4px solid var(--primary);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-weight: bold; color: var(--white);">
                    <i class="fa-solid fa-image"></i> PortraitBank
                </span>
                <span style="color: var(--gray400); font-size: 12px;">для AI генерации</span>
            </div>
            <textarea id="portraitbank_textarea"
                style="width: 100%; min-height: 80px; padding: 8px; border-radius: 8px; background: var(--black50a); color: var(--white); border: 1px solid var(--gray500); resize: vertical;"
                placeholder="Опишите внешность персонажа..."></textarea>
            <div style="display: flex; justify-content: flex-end; margin-top: 8px;">
                <span style="color: var(--gray400); font-size: 12px;">
                    <i class="fa-regular fa-floppy-disk"></i> сохраняется автоматически
                </span>
            </div>
        </div>
    `;

    // ----- 4. ВСТАВКА БЛОКА В ПРАВУЮ ПАНЕЛЬ (С ОЖИДАНИЕМ) -----
    function injectBlock() {
        if ($(`#${blockId}`).length) return;

        // Ищем контейнер с информацией о персонаже (правый сайдбар)
        const target = $('.right_panel .character_name_block, .right_panel .panel_character_name_block, .character_name_block').first();
        
        if (target.length) {
            target.after(blockHtml);
            updateUI();
            console.log('✅ Блок PortraitBank вставлен');
            attachEvents();
        } else {
            console.log('⏳ Ждём появления правой панели...');
            setTimeout(injectBlock, 300);
        }
    }

    // ----- 5. ПРИВЯЗКА СОБЫТИЙ К БЛОКУ -----
    function attachEvents() {
        // Автосохранение при вводе
        $(document).off('input', '#portraitbank_textarea').on('input', '#portraitbank_textarea', function() {
            const charId = context.characterId;
            const newText = $(this).val();
            setDescription(charId, newText);
        });

        // Обновление при смене персонажа
        eventSource.on(eventTypes.CHARACTER_SWITCHED, () => {
            updateUI();
        });
    }

    // Запускаем вставку
    injectBlock();

    // ----- 6. ИНЪЕКЦИЯ В ПРОМПТ -----
    eventSource.on(eventTypes.GENERATION_STARTED, () => {
        const ctx = SillyTavern.getContext();
        const charId = ctx.characterId;
        const description = getDescription(charId);
        if (description.trim()) {
            ctx.setExtensionPrompt(
                MODULE_NAME,
                `[Character appearance for image: ${description.trim()}]`,
                'after_context',
                15,
                'system'
            );
            console.log('🎨 Промпт PortraitBank внедрён');
        }
    });

    console.log('✅ PortraitBank: инициализация завершена');
});