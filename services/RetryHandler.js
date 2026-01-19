// Copyright © 2023 Entreprise SkamKraft
'use strict';

/**
 * Configuration par défaut pour le retry
 */
const DEFAULT_CONFIG = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    retryableStatuses: [429, 500, 502, 503, 504],
    retryableErrors: ['NETWORK_ERROR', 'TIMEOUT', 'ECONNRESET']
};

/**
 * Exécute une opération avec retry et backoff exponentiel
 * @param {Function} operation - Fonction qui retourne une Promise
 * @param {Object} config - Configuration du retry
 * @returns {Promise} - Résultat de l'opération
 */
export async function withRetry(operation, config = {}) {
    const {
        maxRetries,
        baseDelay,
        maxDelay,
        retryableStatuses,
        retryableErrors
    } = { ...DEFAULT_CONFIG, ...config };

    let lastError = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;

            const status = error.status || 
                          error.responseJSON?.error?.code ||
                          (error.xhr && error.xhr.status);

            const isRetryableStatus = status && retryableStatuses.includes(status);
            const isRetryableError = retryableErrors.some(e => 
                error.message?.includes(e) || error.code === e
            );

            const isRetryable = isRetryableStatus || isRetryableError;

            if (!isRetryable || attempt === maxRetries) {
                throw error;
            }

            const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
            const jitter = Math.random() * 0.3 * delay;
            const totalDelay = delay + jitter;

            console.warn(
                `[RetryHandler] Attempt ${attempt + 1}/${maxRetries} failed. ` +
                `Status: ${status || 'N/A'}. Retrying in ${Math.round(totalDelay)}ms...`
            );

            await new Promise(resolve => setTimeout(resolve, totalDelay));
        }
    }

    throw lastError;
}

/**
 * Wrapper pour jQuery AJAX avec retry automatique
 * @param {Object} ajaxConfig - Configuration jQuery AJAX
 * @param {Object} retryConfig - Configuration du retry
 * @returns {Promise} - Résultat de la requête
 */
export function ajaxWithRetry(ajaxConfig, retryConfig = {}) {
    return withRetry(() => {
        return new Promise((resolve, reject) => {
            $.ajax({
                ...ajaxConfig,
                success: (data, textStatus, xhr) => {
                    resolve({ data, textStatus, xhr });
                },
                error: (xhr, textStatus, errorThrown) => {
                    const error = new Error(errorThrown || textStatus);
                    error.xhr = xhr;
                    error.status = xhr.status;
                    error.responseJSON = xhr.responseJSON;
                    reject(error);
                }
            });
        });
    }, retryConfig);
}

/**
 * Vérifie si une erreur est une erreur 429 (Too Many Requests)
 */
export function isRateLimitError(error) {
    const status = error.status || 
                  error.responseJSON?.error?.code ||
                  (error.xhr && error.xhr.status);
    return status === 429;
}

/**
 * Extrait le temps d'attente recommandé d'une réponse 429
 */
export function getRetryAfter(error) {
    if (error.xhr && error.xhr.getResponseHeader) {
        const retryAfter = error.xhr.getResponseHeader('Retry-After');
        if (retryAfter) {
            return parseInt(retryAfter, 10) * 1000;
        }
    }
    return null;
}
