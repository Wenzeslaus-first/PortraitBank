// ================================
// PortraitBank Extension for SillyTavern
// ================================
export const MODULE_NAME = 'PortraitBank';

// ----- Глобальные переменные для адаптивного сравнения -----
let currentOldText = '';
let currentNewText = '';
let activeTab = 'old';

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

// ----- Description storage (positive and negative) ---------------------
function getDescription(charId) {
    const settings = getSettings();
    return settings[charId]?.positive || '';
}

function setDescription(charId, text) {
    const settings = getSettings();
    if (!settings[charId]) settings[charId] = {};
    settings[charId].positive = text;
    saveSettings();
}

function getNegativeDescription(charId) {
    const settings = getSettings();
    return settings[charId]?.negative || '';
}

function setNegativeDescription(charId, text) {
    const settings = getSettings();
    if (!settings[charId]) settings[charId] = {};
    settings[charId].negative = text;
    saveSettings();
}

// ----- ADAPTIVE: Positive Prompt Modal (main editor) -------------------
function createModal() {
    if (document.getElementById('portraitbank_modal')) return;
    const modalHtml = `
        <div id="portraitbank_modal" style="display: none; position: fixed; background: var(--surface); border: 2px solid var(--primary); border-radius: 12px; padding: 20px; z-index: 9999; box-shadow: 0 0 20px rgba(0,0,0,0.7);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <span style="font-size: 18px; font-weight: bold; color: var(--white);"><i class="fa-solid fa-image-portrait"></i> PortraitBank – Положительный промпт</span>
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
    const $modal = $('#portraitbank_modal');
    const $overlay = $('#portraitbank_overlay');
    
    $('#portraitbank_textarea').val(description);
    
    const isMobile = window.innerWidth <= 600;
    $modal.attr('style', 'display: none; position: fixed; border: 2px solid var(--primary); border-radius: 12px; padding: 20px; z-index: 9999; box-shadow: 0 0 20px rgba(0,0,0,0.7);');
    
    if (isMobile) {
        $modal.css({
            top: '10px',
            left: '5%',
            right: '5%',
            width: 'auto',
            maxHeight: 'calc(100vh - 20px)',
            overflowY: 'auto',
            transform: 'none',
            background: 'rgba(32, 32, 32, 0.95)',
        });
    } else {
        $modal.css({
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '400px',
            maxWidth: '90%',
            background: 'var(--surface)',
            maxHeight: 'none',
            overflowY: 'visible',
        });
    }
    
    $modal.fadeIn(200);
    $overlay.fadeIn(200);
}

function closeModal() {
    $('#portraitbank_modal, #portraitbank_overlay').fadeOut(200);
}

// ----- ADAPTIVE: Negative Prompt Modal ---------------------------------
function createNegativeModal() {
    if (document.getElementById('portraitbank_negative_modal')) return;
    const modalHtml = `
        <div id="portraitbank_negative_modal" style="display: none; position: fixed; background: var(--surface); border: 2px solid var(--primary); border-radius: 12px; padding: 20px; z-index: 9999; box-shadow: 0 0 20px rgba(0,0,0,0.7);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <span style="font-size: 18px; font-weight: bold; color: var(--white);"><i class="fa-solid fa-ban"></i> PortraitBank – Отрицательный промпт</span>
                <span id="portraitbank_negative_close" style="cursor: pointer; font-size: 24px; color: var(--gray400);">&times;</span>
            </div>
            <p style="color: var(--gray300); margin-bottom: 10px;">Укажите, что НЕ должно появляться на изображении (через запятую).</p>
            <textarea id="portraitbank_negative_textarea" style="width: 100%; min-height: 120px; padding: 10px; border-radius: 8px; background: var(--black50a); color: var(--white); border: 1px solid var(--gray500);" placeholder="Пример: jewellery, shoes, glasses, hat"></textarea>
            <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 15px;">
                <button id="portraitbank_negative_save" class="menu_button">Сохранить</button>
                <button id="portraitbank_negative_cancel" class="menu_button">Отмена</button>
            </div>
        </div>
        <div id="portraitbank_negative_overlay" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 9998;"></div>
    `;
    $('body').append(modalHtml);
}

function openNegativeModal() {
    const ctx = SillyTavern.getContext();
    const negative = getNegativeDescription(ctx.characterId);
    const $modal = $('#portraitbank_negative_modal');
    const $overlay = $('#portraitbank_negative_overlay');
    
    $('#portraitbank_negative_textarea').val(negative);
    
    const isMobile = window.innerWidth <= 600;
    $modal.attr('style', 'display: none; position: fixed; border: 2px solid var(--primary); border-radius: 12px; padding: 20px; z-index: 9999; box-shadow: 0 0 20px rgba(0,0,0,0.7);');
    
    if (isMobile) {
        $modal.css({
            top: '10px',
            left: '5%',
            right: '5%',
            width: 'auto',
            maxHeight: 'calc(100vh - 20px)',
            overflowY: 'auto',
            transform: 'none',
            background: 'rgba(32, 32, 32, 0.95)',
        });
    } else {
        $modal.css({
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '400px',
            maxWidth: '90%',
            background: 'var(--surface)',
            maxHeight: 'none',
            overflowY: 'visible',
        });
    }
    
    $modal.fadeIn(200);
    $overlay.fadeIn(200);
}

function closeNegativeModal() {
    $('#portraitbank_negative_modal, #portraitbank_negative_overlay').fadeOut(200);
}

// ----- ADAPTIVE: Compare Modal (positive generation) -------------------
function createCompareModal() {
    if (document.getElementById('portraitbank_compare_modal')) return;
    const modalHtml = `
        <div id="portraitbank_compare_modal" style="display: none; position: fixed; background: var(--surface); border: 2px solid var(--primary); padding: 0; z-index: 9999; box-shadow: 0 0 20px rgba(0,0,0,0.7);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding: 20px 20px 0 20px;">
                <span style="font-size: 18px; font-weight: bold; color: var(--white);"><i class="fa-solid fa-code-compare"></i> PortraitBank – Сравнение</span>
                <span id="portraitbank_compare_close" style="cursor: pointer; font-size: 24px; color: var(--gray400);">&times;</span>
            </div>
            <div id="portraitbank_compare_content" style="padding: 0 20px;"></div>
            <div style="display: flex; justify-content: flex-end; padding: 20px;">
                <button id="portraitbank_compare_cancel" class="menu_button">Отмена</button>
            </div>
        </div>
        <div id="portraitbank_compare_overlay" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 9998;"></div>
    `;
    $('body').append(modalHtml);
}

function openCompareModal(oldText, newText) {
    currentOldText = oldText;
    currentNewText = newText;
    activeTab = 'old';

    const isMobile = window.innerWidth <= 600;
    const modal = $('#portraitbank_compare_modal');
    const overlay = $('#portraitbank_compare_overlay');
    const contentDiv = $('#portraitbank_compare_content');

    modal.attr('style', 'display: none; position: fixed; border: 2px solid var(--primary); padding: 0; z-index: 9999; box-shadow: 0 0 20px rgba(0,0,0,0.7);');

    if (isMobile) {
        modal.css({
            top: '10px',
            left: '5%',
            right: '5%',
            width: 'auto',
            maxHeight: 'calc(100vh - 20px)',
            overflowY: 'auto',
            transform: 'none',
            borderRadius: '16px',
            bottom: 'auto',
            background: 'rgba(32, 32, 32, 0.95)',
        });

        const mobileHtml = `
            <div style="display: flex; flex-direction: column; gap: 16px;">
                <div style="display: flex; border-bottom: 1px solid var(--gray600);">
                    <div id="portraitbank_tab_old" style="flex: 1; text-align: center; padding: 10px; cursor: pointer; border-bottom: 3px solid var(--primary); color: var(--primary); font-weight: bold;">Текущее</div>
                    <div id="portraitbank_tab_new" style="flex: 1; text-align: center; padding: 10px; cursor: pointer; border-bottom: 3px solid transparent; color: var(--gray300); font-weight: bold;">Новое</div>
                </div>
                <textarea id="portraitbank_compare_textarea" 
                    style="width: 100%; min-height: 180px; padding: 12px; border-radius: 8px; background: var(--black50a); color: var(--white); border: 1px solid var(--gray500); font-size: 16px; resize: vertical; box-sizing: border-box;"
                >${oldText}</textarea>
                <button id="portraitbank_choose_mobile" class="menu_button" style="width: 100%; padding: 12px; font-size: 16px;">
                    <i class="fa-solid fa-check"></i> Выбрать это описание
                </button>
                <p style="color: var(--gray400); font-size: 12px; margin: 0 0 10px 0;">
                    <i class="fa-solid fa-arrows-left-right"></i> Свайп по тексту для переключения
                </p>
            </div>
        `;
        contentDiv.empty().append(mobileHtml);

        $('#portraitbank_tab_old').off().on('click', function() {
            activeTab = 'old';
            $('#portraitbank_compare_textarea').val(currentOldText);
            $(this).css({ 'border-bottom-color': 'var(--primary)', 'color': 'var(--primary)' });
            $('#portraitbank_tab_new').css({ 'border-bottom-color': 'transparent', 'color': 'var(--gray300)' });
        });
        $('#portraitbank_tab_new').off().on('click', function() {
            activeTab = 'new';
            $('#portraitbank_compare_textarea').val(currentNewText);
            $(this).css({ 'border-bottom-color': 'var(--primary)', 'color': 'var(--primary)' });
            $('#portraitbank_tab_old').css({ 'border-bottom-color': 'transparent', 'color': 'var(--gray300)' });
        });

        let touchStartX = 0;
        const textarea = document.getElementById('portraitbank_compare_textarea');
        if (textarea) {
            textarea.removeEventListener('touchstart', textarea._touchStart);
            textarea.removeEventListener('touchend', textarea._touchEnd);
            textarea._touchStart = function(e) { touchStartX = e.touches[0].clientX; };
            textarea._touchEnd = function(e) {
                if (touchStartX === 0) return;
                const diffX = e.changedTouches[0].clientX - touchStartX;
                if (Math.abs(diffX) > 40) {
                    activeTab = diffX > 0 ? 'old' : 'new';
                    $('#portraitbank_compare_textarea').val(activeTab === 'old' ? currentOldText : currentNewText);
                    $('#portraitbank_tab_old').css('border-bottom-color', activeTab === 'old' ? 'var(--primary)' : 'transparent');
                    $('#portraitbank_tab_new').css('border-bottom-color', activeTab === 'new' ? 'var(--primary)' : 'transparent');
                }
                touchStartX = 0;
            };
            textarea.addEventListener('touchstart', textarea._touchStart, { passive: true });
            textarea.addEventListener('touchend', textarea._touchEnd, { passive: true });
        }

        $('#portraitbank_choose_mobile').off().on('click', function() {
            const ctx = SillyTavern.getContext();
            setDescription(ctx.characterId, $('#portraitbank_compare_textarea').val());
            toastr.success(`Сохранено ${activeTab === 'old' ? 'текущее' : 'новое'} описание`);
            closeCompareModal();
        });

    } else {
        modal.css({
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '800px',
            maxWidth: '95%',
            borderRadius: '12px',
            maxHeight: 'none',
            overflowY: 'visible',
            padding: '20px',
            background: 'var(--surface)',
        });

        const desktopHtml = `
            <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                <div style="flex: 1; min-width: 250px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                        <span style="color: var(--gray300); font-weight: bold;">Текущее описание</span>
                        <span class="fa-solid fa-pencil" style="color: var(--gray400);" title="Редактируемое поле"></span>
                    </div>
                    <textarea id="portraitbank_compare_old" style="width: 100%; min-height: 200px; padding: 10px; border-radius: 8px; background: var(--black50a); color: var(--white); border: 1px solid var(--gray500);">${oldText}</textarea>
                    <button id="portraitbank_choose_old" class="menu_button" style="width: 100%; margin-top: 10px;"><i class="fa-solid fa-check"></i> Выбрать это описание</button>
                </div>
                <div style="flex: 1; min-width: 250px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                        <span style="color: var(--gray300); font-weight: bold;">Новое описание</span>
                        <span class="fa-solid fa-pencil" style="color: var(--gray400);" title="Редактируемое поле"></span>
                    </div>
                    <textarea id="portraitbank_compare_new" style="width: 100%; min-height: 200px; padding: 10px; border-radius: 8px; background: var(--black50a); color: var(--white); border: 1px solid var(--gray500);">${newText}</textarea>
                    <button id="portraitbank_choose_new" class="menu_button" style="width: 100%; margin-top: 10px;"><i class="fa-solid fa-check"></i> Выбрать это описание</button>
                </div>
            </div>
        `;
        contentDiv.empty().append(desktopHtml);

        $('#portraitbank_choose_old').off().on('click', function() {
            const ctx = SillyTavern.getContext();
            setDescription(ctx.characterId, $('#portraitbank_compare_old').val());
            toastr.success('Сохранено текущее описание');
            closeCompareModal();
        });
        $('#portraitbank_choose_new').off().on('click', function() {
            const ctx = SillyTavern.getContext();
            setDescription(ctx.characterId, $('#portraitbank_compare_new').val());
            toastr.success('Сохранено новое описание');
            closeCompareModal();
        });
    }

    modal.fadeIn(200);
    overlay.fadeIn(200);
}

function closeCompareModal() {
    $('#portraitbank_compare_modal, #portraitbank_compare_overlay').fadeOut(200);
}

// ----- AI Generation of positive description --------------------------
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
            const oldDesc = getDescription(ctx.characterId);
            const newDesc = generated.trim();
            openCompareModal(oldDesc, newDesc);
            toastr.success('Описание сгенерировано! Выберите вариант.');
        } else {
            toastr.error('Не удалось сгенерировать описание');
        }
    } catch (error) {
        console.error('[PortraitBank] Generation error:', error);
        toastr.error(`Ошибка генерации: ${error.message}`);
    }
}

// ----- Command: set both prompt fields and generate via /sd you ------
async function portraitImageCommand() {
    const ctx = SillyTavern.getContext();
    const charId = ctx.characterId;
    const positive = getDescription(charId);
    const negative = getNegativeDescription(charId);

    if (!positive.trim()) {
        toastr.warning('❌ Нет положительного описания для этого персонажа. Создайте его через /portrait или /portrait-generate');
        return;
    }

    // 1. Открываем вкладку Image Generation и заполняем оба поля
    $('.character-popups .tab:contains("Image Generation")').trigger('click');
    await new Promise(r => setTimeout(r, 400));

    const $positiveField = $('#sd_character_prompt');
    const $negativeField = $('#sd_character_negative_prompt');

    if ($positiveField.length) {
        $positiveField.val(positive).trigger('input').trigger('change');
        toastr.success('✅ Положительный промпт установлен');
    } else {
        console.warn('[PortraitBank] Поле #sd_character_prompt не найдено');
    }

    if ($negativeField.length) {
        $negativeField.val(negative).trigger('input').trigger('change');
        toastr.success('✅ Отрицательный промпт установлен');
    } else {
        console.warn('[PortraitBank] Поле #sd_character_negative_prompt не найдено');
    }

    // 2. Запускаем генерацию изображения
    try {
        if (typeof ctx.executeSlashCommands !== 'function') {
            throw new Error('Функция executeSlashCommands не найдена. Обновите SillyTavern.');
        }

        await ctx.executeSlashCommands('/sd you');
        toastr.success('🎨 Команда /sd you выполнена. Изображение генерируется.');
    } catch (e) {
        console.error('[PortraitBank] Ошибка выполнения /sd you:', e);
        toastr.error(`❌ Ошибка генерации: ${e.message}. Попробуйте выполнить /sd you вручную.`);
    }
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
                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        <button id="portraitbank_ui_generate" class="menu_button"><i class="fa-solid fa-wand-magic-sparkles"></i> Сгенерировать описание</button>
                        <button id="portraitbank_ui_image" class="menu_button"><i class="fa-solid fa-image"></i> Заполнить поля и генерация</button>
                        <button id="portraitbank_ui_edit" class="menu_button"><i class="fa-solid fa-pencil"></i> Положительный промпт</button>
                        <button id="portraitbank_ui_negative" class="menu_button"><i class="fa-solid fa-ban"></i> Отрицательный промпт</button>
                    </div>
                    <p class="hint" style="margin-top:10px;">
                        Текущий персонаж: <span id="portraitbank_current_char">—</span><br>
                        Положительный: <span id="portraitbank_current_desc_preview">—</span><br>
                        Отрицательный: <span id="portraitbank_current_negative_preview">—</span>
                    </p>
                </div>
            </div>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', html);
    bindSettingsUI();
}

function bindSettingsUI() {
    const settings = getSettings();

    // Инструкция
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
        toastr.info('Инструкция сброшена');
    });

    // Температура / max tokens
    $('#portraitbank_temperature').on('input', function() {
        settings.modelParams.temperature = parseFloat($(this).val()) || 0.9;
        saveSettings();
    });
    $('#portraitbank_max_tokens').on('input', function() {
        settings.modelParams.max_tokens = parseInt($(this).val()) || 400;
        saveSettings();
    });

    // Кнопки действий
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
    $('#portraitbank_ui_negative').on('click', function() {
        openNegativeModal();
    });

    // Обновление информации о текущем персонаже
    function updateUIInfo() {
        const ctx = SillyTavern.getContext();
        const charName = ctx.characters?.[ctx.characterId]?.name || '—';
        const positive = getDescription(ctx.characterId);
        const negative = getNegativeDescription(ctx.characterId);
        const posPreview = positive.length > 50 ? positive.substring(0, 50) + '…' : positive || 'пусто';
        const negPreview = negative.length > 50 ? negative.substring(0, 50) + '…' : negative || 'пусто';
        $('#portraitbank_current_char').text(charName);
        $('#portraitbank_current_desc_preview').text(posPreview);
        $('#portraitbank_current_negative_preview').text(negPreview);
    }

    updateUIInfo();

    const ctx = SillyTavern.getContext();
    if (ctx.eventTypes && ctx.eventTypes.CHARACTER_SWITCHED) {
        ctx.eventSource.on(ctx.eventTypes.CHARACTER_SWITCHED, updateUIInfo);
    } else {
        setInterval(updateUIInfo, 1000);
    }
}

// ----- Slash Commands ------------------------------------------------
function registerCommands() {
    const ctx = SillyTavern.getContext();

    try {
        ctx.registerSlashCommand('portrait', openModal, [], '– открыть редактор положительного промпта', true, true);
        ctx.registerSlashCommand('portrait-negative', openNegativeModal, ['portrait-neg'], '– открыть редактор отрицательного промпта', true, true);
        ctx.registerSlashCommand('portrait-generate', () => {
            const hint = prompt('Введите подсказки для генерации (можно оставить пустым):', '');
            if (hint !== null) generateDescriptionFromPrompt(hint);
        }, ['portrait-gen'], '– сгенерировать положительное описание через AI', true, false);
        ctx.registerSlashCommand('portrait-image', portraitImageCommand, ['portrait-img'], '– заполнить оба поля и запустить /sd you', true, false);
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

    // Добавляем пункт для негативного промпта
    const negItem = $(`
        <li id="portraitbank_user_negative_item">
            <a href="#"><i class="fa-solid fa-ban"></i> PortraitBank Negative</a>
        </li>
    `);
    userMenu.append(negItem);
    negItem.on('click', (e) => {
        e.preventDefault();
        openNegativeModal();
    });
}

// ----- Inject prompt into generation ---------------------------------
function setupInjection() {
    const ctx = SillyTavern.getContext();
    ctx.eventSource.on(ctx.eventTypes.GENERATION_STARTED, () => {
        const positive = getDescription(ctx.characterId);
        const negative = getNegativeDescription(ctx.characterId);
        if (positive.trim()) {
            ctx.setExtensionPrompt(
                MODULE_NAME + '_positive',
                `[Character appearance: ${positive.trim()}]`,
                'after_context',
                15,
                'system'
            );
        }
        // Негативный промпт обычно не добавляют в системный, он используется через поле
        // Но можно добавить как отрицательный контекст, если API поддерживает
    });
}

// ----- INITIALIZATION ------------------------------------------------
(function init() {
    console.log('[PortraitBank] Initializing...');

    getSettings();
    createModal();
    createNegativeModal();
    createCompareModal();

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

    // ----- Обработчики основной модалки -----
    $(document).off('click', '#portraitbank_save').on('click', '#portraitbank_save', function() {
        const ctx = SillyTavern.getContext();
        setDescription(ctx.characterId, $('#portraitbank_textarea').val());
        toastr.success('Положительный промпт сохранён');
        closeModal();
    });
    $(document).off('click', '#portraitbank_cancel, #portraitbank_close, #portraitbank_overlay').on('click', '#portraitbank_cancel, #portraitbank_close, #portraitbank_overlay', closeModal);

    // ----- Обработчики негативной модалки -----
    $(document).off('click', '#portraitbank_negative_save').on('click', '#portraitbank_negative_save', function() {
        const ctx = SillyTavern.getContext();
        setNegativeDescription(ctx.characterId, $('#portraitbank_negative_textarea').val());
        toastr.success('Отрицательный промпт сохранён');
        closeNegativeModal();
    });
    $(document).off('click', '#portraitbank_negative_cancel, #portraitbank_negative_close, #portraitbank_negative_overlay').on('click', '#portraitbank_negative_cancel, #portraitbank_negative_close, #portraitbank_negative_overlay', closeNegativeModal);

    // ----- Обработчики закрытия окна сравнения -----
    $(document).off('click', '#portraitbank_compare_cancel, #portraitbank_compare_close, #portraitbank_compare_overlay').on('click', '#portraitbank_compare_cancel, #portraitbank_compare_close, #portraitbank_compare_overlay', closeCompareModal);
})();