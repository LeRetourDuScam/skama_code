// Copyright © 2023 Entreprise SkamKraft
'use strict';

/**
 * Rate Limiter pour l'API SpaceTraders
 * Limite: 2 requêtes par seconde pour les comptes gratuits
 */
export class RateLimiter {
    constructor(requestsPerSecond = 2) {
        this.queue = [];
        this.isProcessing = false;
        this.lastRequestTime = 0;
        this.minInterval = 1000 / requestsPerSecond;
        this.requestCount = 0;
        this.listeners = new Set();
    }

    /**
     * Ajoute une requête à la queue et attend son tour
     * @param {Function} request - Fonction qui retourne une Promise
     * @returns {Promise} - Résultat de la requête
     */
    async enqueue(request) {
        return new Promise((resolve, reject) => {
            this.queue.push({
                request,
                resolve,
                reject,
                addedAt: Date.now()
            });
            this._notifyListeners();
            this._processQueue();
        });
    }

    /**
     * Traite la queue de requêtes en respectant le rate limit
     */
    async _processQueue() {
        if (this.isProcessing || this.queue.length === 0) return;

        this.isProcessing = true;

        while (this.queue.length > 0) {
            const now = Date.now();
            const timeSinceLastRequest = now - this.lastRequestTime;

            if (timeSinceLastRequest < this.minInterval) {
                await this._sleep(this.minInterval - timeSinceLastRequest);
            }

            const item = this.queue.shift();
            if (item) {
                this.lastRequestTime = Date.now();
                this.requestCount++;
                this._notifyListeners();

                try {
                    const result = await item.request();
                    item.resolve(result);
                } catch (error) {
                    item.reject(error);
                }
            }
        }

        this.isProcessing = false;
    }

    /**
     * Pause l'exécution pendant un certain temps
     */
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Ajoute un listener pour les changements d'état
     */
    addListener(callback) {
        this.listeners.add(callback);
    }

    /**
     * Supprime un listener
     */
    removeListener(callback) {
        this.listeners.delete(callback);
    }

    /**
     * Notifie tous les listeners
     */
    _notifyListeners() {
        const status = this.getStatus();
        this.listeners.forEach(callback => callback(status));
    }

    /**
     * Retourne le statut actuel du rate limiter
     */
    getStatus() {
        return {
            queueLength: this.queue.length,
            isProcessing: this.isProcessing,
            totalRequests: this.requestCount,
            requestsPerSecond: 1000 / this.minInterval
        };
    }

    /**
     * Vide la queue (attention: rejette toutes les requêtes en attente)
     */
    clearQueue() {
        while (this.queue.length > 0) {
            const item = this.queue.shift();
            item.reject(new Error('Queue cleared'));
        }
        this._notifyListeners();
    }
}

export const rateLimiter = new RateLimiter(2);
