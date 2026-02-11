export const MODULE_NAME = 'PortraitBank';

jQuery(async () => {
    const context = SillyTavern.getContext();
    const { extensionSettings, saveSettingsDebounced, eventSource, eventTypes } = context;

    // ----- 1. НАСТРОЙКИ -----
    if (!extensionSettings[MODULE_NAME]) {
        extensionSettings[MODULE_NAME] = {};
    }

    // ----- 2. ФУНКЦИЯ ПОЛУЧЕНИЯ/СОХРАНЕНИЯ ОПИСАНИЯ -----
    function getDescription(charId) {
        return extensionSettings[MODULE_NAME][charId] || '';
    }

    function setDescription(charId, text) {
        extensionSettings[MODULE_NAME][charId] = text;
        saveSettingsDebounced();
    }

    // ----- 3. СОЗДАНИЕ МОДАЛЬНОГО ОКНА (POPUP) -----
    const modalHtml = `
        <div id="portraitbank_modal" class="flex-container" style="display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 400px; max-width: 90%; background: var(--surface); border: 2px solid var(--primary); border-radius: 12px; padding: 20px; z-index: 9999; box-shadow: 0 0 20px rgba(0,0,0,0.7);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <span style="font-size: 18px; font-weight: bold; color: var(--white);">
                    <i class="fa-solid fa-image-portrait"></i> PortraitBank
                </span>
                <span id="portraitbank_close" style="cursor: pointer; font-size: 24px; color: var(--gray400);">&times;</span>
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; color: var(--gray300);">Описание внешности для AI art:</label>
                <textarea id="portraitbank_textarea" style="width: 100%; min-height: 120px; padding: 10px; border-radius: 8px; background: var(--black50a); color: var(--white); border: 1px solid var(--gray500);" placeholder="Например: 1girl, silver hair, red eyes, fantasy dress..."></textarea>
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 10px;">
                <button id="portraitbank_save" class="menu_button" style="padding: 8px 16px;">Сохранить</button>
                <button id="portraitbank_cancel" class="menu_button" style="padding: 8px 16px;">Отмена</button>
            </div>
        </div>
        <div id="portraitbank_overlay" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 9998;"></div>
    `;

    // Добавляем модалку в body
    $('body').append(modalHtml);

    // ----- 4. ФУНКЦИЯ ОТКРЫТИЯ МОДАЛКИ -----
    function openModal() {
        const charId = context.characterId;
        const description = getDescription(charId);
        $('#portraitbank_textarea').val(description);
        $('#portraitbank_modal, #portraitbank_overlay').fadeIn(200);
    }

    function closeModal() {
        $('#portraitbank_modal, #portraitbank_overlay').fadeOut(200);
    }

    // ----- 5. ОБРАБОТЧИКИ МОДАЛКИ -----
    $('#portraitbank_save').on('click', function() {
        const charId = context.characterId;
        const newText = $('#portraitbank_textarea').val();
        setDescription(charId, newText);
        toastr.success('Описание сохранено');
        closeModal();
    });

    $('#portraitbank_cancel, #portraitbank_close, #portraitbank_overlay').on('click', function() {
        closeModal();
    });

    // ----- 6. КНОПКА В МЕНЮ РАСШИРЕНИЙ -----
    const buttonId = 'portraitbank_button';
    const buttonHtml = `<div id="${buttonId}" class="list-group-item flex-container">
        <div class="fa-container"><i class="fa-solid fa-image"></i></div>
        <span>PortraitBank</span>
    </div>`;

    $('#extensions_menu').append(buttonHtml);

    $(`#${buttonId}`).on('click', function() {
        openModal();
    });

    // ----- 7. ИНЪЕКЦИЯ В ПРОМПТ ПРИ ГЕНЕРАЦИИ -----
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
            console.log('PortraitBank: промпт внедрён');
        }
    });

    console.log('✅ PortraitBank загружен (кнопка в меню)');
});