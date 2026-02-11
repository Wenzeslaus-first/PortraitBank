export const MODULE_NAME = 'PortraitBank';

jQuery(() => {
    console.log('🔥 PortraitBank: старт');

    const context = SillyTavern.getContext();
    const { extensionSettings, saveSettingsDebounced, eventSource, eventTypes } = context;

    console.log('✅ Контекст получен');
});