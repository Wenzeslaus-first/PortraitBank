export const MODULE_NAME = 'PortraitBank';

jQuery(async () => {
    const context = SillyTavern.getContext();
    const { extensionSettings, saveSettingsDebounced, eventSource, eventTypes } = context;

    // ----- 1. НАСТРОЙКИ -----
    if (!extensionSettings[MODULE_NAME]) extensionSettings[MODULE_NAME] = {};

    function getDescription(charId) {
        return extensionSettings[MODULE_NAME][charId] || '';
    }

    function setDescription(charId, text) {
        extensionSettings[MODULE_NAME][charId] = text;
        saveSettingsDebounced();
    }

    // ----- 2. МОДАЛЬНОЕ ОКНО (POPUP) -----
    // Убедимся, что не создаём дубликат
    if (!$('#portraitbank_modal').length) {
        const modalHtml = `
            <div id="portraitbank_modal" style="display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 400px; max-width: 90%; background: var(--surface); border: 2px solid var(--primary); border-radius: 12px; padding: 20px; z-index: 9999; box-shadow: 0 0 20px rgba(0,0,0,0.7);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <span style="font-size: 18px; font-weight: bold; color: var(--white);"><i class="fa-solid fa-image-portrait"></i> PortraitBank</span>
                    <span id="portraitbank_close" style="cursor: pointer; font-size: 24px; color: var(--gray400);">&times;</span>
                </div>
                <textarea id="portraitbank_textarea" style="width: 100%; min-height: 120px; padding: 10px; border-radius: 8px; background: var(--black50a); color: var(--white); border: 1px solid var(--gray500);" placeholder="Опишите внешность персонажа для генерации изображения..."></textarea>
                <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 15px;">
                    <button id="portraitbank_save" class="menu_button">Сохранить</button>
                    <button id="portraitbank_cancel" class="menu_button">Отмена</button>
                </div>
            </div>
            <div id="portraitbank_overlay" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 9998;"></div>
        `;
        $('body').append(modalHtml);
    }

    // ----- 3. ФУНКЦИИ ОТКРЫТИЯ/ЗАКРЫТИЯ -----
    function openModal() {
        const charId = context.characterId;
        $('#portraitbank_textarea').val(getDescription(charId));
        $('#portraitbank_modal, #portraitbank_overlay').fadeIn(200);
    }

    function closeModal() {
        $('#portraitbank_modal, #portraitbank_overlay').fadeOut(200);
    }

    // Привязываем обработчики (с защитой от дублирования)
    $(document).off('click', '#portraitbank_save').on('click', '#portraitbank_save', function() {
        const charId = context.characterId;
        const newText = $('#portraitbank_textarea').val();
        setDescription(charId, newText);
        toastr.success('Описание сохранено');
        closeModal();
    });

    $(document).off('click', '#portraitbank_cancel, #portraitbank_close, #portraitbank_overlay').on('click', '#portraitbank_cancel, #portraitbank_close, #portraitbank_overlay', closeModal);

    // ----- 4. РЕГИСТРАЦИЯ СЛЕШ-КОМАНДЫ -----
    // Команда /portrait — открывает редактор описания
    try {
        context.registerSlashCommand(
            'portrait',
            openModal,
            ['pb', 'appearance'], // альтернативные имена
            '– открыть редактор описания внешности для AI генерации',
            true, // showInHelp
            true // interactWithBot? нет, просто UI
        );
        console.log('✅ Зарегистрирована команда /portrait');
    } catch (e) {
        console.error('Не удалось зарегистрировать команду /portrait', e);
    }

    // Дополнительная команда: /getportrait — показать текущее описание в чате
    function showDescription() {
        const charId = context.characterId;
        const desc = getDescription(charId);
        if (desc.trim()) {
            toastr.info(`Текущее описание: ${desc}`);
        } else {
            toastr.warning('Описание не задано. Используйте /portrait чтобы добавить.');
        }
    }

    try {
        context.registerSlashCommand(
            'getportrait',
            showDescription,
            ['showappearance'],
            '– показать сохранённое описание внешности',
            true,
            false
        );
        console.log('✅ Зарегистрирована команда /getportrait');
    } catch (e) {
        console.error('Не удалось зарегистрировать команду /getportrait', e);
    }

    // ----- 5. ИНЪЕКЦИЯ В ПРОМПТ (как и раньше) -----
    eventSource.on(eventTypes.GENERATION_STARTED, () => {
        const ctx = SillyTavern.getContext();
        const desc = getDescription(ctx.characterId);
        if (desc.trim()) {
            ctx.setExtensionPrompt(
                MODULE_NAME,
                `[Character appearance: ${desc.trim()}]`,
                'after_context',
                15,
                'system'
            );
            console.log('🎨 Промпт PortraitBank внедрён');
        }
    });

    console.log('✅ PortraitBank загружен. Используйте /portrait в чате.');
});