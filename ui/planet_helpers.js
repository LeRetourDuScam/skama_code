/**
 * Planet Helpers - Fonctions utilitaires pour les planètes
 * Gestion des images, échelles, affichage d'info et navigation
 */

import { Ship } from "../api/ship.js";
import { spaceTradersClient, fleetManager } from "../services/index.js";
import { showSnackbar } from "./notifications.js";
import { showMarketplace, showShipyard, showMiningInterface, getTraitIcon } from "./waypoint_actions.js";

/**
 * Icônes pour les types de waypoints
 */
const TYPE_ICONS = {
    PLANET: '🌍',
    GAS_GIANT: '🪐',
    MOON: '🌙',
    ORBITAL_STATION: '🛰️',
    JUMP_GATE: '🌀',
    ASTEROID_FIELD: '☄️',
    ASTEROID: '🪨',
    ENGINEERED_ASTEROID: '⚙️',
    ASTEROID_BASE: '🏗️',
    FUEL_STATION: '⛽',
    NEBULA: '🌌',
    DEBRIS_FIELD: '💥',
    GRAVITY_WELL: '🕳️'
};

/**
 * Retourne le(s) nom(s) d'image correspondant au type de planète
 * @param {Object} planet - L'objet planète
 * @returns {string[]} - Liste des noms d'images possibles
 */
export function get_img_from_type(planet) {
    switch(planet.type) {
        case "PLANET":
            return ["PLANET.png"];
        case "GAS_GIANT": 
            return ["GAS_GIANT.png"];
        case "MOON":
            return ["MOON.png"];
        case "ORBITAL_STATION":
            return ["ORBITAL_STATION.png"];
        case "JUMP_GATE":
            return ["jumpgate.png"];
        case "ASTEROID_FIELD":
            return ["ASTEROID_FIELD.png"];
        case "ASTEROID":
            return ["asteroid1.png", "asteroid2.png", "asteroid3.png", "asteroid4.png"];
        case "ENGINEERED_ASTEROID":
            return ["ENGINEERED_ASTEROID.png"];
        case "ASTEROID_BASE":
            return ["ASTEROID_BASE.png"];
        case "NEBULA":
            return [];
        case "DEBRIS_FIELD":
            return [];
        case "GRAVITY_WELL":
            return ["GRAVITY_WELL.png"];
        case "ARTIFICIAL_GRAVITY_WELL":
            return ["ARTIFICAL_GRAVITY_WELL.png"];
        case "FUEL_STATION":
            return ["FUEL_STATION.png"];
        default:
            return [];
    }
}

/**
 * Retourne l'échelle correspondant au type de planète
 * @param {Object} planet - L'objet planète
 * @returns {number} - Facteur d'échelle
 */
export function get_scale_from_type(planet) {
    switch(planet.type) {
        case "PLANET":
            return 0.04;
        case "GAS_GIANT": 
            return 0.04;
        case "MOON":
            return 0.04;
        case "ORBITAL_STATION":
            return 0.06;
        case "JUMP_GATE":
            return 0.08;
        case "ASTEROID_FIELD":
            return 0.05;
        case "ASTEROID":
            return 0.08;
        case "ENGINEERED_ASTEROID":
            return 0.03;
        case "ASTEROID_BASE":
            return 0.03;
        case "GRAVITY_WELL":
            return 0.08;
        case "ARTIFICIAL_GRAVITY_WELL":
            return 0.07;
        case "FUEL_STATION":
            return 0.04;
        default:
            return 0.05;
    }
}

/**
 * Affiche les informations d'une planète dans une modal avec actions selon les traits
 * @param {Object} planet - L'objet planète
 */
