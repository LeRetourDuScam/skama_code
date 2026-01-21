// Copyright © 2023 Entreprise SkamKraft
'use strict';

import { SpaceTraders } from '../api/config.js';
import { rateLimiter } from './RateLimiter.js';
import { withRetry } from './RetryHandler.js';
import { cacheService } from './CacheService.js';
import { tokenManager } from './TokenManager.js';

/**
 * Client API centralisé pour SpaceTraders
 * Intègre: Rate Limiting, Retry, Cache, Gestion d'erreurs
 */
export class SpaceTradersClient {
    constructor() {
        this.baseUrl = SpaceTraders.host;
        this.requestCount = 0;
        this.errorCount = 0;
    }

    /**
     * Méthode de requête générique avec toutes les protections
     */
    async request(endpoint, options = {}, cacheConfig = null) {
        const {
            method = 'GET',
            body = null,
            headers = {},
            requiresAuth = true
        } = options;

        // Gestion du cache pour les GET
        if (method === 'GET' && cacheConfig) {
            const cacheKey = cacheService.generateKey(
                cacheConfig.category,
                endpoint,
                JSON.stringify(body || '')
            );
            
            const cached = cacheService.get(cacheKey);
            if (cached) {
                return cached;
            }
        }

        // Récupérer le token
        const token = tokenManager.getToken();
        if (requiresAuth && !token) {
            throw new Error('Authentication required. Please login first.');
        }

        // Construire les headers
        const requestHeaders = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            ...headers
        };

        if (requiresAuth && token) {
            requestHeaders['Authorization'] = `Bearer ${token}`;
        }

