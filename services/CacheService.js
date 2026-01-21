// Copyright © 2023 Entreprise SkamKraft
'use strict';

/**
 * Service de cache pour les données API SpaceTraders
 * Réduit le nombre d'appels API et améliore les performances
 */
export class CacheService {
    constructor() {
        this.cache = new Map();
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            invalidations: 0
        };

        // TTL par défaut selon le type de données (en ms)
        this.defaultTTLs = {
            'systems': 3600000,      // 1 heure - données quasi-statiques
            'waypoints': 1800000,    // 30 min - changent rarement
            'markets': 60000,        // 1 min - prix volatiles
            'shipyards': 300000,     // 5 min
            'agent': 30000,          // 30 sec - crédits changent souvent
            'contracts': 60000,      // 1 min
            'ships': 10000,          // 10 sec - position/fuel changent
            'factions': 86400000,    // 24h - données statiques
            'default': 60000         // 1 min par défaut
        };
    }

    /**
     * Génère une clé de cache unique
     */
    generateKey(category, ...identifiers) {
        return `${category}:${identifiers.join(':')}`;
    }

    /**
     * Stocke une valeur dans le cache
     * @param {string} key - Clé unique
     * @param {any} data - Données à cacher
     * @param {string} category - Catégorie pour déterminer le TTL
     * @param {number} customTTL - TTL personnalisé (optionnel)
     */
    set(key, data, category = 'default', customTTL = null) {
        const ttl = customTTL || this.defaultTTLs[category] || this.defaultTTLs.default;
        
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl,
            category
        });

        this.stats.sets++;
    }

    /**
     * Récupère une valeur du cache
     * @param {string} key - Clé unique
     * @returns {any|null} - Données ou null si expirées/absentes
     */
    get(key) {
        const entry = this.cache.get(key);

        if (!entry) {
            this.stats.misses++;
            return null;
        }

        // Vérifier si l'entrée est expirée
        if (Date.now() - entry.timestamp > entry.ttl) {
            this.cache.delete(key);
            this.stats.misses++;
            return null;
        }

        this.stats.hits++;
        return entry.data;
    }

    /**
     * Vérifie si une clé existe et n'est pas expirée
     */
    has(key) {
        return this.get(key) !== null;
    }

    /**
     * Invalide une ou plusieurs entrées par pattern
     * @param {string} pattern - Pattern à rechercher dans les clés
     */
    invalidate(pattern) {
        for (const key of this.cache.keys()) {
            if (key.includes(pattern)) {
                this.cache.delete(key);
                this.stats.invalidations++;
            }
        }
    }

    /**
     * Invalide toutes les entrées d'une catégorie
     */
    invalidateCategory(category) {
        for (const [key, entry] of this.cache.entries()) {
            if (entry.category === category) {
                this.cache.delete(key);
                this.stats.invalidations++;
            }
        }
    }

    /**
     * Vide complètement le cache
     */
    clear() {
        this.cache.clear();
        this.stats.invalidations += this.cache.size;
    }

    /**
     * Nettoie les entrées expirées
     */
    cleanup() {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > entry.ttl) {
                this.cache.delete(key);
                cleaned++;
            }
        }

        return cleaned;
    }

    /**
     * Retourne les statistiques du cache
     */
    getStats() {
        const totalRequests = this.stats.hits + this.stats.misses;
        const hitRate = totalRequests > 0 
            ? (this.stats.hits / totalRequests * 100).toFixed(2) 
            : 0;

        return {
            ...this.stats,
            size: this.cache.size,
            hitRate: `${hitRate}%`
        };
    }

    /**
     * Wrapper pour get-or-fetch pattern
     * @param {string} key - Clé de cache
     * @param {Function} fetchFn - Fonction pour récupérer les données si pas en cache
     * @param {string} category - Catégorie de données
     */
    async getOrFetch(key, fetchFn, category = 'default') {
        // Vérifier le cache d'abord
        const cached = this.get(key);
        if (cached !== null) {
            return cached;
        }

        // Récupérer les données
        const data = await fetchFn();
        
        // Mettre en cache
        this.set(key, data, category);
        
        return data;
    }
}

// Instance singleton
export const cacheService = new CacheService();

// Nettoyage automatique toutes les 5 minutes
setInterval(() => {
    const cleaned = cacheService.cleanup();
    if (cleaned > 0) {
        console.log(`[CacheService] Cleaned ${cleaned} expired entries`);
    }
}, 300000);
