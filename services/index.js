// Copyright © 2023 Entreprise SkamKraft
'use strict';

/**
 * Point d'entrée centralisé pour tous les services SkamKraft
 * Import unique pour accéder à toutes les fonctionnalités
 */

export { RateLimiter, rateLimiter } from './RateLimiter.js';
export { withRetry, ajaxWithRetry, isRateLimitError, getRetryAfter } from './RetryHandler.js';
export { CacheService, cacheService } from './CacheService.js';
export { TokenManager, tokenManager } from './TokenManager.js';

export { SpaceTradersClient, spaceTradersClient } from './SpaceTradersClient.js';

export { TradingBot, tradingBot } from './TradingBot.js';
export { FleetManager, fleetManager, ShipRole, TaskStatus } from './FleetManager.js';
export { StatisticsTracker, statisticsTracker } from './StatisticsTracker.js';

/**
 * Initialise tous les services avec les données de l'agent
 * À appeler après la connexion réussie
 */
export async function initializeServices(agent) {
    const { statisticsTracker } = await import('./StatisticsTracker.js');
    const { fleetManager } = await import('./FleetManager.js');
    
    statisticsTracker.setStartCredits(agent.credits);
    
    await fleetManager.syncFleet();
    
    console.log('[Services] Initialized successfully');
    
    return {
        agent,
        fleetStatus: fleetManager.getFleetStatus(),
        stats: statisticsTracker.getSummary()
    };
}

/**
 * Obtient le statut de tous les services
 */
export function getServicesStatus() {
    return {
        rateLimiter: rateLimiter.getStatus(),
        cache: cacheService.getStats(),
        isAuthenticated: tokenManager.isAuthenticated(),
        fleet: fleetManager.getFleetStatus(),
        trading: tradingBot.getStats(),
        statistics: statisticsTracker.getSessionStats()
    };
}
