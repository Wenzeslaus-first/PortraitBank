export const MODULE_NAME = 'PortraitBank';

// Ждём полной загрузки DOM и регистрируем команду
(function() {
    function register() {
        const context = SillyTavern.getContext();
        if (!context?.registerSlashCommand) {
            console.log('⏳ SillyTavern не готов, повтор через 300ms');
            setTimeout(register, 300);
            return;
        }

        context.registerSlashCommand(
            'portrait-image',
            function() {
                console.log('🔥 КОМАНДА ВЫПОЛНЕНА!');
                toastr.info('PortraitBank: команда работает!');
            },
            ['portrait-img', 'pb-image'],
            '– тестовая команда PortraitBank',
            true,
            false
        );
        console.log('✅ Команда /portrait-image зарегистрирована (радикальный метод)');
    }
    register();
})();