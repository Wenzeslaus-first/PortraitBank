// ================================
// PortraitBank Extension for SillyTavern
// ================================
export const MODULE_NAME = 'PortraitBank';

// ----- Default settings -------------------------------------------------
const defaultSettings = Object.freeze({
    generationPrompt: `Based on {{char}}'s gender being "{{gender}}", write at the very beginning: "1 boy" if the gender is male, or "1 girl" if the gender is female. as a single humanoid character. Do NOT include any separate animals, pets, or unrelated objects in the description. Describe only what is physically part of the character. provide only a detailed comma-delimited list of keywords and phrases which describe {{char}}. The list must include all of the following items in this order: species and race, gender, age, clothing, occupation, physical features and appearances. Do not include descriptions of non-visual qualities such as personality, movements, scents, mental traits, or anything which could not be seen in a still photograph. Do not write in full sentences. Prefix your description with the phrase 'full body portrait,'`,
    modelParams: {
        temperature: 0.9,
        max_tokens: 400,
    },
});

// ----- Settings management ---------------------------------------------
function getSettings() {
    const context = SillyTavern.getContext();
    if (!context.extensionSettings[MODULE_NAME]) {
        context.extensionSettings[MODULE_NAME] = structuredClone(defaultSettings);
    }
    const stored = context.extensionSettings[MODULE_NAME];
    for (const key of Object.keys(defaultSettings)) {
        if (!Object.hasOwn(stored, key)) {
            stored[key] = structuredClone(defaultSettings[key]);
        }
    }
    return stored;
}

function saveSettings() {
    SillyTavern.getContext().saveSettingsDebounced();
}

// ----- Description storage (per character) -----------------------------
function getDescription(charId) {
    const settings = getSettings();
    return settings[charId] || '';
}

function setDescription(charId, text) {
    const settings = getSettings();
    settings[charId] = text;
    saveSettings();
}

// ----- Modal window (main PortraitBank editor) -------------------------
function createModal() {
    if (document.getElementById('portraitbank_modal')) return;
    const modalHtml = `
        <div id="portraitbank_modal" style="display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 400px; max-width: 90%; background: var(--surface); border: 2px solid var(--primary); border-radius: 12px; padding: 20px; z-index: 9999; box-shadow: 0 0 20px rgba(0,0,0,0.7);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <span style="font-size: 18px; font-weight: bold; color: var(--white);"><i class="fa-solid fa-image-portrait"></i> PortraitBank</span>
                <span id="portraitbank_close" style="cursor: pointer; font-size: 24px; color: var(--gray400);">&times;</span>
            </div>
            <textarea id="portraitbank_textarea" style="width: 100%; min-height: 120px; padding: 10px; border-radius: 8px; background: var(--black50a); color: var(--white); border: 1px solid var(--gray500);" placeholder="Опишите внешность персонажа..."></textarea>
            <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 15px;">
                <button id="portraitbank_save" class="menu_button">Сохранить</button>
                <button id="portraitbank_cancel" class="menu_button">Отмена</button>
            </div>
        </div>
        <div id="portraitbank_overlay" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 9998;"></div>
    `;
    $('body').append(modalHtml);
}

function openModal() {
    const ctx = SillyTavern.getContext();
    const description = getDescription(ctx.characterId);
    $('#portraitbank_textarea').val(description);
    $('#portraitbank_modal, #portraitbank_overlay').fadeIn(200);
}

function closeModal() {
    $('#portraitbank_modal, #portraitbank_overlay').fadeOut(200);
}