export function showPlanetInfo(planet) {
    const traits = planet.traits || [];
    const traitSymbols = traits.map(t => t.symbol || t);
    const factionText = planet.faction ? planet.faction.symbol : "None";
    
    // Déterminer les features disponibles
    const hasMarketplace = traitSymbols.includes('MARKETPLACE');
    const hasShipyard = traitSymbols.includes('SHIPYARD');
    const canMine = ['ASTEROID_FIELD', 'ASTEROID', 'ENGINEERED_ASTEROID'].includes(planet.type) ||
                   traitSymbols.some(t => t.includes('DEPOSITS') || t.includes('MINERAL'));
    
    // Récupérer les vaisseaux disponibles
    Ship.list((ships) => {
        let shipsAtLocation = ships.filter(s => s.nav.waypointSymbol === planet.name);
        let otherShips = ships.filter(s => s.nav.waypointSymbol !== planet.name && s.nav.systemSymbol === planet.system);
        
        // Génération des traits avec icônes
        let traitsHTML = traits.length > 0 ? `
            <div style="margin: 10px 0;">
                <strong>Traits:</strong>
                <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px;">
                    ${traits.map(t => {
                        const symbol = t.symbol || t;
                        const name = t.name || symbol;
                        const icon = getTraitIcon(symbol);
                        const isActionable = ['MARKETPLACE', 'SHIPYARD'].includes(symbol);
                        return `<span style="padding: 4px 10px; background: ${isActionable ? 'rgba(0,255,255,0.3)' : 'rgba(255,255,255,0.1)'}; border-radius: 15px; font-size: 11px; ${isActionable ? 'border: 1px solid #00ffff;' : ''}">${icon} ${name}</span>`;
                    }).join('')}
                </div>
            </div>
        ` : '<p><strong>Traits:</strong> None</p>';
        
        // Boutons d'actions selon les features
        let featuresHTML = '';
        if (hasMarketplace || hasShipyard || canMine) {
            featuresHTML = `
                <div style="margin: 15px 0; padding: 15px; background: rgba(0,255,255,0.1); border-radius: 8px; border: 1px solid rgba(0,255,255,0.3);">
                    <h4 style="margin: 0 0 10px 0; color: #00ffff;">🎮 Available Actions</h4>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                        ${hasMarketplace ? `
                            <button class="feature-marketplace-btn" data-system="${planet.system}" data-waypoint="${planet.name}"
                                style="padding: 10px 15px; background: linear-gradient(135deg, #00aa66, #00cc88); color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
                                🛒 Marketplace
                            </button>
                        ` : ''}
                        ${hasShipyard ? `
                            <button class="feature-shipyard-btn" data-system="${planet.system}" data-waypoint="${planet.name}"
                                style="padding: 10px 15px; background: linear-gradient(135deg, #aa6600, #cc8800); color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
                                🏭 Shipyard
                            </button>
                        ` : ''}
                        ${canMine ? `
                            <button class="feature-mining-btn" data-waypoint="${planet.name}"
                                style="padding: 10px 15px; background: linear-gradient(135deg, #aa00aa, #cc00cc); color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
                                ⛏️ Mining
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }
        
        // Ships at location avec actions
        let shipsHTML = "";
        if (shipsAtLocation.length > 0) {
            shipsHTML += `
                <div style="margin: 15px 0; padding: 15px; background: rgba(0,255,0,0.1); border-radius: 8px;">
                    <h4 style="margin: 0 0 10px 0; color: #00ff00;">🚀 Ships Here (${shipsAtLocation.length})</h4>
            `;
            shipsAtLocation.forEach(ship => {
                const fuelPercent = ship.fuel.capacity > 0 ? Math.round((ship.fuel.current / ship.fuel.capacity) * 100) : 0;
                const hasMiningLaser = ship.mounts?.some(m => m.symbol.includes('MINING') || m.symbol.includes('LASER'));
                
                shipsHTML += `
                    <div style="margin: 8px 0; padding: 10px; background: rgba(0,0,0,0.3); border-radius: 5px; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-weight: bold;">${hasMiningLaser ? '⛏️' : '🚀'} ${ship.symbol}</div>
                            <div style="font-size: 11px; color: #aaa;">Status: ${ship.nav.status} | ⛽ ${fuelPercent}% | 📦 ${ship.cargo.units}/${ship.cargo.capacity}</div>
                        </div>
                        <div style="display: flex; gap: 5px;">
                            ${hasMarketplace ? `
                                <button class="ship-trade-btn" data-ship="${ship.symbol}" data-system="${planet.system}" data-waypoint="${planet.name}"
                                    style="padding: 5px 10px; background: #00aa66; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 11px;">
                                    🛒 Trade
                                </button>
                            ` : ''}
                            ${hasMiningLaser && canMine ? `
                                <button class="ship-mine-btn" data-ship="${ship.symbol}"
                                    style="padding: 5px 10px; background: #aa00aa; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 11px;">
                                    ⛏️ Mine
                                </button>
                            ` : ''}
                        </div>
                    </div>
                `;
            });
            shipsHTML += `</div>`;
        }
        
        if (otherShips.length > 0) {
            shipsHTML += `
                <div style="margin: 15px 0;">
                    <h4 style="color: #0080ff; margin-bottom: 10px;">🚀 Navigate Ships Here</h4>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            `;
            otherShips.forEach(ship => {
                shipsHTML += `
                    <button class="navigate-ship-btn" data-ship="${ship.symbol}" data-destination="${planet.name}" 
                        style="padding: 8px 12px; background: #0080ff; color: white; border: none; 
                        border-radius: 5px; cursor: pointer; font-size: 11px;">
                        ${ship.symbol} from ${ship.nav.waypointSymbol}
                    </button>
                `;
            });
            shipsHTML += `</div></div>`;
        }
        
        // Ressources si type minéral
        let resourcesHTML = '';
        if (canMine) {
            const miningTraits = traitSymbols.filter(t => 
                t.includes('DEPOSITS') || t.includes('MINERAL') || t.includes('GASES') || t.includes('ICE')
            );
            if (miningTraits.length > 0) {
                resourcesHTML = `
                    <div style="margin: 15px 0; padding: 15px; background: rgba(170,0,170,0.1); border-radius: 8px; border: 1px solid rgba(170,0,170,0.3);">
                        <h4 style="margin: 0 0 10px 0; color: #aa00aa;">💎 Resource Deposits</h4>
                        <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                            ${miningTraits.map(t => `<span style="padding: 4px 10px; background: rgba(170,0,170,0.3); border-radius: 15px; font-size: 11px;">${getTraitIcon(t)} ${t.replace(/_/g, ' ')}</span>`).join('')}
                        </div>
                    </div>
                `;
            }
        }
        
        let infoHTML = `
            <div class="planet-info-modal" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                        background: rgba(0, 0, 0, 0.95); color: white; padding: 25px; 
                        border-radius: 10px; border: 2px solid #00ffff; z-index: 10000; 
                        min-width: 450px; max-width: 650px; max-height: 85vh; overflow-y: auto;
                        box-shadow: 0 0 20px rgba(0, 255, 255, 0.5);">
                <h2 style="margin-top: 0; color: #00ffff; border-bottom: 2px solid #00ffff; padding-bottom: 10px;">
                    ${TYPE_ICONS[planet.type] || '📍'} ${planet.name}
                </h2>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                    <div>
                        <p style="margin: 5px 0;"><strong>Type:</strong> ${planet.type}</p>
                        <p style="margin: 5px 0;"><strong>System:</strong> ${planet.system}</p>
                    </div>
                    <div>
                        <p style="margin: 5px 0;"><strong>Position:</strong> (${planet.position.x}, ${planet.position.y})</p>
                        <p style="margin: 5px 0;"><strong>Faction:</strong> ${factionText}</p>
                    </div>
                </div>
                
                ${planet.orbits ? `<p><strong>Orbits:</strong> ${planet.orbits}</p>` : ""}
                ${planet.moons && planet.moons.length > 0 ? `<p><strong>Moons:</strong> ${planet.moons.length}</p>` : ""}
                ${planet.is_under_construction ? `<p><strong>Status:</strong> <span style="color: orange;">🚧 Under Construction</span></p>` : ""}
                
                ${traitsHTML}
                ${featuresHTML}
                ${resourcesHTML}
                ${shipsHTML}
                
                <button id="close-planet-info" style="margin-top: 15px; padding: 10px 20px; 
                        background: #ff4444; color: white; border: none; border-radius: 5px; 
                        cursor: pointer; font-weight: bold; width: 100%;">Close</button>
            </div>
            <div id="planet-info-overlay" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
                        background: rgba(0, 0, 0, 0.7); z-index: 9999;"></div>
        `;
        
        // Supprimer les anciennes modales si elles existent
        $(".planet-info-modal").remove();
        $("#planet-info-overlay").remove();
        
        $('body').append(infoHTML);
        
        // Fonction pour fermer la modal
        function closePlanetModal() {
            $(".planet-info-modal").remove();
            $("#planet-info-overlay").remove();
            $(document).off("keydown.planetModal");
        }
        
        // Fermeture avec le bouton
        $("#close-planet-info").on("click", function(e) {
            e.preventDefault();
            e.stopPropagation();
            closePlanetModal();
            return false;
        });
        
        // Fermeture avec l'overlay
        $("#planet-info-overlay").on("click", function(e) {
            e.preventDefault();
            e.stopPropagation();
            closePlanetModal();
            return false;
        });
        
        // Fermeture avec la touche Esc
        $(document).off("keydown.planetModal").on("keydown.planetModal", function(e) {
            if (e.key === "Escape" || e.keyCode === 27) {
                closePlanetModal();
            }
        });
        
        // Navigation
        $(".navigate-ship-btn").on("click", function(e) {
            e.stopPropagation();
            let shipSymbol = $(this).attr("data-ship");
            let destination = $(this).attr("data-destination");
            navigateShip(shipSymbol, destination);
        });
        
        // Feature buttons
        $(".feature-marketplace-btn").on("click", function(e) {
            e.stopPropagation();
            const sys = $(this).data("system");
            const wp = $(this).data("waypoint");
            // Trouver un vaisseau au waypoint pour avoir les prix
            const shipHere = shipsAtLocation[0];
            showMarketplace(sys, wp, shipHere?.symbol);
        });
        
        $(".feature-shipyard-btn").on("click", function(e) {
            e.stopPropagation();
            const sys = $(this).data("system");
            const wp = $(this).data("waypoint");
            showShipyard(sys, wp);
        });
        
        $(".feature-mining-btn").on("click", function(e) {
            e.stopPropagation();
            // Trouver un vaisseau mineur au waypoint
            const minerShip = shipsAtLocation.find(s => s.mounts?.some(m => m.symbol.includes('MINING') || m.symbol.includes('LASER')));
            if (minerShip) {
                showMiningInterface(minerShip.symbol);
            } else if (shipsAtLocation.length > 0) {
                showSnackbar("No mining ship at this location. Navigate a mining ship here first.", 'warning');
            } else {
                showSnackbar("No ships at this location. Navigate a ship here first.", 'warning');
            }
        });
        
        // Ship-specific actions
        $(".ship-trade-btn").on("click", function(e) {
            e.stopPropagation();
            const shipSymbol = $(this).data("ship");
            const sys = $(this).data("system");
            const wp = $(this).data("waypoint");
            showMarketplace(sys, wp, shipSymbol);
        });
        
        $(".ship-mine-btn").on("click", function(e) {
            e.stopPropagation();
            const shipSymbol = $(this).data("ship");
            showMiningInterface(shipSymbol);
        });
        
    }, (err) => {
        showSnackbar("Could not load ships: " + err.message, 'error');
    });
}

