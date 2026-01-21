/**
 * Fuel Manager - Gestion du carburant des vaisseaux
 * Permet d'acheter, transférer et gérer le fuel entre vaisseaux
 */

import { Ship } from "../api/ship.js";
import { spaceTradersClient } from "../services/index.js";
import { showSnackbar, showPromptModal } from "./notifications.js";

/**
 * Affiche le gestionnaire de fuel
 */
export function showFuelManager() {
    // Utiliser Ship.list() qui utilise My.agent.token (source de vérité après login)
    Ship.list((ships) => {
        renderFuelManagerModal(ships);
    }, (err) => {
        showSnackbar("Failed to load ships: " + (err.responseJSON?.error?.message || err.statusText || "Unknown error"), 'error');
    });
}

/**
 * Rend le modal du Fuel Manager
 * @param {Array} ships - Liste des vaisseaux
 */
function renderFuelManagerModal(ships) {
    let modalHTML = `
        <div id="fuel-manager-modal" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
            background: rgba(0, 0, 0, 0.95); color: white; padding: 25px; 
            border-radius: 10px; border: 2px solid #ff6600; z-index: 10000; 
            min-width: 500px; max-width: 700px; max-height: 85vh; overflow-y: auto;
            box-shadow: 0 0 30px rgba(255, 102, 0, 0.5);">
            
            <h2 style="margin-top: 0; color: #ff6600; border-bottom: 2px solid #ff6600; padding-bottom: 10px;">
                ⛽ Fuel Manager
            </h2>
            
            <div id="fuel-ships-list" style="max-height: 500px; overflow-y: auto;">
    `;
    
    for (const ship of ships) {
        const fuelPercent = ship.fuel.capacity > 0 ? Math.round((ship.fuel.current / ship.fuel.capacity) * 100) : 0;
        const fuelColor = fuelPercent > 50 ? '#00ff00' : fuelPercent > 20 ? '#ffaa00' : '#ff4444';
        const isInTransit = ship.nav.status === 'IN_TRANSIT';
        const isDocked = ship.nav.status === 'DOCKED';
        
        // Chercher du FUEL dans le cargo
        const fuelInCargo = ship.cargo?.inventory?.find(i => i.symbol === 'FUEL');
        const fuelUnitsInCargo = fuelInCargo ? fuelInCargo.units : 0;
        
        let actionsHTML = '';
        
        if (!isInTransit) {
            // Bouton pour acheter du fuel (doit être docké à une station avec fuel)
            actionsHTML += `
                <button class="refuel-ship-btn" data-ship="${ship.symbol}" data-location="${ship.nav.waypointSymbol}" data-system="${ship.nav.systemSymbol}"
                    style="padding: 8px 12px; background: #00aa00; color: white; border: none; border-radius: 5px; cursor: pointer; margin: 3px; font-size: 11px;">
                    ⛽ Buy Fuel
                </button>
            `;
            
            // Bouton pour acheter une quantité spécifique de fuel
            actionsHTML += `
                <button class="refuel-partial-btn" data-ship="${ship.symbol}" data-location="${ship.nav.waypointSymbol}" data-system="${ship.nav.systemSymbol}" data-max="${ship.fuel.capacity - ship.fuel.current}"
                    style="padding: 8px 12px; background: #0088aa; color: white; border: none; border-radius: 5px; cursor: pointer; margin: 3px; font-size: 11px;">
                    ⛽ Buy Partial
                </button>
            `;
            
            // Si le vaisseau a du fuel dans le cargo, option de refuel depuis le cargo
            if (fuelUnitsInCargo > 0) {
                actionsHTML += `
                    <button class="refuel-from-cargo-btn" data-ship="${ship.symbol}" data-units="${fuelUnitsInCargo}"
                        style="padding: 8px 12px; background: #aa6600; color: white; border: none; border-radius: 5px; cursor: pointer; margin: 3px; font-size: 11px;">
                        📦➡️⛽ Use Cargo Fuel (${fuelUnitsInCargo})
                    </button>
                `;
            }
            
            // Transfert de fuel vers un autre vaisseau (si fuel dans cargo)
            if (fuelUnitsInCargo > 0) {
                // Trouver les autres vaisseaux au même endroit
                const otherShipsAtLocation = ships.filter(s => 
                    s.symbol !== ship.symbol && 
                    s.nav.waypointSymbol === ship.nav.waypointSymbol &&
                    s.nav.status !== 'IN_TRANSIT'
                );
                
                if (otherShipsAtLocation.length > 0) {
                    actionsHTML += `<br><span style="font-size: 10px; color: #aaa;">Transfer fuel to:</span><br>`;
                    otherShipsAtLocation.forEach(targetShip => {
                        actionsHTML += `
                            <button class="transfer-fuel-btn" data-from="${ship.symbol}" data-to="${targetShip.symbol}" data-max="${fuelUnitsInCargo}"
                                style="padding: 6px 10px; background: #6600aa; color: white; border: none; border-radius: 5px; cursor: pointer; margin: 2px; font-size: 10px;">
                                ➡️ ${targetShip.symbol}
                            </button>
                        `;
                    });
                }
            }
            
            // Acheter du fuel et le mettre dans le cargo (pour transfert)
            actionsHTML += `
                <button class="buy-fuel-cargo-btn" data-ship="${ship.symbol}" data-location="${ship.nav.waypointSymbol}" data-system="${ship.nav.systemSymbol}"
                    style="padding: 8px 12px; background: #666600; color: white; border: none; border-radius: 5px; cursor: pointer; margin: 3px; font-size: 11px;">
                    🛒 Buy Fuel to Cargo
                </button>
            `;
        }
        
        modalHTML += `
            <div style="margin: 10px 0; padding: 12px; background: rgba(255,255,255,0.05); border-radius: 8px; border-left: 3px solid ${fuelColor};">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="flex: 1;">
                        <div style="font-weight: bold; font-size: 14px;">🚀 ${ship.symbol}</div>
                        <div style="font-size: 11px; color: #aaa;">📍 ${ship.nav.waypointSymbol} (${ship.nav.status})</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 18px; font-weight: bold; color: ${fuelColor};">${fuelPercent}%</div>
                        <div style="font-size: 11px; color: #aaa;">⛽ ${ship.fuel.current}/${ship.fuel.capacity}</div>
                    </div>
                </div>
                <div style="margin: 8px 0;">
                    <div style="background: #333; border-radius: 5px; height: 10px; overflow: hidden;">
                        <div style="background: ${fuelColor}; width: ${fuelPercent}%; height: 100%; transition: width 0.3s;"></div>
                    </div>
                </div>
                ${fuelUnitsInCargo > 0 ? `<div style="font-size: 11px; color: #ffcc00; margin-bottom: 5px;">📦 Fuel in cargo: ${fuelUnitsInCargo} units</div>` : ''}
                <div style="margin-top: 8px;">
                    ${isInTransit ? '<span style="color: #ffaa00;">🚀 In transit - cannot refuel</span>' : actionsHTML}
                </div>
            </div>
        `;
    }
    
    modalHTML += `
            </div>
            
            <div style="margin-top: 15px; padding: 15px; background: rgba(255,102,0,0.1); border-radius: 8px;">
                <h4 style="margin: 0 0 10px 0; color: #ff6600;">ℹ️ Fuel Tips</h4>
                <ul style="margin: 0; padding-left: 20px; font-size: 11px; color: #aaa;">
                    <li>Ships must be <strong>DOCKED</strong> at a station with fuel to refuel</li>
                    <li>Look for <strong>FUEL_STATION</strong> waypoints or markets selling fuel</li>
                    <li>You can buy fuel to cargo at markets, then transfer to other ships</li>
                    <li>Ships at the same location can transfer cargo between them</li>
                    <li>Use "Buy Fuel to Cargo" to purchase fuel for transport/transfer</li>
                </ul>
            </div>
            
            <button id="close-fuel-manager" style="margin-top: 15px; padding: 12px 25px; 
                background: #ff4444; color: white; border: none; border-radius: 5px; 
                cursor: pointer; font-weight: bold; width: 100%;">Close</button>
        </div>
        <div id="fuel-manager-overlay" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
            background: rgba(0, 0, 0, 0.7); z-index: 9999;"></div>
    `;
    
    // Supprimer modal existante
    $("#fuel-manager-modal, #fuel-manager-overlay").remove();
    $("body").append(modalHTML);
    
    // Event handlers
    $("#close-fuel-manager, #fuel-manager-overlay").on("click", function() {
        $("#fuel-manager-modal, #fuel-manager-overlay").remove();
    });
    
    // Refuel complet
    $(".refuel-ship-btn").on("click", async function() {
        const shipSymbol = $(this).data("ship");
        
        try {
            // D'abord docker si nécessaire
            try {
                await spaceTradersClient.dockShip(shipSymbol);
            } catch (e) { /* Peut-être déjà docké */ }
            
            const result = await spaceTradersClient.refuelShip(shipSymbol);
            const fuel = result.data.fuel;
            const transaction = result.data.transaction;
            
            showSnackbar(`Refueled ${shipSymbol}! ⛽ ${fuel.current}/${fuel.capacity} | Cost: ${transaction.totalPrice} cr`, 'success');
            showFuelManager(); // Refresh
            if (typeof window.updateStatusPanel === 'function') window.updateStatusPanel();
        } catch (err) {
            // Vérifier si c'est une erreur de market
            if (err.message.includes("market") || err.message.includes("fuel")) {
                showSnackbar(`Cannot refuel here! Navigate to a FUEL_STATION or market.`, 'warning', 6000);
            } else {
                showSnackbar("Refuel failed: " + err.message, 'error');
            }
        }
    });
    
    // Refuel partiel
    $(".refuel-partial-btn").on("click", async function() {
        const shipSymbol = $(this).data("ship");
        const maxUnits = $(this).data("max");
        
        showPromptModal('Partial Refuel', `How many units of fuel to buy?\nMax: ${maxUnits}\n\nNote: Fuel is purchased in increments of 100 units.`, Math.min(100, maxUnits), async (units) => {
            const unitsNum = parseInt(units);
            if (isNaN(unitsNum) || unitsNum <= 0) {
                showSnackbar("Please enter a valid number.", 'warning');
                return;
            }
            
            try {
                try {
                    await spaceTradersClient.dockShip(shipSymbol);
                } catch (e) { }
                
                const result = await spaceTradersClient.refuelShip(shipSymbol, unitsNum);
                const fuel = result.data.fuel;
                const transaction = result.data.transaction;
                
                showSnackbar(`Refueled ${shipSymbol}! ⛽ ${fuel.current}/${fuel.capacity} | Cost: ${transaction.totalPrice} cr`, 'success');
                showFuelManager();
                if (typeof window.updateStatusPanel === 'function') window.updateStatusPanel();
            } catch (err) {
                showSnackbar("Refuel failed: " + err.message, 'error');
            }
        });
    });
    
    // Refuel depuis le cargo
    $(".refuel-from-cargo-btn").on("click", async function() {
        const shipSymbol = $(this).data("ship");
        const maxUnits = $(this).data("units");
        
        showPromptModal('Use Cargo Fuel', `How many units to use from cargo?\nAvailable: ${maxUnits}`, maxUnits, async (units) => {
            const unitsNum = parseInt(units);
            if (isNaN(unitsNum) || unitsNum <= 0 || unitsNum > maxUnits) {
                showSnackbar("Please enter a valid number.", 'warning');
                return;
            }
            
            try {
                const result = await spaceTradersClient.refuelShip(shipSymbol, unitsNum, true);
                const fuel = result.data.fuel;
                
                showSnackbar(`Refueled ${shipSymbol} from cargo! ⛽ ${fuel.current}/${fuel.capacity}`, 'success');
                showFuelManager();
                if (typeof window.updateStatusPanel === 'function') window.updateStatusPanel();
            } catch (err) {
                showSnackbar("Refuel from cargo failed: " + err.message, 'error');
            }
        });
    });
    
    // Transfert de fuel
    $(".transfer-fuel-btn").on("click", async function() {
        const fromShip = $(this).data("from");
        const toShip = $(this).data("to");
        const maxUnits = $(this).data("max");
        
        showPromptModal('Transfer Fuel', `Transfer how many units of FUEL?\nFrom: ${fromShip}\nTo: ${toShip}\nMax: ${maxUnits}`, maxUnits, async (units) => {
            const unitsNum = parseInt(units);
            if (isNaN(unitsNum) || unitsNum <= 0 || unitsNum > maxUnits) {
                showSnackbar("Please enter a valid number.", 'warning');
                return;
            }
            
            try {
                // Les deux vaisseaux doivent être en orbite pour le transfert
                try {
                    await spaceTradersClient.orbitShip(fromShip);
                } catch (e) { }
                try {
                    await spaceTradersClient.orbitShip(toShip);
                } catch (e) { }
                
                const result = await spaceTradersClient.transferCargo(fromShip, 'FUEL', unitsNum, toShip);
                
                showSnackbar(`Transferred ${unitsNum} FUEL from ${fromShip} to ${toShip}!`, 'success');
                showFuelManager();
                if (typeof window.updateStatusPanel === 'function') window.updateStatusPanel();
            } catch (err) {
                showSnackbar("Transfer failed: " + err.message, 'error');
            }
        });
    });
    
    // Acheter du fuel pour le cargo (au marché)
    $(".buy-fuel-cargo-btn").on("click", async function() {
        const shipSymbol = $(this).data("ship");
        const waypointSymbol = $(this).data("location");
        const systemSymbol = $(this).data("system");
        
        try {
            // Vérifier d'abord si le marché vend du FUEL
            const marketData = await spaceTradersClient.getMarket(systemSymbol, waypointSymbol);
            const fuelForSale = marketData.data.tradeGoods?.find(g => g.symbol === 'FUEL');
            
            if (!fuelForSale) {
                showSnackbar(`This market does not sell FUEL. Find a FUEL_STATION.`, 'warning', 5000);
                return;
            }
            
            showPromptModal('Buy Fuel to Cargo', `Buy how many units of FUEL?\nPrice: ${fuelForSale.purchasePrice} cr/unit\nMax per transaction: ${fuelForSale.tradeVolume}`, 10, async (units) => {
                const unitsNum = parseInt(units);
                if (isNaN(unitsNum) || unitsNum <= 0) {
                    showSnackbar("Please enter a valid number.", 'warning');
                    return;
                }
                
                try {
                    // Docker d'abord
                    try {
                        await spaceTradersClient.dockShip(shipSymbol);
                    } catch (e) { }
                    
                    const result = await spaceTradersClient.purchaseCargo(shipSymbol, 'FUEL', unitsNum);
                    const transaction = result.data.transaction;
                    
                    showSnackbar(`Purchased ${unitsNum} FUEL to cargo! Cost: ${transaction.totalPrice} cr`, 'success');
                    showFuelManager();
                    if (typeof window.updateStatusPanel === 'function') window.updateStatusPanel();
                } catch (err) {
                    showSnackbar("Purchase failed: " + err.message, 'error');
                }
            });
        } catch (err) {
            showSnackbar("Failed to check market: " + err.message, 'error');
        }
    });
}
