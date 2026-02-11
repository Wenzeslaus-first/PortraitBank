export const MODULE_NAME = 'PortraitBank';

jQuery(async () => {
    const context = SillyTavern.getContext();
    const { extensionSettings, saveSettingsDebounced, eventSource, eventTypes, substituteParams } = context;

    // ----- 1. НАСТРОЙКИ -----
    if (!extensionSettings[MODULE_NAME]) extensionSettings[MODULE_NAME] = {};

    // Глобальная инструкция (промпт для генерации описания)
    const DEFAULT_PROMPT = `Based on {{char}}'s gender being "{{gender}}", write at the very beginning: "1 boy" if the gender is male, or "1 girl" if the gender is female. as a single humanoid character. Do NOT include any separate animals, pets, or unrelated objects in the description. Describe only what is physically part of the character. provide only a detailed comma-delimited list of keywords and phrases which describe {{char}}. The list must include all of the following items in this order: species and race, gender, age, clothing, occupation, physical features and appearances. Do not include descriptions of non-visual qualities such as personality, movements, scents, mental traits, or anything which could not be seen in a still photograph. Do not write in full sentences. Prefix your description with the phrase 'full body portrait,'`;

    if (!extensionSettings[MODULE_NAME].generationPrompt) {
        extensionSettings[MODULE_NAME].generationPrompt = DEFAULT_PROMPT;
        saveSettingsDebounced();
    }

    function getGenerationPrompt() {
        return extensionSettings[MODULE_NAME].generationPrompt || DEFAULT_PROMPT;
    }

    function setGenerationPrompt(text) {
        extensionSettings[MODULE_NAME].generationPrompt = text;
        saveSettingsDebounced();
    }

    // ----- 2. ОСНОВНОЕ ОКНО PORTRAITBANK (редактор описания) -----
    if (!$('#portraitbank_modal').length) {
        const modalHtml = `
            <div id="portraitbank_modal" style="display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 400px; max-width: 90%; background: var(--surface); border: 2px solid var(--primary); border-radius: 12px; padding: 20px; z-index: 9999; box-shadow: 0 0 20px rgba(0,0,0,0.7);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <span style="font-size: 18px; font-weight: bold; color: var(--white);"><i class="fa-solid fa-image-portrait"></i> PortraitBank</span>
                    <span id="portraitbank_close" style="cursor: pointer; font-size: 24px; color: var(--gray400);">&times;</span>
                </div>
                <textarea id="portraitbank_textarea" style="width: 100%; min-height: 120px; padding: 10px; border-radius: 8px; background: var(--black50a); color: var(--white); border: 1px solid var(--gray500);" placeholder="Сохранённое описание внешности..."></textarea>
                <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 15px;">
                    <button id="portraitbank_save" class="menu_button">Сохранить</button>
                    <button id="portraitbank_cancel" class="menu_button">Отмена</button>
                </div>
            </div>
            <div id="portraitbank_overlay" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 9998;"></div>
        `;
        $('body').append(modalHtml);
    }

    // Функции работы с описанием персонажа
    function getDescription(charId) {
        return extensionSettings[MODULE_NAME][charId] || '';
    }

    function setDescription(charId, text) {
        extensionSettings[MODULE_NAME][charId] = text;
        saveSettingsDebounced();
    }

    function openModal() {
        const charId = context.characterId;
        $('#portraitbank_textarea').val(getDescription(charId));
        $('#portraitbank_modal, #portraitbank_overlay').fadeIn(200);
    }

    function closeModal() {
        $('#portraitbank_modal, #portraitbank_overlay').fadeOut(200);
    }

    $(document).off('click', '#portraitbank_save').on('click', '#portraitbank_save', function() {
        setDescription(context.characterId, $('#portraitbank_textarea').val());
        toastr.success('Описание сохранено');
        closeModal();
    });
    $(document).off('click', '#portraitbank_cancel, #portraitbank_close, #portraitbank_overlay').on('click', '#portraitbank_cancel, #portraitbank_close, #portraitbank_overlay', closeModal);

    // ----- 3. ОКНО НАСТРОЙКИ ИНСТРУКЦИИ (ПРОМПТ ДЛЯ ГЕНЕРАЦИИ) -----
    if (!$('#portraitbank_prompt_modal').length) {
        const promptModalHtml = `
            <div id="portraitbank_prompt_modal" style="display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 500px; max-width: 90%; background: var(--surface); border: 2px solid var(--primary); border-radius: 12px; padding: 20px; z-index: 9999; box-shadow: 0 0 20px rgba(0,0,0,0.7);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <span style="font-size: 18px; font-weight: bold; color: var(--white);"><i class="fa-solid fa-gear"></i> Настройка инструкции</span>
                    <span id="portraitbank_prompt_close" style="cursor: pointer; font-size: 24px; color: var(--gray400);">&times;</span>
                </div>
                <p style="color: var(--gray300); margin-bottom: 10px;">Редактируйте промпт для генерации описания. Используйте переменные {{char}}, {{gender}}, {{user}} и др.</p>
                <textarea id="portraitbank_prompt_textarea" style="width: 100%; min-height: 200px; padding: 10px; border-radius: 8px; background: var(--black50a); color: var(--white); border: 1px solid var(--gray500); font-family: monospace;"></textarea>
                <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 15px;">
                    <button id="portraitbank_prompt_save" class="menu_button">Сохранить инструкцию</button>
                    <button id="portraitbank_prompt_cancel" class="menu_button">Отмена</button>
                </div>
                <div style="margin-top: 10px;">
                    <button id="portraitbank_prompt_reset" class="menu_button" style="background: var(--gray700);">Сбросить к умолчанию</button>
                </div>
            </div>
            <div id="portraitbank_prompt_overlay" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 9998;"></div>
        `;
        $('body').append(promptModalHtml);
    }

    function openPromptModal() {
        $('#portraitbank_prompt_textarea').val(getGenerationPrompt());
        $('#portraitbank_prompt_modal, #portraitbank_prompt_overlay').fadeIn(200);
    }

    function closePromptModal() {
        $('#portraitbank_prompt_modal, #portraitbank_prompt_overlay').fadeOut(200);
    }

    $(document).off('click', '#portraitbank_prompt_save').on('click', '#portraitbank_prompt_save', function() {
        setGenerationPrompt($('#portraitbank_prompt_textarea').val());
        toastr.success('Инструкция сохранена');
        closePromptModal();
    });
    $(document).off('click', '#portraitbank_prompt_cancel, #portraitbank_prompt_close, #portraitbank_prompt_overlay').on('click', '#portraitbank_prompt_cancel, #portraitbank_prompt_close, #portraitbank_prompt_overlay', closePromptModal);
    $(document).off('click', '#portraitbank_prompt_reset').on('click', '#portraitbank_prompt_reset', function() {
        $('#portraitbank_prompt_textarea').val(DEFAULT_PROMPT);
    });

    // ----- 4. ФУНКЦИЯ ГЕНЕРАЦИИ ОПИСАНИЯ ПО ИНСТРУКЦИИ -----
    async function generateDescription() {
        const promptTemplate = getGenerationPrompt();
        if (!promptTemplate.trim()) {
            toastr.warning('Инструкция не задана. Откройте настройки и сохраните промпт.');
            return;
        }

        // Подставляем переменные {{...}} через штатную функцию ST
        let finalPrompt = substituteParams(promptTemplate);
        
        // Дополнительно можно обрезать/обработать
        finalPrompt = finalPrompt.trim();

        toastr.info('⏳ Генерация описания...');

        try {
            if (typeof context.generateQuietPrompt !== 'function') {
                throw new Error('generateQuietPrompt недоступен. Обновите SillyTavern.');
            }

            const generatedText = await context.generateQuietPrompt(finalPrompt, false, null, null, false, {
                temperature: 0.9,
                max_tokens: 400,
            });

            if (generatedText && generatedText.trim()) {
                const charId = context.characterId;
                setDescription(charId, generatedText.trim());
                toastr.success('✅ Описание сгенерировано и сохранено!');
                // Открываем основное окно с новым описанием
                openModal();
            } else {
                toastr.error('Не удалось сгенерировать описание');
            }
        } catch (error) {
            console.error('Ошибка генерации:', error);
            toastr.error(`Ошибка: ${error.message || 'Неизвестная ошибка'}`);
        }
    }

    // ----- 5. КНОПКИ В МЕНЮ ПОЛЬЗОВАТЕЛЯ -----
    function addUserMenuButtons() {
        const userMenu = $('.top-bar .dropdown-menu').first();
        if (userMenu.length) {
            // Основная кнопка PortraitBank (уже есть)
            if (!$('#portraitbank_user_menu_item').length) {
                const divider = $('<li class="divider"></li>');
                const menuItem = $(`
                    <li id="portraitbank_user_menu_item">
                        <a href="#"><i class="fa-solid fa-paintbrush"></i> PortraitBank</a>
                    </li>
                `);
                userMenu.append(divider);
                userMenu.append(menuItem);
                menuItem.on('click', (e) => {
                    e.preventDefault();
                    openModal();
                });
            }

            // Кнопка генерации описания
            if (!$('#portraitbank_generate_menu_item').length) {
                const genItem = $(`
                    <li id="portraitbank_generate_menu_item">
                        <a href="#"><i class="fa-solid fa-wand-magic-sparkles"></i> Сгенерировать описание</a>
                    </li>
                `);
                // Вставляем после основной
                const pbItem = $('#portraitbank_user_menu_item');
                if (pbItem.length) {
                    pbItem.after(genItem);
                } else {
                    userMenu.append(genItem);
                }
                genItem.on('click', (e) => {
                    e.preventDefault();
                    generateDescription();
                });
            }

            // Кнопка настройки инструкции
            if (!$('#portraitbank_prompt_menu_item').length) {
                const promptItem = $(`
                    <li id="portraitbank_prompt_menu_item">
                        <a href="#"><i class="fa-solid fa-gear"></i> Настройка инструкции</a>
                    </li>
                `);
                const genItem = $('#portraitbank_generate_menu_item');
                if (genItem.length) {
                    genItem.after(promptItem);
                } else {
                    userMenu.append(promptItem);
                }
                promptItem.on('click', (e) => {
                    e.preventDefault();
                    openPromptModal();
                });
            }

            console.log('✅ Кнопки PortraitBank добавлены в меню пользователя');
        } else {
            setTimeout(addUserMenuButtons, 500);
        }
    }
    addUserMenuButtons();

    // ----- 6. СЛЕШ-КОМАНДЫ -----
    // /portrait — открыть редактор
    try {
        context.registerSlashCommand('portrait', openModal, [], '– открыть редактор описания', true, true);
    } catch (e) { console.error(e); }

    // /portrait-generate — запустить генерацию по сохранённой инструкции
    try {
        context.registerSlashCommand('portrait-generate', generateDescription, ['portrait-gen'], '– сгенерировать описание по текущей инструкции', true, false);
    } catch (e) { console.error(e); }

    // /portrait-prompt — открыть настройки инструкции
    try {
        context.registerSlashCommand('portrait-prompt', openPromptModal, ['portrait-instruction'], '– редактировать инструкцию для генерации', true, false);
    } catch (e) { console.error(e); }

    // ----- 7. ИНЪЕКЦИЯ В ПРОМПТ (как и раньше) -----
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

    console.log('✅ PortraitBank полностью загружен. Команды: /portrait, /portrait-generate, /portrait-prompt');
});
// ----- 8. КОМАНДА: /portrait-image — установить префикс и запустить "Yourself" -----
async function setPromptPrefixAndGenerate() {
    const ctx = SillyTavern.getContext();
    const charId = ctx.characterId;
    const description = getDescription(charId);

    if (!description.trim()) {
        toastr.warning('❌ Сначала сохраните описание персонажа в PortraitBank');
        return;
    }

    // 1. Устанавливаем значение в поле "Character-specific prompt prefix"
    //    Ищем поле по ID, классу или атрибуту (надёжный селектор)
    const $prefixField = $('#character_prompt_prefix, [name="character_prompt_prefix"], input[placeholder*="prompt prefix"], .character_prompt_prefix').first();

    if (!$prefixField.length) {
        toastr.error('❌ Поле Character-specific prompt prefix не найдено. Откройте вкладку Image Generation у персонажа.');
        return;
    }

    $prefixField.val(description).trigger('input').trigger('change');
    toastr.success('✅ Prompt prefix установлен');

    // Небольшая задержка, чтобы поле точно сохранилось
    await new Promise(resolve => setTimeout(resolve, 200));

    // 2. Запускаем генерацию изображения (кнопка "Yourself")
    //    Ищем кнопку по тексту, ID, классу, атрибуту title
    const $yourselfBtn = $('#yourself_button, button:contains("Yourself"), .yourself_button, [title*="Yourself"], [aria-label*="Yourself"]').first();

    if ($yourselfBtn.length) {
        $yourselfBtn.trigger('click');
        toastr.info('🎨 Генерация изображения запущена');
    } else {
        toastr.error('❌ Кнопка Yourself не найдена. Убедитесь, что расширение Image Generation активно.');
    }
}

// Регистрируем команду
try {
    context.registerSlashCommand(
        'portrait-image',
        setPromptPrefixAndGenerate,
        ['portrait-img', 'pb-image'],
        '– установить описание из PortraitBank в prompt prefix и запустить генерацию Yourself',
        true,
        false
    );
    console.log('✅ Команда /portrait-image зарегистрирована');
} catch (e) {
    console.error('Ошибка регистрации /portrait-image:', e);
}