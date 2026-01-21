/**
 * Système de notifications - Snackbars et Modals
 * Remplace les alert/confirm/prompt natifs par des UI modernes
 */

// Conteneur pour les snackbars
function ensureSnackbarContainer() {
    if ($("#snackbar-container").length === 0) {
        $("body").append(`
            <div id="snackbar-container" style="
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 20000;
                display: flex;
                flex-direction: column-reverse;
                gap: 10px;
                max-height: 80vh;
                overflow-y: auto;
                pointer-events: none;
            "></div>
        `);
    }
}

/**
 * Affiche une notification snackbar
 * @param {string} message - Le message à afficher
 * @param {string} type - Type: 'success', 'error', 'warning', 'info'
 * @param {number} duration - Durée d'affichage en ms (0 = permanent)
 * @returns {string} L'ID du snackbar créé
 */
export function showSnackbar(message, type = 'info', duration = 4000) {
    ensureSnackbarContainer();
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    const colors = {
        success: { bg: 'rgba(0, 170, 0, 0.95)', border: '#00ff00' },
        error: { bg: 'rgba(170, 0, 0, 0.95)', border: '#ff4444' },
        warning: { bg: 'rgba(170, 120, 0, 0.95)', border: '#ffaa00' },
        info: { bg: 'rgba(0, 100, 170, 0.95)', border: '#00aaff' }
    };
    
    const color = colors[type] || colors.info;
    const icon = icons[type] || icons.info;
    const id = `snackbar-${Date.now()}`;
    
    const snackbarHTML = `
        <div id="${id}" class="snackbar-item" style="
            background: ${color.bg};
            border: 2px solid ${color.border};
            border-radius: 8px;
            padding: 12px 20px;
            color: white;
            font-size: 13px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            gap: 10px;
            min-width: 280px;
            max-width: 400px;
            pointer-events: auto;
            animation: snackbarSlideIn 0.3s ease-out;
            cursor: pointer;
        ">
            <span style="font-size: 18px;">${icon}</span>
            <span style="flex: 1; line-height: 1.4;">${message}</span>
            <button onclick="$('#${id}').remove()" style="
                background: none;
                border: none;
                color: white;
                opacity: 0.7;
                cursor: pointer;
                font-size: 16px;
                padding: 0 5px;
            ">✕</button>
        </div>
    `;
    
    // Ajouter le CSS d'animation si pas déjà présent
    if ($("#snackbar-styles").length === 0) {
        $("head").append(`
            <style id="snackbar-styles">
                @keyframes snackbarSlideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes snackbarSlideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
                .snackbar-item:hover {
                    filter: brightness(1.1);
                }
            </style>
        `);
    }
    
    $("#snackbar-container").append(snackbarHTML);
    
    // Auto-suppression après le délai
    if (duration > 0) {
        setTimeout(() => {
            $(`#${id}`).css('animation', 'snackbarSlideOut 0.3s ease-in forwards');
            setTimeout(() => $(`#${id}`).remove(), 300);
        }, duration);
    }
    
    // Clic pour fermer
    $(`#${id}`).on('click', function() {
        $(this).remove();
    });
    
    return id;
}

/**
 * Affiche une modal de confirmation
 * @param {string} title - Titre de la modal
 * @param {string} message - Message de la modal
 * @param {Function} onConfirm - Callback si confirmé
 * @param {Function} onCancel - Callback si annulé
 * @param {string} confirmText - Texte du bouton de confirmation
 * @param {string} cancelText - Texte du bouton d'annulation
 */
