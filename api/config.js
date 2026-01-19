// Copyright © 2023 Entreprise SkamKraft
'use strict';


export const SpaceTraders = {
    host: "https://api.spacetraders.io/v2",
    
    timing: 500,
    
    rateLimit: {
        requestsPerSecond: 2,
        burstLimit: 10
    },
    
    retry: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 30000,
        retryableStatuses: [429, 500, 502, 503, 504]
    },
    
    cacheTTL: {
        systems: 3600000,      
        waypoints: 1800000,    
        markets: 60000,        
        shipyards: 300000,     
        agent: 30000,          
        contracts: 60000,      
        ships: 10000,          
        factions: 86400000     
    },
    
    // Limites de pagination
    pagination: {
        defaultLimit: 20,
        maxLimit: 20
    }
};

export function isDevelopment() {
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1';
}

export function debugLog(...args) {
    if (isDevelopment()) {
        console.log('[SpaceTraders]', ...args);
    }
}