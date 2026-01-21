// Copyright © 2023 Entreprise SkamKraft
'use strict';

/**
 * Configuration centrale pour l'API SpaceTraders
 */
export const SpaceTraders = {
    // URL de base de l'API
    host: "https://api.spacetraders.io/v2",
    
    // Délai entre les requêtes (ms) - pour compatibilité legacy
    timing: 500,
    
    // Rate limit: 2 requêtes par seconde pour les comptes gratuits
    rateLimit: {
        requestsPerSecond: 2,
        burstLimit: 10
    },
    
    // Configuration du retry
    retry: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 30000,
        retryableStatuses: [429, 500, 502, 503, 504]
    },
    
    // TTL du cache par type de données (ms)
    cacheTTL: {
        systems: 3600000,      // 1 heure
        waypoints: 1800000,    // 30 min
        markets: 60000,        // 1 min
        shipyards: 300000,     // 5 min
        agent: 30000,          // 30 sec
        contracts: 60000,      // 1 min
        ships: 10000,          // 10 sec
        factions: 86400000     // 24h
    },
    
    // Limites de pagination
    pagination: {
        defaultLimit: 20,
        maxLimit: 20
    }
};

/**
 * Vérifie si l'environnement est en développement
 */
export function isDevelopment() {
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1';
}

/**
 * Logger conditionnel (désactivé en production)
 */
export function debugLog(...args) {
    if (isDevelopment()) {
        console.log('[SpaceTraders]', ...args);
    }
}