/**
 * Navigue un vaisseau vers une destination
 * @param {string} shipSymbol - Symbole du vaisseau
 * @param {string} destination - Destination
 */
export function navigateShip(shipSymbol, destination) {
    (async () => {
        try {
            // D'abord, mettre le vaisseau en orbite
            try {
                await spaceTradersClient.orbitShip(shipSymbol);
            } catch (orbitError) {
                // Si déjà en orbite (code 4214), continuer
                if (orbitError.code !== 4214) {
                    throw orbitError;
                }
            }

            // Naviguer vers la destination
            const response = await spaceTradersClient.navigateShip(shipSymbol, destination);
            const nav = response.data.nav;
            
            showSnackbar(`Ship ${shipSymbol} traveling to ${destination}! Arrival: ${new Date(nav.route.arrival).toLocaleTimeString()}`, 'success', 5000);
            $(".planet-info-modal").remove();
            $("#planet-info-overlay").remove();
            if (typeof window.updateStatusPanel === 'function') window.updateStatusPanel();
            
            // Synchroniser la flotte
            fleetManager.syncFleet().catch(() => {});
            
        } catch (error) {
            const errorMsg = error.message || "Navigation failed";
            showSnackbar(`Navigation failed: ${errorMsg}`, 'error', 6000);
        }
    })();
}

