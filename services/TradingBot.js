// Copyright © 2023 Entreprise SkamKraft
'use strict';

import { spaceTradersClient } from './SpaceTradersClient.js';

/**
 * Bot de Trading automatisé pour SpaceTraders
 * Analyse les marchés et trouve les meilleures opportunités
 */
export class TradingBot {
    constructor() {
        this.marketData = new Map(); 
        this.tradeHistory = [];
        this.isRunning = false;
        this.listeners = new Set();
    }

    /**
     * Scanne tous les marchés d'un système
     */
    async scanMarkets(systemSymbol) {
        this._log(`Scanning markets in system ${systemSymbol}...`);
        
        const allWaypoints = [];
        let page = 1;
        let hasMore = true;

        while (hasMore) {
            const response = await spaceTradersClient.getWaypoints(
                systemSymbol, page, 20, 'MARKETPLACE'
            );
            allWaypoints.push(...response.data);
            hasMore = page < Math.ceil(response.meta.total / 20);
            page++;
        }

        this._log(`Found ${allWaypoints.length} waypoints with marketplaces`);

        for (const waypoint of allWaypoints) {
            try {
                const market = await spaceTradersClient.getMarket(
                    systemSymbol, 
                    waypoint.symbol
                );
                
                this.marketData.set(waypoint.symbol, {
                    market: market.data,
                    timestamp: Date.now(),
                    systemSymbol
                });

                this._log(`Scanned market at ${waypoint.symbol}`);
            } catch (error) {
                this._log(`Cannot access market at ${waypoint.symbol}: ${error.message}`, 'warn');
            }
        }

        return this.marketData;
    }

    /**
     * Trouve les meilleures routes de trading
     */
    findBestTradeRoutes(maxRoutes = 10) {
        const routes = [];

        for (const [buyWaypoint, buyData] of this.marketData) {
            const buyMarket = buyData.market;
            if (!buyMarket.tradeGoods) continue;

            for (const [sellWaypoint, sellData] of this.marketData) {
                if (buyWaypoint === sellWaypoint) continue;
                
                const sellMarket = sellData.market;
                if (!sellMarket.tradeGoods) continue;

                for (const buyGood of buyMarket.tradeGoods) {
                    const sellGood = sellMarket.tradeGoods.find(
                        g => g.symbol === buyGood.symbol
                    );

                    if (sellGood && sellGood.sellPrice > buyGood.purchasePrice) {
                        const profitPerUnit = sellGood.sellPrice - buyGood.purchasePrice;
                        const profitMargin = (profitPerUnit / buyGood.purchasePrice) * 100;

                        routes.push({
                            good: buyGood.symbol,
                            buyWaypoint,
                            sellWaypoint,
                            buyPrice: buyGood.purchasePrice,
                            sellPrice: sellGood.sellPrice,
                            profitPerUnit,
                            profitMargin: profitMargin.toFixed(2) + '%',
                            buySupply: buyGood.supply,
                            sellSupply: sellGood.supply,
                            tradeVolume: Math.min(buyGood.tradeVolume, sellGood.tradeVolume),
                            score: profitPerUnit * Math.min(buyGood.tradeVolume, sellGood.tradeVolume)
                        });
                    }
                }
            }
        }

        return routes
            .sort((a, b) => b.score - a.score)
            .slice(0, maxRoutes);
    }

