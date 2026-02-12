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

// ----- Description storage (per character) – теперь объект {positive, negative} -----
function getDescriptionObject(charId) {
    const settings = getSettings();
    let value = settings[charId];

    // Миграция: если раньше хранилась строка – конвертируем в объект
    if (typeof value === 'string') {
        const obj = { positive: value, negative: '' };
        settings[charId] = obj;
        saveSettings();
        return obj;
    }

    // Уже объект с нужными полями
    if (value && typeof value === 'object' && 'positive' in value && 'negative' in value) {
        return value;
    }

    // Ничего не сохранено – возвращаем пустой объект и сохраняем
    const obj = { positive: '', negative: '' };
    settings[charId] = obj;
    return obj;
}

function getPositiveDescription(charId) {
    return getDescriptionObject(charId).positive;
}

function setPositiveDescription(charId, text) {
    const obj = getDescriptionObject(charId);
    obj.positive = text;
    saveSettings();
}

function getNegativeDescription(charId) {
    return getDescriptionObject(charId).negative;
}

function setNegativeDescription(charId, text) {
    const obj = getDescriptionObject(charId);
    obj.negative = text;
    saveSettings();
}

// ----- ADAPTIVE: Modal window (главный редактор PortraitBank с двумя полями) -----
function createModal() {
    if (document.getElementById('portraitbank_modal')) return;
    const modalHtml = `
        <div id="portraitbank_modal" style="display: none; position: fixed; background: var(--surface); border: 2px solid var(--primary); border-radius: 12px; padding: 20px; z-index: 9999; box-shadow: 0 0 20px rgba(0,0,0,0.7);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <span style="font-size: 18px; font-weight: bold; color: var(--white);"><i class="fa-solid fa-image-portrait"></i> PortraitBank</span>
                <span id="portraitbank_close" style="cursor: pointer; font-size: 24px; color: var(--gray400);">&times;</span>
            </div>

            <!-- Positive prompt field -->
            <div style="margin-bottom: 15px;">
                <label style="color: var(--gray300); font-size: 14px; margin-bottom: 5px; display: block;">
                    <i class="fa-solid fa-pencil"></i> Positive prompt prefix (Character appearance)
                </label>
                <textarea id="portraitbank_textarea_positive" style="width: 100%; min-height: 120px; padding: 10px; border-radius: 8px; background: var(--black50a); color: var(--white); border: 1px solid var(--gray500);" placeholder="Describe character appearance..."></textarea>
            </div>

            <!-- Negative prompt field -->
            <div style="margin-bottom: 15px;">
                <label style="color: var(--gray300); font-size: 14px; margin-bottom: 5px; display: block;">
                    <i class="fa-solid fa-ban"></i> Negative prompt prefix (Things to avoid)
                </label>
                <textarea id="portraitbank_textarea_negative" style="width: 100%; min-height: 80px; padding: 10px; border-radius: 8px; background: var(--black50a); color: var(--white); border: 1px solid var(--gray500);" placeholder="Describe what to avoid in generation..."></textarea>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 15px;">
                <button id="portraitbank_save" class="menu_button">Save</button>
                <button id="portraitbank_cancel" class="menu_button">Cancel</button>
            </div>
        </div>
        <div id="portraitbank_overlay" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 9998;"></div>
    `;
    $('body').append(modalHtml);
}