/**
 * Affiche les options de navigation vers une planète
 * @param {string} planetName - Nom de la planète
 * @param {Array} planets - Liste de toutes les planètes
 */
export function showNavigationOptions(planetName, planets) {
    let planet = planets.find(p => p.name === planetName);
    if (!planet) return;
    
    Ship.list((ships) => {
        let otherShips = ships.filter(s => s.nav.waypointSymbol !== planetName && s.nav.systemSymbol === planet.system);
        
        if (otherShips.length === 0) {
            showSnackbar("No ships available in this system to navigate to " + planetName, 'info');
            return;
        }
        
        let shipsHTML = `<h4 style="color: #00ffff; margin-bottom: 10px;">Select a ship to navigate to ${planetName}:</h4>`;
        otherShips.forEach(ship => {
            shipsHTML += `
                <button class="quick-nav-ship" data-ship="${ship.symbol}" data-dest="${planetName}" 
                    style="display: block; width: 100%; margin: 5px 0; padding: 10px; 
                    background: #0080ff; color: white; border: none; border-radius: 5px; 
                    cursor: pointer; text-align: left; font-size: 12px;">
                    🚀 ${ship.symbol} (from ${ship.nav.waypointSymbol})
                </button>
            `;
        });
        
        let modalHTML = `
            <div id="nav-modal" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                background: rgba(0, 0, 0, 0.95); color: white; padding: 20px; border-radius: 10px; 
                border: 2px solid #00ffff; z-index: 10000; min-width: 300px;">
                ${shipsHTML}
                <button id="close-nav-modal" style="margin-top: 15px; padding: 10px; 
                    background: #ff4444; color: white; border: none; border-radius: 5px; 
                    cursor: pointer; width: 100%;">Cancel</button>
            </div>
            <div id="nav-modal-overlay" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
                background: rgba(0, 0, 0, 0.7); z-index: 9999;"></div>
        `;
        
        $("body").append(modalHTML);
        
        $("#close-nav-modal, #nav-modal-overlay").on("click", function() {
            $("#nav-modal").remove();
            $("#nav-modal-overlay").remove();
        });
        
        $(".quick-nav-ship").on("click", function() {
            let shipSymbol = $(this).attr("data-ship");
            let destination = $(this).attr("data-dest");
            $("#nav-modal").remove();
            $("#nav-modal-overlay").remove();
            navigateShip(shipSymbol, destination);
        });
    }, (err) => {
        showSnackbar("Failed to load ships", 'error');
    });
}