        // Exécuter la requête avec rate limiting et retry
        const result = await rateLimiter.enqueue(() =>
            withRetry(async () => {
                // Pour les requêtes POST/PATCH/PUT, envoyer {} si pas de body
                const needsBody = ['POST', 'PATCH', 'PUT'].includes(method);
                const requestBody = body ? JSON.stringify(body) : (needsBody ? '{}' : null);
                
                const response = await fetch(`${this.baseUrl}${endpoint}`, {
                    method,
                    headers: requestHeaders,
                    body: requestBody
                });

                this.requestCount++;

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    const error = new Error(errorData.error?.message || `HTTP ${response.status}`);
                    error.status = response.status;
                    error.code = errorData.error?.code;
                    error.data = errorData.error?.data;
                    this.errorCount++;
                    throw error;
                }

                return response.json();
            })
        );

        // Mettre en cache si configuré
        if (method === 'GET' && cacheConfig) {
            const cacheKey = cacheService.generateKey(
                cacheConfig.category,
                endpoint,
                JSON.stringify(body || '')
            );
            cacheService.set(cacheKey, result, cacheConfig.category);
        }

        return result;
    }

    // ==================== AGENT ====================

    async getAgent() {
        return this.request('/my/agent', {}, { category: 'agent' });
    }

    // ==================== SHIPS ====================

    async getMyShips(page = 1, limit = 20) {
        return this.request(`/my/ships?page=${page}&limit=${limit}`);
    }

    async getAllShips() {
        const allShips = [];
        let page = 1;
        let hasMore = true;

        while (hasMore) {
            const response = await this.getMyShips(page, 20);
            allShips.push(...response.data);
            
            const totalPages = Math.ceil(response.meta.total / 20);
            hasMore = page < totalPages;
            page++;
        }

        return allShips;
    }

    async getShip(shipSymbol) {
        return this.request(`/my/ships/${shipSymbol}`, {}, { category: 'ships' });
    }

    async orbitShip(shipSymbol) {
        cacheService.invalidate(`ships:${shipSymbol}`);
        return this.request(`/my/ships/${shipSymbol}/orbit`, { method: 'POST' });
    }

    async dockShip(shipSymbol) {
        cacheService.invalidate(`ships:${shipSymbol}`);
        return this.request(`/my/ships/${shipSymbol}/dock`, { method: 'POST' });
    }

    async navigateShip(shipSymbol, waypointSymbol) {
        cacheService.invalidate(`ships:${shipSymbol}`);
        return this.request(`/my/ships/${shipSymbol}/navigate`, {
            method: 'POST',
            body: { waypointSymbol }
        });
    }

    async warpShip(shipSymbol, waypointSymbol) {
        cacheService.invalidate(`ships:${shipSymbol}`);
        return this.request(`/my/ships/${shipSymbol}/warp`, {
            method: 'POST',
            body: { waypointSymbol }
        });
    }

    async jumpShip(shipSymbol, waypointSymbol) {
        cacheService.invalidate(`ships:${shipSymbol}`);
        return this.request(`/my/ships/${shipSymbol}/jump`, {
            method: 'POST',
            body: { waypointSymbol }
        });
    }

    async refuelShip(shipSymbol, units = null, fromCargo = false) {
        cacheService.invalidate(`ships:${shipSymbol}`);
        const body = {};
        if (units) body.units = units;
        if (fromCargo) body.fromCargo = fromCargo;
        return this.request(`/my/ships/${shipSymbol}/refuel`, {
            method: 'POST',
            body: Object.keys(body).length > 0 ? body : undefined
        });
    }

    async extractResources(shipSymbol, survey = null) {
        const body = survey ? { survey } : undefined;
        return this.request(`/my/ships/${shipSymbol}/extract`, {
            method: 'POST',
            body
        });
    }

    async siphonResources(shipSymbol) {
        return this.request(`/my/ships/${shipSymbol}/siphon`, { method: 'POST' });
    }

    async sellCargo(shipSymbol, symbol, units) {
        cacheService.invalidate('agent');
        return this.request(`/my/ships/${shipSymbol}/sell`, {
            method: 'POST',
            body: { symbol, units }
        });
    }

    async purchaseCargo(shipSymbol, symbol, units) {
        cacheService.invalidate('agent');
        return this.request(`/my/ships/${shipSymbol}/purchase`, {
            method: 'POST',
            body: { symbol, units }
        });
    }

    async transferCargo(shipSymbol, tradeSymbol, units, targetShipSymbol) {
        return this.request(`/my/ships/${shipSymbol}/transfer`, {
            method: 'POST',
            body: { tradeSymbol, units, shipSymbol: targetShipSymbol }
        });
    }

    async jettisonCargo(shipSymbol, symbol, units) {
        return this.request(`/my/ships/${shipSymbol}/jettison`, {
            method: 'POST',
            body: { symbol, units }
        });
    }

    async createSurvey(shipSymbol) {
        return this.request(`/my/ships/${shipSymbol}/survey`, { method: 'POST' });
    }

    async createChart(shipSymbol) {
        return this.request(`/my/ships/${shipSymbol}/chart`, { method: 'POST' });
    }

    async scanSystems(shipSymbol) {
        return this.request(`/my/ships/${shipSymbol}/scan/systems`, { method: 'POST' });
    }

    async scanWaypoints(shipSymbol) {
        return this.request(`/my/ships/${shipSymbol}/scan/waypoints`, { method: 'POST' });
    }

    async scanShips(shipSymbol) {
        return this.request(`/my/ships/${shipSymbol}/scan/ships`, { method: 'POST' });
    }

    async setFlightMode(shipSymbol, flightMode) {
        return this.request(`/my/ships/${shipSymbol}/nav`, {
            method: 'PATCH',
            body: { flightMode }
        });
    }

    async purchaseShip(shipType, waypointSymbol) {
        cacheService.invalidate('agent');
        return this.request('/my/ships', {
            method: 'POST',
            body: { shipType, waypointSymbol }
        });
    }

    // ==================== CONTRACTS ====================

    async getContracts(page = 1, limit = 20) {
        return this.request(`/my/contracts?page=${page}&limit=${limit}`, {}, { category: 'contracts' });
    }

    async getContract(contractId) {
        return this.request(`/my/contracts/${contractId}`, {}, { category: 'contracts' });
    }

    async acceptContract(contractId) {
        cacheService.invalidate('contracts');
        cacheService.invalidate('agent');
        return this.request(`/my/contracts/${contractId}/accept`, { method: 'POST' });
    }

    async deliverContract(contractId, shipSymbol, tradeSymbol, units) {
        cacheService.invalidate('contracts');
        return this.request(`/my/contracts/${contractId}/deliver`, {
            method: 'POST',
            body: { shipSymbol, tradeSymbol, units }
        });
    }

    async fulfillContract(contractId) {
        cacheService.invalidate('contracts');
        cacheService.invalidate('agent');
        return this.request(`/my/contracts/${contractId}/fulfill`, { method: 'POST' });
    }

    // ==================== SYSTEMS ====================

    async getSystems(page = 1, limit = 20) {
        return this.request(`/systems?page=${page}&limit=${limit}`, {}, { category: 'systems' });
    }

    async getSystem(systemSymbol) {
        return this.request(`/systems/${systemSymbol}`, {}, { category: 'systems' });
    }

    async getWaypoints(systemSymbol, page = 1, limit = 20, traits = null, type = null) {
        let url = `/systems/${systemSymbol}/waypoints?page=${page}&limit=${limit}`;
        if (traits) url += `&traits=${traits}`;
        if (type) url += `&type=${type}`;
        return this.request(url, {}, { category: 'waypoints' });
    }

    async getWaypoint(systemSymbol, waypointSymbol) {
        return this.request(
            `/systems/${systemSymbol}/waypoints/${waypointSymbol}`,
            {},
            { category: 'waypoints' }
        );
    }

    async getMarket(systemSymbol, waypointSymbol) {
        return this.request(
            `/systems/${systemSymbol}/waypoints/${waypointSymbol}/market`,
            {},
            { category: 'markets' }
        );
    }

    async getShipyard(systemSymbol, waypointSymbol) {
        return this.request(
            `/systems/${systemSymbol}/waypoints/${waypointSymbol}/shipyard`,
            {},
            { category: 'shipyards' }
        );
    }

    async getJumpGate(systemSymbol, waypointSymbol) {
        return this.request(
            `/systems/${systemSymbol}/waypoints/${waypointSymbol}/jump-gate`,
            {},
            { category: 'systems' }
        );
    }

    async getConstruction(systemSymbol, waypointSymbol) {
        return this.request(
            `/systems/${systemSymbol}/waypoints/${waypointSymbol}/construction`
        );
    }

    async supplyConstruction(systemSymbol, waypointSymbol, shipSymbol, tradeSymbol, units) {
        return this.request(
            `/systems/${systemSymbol}/waypoints/${waypointSymbol}/construction/supply`,
            {
                method: 'POST',
                body: { shipSymbol, tradeSymbol, units }
            }
        );
    }

    // ==================== FACTIONS ====================

    async getFactions(page = 1, limit = 20) {
        return this.request(
            `/factions?page=${page}&limit=${limit}`,
            { requiresAuth: false },
            { category: 'factions' }
        );
    }

    async getFaction(factionSymbol) {
        return this.request(
            `/factions/${factionSymbol}`,
            { requiresAuth: false },
            { category: 'factions' }
        );
    }

    // ==================== REGISTRATION ====================

    async register(symbol, faction) {
        return this.request('/register', {
            method: 'POST',
            body: { symbol, faction },
            requiresAuth: false
        });
    }

    // ==================== UTILITIES ====================

    getStats() {
        return {
            requests: this.requestCount,
            errors: this.errorCount,
            rateLimiter: rateLimiter.getStatus(),
            cache: cacheService.getStats()
        };
    }
}

// Instance singleton
export const spaceTradersClient = new SpaceTradersClient();
