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
        console.log('updateUI, текст:', savedText);
        // пока без вставки в DOM
    }

    console.log('✅ Настройки и updateUI готовы');
});