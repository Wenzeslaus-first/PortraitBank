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

    // ----- 2. МОДАЛЬНОЕ ОКНО -----
    const modalHtml = `
        <div id="portraitbank_modal" style="display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 400px; max-width: 90%; background: var(--surface); border: 2px solid var(--primary); border-radius: 12px; padding: 20px; z-index: 9999; box-shadow: 0 0 20px rgba(0,0,0,0.7);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <span style="font-size: 18px; font-weight: bold; color: var(--white);"><i class="fa-solid fa-image-portrait"></i> PortraitBank</span>
                <span id="portraitbank_close" style="cursor: pointer; font-size: 24px; color: var(--gray400);">&times;</span>
            </div>
            <textarea id="portraitbank_textarea" style="width: 100%; min-height: 120px; padding: 10px; border-radius: 8px; background: var(--black50a); color: var(--white); border: 1px solid var(--gray500);" placeholder="Опишите внешность персонажа..."></textarea>
            <div style="display: flex; justify-content: flex-end; margin-top: 15px;">
                <button id="portraitbank_save" class="menu_button">Сохранить</button>
                <button id="portraitbank_cancel" class="menu_button" style="margin-left: 10px;">Отмена</button>
            </div>
        </div>
        <div id="portraitbank_overlay" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 9998;"></div>
    `;
    $('body').append(modalHtml);

    // ----- 3. ЛОГИКА МОДАЛКИ -----
    function openModal() {
        const charId = context.characterId;
        $('#portraitbank_textarea').val(getDescription(charId));
        $('#portraitbank_modal, #portraitbank_overlay').fadeIn(200);
    }

    function closeModal() {
        $('#portraitbank_modal, #portraitbank_overlay').fadeOut(200);
    }

    $('#portraitbank_save').on('click', function() {
        const charId = context.characterId;
        setDescription(charId, $('#portraitbank_textarea').val());
        toastr.success('Описание сохранено');
        closeModal();
    });
    $('#portraitbank_cancel, #portraitbank_close, #portraitbank_overlay').on('click', closeModal);

    // ----- 4. ДОБАВЛЯЕМ ИКОНКУ РЯДОМ С ИМЕНЕМ ПЕРСОНАЖА (ГАРАНТИРОВАННО) -----
    function addIcon() {
        // Ищем элемент с именем персонажа (первый попавшийся подойдёт)
        const nameElement = $('.character_name_block').first();
        if (nameElement.length && !$('#portraitbank_icon').length) {
            const iconHtml = `<span id="portraitbank_icon" style="margin-left: 8px; cursor: pointer; color: #9c27b0; font-size: 1.2em;" title="PortraitBank — описание внешности для AI">
                <i class="fa-solid fa-paintbrush"></i>
            </span>`;
            nameElement.append(iconHtml);
            $('#portraitbank_icon').on('click', openModal);
            console.log('✅ Иконка PortraitBank добавлена к имени персонажа');
        } else {
            // Если элемент ещё не загружен — пробуем через 300 мс
            setTimeout(addIcon, 300);
        }
    }
    addIcon();

    // ----- 5. АВТОМАТИЧЕСКАЯ ВСТАВКА В ПРОМПТ -----
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

    console.log('✅ PortraitBank: инициализация завершена');
});