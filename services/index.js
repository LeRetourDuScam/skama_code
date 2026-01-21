// Copyright © 2023 Entreprise SkamKraft
'use strict';

/**
 * Point d'entrée centralisé pour tous les services SkamKraft
 * Import unique pour accéder à toutes les fonctionnalités
 */

// Services de base
export { RateLimiter, rateLimiter } from './RateLimiter.js';
export { withRetry, ajaxWithRetry, isRateLimitError, getRetryAfter } from './RetryHandler.js';
export { CacheService, cacheService } from './CacheService.js';
export { TokenManager, tokenManager } from './TokenManager.js';

// Client API
export { SpaceTradersClient, spaceTradersClient } from './SpaceTradersClient.js';

// Services avancés
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
    
    // Enregistrer les crédits de départ
    statisticsTracker.setStartCredits(agent.credits);
    
    // Synchroniser la flotte
    await fleetManager.syncFleet();
    
    console.log('[Services] Initialized successfully');
    
    return {
        agent,
        fleetStatus: fleetManager.getFleetStatus(),
        stats: statisticsTracker.getSummary()
    };
}

// Import local des instances pour utilisation dans les fonctions
import { rateLimiter as _rateLimiter } from './RateLimiter.js';
import { cacheService as _cacheService } from './CacheService.js';
import { tokenManager as _tokenManager } from './TokenManager.js';
import { fleetManager as _fleetManager } from './FleetManager.js';
import { tradingBot as _tradingBot } from './TradingBot.js';
import { statisticsTracker as _statisticsTracker } from './StatisticsTracker.js';

/**
 * Obtient le statut de tous les services
 */
export function getServicesStatus() {
    return {
        rateLimiter: _rateLimiter.getStatus(),
        cache: _cacheService.getStats(),
        isAuthenticated: _tokenManager.isAuthenticated(),
        fleet: _fleetManager.getFleetStatus(),
        trading: _tradingBot.getStats(),
        statistics: _statisticsTracker.getSessionStats()
    };
}

/**
 * Nettoie tous les services lors de la déconnexion
 * Vide le cache, supprime les tokens, réinitialise les statistiques
 */
export function clearAllServices() {
    // Vider le cache complètement
    _cacheService.clear();
    
    // Supprimer le token (nouveau système)
    _tokenManager.clearToken();
    
    // Supprimer aussi l'ancien token (compatibilité)
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    
    // Réinitialiser les statistiques
    _statisticsTracker.reset();
    
    // Réinitialiser le rate limiter
    _rateLimiter.reset();
    
    console.log('[Services] All services cleared - user logged out');
}
