/**
 * Waypoint Actions - Actions disponibles sur les waypoints selon leurs traits
 * Marketplace, Shipyard, Mining, etc.
 */

import { spaceTradersClient } from "../services/index.js";
import { showSnackbar, showConfirmModal, showPromptModal, showInfoModal } from "./notifications.js";

/**
 * Icônes pour les différents traits
 */
const TRAIT_ICONS = {
    MARKETPLACE: '🛒',
    SHIPYARD: '🏭',
    INDUSTRIAL: '🏗️',
    OUTPOST: '🏕️',
    MINERAL_DEPOSITS: '💎',
    COMMON_METAL_DEPOSITS: '🔩',
    PRECIOUS_METAL_DEPOSITS: '🥇',
    RARE_METAL_DEPOSITS: '⚙️',
    EXPLOSIVE_GASES: '💨',
    FROZEN_GASES: '❄️',
    STRIPPED: '🪨',
    VOLCANIC: '🌋',
    CORROSIVE_ATMOSPHERE: '☢️',
    TEMPERATE: '🌡️',
    FOSSILS: '🦴',
    CANYONS: '🏜️',
    MAGMA_SEAS: '🔥',
    MILITARY_BASE: '🎖️',
    RESEARCH_FACILITY: '🔬',
    TRADING_HUB: '📊',
    UNCHARTED: '❓'
};

/**
 * Affiche le marché d'un waypoint
 * @param {string} systemSymbol - Symbole du système
 * @param {string} waypointSymbol - Symbole du waypoint
 * @param {string} shipSymbol - Symbole du vaisseau (optionnel, pour acheter/vendre)
 */