// ----- NEW: Compare Modal (two descriptions side by side) -------------
function createCompareModal() {
    if (document.getElementById('portraitbank_compare_modal')) return;
    const modalHtml = `
        <div id="portraitbank_compare_modal" style="display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 800px; max-width: 95%; background: var(--surface); border: 2px solid var(--primary); border-radius: 12px; padding: 20px; z-index: 9999; box-shadow: 0 0 20px rgba(0,0,0,0.7);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <span style="font-size: 18px; font-weight: bold; color: var(--white);"><i class="fa-solid fa-code-compare"></i> PortraitBank – Сравнение</span>
                <span id="portraitbank_compare_close" style="cursor: pointer; font-size: 24px; color: var(--gray400);">&times;</span>
            </div>
            <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                <!-- Старое описание -->
                <div style="flex: 1; min-width: 250px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                        <span style="color: var(--gray300); font-weight: bold;">Текущее описание</span>
                        <span class="fa-solid fa-pencil" style="color: var(--gray400);" title="Редактируемое поле"></span>
                    </div>
                    <textarea id="portraitbank_compare_old" style="width: 100%; min-height: 200px; padding: 10px; border-radius: 8px; background: var(--black50a); color: var(--white); border: 1px solid var(--gray500);"></textarea>
                    <button id="portraitbank_choose_old" class="menu_button" style="width: 100%; margin-top: 10px;"><i class="fa-solid fa-check"></i> Выбрать это описание</button>
                </div>
                <!-- Новое описание -->
                <div style="flex: 1; min-width: 250px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                        <span style="color: var(--gray300); font-weight: bold;">Новое описание</span>
                        <span class="fa-solid fa-pencil" style="color: var(--gray400);" title="Редактируемое поле"></span>
                    </div>
                    <textarea id="portraitbank_compare_new" style="width: 100%; min-height: 200px; padding: 10px; border-radius: 8px; background: var(--black50a); color: var(--white); border: 1px solid var(--gray500);"></textarea>
                    <button id="portraitbank_choose_new" class="menu_button" style="width: 100%; margin-top: 10px;"><i class="fa-solid fa-check"></i> Выбрать это описание</button>
                </div>
            </div>
            <div style="display: flex; justify-content: flex-end; margin-top: 20px;">
                <button id="portraitbank_compare_cancel" class="menu_button">Отмена</button>
            </div>
        </div>
        <div id="portraitbank_compare_overlay" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 9998;"></div>
    `;
    $('body').append(modalHtml);
}

function openCompareModal(oldText, newText) {
    $('#portraitbank_compare_old').val(oldText);
    $('#portraitbank_compare_new').val(newText);
    $('#portraitbank_compare_modal, #portraitbank_compare_overlay').fadeIn(200);
}

function closeCompareModal() {
    $('#portraitbank_compare_modal, #portraitbank_compare_overlay').fadeOut(200);
}

// ----- AI Generation of description (quiet prompt) --------------------
async function generateDescriptionFromPrompt(promptText = '') {
    const ctx = SillyTavern.getContext();
    const settings = getSettings();

    const finalPrompt = promptText?.trim()
        ? ctx.substituteParams(settings.generationPrompt + '\n\n' + promptText)
        : ctx.substituteParams(settings.generationPrompt);

    try {
        if (typeof ctx.generateQuietPrompt !== 'function') {
            throw new Error('generateQuietPrompt не доступен. Обновите SillyTavern.');
        }

        const generated = await ctx.generateQuietPrompt(finalPrompt, false, null, null, false, {
            temperature: settings.modelParams.temperature,
            max_tokens: settings.modelParams.max_tokens,
        });

        if (generated?.trim()) {
            // Вместо автоматического сохранения – показываем окно сравнения
            const oldDesc = getDescription(ctx.characterId);
            const newDesc = generated.trim();
            openCompareModal(oldDesc, newDesc);
            toastr.success('Описание сгенерировано! Выберите вариант для сохранения.');
        } else {
            toastr.error('Не удалось сгенерировать описание');
        }
    } catch (error) {
        console.error('[PortraitBank] Generation error:', error);
        toastr.error(`Ошибка генерации: ${error.message}`);
    }
}

// ----- Command: set prompt prefix and click Yourself -----------------
async function portraitImageCommand() {
    const ctx = SillyTavern.getContext();
    const charId = ctx.characterId;
    const description = getDescription(charId);

    if (!description.trim()) {
        toastr.warning('❌ Нет описания для этого персонажа. Создайте его через /portrait или /portrait-generate');
        return;
    }

    $('.character-popups .tab:contains("Image Generation")').trigger('click');
    await new Promise(r => setTimeout(r, 400));

    const $field = $('#sd_character_prompt');
    if ($field.length) {
        $field.val(description).trigger('input').trigger('change');
        toastr.success('✅ Prompt prefix установлен');
    } else {
        toastr.error('❌ Поле #sd_character_prompt не найдено');
        return;
    }

    setTimeout(() => {
        const $btn = $('#yourself_button, button:contains("Yourself")').first();
        if ($btn.length) {
            $btn.trigger('click');
            toastr.info('🎨 Генерация изображения запущена');
        } else {
            toastr.error('❌ Кнопка Yourself не найдена. Нажмите вручную.');
        }
    }, 300);
}

