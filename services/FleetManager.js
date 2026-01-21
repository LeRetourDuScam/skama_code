// Copyright © 2023 Entreprise SkamKraft
'use strict';

import { spaceTradersClient } from './SpaceTradersClient.js';

/**
 * Gestionnaire de flotte intelligent pour SpaceTraders
 * Gère l'assignation de rôles, les tâches et la coordination des vaisseaux
 */

// Types de rôles
export const ShipRole = {
    MINER: 'MINER',
    TRADER: 'TRADER',
    EXPLORER: 'EXPLORER',
    HAULER: 'HAULER',
    COMBAT: 'COMBAT',
    SURVEYOR: 'SURVEYOR',
    IDLE: 'IDLE'
};

// États des tâches
export const TaskStatus = {
    PENDING: 'PENDING',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
    CANCELLED: 'CANCELLED'
};

export class FleetManager {
    constructor() {
        this.fleet = new Map(); // shipSymbol -> ManagedShip
        this.taskQueue = [];
        this.completedTasks = [];
        this.isProcessing = false;
        this.listeners = new Set();
    }

    /**
     * Synchronise la flotte avec l'API
     */
    async syncFleet() {
        this._log('Syncing fleet...');
        
        const ships = await spaceTradersClient.getAllShips();
        
        for (const ship of ships) {
            if (!this.fleet.has(ship.symbol)) {
                // Nouveau vaisseau
                this.fleet.set(ship.symbol, {
                    ship,
                    role: this._detectRole(ship),
                    currentTask: null,
                    assignedContract: null,
                    stats: {
                        tasksCompleted: 0,
                        tasksFailed: 0,
                        creditsEarned: 0,
                        distanceTraveled: 0
                    }
                });
            } else {
                // Mettre à jour les données du vaisseau
                const managed = this.fleet.get(ship.symbol);
                managed.ship = ship;
            }
        }

        this._log(`Fleet synced: ${this.fleet.size} ships`);
        return this.getFleetStatus();
    }

    /**
     * Détecte automatiquement le rôle d'un vaisseau
     */
    _detectRole(ship) {
        const mounts = ship.mounts || [];
        const modules = ship.modules || [];
        
        // Vérifier les équipements
        const hasMiningLaser = mounts.some(m => 
            m.symbol.includes('MINING') || m.symbol.includes('LASER')
        );
        const hasSurveyor = mounts.some(m => m.symbol.includes('SURVEYOR'));
        const hasSensor = mounts.some(m => m.symbol.includes('SENSOR'));
        const hasWeapons = mounts.some(m => 
            m.symbol.includes('TURRET') || m.symbol.includes('MISSILE')
        );
        
        // Vérifier le type de frame
        const frameType = ship.frame?.symbol || '';
        const isMiningShip = frameType.includes('MINER');
        const isHauler = frameType.includes('HAULER') || frameType.includes('FREIGHTER');
        const isExplorer = frameType.includes('EXPLORER') || frameType.includes('PROBE');
        
        // Déterminer le rôle
        if (hasMiningLaser || isMiningShip) return ShipRole.MINER;
        if (hasSurveyor) return ShipRole.SURVEYOR;
        if (isExplorer || hasSensor) return ShipRole.EXPLORER;
        if (hasWeapons) return ShipRole.COMBAT;
        if (isHauler || ship.cargo?.capacity > 100) return ShipRole.HAULER;
        if (ship.cargo?.capacity > 0) return ShipRole.TRADER;
        
        return ShipRole.IDLE;
    }

    /**
     * Assigne un rôle à un vaisseau
     */
    assignRole(shipSymbol, role) {
        const managed = this.fleet.get(shipSymbol);
        if (managed) {
            managed.role = role;
            this._log(`Assigned role ${role} to ${shipSymbol}`);
        }
    }

    /**
     * Récupère les vaisseaux par rôle
     */
    getShipsByRole(role) {
        return [...this.fleet.values()].filter(m => m.role === role);
    }

    /**
     * Récupère les vaisseaux disponibles (pas en transit, pas de cooldown)
     */
    getIdleShips() {
        return [...this.fleet.values()].filter(m => {
            const ship = m.ship;
            const isNotInTransit = ship.nav?.status !== 'IN_TRANSIT';
            const noCooldown = !ship.cooldown || ship.cooldown.remainingSeconds === 0;
            const noTask = !m.currentTask;
            return isNotInTransit && noCooldown && noTask;
        });
    }

