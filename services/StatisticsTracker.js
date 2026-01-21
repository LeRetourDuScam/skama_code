// Copyright © 2023 Entreprise SkamKraft
'use strict';

/**
 * Tracker de statistiques et profits pour SpaceTraders
 * Enregistre toutes les transactions et calcule les métriques
 */
export class StatisticsTracker {
    constructor() {
        this.STORAGE_KEY = 'st_statistics';
        this.transactions = [];
        this.startCredits = 0;
        this.sessionStart = Date.now();
        this._load();
    }

    /**
     * Définit les crédits de départ
     */
    setStartCredits(credits) {
        if (this.startCredits === 0) {
            this.startCredits = credits;
            this._save();
        }
    }

    /**
     * Enregistre une transaction
     */
    recordTransaction(type, data) {
        const transaction = {
            id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            type,
            ...data
        };

        this.transactions.push(transaction);
        this._save();
        
        return transaction;
    }

    /**
     * Enregistre un achat de cargo
     */
    recordPurchase(shipSymbol, good, units, totalPrice, waypoint) {
        return this.recordTransaction('PURCHASE', {
            shipSymbol,
            good,
            units,
            pricePerUnit: totalPrice / units,
            totalPrice,
            waypoint
        });
    }

    /**
     * Enregistre une vente de cargo
     */
    recordSale(shipSymbol, good, units, totalPrice, waypoint) {
        return this.recordTransaction('SALE', {
            shipSymbol,
            good,
            units,
            pricePerUnit: totalPrice / units,
            totalPrice,
            waypoint
        });
    }

    /**
     * Enregistre un ravitaillement
     */
    recordRefuel(shipSymbol, units, totalPrice, waypoint) {
        return this.recordTransaction('REFUEL', {
            shipSymbol,
            units,
            totalPrice,
            waypoint
        });
    }

    /**
     * Enregistre un achat de vaisseau
     */
    recordShipPurchase(shipSymbol, shipType, totalPrice, waypoint) {
        return this.recordTransaction('SHIP_PURCHASE', {
            shipSymbol,
            shipType,
            totalPrice,
            waypoint
        });
    }

    /**
     * Enregistre un paiement de contrat
     */
    recordContractPayment(contractId, paymentType, amount) {
        return this.recordTransaction('CONTRACT_PAYMENT', {
            contractId,
            paymentType, // 'onAccepted' ou 'onFulfilled'
            totalPrice: amount
        });
    }

    /**
     * Enregistre une extraction de ressources
     */
    recordExtraction(shipSymbol, good, units, waypoint) {
        return this.recordTransaction('EXTRACTION', {
            shipSymbol,
            good,
            units,
            waypoint
        });
    }

    /**
     * Réinitialise toutes les statistiques (pour déconnexion)
     */
    reset() {
        this.transactions = [];
        this.startCredits = 0;
        this.sessionStart = Date.now();
        localStorage.removeItem(this.STORAGE_KEY);
        console.log('[StatisticsTracker] Statistics reset');
    }

    /**
     * Calcule le profit total
     */
    getTotalProfit() {
        return this.transactions.reduce((sum, tx) => {
            switch (tx.type) {
                case 'SALE':
                case 'CONTRACT_PAYMENT':
                    return sum + (tx.totalPrice || 0);
                case 'PURCHASE':
                case 'REFUEL':
                case 'SHIP_PURCHASE':
                    return sum - (tx.totalPrice || 0);
                default:
                    return sum;
            }
        }, 0);
    }

    /**
     * Calcule les revenus
     */
    getTotalRevenue() {
        return this.transactions
            .filter(tx => tx.type === 'SALE' || tx.type === 'CONTRACT_PAYMENT')
            .reduce((sum, tx) => sum + (tx.totalPrice || 0), 0);
    }

    /**
     * Calcule les dépenses
     */
    getTotalExpenses() {
        return this.transactions
            .filter(tx => tx.type === 'PURCHASE' || tx.type === 'REFUEL' || tx.type === 'SHIP_PURCHASE')
            .reduce((sum, tx) => sum + (tx.totalPrice || 0), 0);
    }

    /**
     * Obtient les statistiques journalières
     */
    getDailyStats(days = 7) {
        const stats = new Map();
        const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);

        for (const tx of this.transactions) {
            if (tx.timestamp < cutoff) continue;

            const dateKey = new Date(tx.timestamp).toISOString().split('T')[0];
            
            if (!stats.has(dateKey)) {
                stats.set(dateKey, {
                    date: dateKey,
                    revenue: 0,
                    expenses: 0,
                    profit: 0,
                    transactions: 0,
                    extractions: 0,
                    sales: 0,
                    purchases: 0
                });
            }

            const day = stats.get(dateKey);
            day.transactions++;

            switch (tx.type) {
                case 'SALE':
                case 'CONTRACT_PAYMENT':
                    day.revenue += tx.totalPrice || 0;
                    day.sales++;
                    break;
                case 'PURCHASE':
                case 'REFUEL':
                case 'SHIP_PURCHASE':
                    day.expenses += tx.totalPrice || 0;
                    day.purchases++;
                    break;
                case 'EXTRACTION':
                    day.extractions++;
                    break;
            }

            day.profit = day.revenue - day.expenses;
        }