export function showConfirmModal(title, message, onConfirm, onCancel = null, confirmText = 'Confirm', cancelText = 'Cancel') {
    // Supprimer modal existante
    $("#confirm-modal, #confirm-modal-overlay").remove();
    
    const modalHTML = `
        <div id="confirm-modal-overlay" style="
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            z-index: 15000;
            animation: fadeIn 0.2s ease-out;
        "></div>
        <div id="confirm-modal" style="
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(10, 15, 25, 0.98);
            border: 2px solid #00ffff;
            border-radius: 12px;
            padding: 25px;
            min-width: 350px;
            max-width: 500px;
            z-index: 15001;
            box-shadow: 0 0 30px rgba(0, 255, 255, 0.3);
            animation: modalSlideIn 0.3s ease-out;
        ">
            <h3 style="
                margin: 0 0 15px 0;
                color: #00ffff;
                font-size: 18px;
                border-bottom: 1px solid rgba(0, 255, 255, 0.3);
                padding-bottom: 10px;
            ">${title}</h3>
            <p style="
                color: #ddd;
                font-size: 14px;
                line-height: 1.6;
                margin: 0 0 25px 0;
                white-space: pre-line;
            ">${message}</p>
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button id="confirm-modal-cancel" style="
                    padding: 10px 20px;
                    background: rgba(100, 100, 100, 0.5);
                    border: 1px solid #666;
                    border-radius: 6px;
                    color: #aaa;
                    cursor: pointer;
                    font-size: 13px;
                    transition: all 0.2s;
                ">${cancelText}</button>
                <button id="confirm-modal-confirm" style="
                    padding: 10px 20px;
                    background: linear-gradient(135deg, #00aaaa, #00cccc);
                    border: none;
                    border-radius: 6px;
                    color: white;
                    cursor: pointer;
                    font-size: 13px;
                    font-weight: bold;
                    transition: all 0.2s;
                ">${confirmText}</button>
            </div>
        </div>
    `;
    
    // Ajouter CSS animations
    ensureModalStyles();
    
    $("body").append(modalHTML);
    
    // Event handlers
    $("#confirm-modal-confirm").on("click", function() {
        $("#confirm-modal, #confirm-modal-overlay").remove();
        if (onConfirm) onConfirm();
    });
    
    $("#confirm-modal-cancel, #confirm-modal-overlay").on("click", function() {
        $("#confirm-modal, #confirm-modal-overlay").remove();
        if (onCancel) onCancel();
    });
    
    // Fermer avec Escape
    $(document).on("keydown.confirmModal", function(e) {
        if (e.key === "Escape") {
            $("#confirm-modal, #confirm-modal-overlay").remove();
            $(document).off("keydown.confirmModal");
            if (onCancel) onCancel();
        }
    });
}

/**
 * Affiche une modal d'information (remplace alert)
 * @param {string} title - Titre de la modal
 * @param {string} message - Message de la modal
 * @param {Function} onClose - Callback à la fermeture
 */
export function showInfoModal(title, message, onClose = null) {
    // Supprimer modal existante
    $("#info-modal, #info-modal-overlay").remove();
    
    const modalHTML = `
        <div id="info-modal-overlay" style="
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            z-index: 15000;
            animation: fadeIn 0.2s ease-out;
        "></div>
        <div id="info-modal" style="
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(10, 15, 25, 0.98);
            border: 2px solid #00ffff;
            border-radius: 12px;
            padding: 25px;
            min-width: 350px;
            max-width: 500px;
            z-index: 15001;
            box-shadow: 0 0 30px rgba(0, 255, 255, 0.3);
            animation: modalSlideIn 0.3s ease-out;
        ">
            <h3 style="
                margin: 0 0 15px 0;
                color: #00ffff;
                font-size: 18px;
                border-bottom: 1px solid rgba(0, 255, 255, 0.3);
                padding-bottom: 10px;
            ">${title}</h3>
            <p style="
                color: #ddd;
                font-size: 14px;
                line-height: 1.6;
                margin: 0 0 25px 0;
                white-space: pre-line;
            ">${message}</p>
            <div style="display: flex; justify-content: flex-end;">
                <button id="info-modal-close" style="
                    padding: 10px 25px;
                    background: linear-gradient(135deg, #00aaaa, #00cccc);
                    border: none;
                    border-radius: 6px;
                    color: white;
                    cursor: pointer;
                    font-size: 13px;
                    font-weight: bold;
                    transition: all 0.2s;
                ">OK</button>
            </div>
        </div>
    `;
    
    ensureModalStyles();
    $("body").append(modalHTML);
    
    function closeModal() {
        $("#info-modal, #info-modal-overlay").remove();
        $(document).off("keydown.infoModal");
        if (onClose) onClose();
    }
    
    $("#info-modal-close, #info-modal-overlay").on("click", closeModal);
    
    $(document).on("keydown.infoModal", function(e) {
        if (e.key === "Escape" || e.key === "Enter") {
            closeModal();
        }
    });
}