    /**
     * Récupère les vaisseaux à une position donnée
     */
    getShipsAtWaypoint(waypointSymbol) {
        return [...this.fleet.values()].filter(
            m => m.ship.nav?.waypointSymbol === waypointSymbol
        );
    }

    /**
     * Crée une tâche de navigation
     */
    async createNavigationTask(shipSymbol, waypointSymbol, priority = 5) {
        const task = {
            id: `nav-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'NAVIGATE',
            shipSymbol,
            target: waypointSymbol,
            priority,
            status: TaskStatus.PENDING,
            createdAt: Date.now(),
            error: null
        };

        this._addTask(task);
        return task;
    }

    /**
     * Crée une tâche de minage
     */
    async createMiningTask(shipSymbol, asteroidWaypoint, targetCargo = null, priority = 5) {
        const task = {
            id: `mine-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'MINE',
            shipSymbol,
            target: asteroidWaypoint,
            targetCargo, // null = jusqu'à plein
            priority,
            status: TaskStatus.PENDING,
            createdAt: Date.now(),
            extracted: 0,
            error: null
        };

        this._addTask(task);
        return task;
    }

    /**
     * Crée une tâche de livraison de contrat
     */
    async createContractDeliveryTask(shipSymbol, contractId, tradeSymbol, destination, units, priority = 8) {
        const task = {
            id: `contract-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'CONTRACT_DELIVERY',
            shipSymbol,
            contractId,
            tradeSymbol,
            destination,
            units,
            priority,
            status: TaskStatus.PENDING,
            createdAt: Date.now(),
            delivered: 0,
            error: null
        };

        this._addTask(task);
        return task;
    }

    /**
     * Ajoute une tâche à la queue
     */
    _addTask(task) {
        this.taskQueue.push(task);
        this.taskQueue.sort((a, b) => b.priority - a.priority);
        
        const managed = this.fleet.get(task.shipSymbol);
        if (managed) {
            managed.currentTask = task.id;
        }

        this._log(`Task created: ${task.type} for ${task.shipSymbol}`);
        this._processQueue();
    }

    /**
     * Traite la queue de tâches
     */
    async _processQueue() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        while (this.taskQueue.length > 0) {
            const task = this.taskQueue.find(t => t.status === TaskStatus.PENDING);
            if (!task) break;

            task.status = TaskStatus.IN_PROGRESS;
            this._notifyListeners('task_started', task);

            try {
                await this._executeTask(task);
                task.status = TaskStatus.COMPLETED;
                task.completedAt = Date.now();
                
                const managed = this.fleet.get(task.shipSymbol);
                if (managed) {
                    managed.currentTask = null;
                    managed.stats.tasksCompleted++;
                }

                this._log(`Task completed: ${task.id}`);
                this._notifyListeners('task_completed', task);

            } catch (error) {
                task.status = TaskStatus.FAILED;
                task.error = error.message;
                
                const managed = this.fleet.get(task.shipSymbol);
                if (managed) {
                    managed.currentTask = null;
                    managed.stats.tasksFailed++;
                }

                this._log(`Task failed: ${task.id} - ${error.message}`, 'error');
                this._notifyListeners('task_failed', task);
            }

            // Déplacer vers completedTasks
            this.taskQueue = this.taskQueue.filter(t => t.id !== task.id);
            this.completedTasks.push(task);

            // Garder seulement les 100 dernières tâches complétées
            if (this.completedTasks.length > 100) {
                this.completedTasks = this.completedTasks.slice(-100);
            }
        }

        this.isProcessing = false;
    }

    /**
     * Exécute une tâche
     */
    async _executeTask(task) {
        switch (task.type) {
            case 'NAVIGATE':
                await this._executeNavigationTask(task);
                break;
            case 'MINE':
                await this._executeMiningTask(task);
                break;
            case 'CONTRACT_DELIVERY':
                await this._executeContractDeliveryTask(task);
                break;
            default:
                throw new Error(`Unknown task type: ${task.type}`);
        }
    }

    /**
     * Exécute une tâche de navigation
     */
    async _executeNavigationTask(task) {
        const { shipSymbol, target } = task;
        
        const shipResponse = await spaceTradersClient.getShip(shipSymbol);
        const ship = shipResponse.data;

        if (ship.nav.waypointSymbol === target) {
            return; // Déjà à destination
        }

        if (ship.nav.status === 'DOCKED') {
            await spaceTradersClient.orbitShip(shipSymbol);
        }

        const navResponse = await spaceTradersClient.navigateShip(shipSymbol, target);
        await this._waitForArrival(navResponse.data.nav);
    }

    /**
     * Exécute une tâche de minage
     */
    async _executeMiningTask(task) {
        const { shipSymbol, target, targetCargo } = task;
        
        // Naviguer vers l'astéroïde
        await this._executeNavigationTask({ shipSymbol, target });

        // Mettre en orbite si nécessaire
        const shipResponse = await spaceTradersClient.getShip(shipSymbol);
        let ship = shipResponse.data;

        if (ship.nav.status === 'DOCKED') {
            await spaceTradersClient.orbitShip(shipSymbol);
        }

        // Miner jusqu'à plein ou targetCargo atteint
        while (true) {
            const currentShip = (await spaceTradersClient.getShip(shipSymbol)).data;
            const cargoFull = currentShip.cargo.units >= currentShip.cargo.capacity;
            const targetReached = targetCargo && task.extracted >= targetCargo;

            if (cargoFull || targetReached) {
                break;
            }

            // Attendre le cooldown si nécessaire
            if (currentShip.cooldown?.remainingSeconds > 0) {
                await new Promise(resolve => 
                    setTimeout(resolve, currentShip.cooldown.remainingSeconds * 1000 + 500)
                );
            }

            try {
                const extractResponse = await spaceTradersClient.extractResources(shipSymbol);
                task.extracted += extractResponse.data.extraction.yield.units;
                this._log(`Extracted ${extractResponse.data.extraction.yield.units} ${extractResponse.data.extraction.yield.symbol}`);
            } catch (error) {
                if (error.code === 4000) {
                    // Cooldown not expired, wait and retry
                    await new Promise(resolve => setTimeout(resolve, 5000));
                } else {
                    throw error;
                }
            }
        }
    }

    /**
     * Exécute une tâche de livraison de contrat
     */
    async _executeContractDeliveryTask(task) {
        const { shipSymbol, contractId, tradeSymbol, destination, units } = task;
        
        // Naviguer vers la destination
        await this._executeNavigationTask({ shipSymbol, target: destination });

        // Docker
        await spaceTradersClient.dockShip(shipSymbol);

        // Livrer
        const deliverResponse = await spaceTradersClient.deliverContract(
            contractId,
            shipSymbol,
            tradeSymbol,
            units
        );

        task.delivered = units;
        this._log(`Delivered ${units} ${tradeSymbol} for contract ${contractId}`);
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
     * Annule une tâche
     */
    cancelTask(taskId) {
        const task = this.taskQueue.find(t => t.id === taskId);
        if (task && task.status === TaskStatus.PENDING) {
            task.status = TaskStatus.CANCELLED;
            this.taskQueue = this.taskQueue.filter(t => t.id !== taskId);
            
            const managed = this.fleet.get(task.shipSymbol);
            if (managed) {
                managed.currentTask = null;
            }
            
            this._log(`Task cancelled: ${taskId}`);
            return true;
        }
        return false;
    }

    /**
     * Obtient le statut de la flotte
     */
    getFleetStatus() {
        const ships = [...this.fleet.values()];
        
        const byRole = {};
        Object.values(ShipRole).forEach(role => byRole[role] = 0);
        
        for (const m of ships) {
            byRole[m.role] = (byRole[m.role] || 0) + 1;
        }

        const byStatus = {
            inTransit: ships.filter(m => m.ship.nav?.status === 'IN_TRANSIT').length,
            docked: ships.filter(m => m.ship.nav?.status === 'DOCKED').length,
            inOrbit: ships.filter(m => m.ship.nav?.status === 'IN_ORBIT').length,
            onCooldown: ships.filter(m => m.ship.cooldown?.remainingSeconds > 0).length
        };

        return {
            total: ships.length,
            byRole,
            byStatus,
            idle: this.getIdleShips().length,
            pendingTasks: this.taskQueue.filter(t => t.status === TaskStatus.PENDING).length,
            activeTasks: this.taskQueue.filter(t => t.status === TaskStatus.IN_PROGRESS).length
        };
    }

    /**
     * Obtient les détails d'un vaisseau géré
     */
    getManagedShip(shipSymbol) {
        return this.fleet.get(shipSymbol);
    }

    /**
     * Logging
     */
    _log(message, level = 'info') {
        console[level === 'error' ? 'error' : 'log'](`[FleetManager] ${message}`);
    }

    /**
     * Ajoute un listener
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
     * Notifie les listeners
     */
    _notifyListeners(event, data) {
        this.listeners.forEach(callback => {
            try {
                callback(event, data);
            } catch (e) {
                console.error('[FleetManager] Listener error:', e);
            }
        });
    }
}

// Instance singleton
export const fleetManager = new FleetManager();
