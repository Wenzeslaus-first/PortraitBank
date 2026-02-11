export const MODULE_NAME = 'PortraitBank';

jQuery(() => {
    console.log('🔥 PortraitBank: старт');

    const context = SillyTavern.getContext();
    const { extensionSettings, saveSettingsDebounced, eventSource, eventTypes, characterId } = context;

    // Инициализация настроек
    if (!extensionSettings[MODULE_NAME]) {
        extensionSettings[MODULE_NAME] = {};
    }

    if (!extensionSettings[MODULE_NAME][characterId]) {
        extensionSettings[MODULE_NAME][characterId] = '1girl, brown hair, blue eyes, smiling';
        saveSettingsDebounced();
    }

    function updateUI() {
        const currentCharId = SillyTavern.getContext().characterId;
        const savedText = extensionSettings[MODULE_NAME][currentCharId] || '';
        $('#portrait_bank_textarea').val(savedText);
    }

    // --- БЛОК ИНТЕРФЕЙСА ---
    const blockHtml = `
        <div id="portrait_bank_block" style="margin:10px; padding:10px; background:#333; border-radius:8px;">
            <div style="font-weight:bold; color:white;">PortraitBank</div>
            <textarea id="portrait_bank_textarea" style="width:100%; min-height:80px; color:white; background:#222;"></textarea>
        </div>
    `;

    function injectBlock() {
        if ($('#portrait_bank_block').length) return;
        const target = $('.character_name_block, .character_name_prompt').first();
        if (target.length) {
            target.after(blockHtml);
            updateUI();
            console.log('✅ Блок вставлен');
        } else {
            setTimeout(injectBlock, 300);
        }
    }
    injectBlock();

    console.log('✅ Интерфейс добавлен');
});