// ----- UI Settings Panel (Extensions tab) ----------------------------
function createSettingsUI() {
    const settings = getSettings();
    const container = document.getElementById('extensions_settings');
    if (!container) return;

    const html = `
        <div class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header">
                <b>PortraitBank – генерация описаний внешности</b>
                <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
            </div>
            <div class="inline-drawer-content">
                <div class="iig-settings" style="padding: 10px;">
                    <h4>Инструкция для генерации описания</h4>
                    <p class="hint">Этот промпт отправляется AI вместе с вашими подсказками. Используйте {{char}}, {{gender}} и другие макросы.</p>
                    <textarea id="portraitbank_prompt_editor" class="text_pole" style="width:100%; min-height:150px; font-family:monospace;">${settings.generationPrompt.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
                    <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:10px;">
                        <button id="portraitbank_save_prompt" class="menu_button"><i class="fa-solid fa-save"></i> Сохранить инструкцию</button>
                        <button id="portraitbank_reset_prompt" class="menu_button"><i class="fa-solid fa-undo"></i> Сбросить</button>
                    </div>
                    
                    <hr>
                    
                    <h4>Параметры генерации</h4>
                    <div class="flex-row">
                        <label for="portraitbank_temperature">Temperature</label>
                        <input type="number" id="portraitbank_temperature" class="text_pole flex1" value="${settings.modelParams.temperature}" min="0.1" max="2.0" step="0.1">
                    </div>
                    <div class="flex-row">
                        <label for="portraitbank_max_tokens">Max tokens</label>
                        <input type="number" id="portraitbank_max_tokens" class="text_pole flex1" value="${settings.modelParams.max_tokens}" min="100" max="1000" step="50">
                    </div>
                    
                    <hr>
                    
                    <h4>Действия</h4>
                    <div style="display:flex; gap:10px; flex-wrap:wrap;">
                        <button id="portraitbank_ui_generate" class="menu_button"><i class="fa-solid fa-wand-magic-sparkles"></i> Сгенерировать описание</button>
                        <button id="portraitbank_ui_image" class="menu_button"><i class="fa-solid fa-image"></i> Заполнить поле и сгенерировать изображение</button>
                        <button id="portraitbank_ui_edit" class="menu_button"><i class="fa-solid fa-pencil"></i> Редактировать описание</button>
                    </div>
                    <p class="hint" style="margin-top:10px;">Текущий персонаж: <span id="portraitbank_current_char">—</span>, описание: <span id="portraitbank_current_desc_preview">—</span></p>
                </div>
            </div>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', html);
    bindSettingsUI();
}

function bindSettingsUI() {
    const settings = getSettings();

    $('#portraitbank_save_prompt').on('click', function() {
        const newPrompt = $('#portraitbank_prompt_editor').val();
        settings.generationPrompt = newPrompt;
        saveSettings();
        toastr.success('Инструкция сохранена');
    });

    $('#portraitbank_reset_prompt').on('click', function() {
        $('#portraitbank_prompt_editor').val(defaultSettings.generationPrompt);
        settings.generationPrompt = defaultSettings.generationPrompt;
        saveSettings();
        toastr.info('Инструкция сброшена к умолчанию');
    });

    $('#portraitbank_temperature').on('input', function() {
        settings.modelParams.temperature = parseFloat($(this).val()) || 0.9;
        saveSettings();
    });

    $('#portraitbank_max_tokens').on('input', function() {
        settings.modelParams.max_tokens = parseInt($(this).val()) || 400;
        saveSettings();
    });

    $('#portraitbank_ui_generate').on('click', function() {
        toastr.info('⏳ Генерация описания...');
        generateDescriptionFromPrompt('');
    });

    $('#portraitbank_ui_image').on('click', function() {
        portraitImageCommand();
    });

    $('#portraitbank_ui_edit').on('click', function() {
        openModal();
    });

    function updateUIInfo() {
        const ctx = SillyTavern.getContext();
        const charName = ctx.characters?.[ctx.characterId]?.name || '—';
        const desc = getDescription(ctx.characterId);
        const preview = desc.length > 50 ? desc.substring(0, 50) + '…' : desc || 'пусто';
        $('#portraitbank_current_char').text(charName);
        $('#portraitbank_current_desc_preview').text(preview);
    }

    updateUIInfo();
    SillyTavern.getContext().eventSource.on(SillyTavern.getContext().eventTypes.CHARACTER_SWITCHED, updateUIInfo);
}

// ----- Slash Commands ------------------------------------------------
function registerCommands() {
    const ctx = SillyTavern.getContext();

    try {
        ctx.registerSlashCommand('portrait', openModal, [], '– открыть редактор описания внешности', true, true);
        ctx.registerSlashCommand('portrait-generate', () => {
            const hint = prompt('Введите подсказки для генерации (можно оставить пустым):', '');
            if (hint !== null) generateDescriptionFromPrompt(hint);
        }, ['portrait-gen'], '– сгенерировать описание через AI (укажите подсказки в диалоге)', true, false);
        ctx.registerSlashCommand('portrait-image', portraitImageCommand, ['portrait-img'], '– записать описание в промпт-префикс и запустить Yourself', true, false);
        console.log('[PortraitBank] Slash commands registered');
    } catch (e) {
        console.error('[PortraitBank] Failed to register commands:', e);
    }
}

// ----- User menu button (optional) -----------------------------------
function addUserMenuButton() {
    const userMenu = $('.top-bar .dropdown-menu').first();
    if (!userMenu.length) {
        setTimeout(addUserMenuButton, 500);
        return;
    }
    if ($('#portraitbank_user_menu_item').length) return;

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

// ----- Inject prompt into generation ---------------------------------
function setupInjection() {
    const ctx = SillyTavern.getContext();
    ctx.eventSource.on(ctx.eventTypes.GENERATION_STARTED, () => {
        const desc = getDescription(ctx.characterId);
        if (desc.trim()) {
            ctx.setExtensionPrompt(
                MODULE_NAME,
                `[Character appearance: ${desc.trim()}]`,
                'after_context',
                15,
                'system'
            );
        }
    });
}

// ----- INITIALIZATION ------------------------------------------------
(function init() {
    console.log('[PortraitBank] Initializing...');

    getSettings();
    createModal();
    createCompareModal(); // Создаём новое модальное окно при инициализации

    function tryRegister() {
        if (SillyTavern.getContext()?.registerSlashCommand) {
            registerCommands();
        } else {
            setTimeout(tryRegister, 200);
        }
    }
    tryRegister();

    const context = SillyTavern.getContext();
    context.eventSource.on(context.eventTypes.APP_READY, () => {
        console.log('[PortraitBank] APP_READY – creating UI');
        createSettingsUI();
        addUserMenuButton();
        setupInjection();
        console.log('[PortraitBank] Fully loaded');
    });

    if (context.app_ready) {
        setTimeout(() => {
            createSettingsUI();
            addUserMenuButton();
            setupInjection();
        }, 100);
    }

    // Modal event handlers (main modal)
    $(document).off('click', '#portraitbank_save').on('click', '#portraitbank_save', function() {
        const ctx = SillyTavern.getContext();
        setDescription(ctx.characterId, $('#portraitbank_textarea').val());
        toastr.success('Описание сохранено');
        closeModal();
    });
    $(document).off('click', '#portraitbank_cancel, #portraitbank_close, #portraitbank_overlay').on('click', '#portraitbank_cancel, #portraitbank_close, #portraitbank_overlay', closeModal);

    // NEW: Compare modal event handlers
    $(document).off('click', '#portraitbank_choose_old').on('click', '#portraitbank_choose_old', function() {
        const ctx = SillyTavern.getContext();
        const text = $('#portraitbank_compare_old').val();
        setDescription(ctx.characterId, text);
        toastr.success('Сохранено текущее описание');
        closeCompareModal();
        // Опционально: открыть основную модалку с сохранённым описанием
        // openModal();
    });
    $(document).off('click', '#portraitbank_choose_new').on('click', '#portraitbank_choose_new', function() {
        const ctx = SillyTavern.getContext();
        const text = $('#portraitbank_compare_new').val();
        setDescription(ctx.characterId, text);
        toastr.success('Сохранено новое описание');
        closeCompareModal();
        // openModal();
    });
    $(document).off('click', '#portraitbank_compare_cancel, #portraitbank_compare_close, #portraitbank_compare_overlay').on('click', '#portraitbank_compare_cancel, #portraitbank_compare_close, #portraitbank_compare_overlay', closeCompareModal);
})();