    /**
     * Exécute un trade complet
     */
    async executeTrade(shipSymbol, route, maxUnits = null) {
        const startTime = Date.now();
        let profit = 0;
        let unitsSold = 0;

        try {
            this._log(`Starting trade: ${route.good} from ${route.buyWaypoint} to ${route.sellWaypoint}`);

            const shipResponse = await spaceTradersClient.getShip(shipSymbol);
            const ship = shipResponse.data;

            if (ship.nav.waypointSymbol !== route.buyWaypoint) {
                if (ship.nav.status === 'DOCKED') {
                    await spaceTradersClient.orbitShip(shipSymbol);
                }
                this._log(`Navigating to ${route.buyWaypoint}...`);
                const navResponse = await spaceTradersClient.navigateShip(shipSymbol, route.buyWaypoint);
                await this._waitForArrival(navResponse.data.nav);
            }

            await spaceTradersClient.dockShip(shipSymbol);
            
            const cargoSpace = ship.cargo.capacity - ship.cargo.units;
            const unitsToBuy = maxUnits 
                ? Math.min(maxUnits, cargoSpace, route.tradeVolume)
                : Math.min(cargoSpace, route.tradeVolume);

            if (unitsToBuy <= 0) {
                throw new Error('No cargo space available');
            }

            this._log(`Purchasing ${unitsToBuy} units of ${route.good}...`);
            const buyResponse = await spaceTradersClient.purchaseCargo(
                shipSymbol, 
                route.good, 
                unitsToBuy
            );
            const totalBuyCost = buyResponse.data.transaction.totalPrice;

            await spaceTradersClient.orbitShip(shipSymbol);
            this._log(`Navigating to ${route.sellWaypoint}...`);
            const sellNavResponse = await spaceTradersClient.navigateShip(
                shipSymbol, 
                route.sellWaypoint
            );
            await this._waitForArrival(sellNavResponse.data.nav);

            await spaceTradersClient.dockShip(shipSymbol);
            this._log(`Selling ${unitsToBuy} units of ${route.good}...`);
            const sellResponse = await spaceTradersClient.sellCargo(
                shipSymbol, 
                route.good, 
                unitsToBuy
            );
            const totalSellPrice = sellResponse.data.transaction.totalPrice;

            profit = totalSellPrice - totalBuyCost;
            unitsSold = unitsToBuy;

            this.tradeHistory.push({
                timestamp: Date.now(),
                shipSymbol,
                good: route.good,
                buyWaypoint: route.buyWaypoint,
                sellWaypoint: route.sellWaypoint,
                units: unitsSold,
                buyPrice: totalBuyCost,
                sellPrice: totalSellPrice,
                profit,
                duration: Date.now() - startTime
            });

            this._log(`Trade completed! Profit: ${profit} credits`, 'success');

            return {
                success: true,
                profit,
                units: unitsSold,
                duration: Date.now() - startTime
            };

        } catch (error) {
            this._log(`Trade failed: ${error.message}`, 'error');
            return {
                success: false,
                error: error.message,
                duration: Date.now() - startTime
            };
        }
    }

    /**
     * Démarre le trading automatique
     */
    async startAutoTrading(shipSymbol, systemSymbol, options = {}) {
        const {
            minProfitMargin = 10,  
            maxTradesPerRun = 10,
            intervalMs = 60000   
        } = options;

        this.isRunning = true;
        this._log('Auto-trading started');

        while (this.isRunning) {
            try {
                await this.scanMarkets(systemSymbol);

                const routes = this.findBestTradeRoutes(maxTradesPerRun);
                const profitableRoutes = routes.filter(
                    r => parseFloat(r.profitMargin) >= minProfitMargin
                );

                if (profitableRoutes.length === 0) {
                    this._log('No profitable routes found. Waiting...');
                } else {
                    const bestRoute = profitableRoutes[0];
                    this._log(`Best route: ${bestRoute.good} with ${bestRoute.profitMargin} margin`);
                    await this.executeTrade(shipSymbol, bestRoute);
                }

                if (this.isRunning) {
                    await new Promise(resolve => setTimeout(resolve, intervalMs));
                }

            } catch (error) {
                this._log(`Auto-trading error: ${error.message}`, 'error');
                await new Promise(resolve => setTimeout(resolve, intervalMs));
            }
        }

        this._log('Auto-trading stopped');
    }

    /**
     * Arrête le trading automatique
     */
    stopAutoTrading() {
        this.isRunning = false;
    }

    /**
     * Attend l'arrivée d'un vaisseau
     */
    async _waitForArrival(nav) {
        if (nav.status !== 'IN_TRANSIT') return;

        const arrivalTime = new Date(nav.route.arrival).getTime();
        const waitTime = arrivalTime - Date.now() + 1000;

        if (waitTime > 0) {
            this._log(`Waiting ${Math.round(waitTime / 1000)}s for arrival...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }

    /**
     * Obtient les statistiques de trading
     */
    getStats() {
        const totalProfit = this.tradeHistory.reduce((sum, t) => sum + t.profit, 0);
        const totalTrades = this.tradeHistory.length;
        const successfulTrades = this.tradeHistory.filter(t => t.profit > 0).length;

        return {
            totalProfit,
            totalTrades,
            successfulTrades,
            successRate: totalTrades > 0 
                ? ((successfulTrades / totalTrades) * 100).toFixed(2) + '%' 
                : '0%',
            averageProfit: totalTrades > 0 
                ? Math.round(totalProfit / totalTrades) 
                : 0,
            marketsScanned: this.marketData.size,
            isRunning: this.isRunning
        };
    }

    /**
     * Obtient l'historique des trades
     */
    getHistory(limit = 50) {
        return this.tradeHistory.slice(-limit).reverse();
    }

    /**
     * Log avec support pour les listeners
     */
    _log(message, level = 'info') {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            message
        };

        console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](
            `[TradingBot] ${message}`
        );

        this.listeners.forEach(callback => callback(logEntry));
    }

    /**
     * Ajoute un listener pour les logs
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
}

// Instance singleton
export const tradingBot = new TradingBot();