        return [...stats.values()].sort((a, b) => b.date.localeCompare(a.date));
    }

    /**
     * Obtient les marchandises les plus rentables
     */
    getMostProfitableGoods(limit = 10) {
        const goodsProfit = new Map();

        for (const tx of this.transactions) {
            if (!tx.good) continue;

            if (!goodsProfit.has(tx.good)) {
                goodsProfit.set(tx.good, {
                    bought: 0,
                    sold: 0,
                    volume: 0,
                    profit: 0
                });
            }

            const stats = goodsProfit.get(tx.good);
            
            if (tx.type === 'PURCHASE') {
                stats.bought += tx.totalPrice;
                stats.volume += tx.units;
            } else if (tx.type === 'SALE') {
                stats.sold += tx.totalPrice;
                stats.volume += tx.units;
            }

            stats.profit = stats.sold - stats.bought;
        }

        return [...goodsProfit.entries()]
            .map(([good, stats]) => ({ good, ...stats }))
            .sort((a, b) => b.profit - a.profit)
            .slice(0, limit);
    }

    /**
     * Obtient les statistiques par vaisseau
     */
    getShipStats() {
        const shipStats = new Map();

        for (const tx of this.transactions) {
            if (!tx.shipSymbol) continue;

            if (!shipStats.has(tx.shipSymbol)) {
                shipStats.set(tx.shipSymbol, {
                    revenue: 0,
                    expenses: 0,
                    profit: 0,
                    transactions: 0,
                    extractions: 0
                });
            }

            const stats = shipStats.get(tx.shipSymbol);
            stats.transactions++;

            switch (tx.type) {
                case 'SALE':
                    stats.revenue += tx.totalPrice || 0;
                    break;
                case 'PURCHASE':
                case 'REFUEL':
                    stats.expenses += tx.totalPrice || 0;
                    break;
                case 'EXTRACTION':
                    stats.extractions++;
                    break;
            }

            stats.profit = stats.revenue - stats.expenses;
        }

        return [...shipStats.entries()]
            .map(([ship, stats]) => ({ ship, ...stats }))
            .sort((a, b) => b.profit - a.profit);
    }

    /**
     * Obtient les statistiques de la session courante
     */
    getSessionStats() {
        const sessionTx = this.transactions.filter(tx => tx.timestamp >= this.sessionStart);
        
        const revenue = sessionTx
            .filter(tx => tx.type === 'SALE' || tx.type === 'CONTRACT_PAYMENT')
            .reduce((sum, tx) => sum + (tx.totalPrice || 0), 0);
        
        const expenses = sessionTx
            .filter(tx => tx.type === 'PURCHASE' || tx.type === 'REFUEL' || tx.type === 'SHIP_PURCHASE')
            .reduce((sum, tx) => sum + (tx.totalPrice || 0), 0);

        const duration = Date.now() - this.sessionStart;
        const profitPerHour = duration > 0 
            ? ((revenue - expenses) / (duration / 3600000)).toFixed(0)
            : 0;

        return {
            duration: this._formatDuration(duration),
            transactions: sessionTx.length,
            revenue,
            expenses,
            profit: revenue - expenses,
            profitPerHour: parseInt(profitPerHour)
        };
    }

    /**
     * Obtient un résumé global
     */
    getSummary() {
        return {
            totalTransactions: this.transactions.length,
            totalRevenue: this.getTotalRevenue(),
            totalExpenses: this.getTotalExpenses(),
            totalProfit: this.getTotalProfit(),
            startCredits: this.startCredits,
            session: this.getSessionStats(),
            topGoods: this.getMostProfitableGoods(5),
            daily: this.getDailyStats(7)
        };
    }

    /**
     * Exporte les données
     */
    export() {
        return {
            version: 1,
            exportDate: new Date().toISOString(),
            startCredits: this.startCredits,
            transactions: this.transactions
        };
    }

    /**
     * Importe des données
     */
    import(data) {
        if (data.version !== 1) {
            throw new Error('Unsupported data version');
        }

        this.startCredits = data.startCredits;
        this.transactions = data.transactions;
        this._save();
    }

    /**
     * Efface toutes les données
     */
    clear() {
        this.transactions = [];
        this.startCredits = 0;
        this.sessionStart = Date.now();
        localStorage.removeItem(this.STORAGE_KEY);
    }

    /**
     * Formate une durée en texte lisible
     */
    _formatDuration(ms) {
        const hours = Math.floor(ms / 3600000);
        const minutes = Math.floor((ms % 3600000) / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        } else {
            return `${seconds}s`;
        }
    }

    /**
     * Sauvegarde les données dans localStorage
     */
    _save() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
                startCredits: this.startCredits,
                transactions: this.transactions
            }));
        } catch (e) {
            console.error('[StatisticsTracker] Save failed:', e);
        }
    }

    /**
     * Charge les données depuis localStorage
     */
    _load() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            if (data) {
                const parsed = JSON.parse(data);
                this.startCredits = parsed.startCredits || 0;
                this.transactions = parsed.transactions || [];
            }
        } catch (e) {
            console.error('[StatisticsTracker] Load failed:', e);
            this.transactions = [];
            this.startCredits = 0;
        }
    }
}

// Instance singleton
export const statisticsTracker = new StatisticsTracker();
