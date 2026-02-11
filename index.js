export const MODULE_NAME = 'PortraitBank';

jQuery(async () => {
    console.log('🔥 PortraitBank: скрипт выполняется');
    const context = SillyTavern.getContext();
    console.log('Контекст получен', !!context);
});