/**
 * Affiche une modal de prompt (remplace prompt)
 * @param {string} title - Titre de la modal
 * @param {string} message - Message de la modal
 * @param {string} defaultValue - Valeur par défaut de l'input
 * @param {Function} onSubmit - Callback avec la valeur saisie
 * @param {Function} onCancel - Callback si annulé
 */
export function showPromptModal(title, message, defaultValue, onSubmit, onCancel = null) {
    $("#prompt-modal, #prompt-modal-overlay").remove();
    
    const modalHTML = `
        <div id="prompt-modal-overlay" style="
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            z-index: 15000;
        "></div>
        <div id="prompt-modal" style="
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(10, 15, 25, 0.98);
            border: 2px solid #00ffff;
            border-radius: 12px;
            padding: 25px;
            min-width: 380px;
            max-width: 500px;
            z-index: 15001;
            box-shadow: 0 0 30px rgba(0, 255, 255, 0.3);
            animation: modalSlideIn 0.3s ease-out;
        ">
            <h3 style="
                margin: 0 0 15px 0;
                color: #00ffff;
                font-size: 18px;
                border-bottom: 1px solid rgba(0, 255, 255, 0.3);
                padding-bottom: 10px;
            ">${title}</h3>
            <p style="
                color: #ddd;
                font-size: 14px;
                line-height: 1.6;
                margin: 0 0 15px 0;
                white-space: pre-line;
            ">${message}</p>
            <input type="text" id="prompt-modal-input" value="${defaultValue || ''}" style="
                width: 100%;
                padding: 12px;
                background: rgba(0, 0, 0, 0.5);
                border: 1px solid #00aaaa;
                border-radius: 6px;
                color: white;
                font-size: 14px;
                margin-bottom: 20px;
                box-sizing: border-box;
            " />
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button id="prompt-modal-cancel" style="
                    padding: 10px 20px;
                    background: rgba(100, 100, 100, 0.5);
                    border: 1px solid #666;
                    border-radius: 6px;
                    color: #aaa;
                    cursor: pointer;
                    font-size: 13px;
                ">Cancel</button>
                <button id="prompt-modal-confirm" style="
                    padding: 10px 20px;
                    background: linear-gradient(135deg, #00aaaa, #00cccc);
                    border: none;
                    border-radius: 6px;
                    color: white;
                    cursor: pointer;
                    font-size: 13px;
                    font-weight: bold;
                ">OK</button>
            </div>
        </div>
    `;
    
    ensureModalStyles();
    $("body").append(modalHTML);
    $("#prompt-modal-input").focus().select();
    
    function closeModal(value) {
        $("#prompt-modal, #prompt-modal-overlay").remove();
        $(document).off("keydown.promptModal");
        if (value !== null && onSubmit) {
            onSubmit(value);
        } else if (onCancel) {
            onCancel();
        }
    }
    
    $("#prompt-modal-confirm").on("click", function() {
        closeModal($("#prompt-modal-input").val());
    });
    
    $("#prompt-modal-cancel, #prompt-modal-overlay").on("click", function() {
        closeModal(null);
    });
    
    $(document).on("keydown.promptModal", function(e) {
        if (e.key === "Enter") {
            closeModal($("#prompt-modal-input").val());
        } else if (e.key === "Escape") {
            closeModal(null);
        }
    });
}

/**
 * Ajoute les styles CSS pour les modals si pas déjà présents
 */
function ensureModalStyles() {
    if ($("#modal-styles").length === 0) {
        $("head").append(`
            <style id="modal-styles">
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes modalSlideIn {
                    from { transform: translate(-50%, -50%) scale(0.9); opacity: 0; }
                    to { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                }
                #confirm-modal-cancel:hover {
                    background: rgba(100, 100, 100, 0.8);
                    color: white;
                }
                #confirm-modal-confirm:hover,
                #info-modal-close:hover,
                #prompt-modal-confirm:hover {
                    filter: brightness(1.2);
                }
            </style>
        `);
    }
}

// Fonction globale pour nettoyer le panneau depuis d'autres pages
window.cleanupSystemStatusPanel = function() {
    $("#status-panel").remove();
};
