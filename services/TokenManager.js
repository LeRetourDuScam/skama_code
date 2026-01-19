// Copyright © 2023 Entreprise SkamKraft
'use strict';

/**
 * Gestionnaire sécurisé pour le token SpaceTraders
 * Utilise sessionStorage par défaut pour plus de sécurité
 */
export class TokenManager {
    constructor() {
        this.STORAGE_KEY = 'st_token';
        this.REMEMBER_KEY = 'st_remember';
        this._token = null;
        this._listeners = new Set();
    }

    /**
     * Définit le token
     * @param {string} token - Token SpaceTraders
     * @param {boolean} remember - Si true, utilise localStorage (persistant)
     */
    setToken(token, remember = false) {
        if (!token || typeof token !== 'string') {
            throw new Error('Invalid token');
        }

        this._token = token;

        const encoded = this._encode(token);

        if (remember) {
            localStorage.setItem(this.STORAGE_KEY, encoded);
            localStorage.setItem(this.REMEMBER_KEY, 'true');
            sessionStorage.removeItem(this.STORAGE_KEY);
        } else {
            sessionStorage.setItem(this.STORAGE_KEY, encoded);
            localStorage.removeItem(this.STORAGE_KEY);
            localStorage.removeItem(this.REMEMBER_KEY);
        }

        this._notifyListeners('set');
    }

    /**
     * Récupère le token
     * @returns {string|null}
     */
    getToken() {
        if (this._token) {
            return this._token;
        }

        let encoded = sessionStorage.getItem(this.STORAGE_KEY);
        
        if (!encoded && localStorage.getItem(this.REMEMBER_KEY)) {
            encoded = localStorage.getItem(this.STORAGE_KEY);
        }

        if (encoded) {
            try {
                this._token = this._decode(encoded);
                return this._token;
            } catch (e) {
                console.error('[TokenManager] Failed to decode token');
                this.clearToken();
                return null;
            }
        }

        return null;
    }

    /**
     * Vérifie si un token est présent
     */
    isAuthenticated() {
        return this.getToken() !== null;
    }

    /**
     * Supprime le token
     */
    clearToken() {
        this._token = null;
        sessionStorage.removeItem(this.STORAGE_KEY);
        localStorage.removeItem(this.STORAGE_KEY);
        localStorage.removeItem(this.REMEMBER_KEY);
        this._notifyListeners('clear');
    }

    /**
     * Migre un token depuis l'ancien système (localStorage.token)
     * Utile pour la rétrocompatibilité
     */
    migrateFromLegacy() {
        const legacyToken = localStorage.getItem('token');
        if (legacyToken && !this.isAuthenticated()) {
            console.log('[TokenManager] Migrating legacy token...');
            this.setToken(legacyToken, true);
            // Garder l'ancien pour la compatibilité temporaire
            // localStorage.removeItem('token');
            return true;
        }
        return false;
    }

    /**
     * Ajoute un listener pour les changements de token
     */
    addListener(callback) {
        this._listeners.add(callback);
    }

    /**
     * Supprime un listener
     */
    removeListener(callback) {
        this._listeners.delete(callback);
    }

    /**
     * Notifie les listeners
     */
    _notifyListeners(event) {
        this._listeners.forEach(callback => {
            try {
                callback(event, this.isAuthenticated());
            } catch (e) {
                console.error('[TokenManager] Listener error:', e);
            }
        });
    }

    /**
     * Encode le token (obfuscation basique)
     * NOTE: Ce n'est PAS une vraie encryption!
     * Pour une vraie sécurité, utilisez un backend ou Web Crypto API
     */
    _encode(token) {
        return btoa(token.split('').reverse().join(''));
    }

    /**
     * Décode le token
     */
    _decode(encoded) {
        return atob(encoded).split('').reverse().join('');
    }

    /**
     * Vérifie la validité du token avec l'API
     */
    async validateToken() {
        const token = this.getToken();
        if (!token) return false;

        try {
            const response = await fetch('https://api.spacetraders.io/v2/my/agent', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                this.clearToken();
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('[TokenManager] Validation failed:', error);
            return false;
        }
    }
}

export const tokenManager = new TokenManager();

tokenManager.migrateFromLegacy();