function openModal() {
    const ctx = SillyTavern.getContext();
    const descObj = getDescriptionObject(ctx.characterId);
    const $modal = $('#portraitbank_modal');
    const $overlay = $('#portraitbank_overlay');

    // Загружаем оба описания
    $('#portraitbank_textarea_positive').val(descObj.positive);
    $('#portraitbank_textarea_negative').val(descObj.negative);

    // Адаптивные стили под мобильные/десктоп
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
            width: '500px',  // немного шире для двух полей
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

// ----- ADAPTIVE: Compare Modal (без изменений, работает только с positive) -----
function createCompareModal() {
    if (document.getElementById('portraitbank_compare_modal')) return;
    const modalHtml = `
        <div id="portraitbank_compare_modal" style="display: none; position: fixed; background: var(--surface); border: 2px solid var(--primary); padding: 0; z-index: 9999; box-shadow: 0 0 20px rgba(0,0,0,0.7);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding: 20px 20px 0 20px;">
                <span style="font-size: 18px; font-weight: bold; color: var(--white);"><i class="fa-solid fa-code-compare"></i> PortraitBank – Compare</span>
                <span id="portraitbank_compare_close" style="cursor: pointer; font-size: 24px; color: var(--gray400);">&times;</span>
            </div>
            <div id="portraitbank_compare_content" style="padding: 0 20px;"></div>
            <div style="display: flex; justify-content: flex-end; padding: 20px;">
                <button id="portraitbank_compare_cancel" class="menu_button">Cancel</button>
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
        // ... мобильная версия без изменений, только вызов setPositiveDescription
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
                    <div id="portraitbank_tab_old" style="flex: 1; text-align: center; padding: 10px; cursor: pointer; border-bottom: 3px solid var(--primary); color: var(--primary); font-weight: bold;">Current</div>
                    <div id="portraitbank_tab_new" style="flex: 1; text-align: center; padding: 10px; cursor: pointer; border-bottom: 3px solid transparent; color: var(--gray300); font-weight: bold;">New</div>
                </div>
                <textarea id="portraitbank_compare_textarea" 
                    style="width: 100%; min-height: 180px; padding: 12px; border-radius: 8px; background: var(--black50a); color: var(--white); border: 1px solid var(--gray500); font-size: 16px; resize: vertical; box-sizing: border-box;"
                >${oldText}</textarea>
                <button id="portraitbank_choose_mobile" class="menu_button" style="width: 100%; padding: 12px; font-size: 16px;">
                    <i class="fa-solid fa-check"></i> Choose this description
                </button>
                <p style="color: var(--gray400); font-size: 12px; margin: 0 0 10px 0;">
                    <i class="fa-solid fa-arrows-left-right"></i> Swipe text to switch
                </p>
            </div>
        `;
        contentDiv.empty().append(mobileHtml);

        // --- Tab handlers ---
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

        // --- Swipe handler ---
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

        // --- Mobile choose button – сохраняем ТОЛЬКО положительное описание ---
        $('#portraitbank_choose_mobile').off().on('click', function() {
            const ctx = SillyTavern.getContext();
            setPositiveDescription(ctx.characterId, $('#portraitbank_compare_textarea').val());
            toastr.success(`Saved ${activeTab === 'old' ? 'current' : 'new'} description`);
            closeCompareModal();
        });

    } else {
        // --- DESKTOP: два столбца, центрированное окно ---
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
                        <span style="color: var(--gray300); font-weight: bold;">Current description</span>
                        <span class="fa-solid fa-pencil" style="color: var(--gray400);" title="Editable field"></span>
                    </div>
                    <textarea id="portraitbank_compare_old" style="width: 100%; min-height: 200px; padding: 10px; border-radius: 8px; background: var(--black50a); color: var(--white); border: 1px solid var(--gray500);">${oldText}</textarea>
                    <button id="portraitbank_choose_old" class="menu_button" style="width: 100%; margin-top: 10px;"><i class="fa-solid fa-check"></i> Choose this description</button>
                </div>
                <div style="flex: 1; min-width: 250px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                        <span style="color: var(--gray300); font-weight: bold;">New description</span>
                        <span class="fa-solid fa-pencil" style="color: var(--gray400);" title="Editable field"></span>
                    </div>
                    <textarea id="portraitbank_compare_new" style="width: 100%; min-height: 200px; padding: 10px; border-radius: 8px; background: var(--black50a); color: var(--white); border: 1px solid var(--gray500);">${newText}</textarea>
                    <button id="portraitbank_choose_new" class="menu_button" style="width: 100%; margin-top: 10px;"><i class="fa-solid fa-check"></i> Choose this description</button>
                </div>
            </div>
        `;
        contentDiv.empty().append(desktopHtml);

        // --- Desktop choose buttons – сохраняем положительное описание ---
        $('#portraitbank_choose_old').off().on('click', function() {
            const ctx = SillyTavern.getContext();
            setPositiveDescription(ctx.characterId, $('#portraitbank_compare_old').val());
            toastr.success('Saved current description');
            closeCompareModal();
        });
        $('#portraitbank_choose_new').off().on('click', function() {
            const ctx = SillyTavern.getContext();
            setPositiveDescription(ctx.characterId, $('#portraitbank_compare_new').val());
            toastr.success('Saved new description');
            closeCompareModal();
        });
    }

    modal.fadeIn(200);
    overlay.fadeIn(200);
}

function closeCompareModal() {
    $('#portraitbank_compare_modal, #portraitbank_compare_overlay').fadeOut(200);
}

// ----- AI Generation of description (quiet prompt) – работает только с positive -----
async function generateDescriptionFromPrompt(promptText = '') {
    const ctx = SillyTavern.getContext();
    const settings = getSettings();

    const finalPrompt = promptText?.trim()
        ? ctx.substituteParams(settings.generationPrompt + '\n\n' + promptText)
        : ctx.substituteParams(settings.generationPrompt);

    try {
        if (typeof ctx.generateQuietPrompt !== 'function') {
            throw new Error('generateQuietPrompt is not available. Update SillyTavern.');
        }

        const generated = await ctx.generateQuietPrompt(finalPrompt, false, null, null, false, {
            temperature: settings.modelParams.temperature,
            max_tokens: settings.modelParams.max_tokens,
        });

        if (generated?.trim()) {
            const oldDesc = getPositiveDescription(ctx.characterId);
            const newDesc = generated.trim();
            openCompareModal(oldDesc, newDesc);
            toastr.success('Description generated! Choose a version.');
        } else {
            toastr.error('Failed to generate description');
        }
    } catch (error) {
        console.error('[PortraitBank] Generation error:', error);
        toastr.error(`Generation error: ${error.message}`);
    }
}

// ----- Command: set prompt prefix (positive + negative) and generate image via /sd you -----
async function portraitImageCommand() {
    const ctx = SillyTavern.getContext();
    const charId = ctx.characterId;
    const positiveDesc = getPositiveDescription(charId);
    const negativeDesc = getNegativeDescription(charId);

    if (!positiveDesc.trim()) {
        toastr.warning('❌ No positive description for this character. Create it via /portrait or /portrait-generate');
        return;
    }

    // 1. Активируем вкладку Image Generation
    $('.character-popups .tab:contains("Image Generation")').trigger('click');
    await new Promise(r => setTimeout(r, 400));

    // 2. Устанавливаем POSITIVE prompt
    const $positiveField = $('#sd_character_prompt');
    if ($positiveField.length) {
        $positiveField.val(positiveDesc).trigger('input').trigger('change');
        toastr.success('✅ Positive prompt prefix set');
    } else {
        console.warn('[PortraitBank] Field #sd_character_prompt not found');
    }

    // 3. Устанавливаем NEGATIVE prompt
    const $negativeField = $('#sd_character_negative_prompt');
    if ($negativeField.length) {
        $negativeField.val(negativeDesc).trigger('input').trigger('change');
        toastr.success('✅ Negative prompt prefix set');
    } else {
        console.warn('[PortraitBank] Field #sd_character_negative_prompt not found – negative prompt not set');
    }

    // 4. Запускаем генерацию изображения
    try {
        if (typeof ctx.executeSlashCommands !== 'function') {
            throw new Error('executeSlashCommands function not found. Update SillyTavern.');
        }

        await ctx.executeSlashCommands('/sd you');
        toastr.success('🎨 Command /sd you executed. Image generation started.');
    } catch (e) {
        console.error('[PortraitBank] Error executing /sd you:', e);
        toastr.error(`❌ Generation error: ${e.message}. Try to run /sd you manually.`);
    }
}

// ----- UI Settings Panel (Extensions tab) – без изменений, только заменён getDescription -> getPositiveDescription -----
function createSettingsUI() {
    const settings = getSettings();
    const container = document.getElementById('extensions_settings');
    if (!container) return;

    const html = `
        <div class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header">
                <b>PortraitBank – appearance description generator</b>
                <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
            </div>
            <div class="inline-drawer-content">
                <div class="iig-settings" style="padding: 10px;">
                    <h4>Generation prompt</h4>
                    <p class="hint">This prompt is sent to AI together with your hints. Use {{char}}, {{gender}} and other macros.</p>
                    <textarea id="portraitbank_prompt_editor" class="text_pole" style="width:100%; min-height:150px; font-family:monospace;">${settings.generationPrompt.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
                    <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:10px;">
                        <button id="portraitbank_save_prompt" class="menu_button"><i class="fa-solid fa-save"></i> Save prompt</button>
                        <button id="portraitbank_reset_prompt" class="menu_button"><i class="fa-solid fa-undo"></i> Reset</button>
                    </div>
                    <hr>
                    <h4>Generation parameters</h4>
                    <div class="flex-row">
                        <label for="portraitbank_temperature">Temperature</label>
                        <input type="number" id="portraitbank_temperature" class="text_pole flex1" value="${settings.modelParams.temperature}" min="0.1" max="2.0" step="0.1">
                    </div>
                    <div class="flex-row">
                        <label for="portraitbank_max_tokens">Max tokens</label>
                        <input type="number" id="portraitbank_max_tokens" class="text_pole flex1" value="${settings.modelParams.max_tokens}" min="100" max="1000" step="50">
                    </div>
                    <hr>
                    <h4>Actions</h4>
                    <div style="display:flex; gap:10px; flex-wrap:wrap;">
                        <button id="portraitbank_ui_generate" class="menu_button"><i class="fa-solid fa-wand-magic-sparkles"></i> Generate description</button>
                        <button id="portraitbank_ui_image" class="menu_button"><i class="fa-solid fa-image"></i> Fill prompt fields & generate image</button>
                        <button id="portraitbank_ui_edit" class="menu_button"><i class="fa-solid fa-pencil"></i> Edit description</button>
                    </div>
                    <p class="hint" style="margin-top:10px;">Current character: <span id="portraitbank_current_char">—</span>, positive description: <span id="portraitbank_current_desc_preview">—</span></p>
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
        toastr.success('Prompt saved');
    });

    $('#portraitbank_reset_prompt').on('click', function() {
        $('#portraitbank_prompt_editor').val(defaultSettings.generationPrompt);
        settings.generationPrompt = defaultSettings.generationPrompt;
        saveSettings();
        toastr.info('Prompt reset to default');
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
        toastr.info('⏳ Generating description...');
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
        const desc = getPositiveDescription(ctx.characterId);
        const preview = desc.length > 50 ? desc.substring(0, 50) + '…' : desc || 'empty';
        $('#portraitbank_current_char').text(charName);
        $('#portraitbank_current_desc_preview').text(preview);
    }

    updateUIInfo();

    const ctx = SillyTavern.getContext();
    if (ctx.eventTypes && ctx.eventTypes.CHARACTER_SWITCHED) {
        ctx.eventSource.on(ctx.eventTypes.CHARACTER_SWITCHED, updateUIInfo);
    } else {
        setInterval(updateUIInfo, 1000);
    }
}

// ----- Slash Commands -------------------------------------------------
function registerCommands() {
    const ctx = SillyTavern.getContext();

    try {
        ctx.registerSlashCommand('portrait', openModal, [], '– open appearance description editor (positive + negative)', true, true);
        ctx.registerSlashCommand('portrait-generate', () => {
            const hint = prompt('Enter hints for generation (can be empty):', '');
            if (hint !== null) generateDescriptionFromPrompt(hint);
        }, ['portrait-gen'], '– generate positive description via AI (enter hints in dialog)', true, false);
        ctx.registerSlashCommand('portrait-image', portraitImageCommand, ['portrait-img'], '– write positive/negative descriptions to prompt prefix fields and run /sd you', true, false);
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

// ----- Inject positive prompt into text generation --------------------
function setupInjection() {
    const ctx = SillyTavern.getContext();
    ctx.eventSource.on(ctx.eventTypes.GENERATION_STARTED, () => {
        const desc = getPositiveDescription(ctx.characterId);
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

    // ----- Обработчики основной модалки (с двумя полями) -----
    $(document).off('click', '#portraitbank_save').on('click', '#portraitbank_save', function() {
        const ctx = SillyTavern.getContext();
        const positive = $('#portraitbank_textarea_positive').val();
        const negative = $('#portraitbank_textarea_negative').val();
        setPositiveDescription(ctx.characterId, positive);
        setNegativeDescription(ctx.characterId, negative);
        toastr.success('Descriptions saved');
        closeModal();
    });
    $(document).off('click', '#portraitbank_cancel, #portraitbank_close, #portraitbank_overlay').on('click', '#portraitbank_cancel, #portraitbank_close, #portraitbank_overlay', closeModal);

    // ----- Обработчики закрытия окна сравнения -----
    $(document).off('click', '#portraitbank_compare_cancel, #portraitbank_compare_close, #portraitbank_compare_overlay').on('click', '#portraitbank_compare_cancel, #portraitbank_compare_close, #portraitbank_compare_overlay', closeCompareModal);
})();