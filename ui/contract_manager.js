/**
 * Contract Manager - Gestion des contrats
 * Permet de voir et gérer les contrats de livraison
 */

import { spaceTradersClient } from "../services/index.js";
import { showSnackbar, showConfirmModal } from "./notifications.js";

/**
 * Affiche le gestionnaire de contrat
 * @param {string} contractId - ID du contrat
 * @param {string} tradeSymbol - Symbole de la ressource à livrer
 * @param {string} destination - Destination de livraison
 */
export async function showContractManager(contractId, tradeSymbol, destination) {
    try {
        // Récupérer les vaisseaux
        const shipsResponse = await spaceTradersClient.getMyShips();
        const ships = shipsResponse.data;
        
        // Trouver les waypoints avec des champs d'astéroïdes pour le minage
        const systemSymbol = destination.split('-').slice(0, 2).join('-');
        
        let modalHTML = `
            <div id="contract-manager-modal" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                background: rgba(0, 0, 0, 0.95); color: white; padding: 25px; 
                border-radius: 10px; border: 2px solid #ffaa00; z-index: 10000; 
                min-width: 450px; max-width: 600px; max-height: 80vh; overflow-y: auto;
                box-shadow: 0 0 30px rgba(255, 170, 0, 0.5);">
                
                <h2 style="margin-top: 0; color: #ffaa00; border-bottom: 2px solid #ffaa00; padding-bottom: 10px;">
                    📋 Contract Manager
                </h2>
                
                <div style="background: rgba(255,170,0,0.1); padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                    <p style="margin: 5px 0;"><strong>📦 Need:</strong> <span style="color: #ffcc00;">${tradeSymbol}</span></p>
                    <p style="margin: 5px 0;"><strong>📍 Deliver to:</strong> ${destination}</p>
                </div>
                
                <h3 style="color: #00ffff; margin-top: 20px;">🚀 Your Ships</h3>
                <div id="ships-for-contract" style="max-height: 300px; overflow-y: auto;">
        `;
        
        for (const ship of ships) {
            const isAtDestination = ship.nav.waypointSymbol === destination;
            const isInTransit = ship.nav.status === 'IN_TRANSIT';
            const hasCooldown = ship.cooldown && ship.cooldown.remainingSeconds > 0;
            const hasMiningLaser = ship.mounts?.some(m => m.symbol.includes('MINING') || m.symbol.includes('LASER'));
            
            // Chercher le cargo de la ressource demandée
            const cargoItem = ship.cargo?.inventory?.find(i => i.symbol === tradeSymbol);
            const cargoUnits = cargoItem ? cargoItem.units : 0;
            
            let statusBadge = '';
            if (isInTransit) {
                const arrival = new Date(ship.nav.route.arrival);
                const remaining = Math.max(0, Math.ceil((arrival - new Date()) / 1000 / 60));
                statusBadge = `<span style="color: #ffaa00;">🚀 In Transit (${remaining}min)</span>`;
            } else if (hasCooldown) {
                statusBadge = `<span style="color: #ff6666;">⏳ Cooldown (${ship.cooldown.remainingSeconds}s)</span>`;
            } else {
                statusBadge = `<span style="color: #00ff00;">✅ Ready</span>`;
            }
            
            let actionsHTML = '';
            if (!isInTransit) {
                // Si le vaisseau a du cargo à livrer et est à destination
                if (cargoUnits > 0 && isAtDestination) {
                    actionsHTML += `
                        <button class="deliver-cargo-btn" data-ship="${ship.symbol}" data-contract="${contractId}" data-trade="${tradeSymbol}" data-units="${cargoUnits}"
                            style="padding: 8px 12px; background: #00ff00; color: black; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; margin: 3px;">
                            📦 Deliver ${cargoUnits} ${tradeSymbol}
                        </button>
                    `;
                }
                // Si le vaisseau a du cargo mais pas à destination
                else if (cargoUnits > 0 && !isAtDestination) {
                    actionsHTML += `
                        <button class="navigate-to-dest-btn" data-ship="${ship.symbol}" data-dest="${destination}"
                            style="padding: 8px 12px; background: #0080ff; color: white; border: none; border-radius: 5px; cursor: pointer; margin: 3px;">
                            🚀 Go to ${destination}
                        </button>
                    `;
                }
                // Si le vaisseau peut miner
                if (hasMiningLaser && !hasCooldown && ship.nav.status !== 'DOCKED') {
                    actionsHTML += `
                        <button class="mine-btn" data-ship="${ship.symbol}"
                            style="padding: 8px 12px; background: #aa00aa; color: white; border: none; border-radius: 5px; cursor: pointer; margin: 3px;">
                            ⛏️ Extract Resources
                        </button>
                    `;
                }
                // Chercher un champ d'astéroïdes pour la ressource demandée
                if (hasMiningLaser) {
                    actionsHTML += `
                        <button class="find-asteroid-btn" data-ship="${ship.symbol}" data-system="${systemSymbol}" data-trade="${tradeSymbol}"
                            style="padding: 8px 12px; background: #ff6600; color: white; border: none; border-radius: 5px; cursor: pointer; margin: 3px;">
                            🔍 Find ${tradeSymbol}
                        </button>
                    `;
                }
            }
            
            modalHTML += `
                <div style="margin: 10px 0; padding: 12px; background: rgba(255,255,255,0.05); border-radius: 8px; border-left: 3px solid ${hasMiningLaser ? '#aa00aa' : '#0080ff'};">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-weight: bold; font-size: 14px;">${hasMiningLaser ? '⛏️' : '🚀'} ${ship.symbol}</div>
                            <div style="font-size: 11px; color: #aaa;">📍 ${ship.nav.waypointSymbol}</div>
                            <div style="font-size: 11px;">${statusBadge}</div>
                            <div style="font-size: 11px; color: #aaa;">📦 Cargo: ${ship.cargo.units}/${ship.cargo.capacity}</div>
                            ${cargoUnits > 0 ? `<div style="font-size: 11px; color: #ffcc00;">✨ Has ${cargoUnits} ${tradeSymbol}</div>` : ''}
                        </div>
                    </div>
                    <div style="margin-top: 8px;">
                        ${actionsHTML}
                    </div>
                </div>
            `;
        }
        
        modalHTML += `
                </div>
                <button id="close-contract-manager" style="margin-top: 20px; padding: 12px 25px; 
                    background: #ff4444; color: white; border: none; border-radius: 5px; 
                    cursor: pointer; font-weight: bold; width: 100%;">Close</button>
            </div>
            <div id="contract-manager-overlay" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
                background: rgba(0, 0, 0, 0.7); z-index: 9999;"></div>
        `;
        
        // Supprimer modal existante
        $("#contract-manager-modal, #contract-manager-overlay").remove();
        $("body").append(modalHTML);
        
        // Event handlers
        $("#close-contract-manager, #contract-manager-overlay").on("click", function() {
            $("#contract-manager-modal, #contract-manager-overlay").remove();
        });
        
        // Livrer le cargo
        $(".deliver-cargo-btn").on("click", async function() {
            const shipSymbol = $(this).data("ship");
            const cId = $(this).data("contract");
            const trade = $(this).data("trade");
            const units = $(this).data("units");
            
            try {
                // Docker d'abord si nécessaire
                try {
                    await spaceTradersClient.dockShip(shipSymbol);
                } catch (e) { /* Peut-être déjà docké */ }
                
                const result = await spaceTradersClient.deliverContract(cId, shipSymbol, trade, units);
                const deliver = result.data.contract.terms.deliver[0];
                showSnackbar(`Delivered ${units} ${trade}! Progress: ${deliver.unitsFulfilled}/${deliver.unitsRequired}`, 'success', 5000);
                $("#contract-manager-modal, #contract-manager-overlay").remove();
                if (typeof window.updateStatusPanel === 'function') window.updateStatusPanel();
            } catch (err) {
                showSnackbar("Delivery failed: " + err.message, 'error');
            }
        });
        
        // Naviguer vers destination
        $(".navigate-to-dest-btn").on("click", async function() {
            const shipSymbol = $(this).data("ship");
            const dest = $(this).data("dest");
            
            try {
                try {
                    await spaceTradersClient.orbitShip(shipSymbol);
                } catch (e) { /* Peut-être déjà en orbite */ }
                
                const result = await spaceTradersClient.navigateShip(shipSymbol, dest);
                const arrival = new Date(result.data.nav.route.arrival).toLocaleTimeString();
                showSnackbar(`${shipSymbol} traveling to ${dest}! Arrival: ${arrival}`, 'success', 5000);
                $("#contract-manager-modal, #contract-manager-overlay").remove();
                if (typeof window.updateStatusPanel === 'function') window.updateStatusPanel();
            } catch (err) {
                showSnackbar("Navigation failed: " + err.message, 'error');
            }
        });
        
        // Miner
        $(".mine-btn").on("click", async function() {
            const shipSymbol = $(this).data("ship");
            
            try {
                const result = await spaceTradersClient.extractResources(shipSymbol);
                const extraction = result.data.extraction;
                const cooldown = result.data.cooldown;
                showSnackbar(`Extracted ${extraction.yield.units} ${extraction.yield.symbol}! Cooldown: ${cooldown.remainingSeconds}s`, 'success', 5000);
                showContractManager(contractId, tradeSymbol, destination); // Refresh
            } catch (err) {
                showSnackbar("Extraction failed: " + err.message, 'error');
            }
        });
        
        // Trouver champs d'astéroïdes pour la ressource demandée
        $(".find-asteroid-btn").on("click", async function() {
            const shipSymbol = $(this).data("ship");
            const sys = $(this).data("system");
            const requiredTrade = $(this).data("trade");

            try {
                showSnackbar(`🔍 Searching for ${requiredTrade} sources...`, 'info', 3000);

                // Récupérer la position actuelle du vaisseau
                const shipResponse = await spaceTradersClient.getShip(shipSymbol);
                const shipWaypointSymbol = shipResponse.data.nav.waypointSymbol;

                // Récupérer les coordonnées du waypoint actuel du vaisseau
                const shipWaypointResponse = await spaceTradersClient.getWaypoint(sys, shipWaypointSymbol);
                const shipX = shipWaypointResponse.data.x;
                const shipY = shipWaypointResponse.data.y;

                // Récupérer tous les waypoints du système
                const allWaypoints = [];
                let page = 1;
                let hasMore = true;

                while (hasMore) {
                    const response = await spaceTradersClient.getWaypoints(sys, page, 20);
                    allWaypoints.push(...response.data);
                    hasMore = response.data.length === 20;
                    page++;
                    if (page > 5) break; // Limiter à 100 waypoints max
                }

                // Filtrer les waypoints qui peuvent avoir la ressource demandée
                const miningWaypoints = allWaypoints.filter(wp => {
                    // Exclure le waypoint où le vaisseau se trouve déjà
                    if (wp.symbol === shipWaypointSymbol) return false;

                    // Types de waypoints minables
                    const minableTypes = ['ASTEROID_FIELD', 'ASTEROID', 'ENGINEERED_ASTEROID', 'ASTEROID_BASE'];
                    if (!minableTypes.includes(wp.type)) return false;

                    // Si le waypoint a des traits, vérifier s'ils correspondent à la ressource
                    if (wp.traits && wp.traits.length > 0) {
                        const traitSymbols = wp.traits.map(t => t.symbol);

                        // Mapping des ressources vers les traits qui les produisent
                        const resourceTraitMap = {
                            // Minéraux communs
                            'IRON_ORE': ['COMMON_METAL_DEPOSITS', 'MINERAL_DEPOSITS'],
                            'COPPER_ORE': ['COMMON_METAL_DEPOSITS', 'MINERAL_DEPOSITS'],
                            'ALUMINUM_ORE': ['COMMON_METAL_DEPOSITS', 'MINERAL_DEPOSITS'],
                            // Minéraux précieux
                            'GOLD_ORE': ['PRECIOUS_METAL_DEPOSITS'],
                            'SILVER_ORE': ['PRECIOUS_METAL_DEPOSITS'],
                            'PLATINUM_ORE': ['PRECIOUS_METAL_DEPOSITS'],
                            // Minéraux rares
                            'URANITE_ORE': ['RARE_METAL_DEPOSITS'],
                            'MERITIUM_ORE': ['RARE_METAL_DEPOSITS'],
                            // Cristaux et glace
                            'QUARTZ_SAND': ['MINERAL_DEPOSITS'],
                            'SILICON_CRYSTALS': ['MINERAL_DEPOSITS'],
                            'ICE_WATER': ['ICE_CRYSTALS', 'FROZEN'],
                            'AMMONIA_ICE': ['ICE_CRYSTALS', 'FROZEN'],
                            // Organiques et gaz
                            'HYDROCARBON': ['EXPLOSIVE_GASES', 'VOLATILE_COMPOUNDS'],
                            'LIQUID_HYDROGEN': ['EXPLOSIVE_GASES'],
                            'LIQUID_NITROGEN': ['EXPLOSIVE_GASES'],
                            // Avancés
                            'POLYNUCLEOTIDES': ['RARE_METAL_DEPOSITS', 'PRECIOUS_METAL_DEPOSITS', 'MINERAL_DEPOSITS'],
                            'DIAMONDS': ['PRECIOUS_METAL_DEPOSITS', 'RARE_METAL_DEPOSITS'],
                        };

                        const relevantTraits = resourceTraitMap[requiredTrade] || [];

                        // Si on a un mapping, filtrer par trait
                        if (relevantTraits.length > 0) {
                            return traitSymbols.some(t => relevantTraits.includes(t));
                        }
                    }

                    // Sinon, inclure tous les astéroïdes
                    return true;
                });

                if (miningWaypoints.length === 0) {
                    showSnackbar(`No mining locations found for ${requiredTrade} in this system!`, 'warning');
                    return;
                }

                // Calculer la distance de chaque waypoint par rapport à la position du vaisseau
                miningWaypoints.forEach(wp => {
                    const dx = wp.x - shipX;
                    const dy = wp.y - shipY;
                    wp.distance = Math.sqrt(dx * dx + dy * dy);
                });

                // Trier par distance (le plus proche en premier)
                miningWaypoints.sort((a, b) => a.distance - b.distance);

                // Construire la liste avec les traits et la distance
                let waypointList = miningWaypoints.slice(0, 5).map(wp => {
                    const traits = wp.traits ? wp.traits.map(t => t.symbol).slice(0, 3).join(', ') : 'Unknown';
                    return `${wp.symbol} (${wp.type})\n   📍 Distance: ${Math.round(wp.distance)} units\n   Traits: ${traits}`;
                }).join('\n\n');

                const closestWaypoint = miningWaypoints[0];

                showConfirmModal(
                    `Find ${requiredTrade}`,
                    `Found ${miningWaypoints.length} potential location(s) for ${requiredTrade}:\n\n${waypointList}\n\n🎯 Navigate ${shipSymbol} to nearest: ${closestWaypoint.symbol} (${Math.round(closestWaypoint.distance)} units)?`,
                    async () => {
                        try {
                            await spaceTradersClient.orbitShip(shipSymbol);
                        } catch (e) { }

                        try {
                            const result = await spaceTradersClient.navigateShip(shipSymbol, closestWaypoint.symbol);
                            const arrival = new Date(result.data.nav.route.arrival).toLocaleTimeString();
                            showSnackbar(`🚀 Navigating to ${closestWaypoint.symbol}! Arrival: ${arrival}`, 'success', 5000);
                            $("#contract-manager-modal, #contract-manager-overlay").remove();
                            if (typeof window.updateStatusPanel === 'function') window.updateStatusPanel();
                        } catch (navErr) {
                            showSnackbar("Navigation failed: " + navErr.message, 'error');
                        }
                    },
                    null,
                    'Navigate',
                    'Cancel'
                );
            } catch (err) {
                showSnackbar("Failed to find mining locations: " + err.message, 'error');
            }
        });
        
    } catch (err) {
        showSnackbar("Failed to load contract manager: " + err.message, 'error');
    }
}