export async function showMarketplace(systemSymbol, waypointSymbol, shipSymbol = null) {
    try {
        showSnackbar("Loading marketplace...", 'info', 2000);
        const marketData = await spaceTradersClient.getMarket(systemSymbol, waypointSymbol);
        const market = marketData.data;
        
        // Récupérer le vaisseau si spécifié pour voir son cargo
        let ship = null;
        let shipCargo = [];
        if (shipSymbol) {
            const shipData = await spaceTradersClient.getShip(shipSymbol);
            ship = shipData.data;
            shipCargo = ship.cargo?.inventory || [];
        }
        
        let modalHTML = `
            <div id="marketplace-modal" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                background: rgba(0, 0, 0, 0.95); color: white; padding: 25px; 
                border-radius: 10px; border: 2px solid #00ff88; z-index: 10000; 
                min-width: 600px; max-width: 900px; max-height: 85vh; overflow-y: auto;
                box-shadow: 0 0 30px rgba(0, 255, 136, 0.5);">
                
                <h2 style="margin-top: 0; color: #00ff88; border-bottom: 2px solid #00ff88; padding-bottom: 10px;">
                    🛒 Marketplace - ${waypointSymbol}
                </h2>
        `;
        
        // Imports disponibles
        if (market.imports && market.imports.length > 0) {
            modalHTML += `
                <div style="margin-bottom: 15px;">
                    <h4 style="color: #ff6666; margin: 10px 0;">📥 Station Buys (You can SELL):</h4>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                        ${market.imports.map(item => `
                            <span style="padding: 5px 10px; background: rgba(255,100,100,0.2); border-radius: 5px; font-size: 11px;">
                                ${item.symbol}
                            </span>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        // Exports disponibles
        if (market.exports && market.exports.length > 0) {
            modalHTML += `
                <div style="margin-bottom: 15px;">
                    <h4 style="color: #66ff66; margin: 10px 0;">📤 Station Sells (You can BUY):</h4>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                        ${market.exports.map(item => `
                            <span style="padding: 5px 10px; background: rgba(100,255,100,0.2); border-radius: 5px; font-size: 11px;">
                                ${item.symbol}
                            </span>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        // Exchange (buy or sell)
        if (market.exchange && market.exchange.length > 0) {
            modalHTML += `
                <div style="margin-bottom: 15px;">
                    <h4 style="color: #ffff66; margin: 10px 0;">🔄 Exchange (Buy or Sell):</h4>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                        ${market.exchange.map(item => `
                            <span style="padding: 5px 10px; background: rgba(255,255,100,0.2); border-radius: 5px; font-size: 11px;">
                                ${item.symbol}
                            </span>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        // Prix détaillés
        if (market.tradeGoods && market.tradeGoods.length > 0) {
            modalHTML += `
                <h4 style="color: #00ffff; margin: 15px 0 10px 0;">💰 Current Prices:</h4>
                <div style="max-height: 300px; overflow-y: auto;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                        <thead>
                            <tr style="background: rgba(0,255,255,0.1); position: sticky; top: 0;">
                                <th style="padding: 8px; text-align: left; border-bottom: 1px solid #00ffff;">Item</th>
                                <th style="padding: 8px; text-align: right; border-bottom: 1px solid #00ffff;">Buy</th>
                                <th style="padding: 8px; text-align: right; border-bottom: 1px solid #00ffff;">Sell</th>
                                <th style="padding: 8px; text-align: center; border-bottom: 1px solid #00ffff;">Stock</th>
                                <th style="padding: 8px; text-align: center; border-bottom: 1px solid #00ffff;">Vol</th>
                                ${shipSymbol ? '<th style="padding: 8px; text-align: center; border-bottom: 1px solid #00ffff;">Actions</th>' : ''}
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            for (const good of market.tradeGoods) {
                const inCargo = shipCargo.find(c => c.symbol === good.symbol);
                const cargoQty = inCargo ? inCargo.units : 0;
                
                modalHTML += `
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);">
                        <td style="padding: 8px;">
                            <div style="font-weight: bold;">${good.symbol}</div>
                            ${cargoQty > 0 ? `<div style="font-size: 10px; color: #ffcc00;">In cargo: ${cargoQty}</div>` : ''}
                        </td>
                        <td style="padding: 8px; text-align: right; color: #ff6666;">${good.purchasePrice?.toLocaleString() || '-'}</td>
                        <td style="padding: 8px; text-align: right; color: #66ff66;">${good.sellPrice?.toLocaleString() || '-'}</td>
                        <td style="padding: 8px; text-align: center;">
                            <span style="color: ${good.supply === 'ABUNDANT' ? '#00ff00' : good.supply === 'SCARCE' ? '#ff6666' : '#ffaa00'};">
                                ${good.supply || '-'}
                            </span>
                        </td>
                        <td style="padding: 8px; text-align: center;">${good.tradeVolume || '-'}</td>
                        ${shipSymbol ? `
                            <td style="padding: 8px; text-align: center;">
                                <button class="buy-good-btn" data-symbol="${good.symbol}" data-price="${good.purchasePrice}" data-vol="${good.tradeVolume}"
                                    style="padding: 3px 8px; background: #00aa00; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 10px; margin: 2px;">
                                    Buy
                                </button>
                                ${cargoQty > 0 ? `
                                    <button class="sell-good-btn" data-symbol="${good.symbol}" data-price="${good.sellPrice}" data-qty="${cargoQty}"
                                        style="padding: 3px 8px; background: #aa0000; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 10px; margin: 2px;">
                                        Sell
                                    </button>
                                ` : ''}
                            </td>
                        ` : ''}
                    </tr>
                `;
            }
            
            modalHTML += `
                        </tbody>
                    </table>
                </div>
            `;
        } else {
            modalHTML += `<p style="color: #aaa; font-style: italic;">No price data available. A ship must be docked here to see prices.</p>`;
        }
        
        modalHTML += `
                <button id="close-marketplace" style="margin-top: 20px; padding: 12px 25px; 
                    background: #ff4444; color: white; border: none; border-radius: 5px; 
                    cursor: pointer; font-weight: bold; width: 100%;">Close</button>
            </div>
            <div id="marketplace-overlay" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
                background: rgba(0, 0, 0, 0.7); z-index: 9999;"></div>
        `;
        
        $("#marketplace-modal, #marketplace-overlay").remove();
        $("body").append(modalHTML);
        
        // Event handlers
        $("#close-marketplace, #marketplace-overlay").on("click", function() {
            $("#marketplace-modal, #marketplace-overlay").remove();
        });
        
        // Acheter
        $(".buy-good-btn").on("click", function() {
            const symbol = $(this).data("symbol");
            const price = $(this).data("price");
            const maxVol = $(this).data("vol");
            
            showPromptModal('Buy Goods', `Buy how many units of ${symbol}?\nPrice: ${price} cr/unit\nMax per transaction: ${maxVol}\nAvailable cargo: ${ship.cargo.capacity - ship.cargo.units}`, Math.min(maxVol, ship.cargo.capacity - ship.cargo.units), async (units) => {
                const unitsNum = parseInt(units);
                if (isNaN(unitsNum) || unitsNum <= 0) {
                    showSnackbar("Invalid quantity", 'warning');
                    return;
                }
                
                try {
                    await spaceTradersClient.dockShip(shipSymbol).catch(() => {});
                    const result = await spaceTradersClient.purchaseCargo(shipSymbol, symbol, unitsNum);
                    showSnackbar(`Bought ${unitsNum} ${symbol} for ${result.data.transaction.totalPrice} cr!`, 'success');
                    showMarketplace(systemSymbol, waypointSymbol, shipSymbol); // Refresh
                    if (typeof window.updateStatusPanel === 'function') window.updateStatusPanel();
                } catch (err) {
                    showSnackbar("Purchase failed: " + err.message, 'error');
                }
            });
        });
        
        // Vendre
        $(".sell-good-btn").on("click", function() {
            const symbol = $(this).data("symbol");
            const price = $(this).data("price");
            const maxQty = $(this).data("qty");
            
            showPromptModal('Sell Goods', `Sell how many units of ${symbol}?\nPrice: ${price} cr/unit\nIn cargo: ${maxQty}`, maxQty, async (units) => {
                const unitsNum = parseInt(units);
                if (isNaN(unitsNum) || unitsNum <= 0 || unitsNum > maxQty) {
                    showSnackbar("Invalid quantity", 'warning');
                    return;
                }
                
                try {
                    await spaceTradersClient.dockShip(shipSymbol).catch(() => {});
                    const result = await spaceTradersClient.sellCargo(shipSymbol, symbol, unitsNum);
                    showSnackbar(`Sold ${unitsNum} ${symbol} for ${result.data.transaction.totalPrice} cr!`, 'success');
                    showMarketplace(systemSymbol, waypointSymbol, shipSymbol); // Refresh
                    if (typeof window.updateStatusPanel === 'function') window.updateStatusPanel();
                } catch (err) {
                    showSnackbar("Sale failed: " + err.message, 'error');
                }
            });
        });
        
    } catch (err) {
        showSnackbar("Failed to load marketplace: " + err.message, 'error');
    }
}

/**
 * Affiche le shipyard d'un waypoint
 */
export async function showShipyard(systemSymbol, waypointSymbol) {
    try {
        showSnackbar("Loading shipyard...", 'info', 2000);
        const shipyardData = await spaceTradersClient.getShipyard(systemSymbol, waypointSymbol);
        const shipyard = shipyardData.data;
        
        let modalHTML = `
            <div id="shipyard-modal" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                background: rgba(0, 0, 0, 0.95); color: white; padding: 25px; 
                border-radius: 10px; border: 2px solid #ff8800; z-index: 10000; 
                min-width: 600px; max-width: 800px; max-height: 85vh; overflow-y: auto;
                box-shadow: 0 0 30px rgba(255, 136, 0, 0.5);">
                
                <h2 style="margin-top: 0; color: #ff8800; border-bottom: 2px solid #ff8800; padding-bottom: 10px;">
                    🏭 Shipyard - ${waypointSymbol}
                </h2>
        `;
        
        // Types de vaisseaux disponibles
        if (shipyard.shipTypes && shipyard.shipTypes.length > 0) {
            modalHTML += `
                <div style="margin-bottom: 15px;">
                    <h4 style="color: #00ffff; margin: 10px 0;">🚀 Available Ship Types:</h4>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                        ${shipyard.shipTypes.map(type => `
                            <span style="padding: 5px 10px; background: rgba(0,255,255,0.2); border-radius: 5px; font-size: 11px;">
                                ${type.type}
                            </span>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        // Vaisseaux avec prix détaillés
        if (shipyard.ships && shipyard.ships.length > 0) {
            modalHTML += `
                <h4 style="color: #00ffff; margin: 15px 0 10px 0;">💰 Ships for Sale:</h4>
                <div style="max-height: 400px; overflow-y: auto;">
            `;
            
            for (const ship of shipyard.ships) {
                modalHTML += `
                    <div style="margin: 10px 0; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 8px; border-left: 3px solid #ff8800;">
                        <div style="display: flex; justify-content: space-between; align-items: start;">
                            <div style="flex: 1;">
                                <div style="font-weight: bold; font-size: 16px; color: #ff8800;">${ship.name || ship.type}</div>
                                <div style="font-size: 12px; color: #aaa; margin-top: 5px;">${ship.description || ''}</div>
                                <div style="margin-top: 10px; font-size: 11px;">
                                    <span style="margin-right: 15px;">⛽ Fuel: ${ship.frame?.fuelCapacity || '?'}</span>
                                    <span style="margin-right: 15px;">📦 Cargo: ${ship.frame?.moduleSlots || '?'} slots</span>
                                    <span>⚡ Speed: ${ship.engine?.speed || '?'}</span>
                                </div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 20px; font-weight: bold; color: #00ff00;">${ship.purchasePrice?.toLocaleString() || '?'} cr</div>
                                <button class="buy-ship-btn" data-type="${ship.type}" data-waypoint="${waypointSymbol}" data-price="${ship.purchasePrice}"
                                    style="margin-top: 10px; padding: 8px 20px; background: #00aa00; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
                                    🛒 Purchase
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }
            
            modalHTML += `</div>`;
        } else {
            modalHTML += `<p style="color: #aaa; font-style: italic;">No detailed ship information available. A ship must be docked here to see prices.</p>`;
        }
        
        modalHTML += `
                <button id="close-shipyard" style="margin-top: 20px; padding: 12px 25px; 
                    background: #ff4444; color: white; border: none; border-radius: 5px; 
                    cursor: pointer; font-weight: bold; width: 100%;">Close</button>
            </div>
            <div id="shipyard-overlay" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
                background: rgba(0, 0, 0, 0.7); z-index: 9999;"></div>
        `;
        
        $("#shipyard-modal, #shipyard-overlay").remove();
        $("body").append(modalHTML);
        
        // Event handlers
        $("#close-shipyard, #shipyard-overlay").on("click", function() {
            $("#shipyard-modal, #shipyard-overlay").remove();
        });
        
        // Acheter un vaisseau
        $(".buy-ship-btn").on("click", function() {
            const shipType = $(this).data("type");
            const waypoint = $(this).data("waypoint");
            const price = $(this).data("price");
            
            showConfirmModal('Purchase Ship', `Are you sure you want to purchase a ${shipType}?\n\nCost: ${price?.toLocaleString() || '?'} credits`, async () => {
                try {
                    const result = await spaceTradersClient.purchaseShip(shipType, waypoint);
                    showSnackbar(`🎉 Purchased ${result.data.ship.symbol}!`, 'success', 6000);
                    $("#shipyard-modal, #shipyard-overlay").remove();
                    if (typeof window.updateStatusPanel === 'function') window.updateStatusPanel();
                } catch (err) {
                    showSnackbar("Purchase failed: " + err.message, 'error');
                }
            }, null, 'Purchase', 'Cancel');
        });
        
    } catch (err) {
        showSnackbar("Failed to load shipyard: " + err.message, 'error');
    }
}

/**
 * Affiche l'interface de minage améliorée
 * @param {string} shipSymbol - Symbole du vaisseau
 * @param {string} targetResource - Ressource ciblée (optionnel)
 */
export async function showMiningInterface(shipSymbol, targetResource = null) {
    try {
        const shipData = await spaceTradersClient.getShip(shipSymbol);
        const ship = shipData.data;
        
        const waypointSymbol = ship.nav.waypointSymbol;
        const systemSymbol = ship.nav.systemSymbol;
        
        // Récupérer les infos du waypoint
        const waypointData = await spaceTradersClient.getWaypoint(systemSymbol, waypointSymbol);
        const waypoint = waypointData.data;
        
        // Déterminer les ressources possibles selon les traits
        const traits = waypoint.traits?.map(t => t.symbol) || [];
        let possibleResources = [];
        
        if (traits.includes('MINERAL_DEPOSITS')) {
            possibleResources.push('QUARTZ_SAND', 'SILICON_CRYSTALS', 'AMMONIA_ICE');
        }
        if (traits.includes('COMMON_METAL_DEPOSITS')) {
            possibleResources.push('IRON_ORE', 'COPPER_ORE', 'ALUMINUM_ORE');
        }
        if (traits.includes('PRECIOUS_METAL_DEPOSITS')) {
            possibleResources.push('GOLD_ORE', 'SILVER_ORE', 'PLATINUM_ORE');
        }
        if (traits.includes('RARE_METAL_DEPOSITS')) {
            possibleResources.push('URANITE_ORE', 'MERITIUM_ORE');
        }
        if (traits.includes('EXPLOSIVE_GASES') || traits.includes('FROZEN_GASES')) {
            possibleResources.push('HYDROCARBON', 'LIQUID_HYDROGEN', 'LIQUID_NITROGEN');
        }
        if (traits.includes('ICE_CRYSTALS')) {
            possibleResources.push('ICE_WATER', 'AMMONIA_ICE');
        }
        
        // Cooldown
        const cooldown = ship.cooldown;
        const hasCooldown = cooldown && cooldown.remainingSeconds > 0;
        
        // Cargo actuel
        const cargo = ship.cargo;
        const cargoFull = cargo.units >= cargo.capacity;
        
        let modalHTML = `
            <div id="mining-modal" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                background: rgba(0, 0, 0, 0.95); color: white; padding: 25px; 
                border-radius: 10px; border: 2px solid #aa00aa; z-index: 10000; 
                min-width: 500px; max-width: 700px; max-height: 85vh; overflow-y: auto;
                box-shadow: 0 0 30px rgba(170, 0, 170, 0.5);">
                
                <h2 style="margin-top: 0; color: #aa00aa; border-bottom: 2px solid #aa00aa; padding-bottom: 10px;">
                    ⛏️ Mining Interface - ${shipSymbol}
                </h2>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div style="padding: 15px; background: rgba(170,0,170,0.1); border-radius: 8px;">
                        <h4 style="margin: 0 0 10px 0; color: #aa00aa;">📍 Location</h4>
                        <div style="font-size: 14px;">${waypointSymbol}</div>
                        <div style="font-size: 11px; color: #aaa;">${waypoint.type}</div>
                    </div>
                    <div style="padding: 15px; background: rgba(0,255,255,0.1); border-radius: 8px;">
                        <h4 style="margin: 0 0 10px 0; color: #00ffff;">📦 Cargo</h4>
                        <div style="font-size: 14px; ${cargoFull ? 'color: #ff4444;' : ''}">${cargo.units}/${cargo.capacity}</div>
                        <div style="background: #333; border-radius: 5px; height: 8px; margin-top: 5px;">
                            <div style="background: ${cargoFull ? '#ff4444' : '#00ffff'}; width: ${(cargo.units/cargo.capacity)*100}%; height: 100%; border-radius: 5px;"></div>
                        </div>
                    </div>
                </div>
                
                ${targetResource ? `
                    <div style="padding: 15px; background: rgba(255,204,0,0.2); border-radius: 8px; margin-bottom: 15px; border: 1px solid #ffcc00;">
                        <h4 style="margin: 0; color: #ffcc00;">🎯 Target Resource: ${targetResource}</h4>
                        <p style="margin: 5px 0 0 0; font-size: 11px; color: #aaa;">Mining will continue until you get this resource or cargo is full.</p>
                    </div>
                ` : ''}
                
                <div style="margin-bottom: 15px;">
                    <h4 style="color: #00ffff; margin: 10px 0;">💎 Possible Resources Here:</h4>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                        ${possibleResources.length > 0 ? possibleResources.map(res => `
                            <span class="target-resource-btn" data-resource="${res}" style="padding: 5px 10px; background: rgba(0,255,255,0.2); border-radius: 5px; font-size: 11px; cursor: pointer; border: 1px solid transparent; transition: all 0.2s;">
                                ${res}
                            </span>
                        `).join('') : '<span style="color: #aaa; font-style: italic;">Unknown - try creating a survey!</span>'}
                    </div>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <h4 style="color: #00ffff; margin: 10px 0;">📦 Current Cargo:</h4>
                    ${cargo.inventory.length > 0 ? `
                        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                            ${cargo.inventory.map(item => `
                                <div style="padding: 8px 12px; background: rgba(255,255,255,0.1); border-radius: 5px;">
                                    <div style="font-weight: bold; font-size: 12px;">${item.symbol}</div>
                                    <div style="font-size: 11px; color: #aaa;">${item.units} units</div>
                                    <button class="jettison-btn" data-symbol="${item.symbol}" data-units="${item.units}"
                                        style="margin-top: 5px; padding: 3px 8px; background: #aa0000; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 10px;">
                                        🗑️ Jettison
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                    ` : '<p style="color: #aaa; font-style: italic;">Cargo is empty</p>'}
                </div>
                
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    ${hasCooldown ? `
                        <div style="padding: 15px; background: rgba(255,100,100,0.2); border-radius: 8px; flex: 1; text-align: center;">
                            <div style="font-size: 24px;">⏳</div>
                            <div style="font-size: 14px; color: #ff6666;">Cooldown: ${cooldown.remainingSeconds}s</div>
                        </div>
                    ` : `
                        <button id="extract-btn" ${cargoFull ? 'disabled' : ''} style="flex: 1; padding: 15px; background: ${cargoFull ? '#666' : 'linear-gradient(135deg, #aa00aa, #cc00cc)'}; color: white; border: none; border-radius: 8px; cursor: ${cargoFull ? 'not-allowed' : 'pointer'}; font-size: 16px; font-weight: bold;">
                            ⛏️ Extract Resources
                        </button>
                    `}
                    <button id="survey-btn" ${hasCooldown ? 'disabled' : ''} style="flex: 1; padding: 15px; background: ${hasCooldown ? '#666' : 'linear-gradient(135deg, #0088aa, #00aacc)'}; color: white; border: none; border-radius: 8px; cursor: ${hasCooldown ? 'not-allowed' : 'pointer'}; font-size: 16px; font-weight: bold;">
                        📊 Create Survey
                    </button>
                </div>
                
                <button id="close-mining" style="margin-top: 20px; padding: 12px 25px; 
                    background: #ff4444; color: white; border: none; border-radius: 5px; 
                    cursor: pointer; font-weight: bold; width: 100%;">Close</button>
            </div>
            <div id="mining-overlay" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
                background: rgba(0, 0, 0, 0.7); z-index: 9999;"></div>
        `;
        
        $("#mining-modal, #mining-overlay").remove();
        $("body").append(modalHTML);
        
        // Event handlers
        $("#close-mining, #mining-overlay").on("click", function() {
            $("#mining-modal, #mining-overlay").remove();
        });
        
        // Sélectionner une ressource cible
        $(".target-resource-btn").on("click", function() {
            const resource = $(this).data("resource");
            showMiningInterface(shipSymbol, resource);
        });
        
        // Extraire
        $("#extract-btn").on("click", async function() {
            if ($(this).prop("disabled")) return;
            
            try {
                // S'assurer d'être en orbite
                await spaceTradersClient.orbitShip(shipSymbol).catch(() => {});
                
                const result = await spaceTradersClient.extractResources(shipSymbol);
                const extraction = result.data.extraction;
                const newCooldown = result.data.cooldown;
                
                const isTarget = targetResource && extraction.yield.symbol === targetResource;
                const message = isTarget 
                    ? `🎯 Got ${extraction.yield.units} ${extraction.yield.symbol}! (Target found!)`
                    : `⛏️ Extracted ${extraction.yield.units} ${extraction.yield.symbol}`;
                
                showSnackbar(message, isTarget ? 'success' : 'info', 4000);
                showMiningInterface(shipSymbol, targetResource); // Refresh
                if (typeof window.updateStatusPanel === 'function') window.updateStatusPanel();
            } catch (err) {
                showSnackbar("Extraction failed: " + err.message, 'error');
            }
        });
        
        // Survey
        $("#survey-btn").on("click", async function() {
            if ($(this).prop("disabled")) return;
            
            try {
                await spaceTradersClient.orbitShip(shipSymbol).catch(() => {});
                const result = await spaceTradersClient.createSurvey(shipSymbol);
                const surveys = result.data.surveys;
                
                let surveyInfo = surveys.map(s => `${s.symbol}: ${s.deposits.map(d => d.symbol).join(', ')}`).join('\n');
                showInfoModal('Survey Results', `Found ${surveys.length} survey(s):\n\n${surveyInfo}\n\nSurveys are automatically used when extracting.`);
                showMiningInterface(shipSymbol, targetResource);
            } catch (err) {
                showSnackbar("Survey failed: " + err.message, 'error');
            }
        });
        
        // Jettison
        $(".jettison-btn").on("click", function() {
            const symbol = $(this).data("symbol");
            const maxUnits = $(this).data("units");
            
            showPromptModal('Jettison Cargo', `Jettison how many units of ${symbol}?\nCurrent: ${maxUnits}`, maxUnits, async (units) => {
                const unitsNum = parseInt(units);
                if (isNaN(unitsNum) || unitsNum <= 0 || unitsNum > maxUnits) {
                    showSnackbar("Invalid quantity", 'warning');
                    return;
                }
                
                try {
                    await spaceTradersClient.jettisonCargo(shipSymbol, symbol, unitsNum);
                    showSnackbar(`Jettisoned ${unitsNum} ${symbol}`, 'info');
                    showMiningInterface(shipSymbol, targetResource);
                    if (typeof window.updateStatusPanel === 'function') window.updateStatusPanel();
                } catch (err) {
                    showSnackbar("Jettison failed: " + err.message, 'error');
                }
            });
        });
        
    } catch (err) {
        showSnackbar("Failed to load mining interface: " + err.message, 'error');
    }
}

/**
 * Retourne l'icône pour un trait
 */
export function getTraitIcon(trait) {
    return TRAIT_ICONS[trait] || '📍';
}

/**
 * Vérifie si un waypoint a un trait spécifique
 */
export function hasTrait(waypoint, traitSymbol) {
    return waypoint.traits?.some(t => t.symbol === traitSymbol);
}
