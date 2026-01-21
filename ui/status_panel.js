/**
 * Status Panel - Panneau de status des vaisseaux et contrats
 * Affiche les informations en temps réel et permet la recherche de planètes
 */

import { Ship } from "../api/ship.js";
import { spaceTradersClient, statisticsTracker } from "../services/index.js";
import { showSnackbar } from "./notifications.js";
import { showFuelManager } from "./fuel_manager.js";
import { showContractManager } from "./contract_manager.js";
import { showPlanetInfo, showNavigationOptions } from "./planet_helpers.js";
import { Position } from "../commun/position.js";

// Variables globales pour la recherche
let globalPlanets = [];
let globalCanvas = null;
let shipCanvasObjects = {}; // Pour stocker les objets canvas des vaisseaux

/**
 * Configure la recherche de planètes
 * @param {Array} planets - Liste des planètes
 * @param {Object} canvas - Instance du canvas
 */
export function setupPlanetSearch(planets, canvas) {
    globalPlanets = planets;
    globalCanvas = canvas;
    
    $("#planet-search").off("input").on("input", function() {
        let searchTerm = $(this).val().toLowerCase();
        if (searchTerm.length === 0) {
            $("#search-results").html("");
            return;
        }
        
        let filteredPlanets = planets.filter(p => 
            p.name.toLowerCase().includes(searchTerm) || 
            p.type.toLowerCase().includes(searchTerm)
        );
        
        displaySearchResults(filteredPlanets);
    });
}

/**
 * Affiche les résultats de recherche
 * @param {Array} planets - Liste des planètes filtrées
 */
function displaySearchResults(planets) {
    if (planets.length === 0) {
        $("#search-results").html('<p style="color: #aaa; font-size: 11px; padding: 5px;">No planets found</p>');
        return;
    }
    
    let resultsHTML = '';
    planets.slice(0, 10).forEach(planet => {
        resultsHTML += `
            <div class="planet-result" data-planet="${planet.name}" 
                style="margin: 5px 0; padding: 8px; background: rgba(0, 255, 255, 0.1); 
                border-radius: 5px; cursor: pointer; border: 1px solid transparent;
                transition: all 0.2s;">
                <div style="font-weight: bold; font-size: 12px; color: #00ffff;">${planet.name}</div>
                <div style="font-size: 10px; color: #aaa;">${planet.type}</div>
                <div style="margin-top: 5px; font-size: 11px;">
                    <button class="zoom-planet-btn" data-planet="${planet.name}" 
                        style="padding: 4px 8px; background: #0080ff; color: white; border: none; 
                        border-radius: 3px; cursor: pointer; margin-right: 5px; font-size: 10px;">
                        🔍 Zoom
                    </button>
                    <button class="nav-to-planet-btn" data-planet="${planet.name}" 
                        style="padding: 4px 8px; background: #00aa00; color: white; border: none; 
                        border-radius: 3px; cursor: pointer; font-size: 10px;">
                        🚀 Navigate
                    </button>
                </div>
            </div>
        `;
    });
    
    if (planets.length > 10) {
        resultsHTML += `<p style="color: #aaa; font-size: 10px; padding: 5px;">+${planets.length - 10} more results...</p>`;
    }
    
    $("#search-results").html(resultsHTML);
    
    // Hover effect
    $(".planet-result").hover(
        function() { $(this).css({"background": "rgba(0, 255, 255, 0.2)", "border-color": "#00ffff"}); },
        function() { $(this).css({"background": "rgba(0, 255, 255, 0.1)", "border-color": "transparent"}); }
    );
    
    // Zoom button
    $(".zoom-planet-btn").off("click").on("click", function(e) {
        e.stopPropagation();
        let planetName = $(this).attr("data-planet");
        zoomToPlanet(planetName);
    });
    
    // Navigate button
    $(".nav-to-planet-btn").off("click").on("click", function(e) {
        e.stopPropagation();
        let planetName = $(this).attr("data-planet");
        showNavigationOptions(planetName, globalPlanets);
    });
    
    // Click sur le résultat pour zoomer
    $(".planet-result").off("click").on("click", function() {
        let planetName = $(this).attr("data-planet");
        zoomToPlanet(planetName);
    });
}

/**
 * Zoom sur une planète spécifique
 * @param {string} planetName - Nom de la planète
 */
export function zoomToPlanet(planetName) {
    let planet = globalPlanets.find(p => p.name === planetName);
    if (!planet || !globalCanvas) return;
    
    // Centrer le canvas sur la planète
    let planetPos = globalCanvas.canvas_pos(planet.position);
    let centerX = globalCanvas.canvas.width / 2;
    let centerY = globalCanvas.canvas.height / 2;
    
    // Calculer le déplacement nécessaire
    let offsetX = centerX - planetPos.x;
    let offsetY = centerY - planetPos.y;
    
    // Déplacer tous les objets
    globalCanvas.canvas.getObjects().forEach(obj => {
        obj.left += offsetX;
        obj.top += offsetY;
        obj.setCoords();
    });
    
    globalCanvas.canvas.renderAll();
    
    // Effet visuel
    setTimeout(() => {
        showPlanetInfo(planet);
    }, 300);
}

/**
 * Crée le Status Panel Factory - retourne les fonctions de gestion du panneau
 * @returns {Object} - Objet avec les fonctions createStatusPanel et updateStatusPanel
 */
export function createStatusPanelFactory() {
    let statusUpdateInterval = null;
    
    /**
     * Met à jour le panneau de status
     */
    function updateStatusPanel() {
        // Vérifier si le panneau existe toujours, sinon arrêter l'intervalle
        if ($("#status-panel").length === 0) {
            console.log("Status panel not found, stopping interval");
            if (statusUpdateInterval) {
                clearInterval(statusUpdateInterval);
                statusUpdateInterval = null;
            }
            return;
        }
        
        // Récupérer les vaisseaux
        Ship.list((ships) => {
            let shipsHTML = '<div style="margin-bottom: 15px;"><h4 style="color: #00ffff; margin: 5px 0; font-size: 14px;">🚀 SHIPS (' + ships.length + ')</h4>';
            
            ships.forEach(ship => {
                let statusColor = ship.nav.status === "IN_TRANSIT" ? "#ffaa00" : 
                                 ship.nav.status === "DOCKED" ? "#00ff00" : "#00aaff";
                let statusIcon = ship.nav.status === "IN_TRANSIT" ? "➡️" : 
                                ship.nav.status === "DOCKED" ? "🛥" : "🛸";
                
                let arrivalInfo = "";
                if (ship.nav.status === "IN_TRANSIT" && ship.nav.route) {
                    let arrival = new Date(ship.nav.route.arrival);
                    let now = new Date();
                    let remaining = Math.max(0, Math.ceil((arrival - now) / 1000 / 60));
                    arrivalInfo = `<br><span style="color: #ffaa00; font-size: 11px;">⏱ ${remaining}min to ${ship.nav.route.destination.symbol}</span>`;
                }
                
                // Afficher le fuel
                let fuelPercent = ship.fuel.capacity > 0 ? Math.round((ship.fuel.current / ship.fuel.capacity) * 100) : 0;
                let fuelColor = fuelPercent > 50 ? '#00ff00' : fuelPercent > 20 ? '#ffaa00' : '#ff4444';
                
                shipsHTML += `
                    <div style="margin: 8px 0; padding: 8px; background: rgba(255,255,255,0.05); border-radius: 5px; border-left: 3px solid ${statusColor};">
                        <div style="font-weight: bold; font-size: 12px;">${statusIcon} ${ship.symbol}</div>
                        <div style="font-size: 11px; color: #aaa;">📍 ${ship.nav.waypointSymbol}</div>
                        <div style="font-size: 11px; color: ${statusColor};">Status: ${ship.nav.status}</div>
                        <div style="font-size: 11px;">⛽ <span style="color: ${fuelColor};">${ship.fuel.current}/${ship.fuel.capacity}</span></div>
                        ${arrivalInfo}
                        <button class="view-ship-location-btn" data-ship="${ship.symbol}" data-waypoint="${ship.nav.waypointSymbol}"
                            style="margin-top: 5px; padding: 4px 8px; background: #0080ff; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 10px;">
                            🔍 View Location
                        </button>
                    </div>
                `;
            });
            shipsHTML += `
                <button id="open-fuel-manager" style="margin-top: 10px; padding: 10px 15px; 
                    background: linear-gradient(135deg, #ff6600, #ff8800); color: white; border: none; border-radius: 5px; 
                    cursor: pointer; font-weight: bold; width: 100%; font-size: 12px;">
                    ⛽ Fuel Manager
                </button>
            </div>`;
            
            // Récupérer les contrats avec le nouveau client API
            spaceTradersClient.getContracts().then((response) => {
                let contractsHTML = '<div><h4 style="color: #00ffff; margin: 5px 0; font-size: 14px;">📜 CONTRACTS (' + response.data.length + ')</h4>';
                
                response.data.forEach(contract => {
                    let statusColor = contract.fulfilled ? "#00ff00" : 
                                     contract.accepted ? "#ffaa00" : "#aaa";
                    let statusText = contract.fulfilled ? "COMPLETED" : 
                                    contract.accepted ? "IN PROGRESS" : "AVAILABLE";
                    let statusIcon = contract.fulfilled ? "✅" : 
                                    contract.accepted ? "⏳" : "📝";
                    
                    // Détails du contrat
                    let deliverInfo = '';
                    let actionsHTML = '';
                    if (contract.terms && contract.terms.deliver && contract.terms.deliver.length > 0) {
                        const deliver = contract.terms.deliver[0];
                        const progress = deliver.unitsFulfilled || 0;
                        const required = deliver.unitsRequired || 0;
                        const progressPercent = required > 0 ? Math.round((progress / required) * 100) : 0;
                        
                        deliverInfo = `
                            <div style="font-size: 10px; margin-top: 5px; padding: 5px; background: rgba(0,0,0,0.3); border-radius: 3px;">
                                <div style="color: #ffcc00;">📦 ${deliver.tradeSymbol}</div>
                                <div style="color: #aaa;">📍 To: ${deliver.destinationSymbol}</div>
                                <div style="color: #aaa;">Progress: ${progress}/${required} (${progressPercent}%)</div>
                                <div style="background: #333; border-radius: 3px; height: 6px; margin-top: 3px;">
                                    <div style="background: ${progressPercent === 100 ? '#00ff00' : '#ffaa00'}; width: ${progressPercent}%; height: 100%; border-radius: 3px;"></div>
                                </div>
                            </div>
                        `;
                        
                        if (contract.accepted && !contract.fulfilled && progress < required) {
                            actionsHTML = `
                                <button class="contract-action-btn" data-contract-id="${contract.id}" data-trade="${deliver.tradeSymbol}" data-dest="${deliver.destinationSymbol}"
                                    style="margin-top: 5px; padding: 5px 10px; background: #0080ff; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 10px; width: 100%;">
                                    🚀 Manage Contract
                                </button>
                            `;
                        }
                    }
                    
                    // Bouton pour accepter si pas encore accepté
                    if (!contract.accepted) {
                        actionsHTML = `
                            <button class="accept-contract-btn" data-contract-id="${contract.id}"
                                style="margin-top: 5px; padding: 5px 10px; background: #00aa00; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 10px; width: 100%;">
                                ✅ Accept Contract
                            </button>
                        `;
                    }
                    
                    // Bouton pour fulfiller si terminé
                    if (contract.accepted && !contract.fulfilled) {
                        const deliver = contract.terms?.deliver?.[0];
                        if (deliver && deliver.unitsFulfilled >= deliver.unitsRequired) {
                            actionsHTML = `
                                <button class="fulfill-contract-btn" data-contract-id="${contract.id}"
                                    style="margin-top: 5px; padding: 5px 10px; background: #00ff00; color: black; border: none; border-radius: 3px; cursor: pointer; font-size: 10px; width: 100%; font-weight: bold;">
                                    🎉 Complete Contract (+${contract.terms.payment.onFulfilled} credits)
                                </button>
                            `;
                        }
                    }
                    
                    contractsHTML += `
                        <div style="margin: 8px 0; padding: 8px; background: rgba(255,255,255,0.05); border-radius: 5px; border-left: 3px solid ${statusColor};">
                            <div style="font-weight: bold; font-size: 12px;">${statusIcon} ${contract.factionSymbol}</div>
                            <div style="font-size: 11px; color: ${statusColor};">${statusText}</div>
                            <div style="font-size: 11px; color: #aaa;">${contract.type}</div>
                            ${deliverInfo}
                            ${actionsHTML}
                        </div>
                    `;
                });
                contractsHTML += '</div>';
                
                // Ajouter les statistiques de session
                const sessionStats = statisticsTracker.getSessionStats();
                let statsHTML = `
                    <div style="margin-top: 15px; border-top: 1px solid #00ffff; padding-top: 10px;">
                        <h4 style="color: #00ffff; margin: 5px 0; font-size: 14px;">📊 SESSION STATS</h4>
                        <div style="font-size: 11px; color: #aaa;">
                            <div>⏱️ Duration: ${sessionStats.duration}</div>
                            <div>💰 Profit: <span style="color: ${sessionStats.profit >= 0 ? '#00ff00' : '#ff4444'};">${sessionStats.profit.toLocaleString()} credits</span></div>
                            <div>📈 Per Hour: ${sessionStats.profitPerHour.toLocaleString()} credits/h</div>
                        </div>
                    </div>
                `;
                
                $("#status-content").html(shipsHTML + contractsHTML + statsHTML);
                
                // Event handlers pour les boutons de contrat
                $(".accept-contract-btn").off("click").on("click", async function() {
                    const contractId = $(this).data("contract-id");
                    try {
                        await spaceTradersClient.acceptContract(contractId);
                        showSnackbar("Contract accepted! You received the advance payment.", 'success', 5000);
                        updateStatusPanel();
                    } catch (err) {
                        showSnackbar("Failed to accept contract: " + err.message, 'error');
                    }
                });
                
                $(".fulfill-contract-btn").off("click").on("click", async function() {
                    const contractId = $(this).data("contract-id");
                    try {
                        await spaceTradersClient.fulfillContract(contractId);
                        showSnackbar("🎉 Contract completed! You received the full payment!", 'success', 6000);
                        updateStatusPanel();
                    } catch (err) {
                        showSnackbar("Failed to complete contract: " + err.message, 'error');
                    }
                });
                
                $(".contract-action-btn").off("click").on("click", function() {
                    const contractId = $(this).data("contract-id");
                    const tradeSymbol = $(this).data("trade");
                    const destination = $(this).data("dest");
                    showContractManager(contractId, tradeSymbol, destination);
                });
                
                // Ouvrir le Fuel Manager
                $("#open-fuel-manager").off("click").on("click", function() {
                    showFuelManager();
                });

                // View ship location - zoom sur la planète et affiche ses infos
                $(".view-ship-location-btn").off("click").on("click", function() {
                    const waypointSymbol = $(this).data("waypoint");
                    const shipSymbol = $(this).data("ship");

                    // Trouver la planète correspondante
                    const planet = globalPlanets.find(p => p.name === waypointSymbol);
                    if (planet) {
                        zoomToPlanet(waypointSymbol);
                        showSnackbar(`📍 ${shipSymbol} is at ${waypointSymbol}`, 'info', 3000);
                    } else {
                        showSnackbar(`${shipSymbol} is at ${waypointSymbol} (not in current view)`, 'warning', 3000);
                    }
                });

                // Mettre à jour les vaisseaux sur le canvas
                updateShipsOnCanvas(ships);

            }).catch((err) => {
                $("#status-content").html(shipsHTML + '<p style="color: #ff6666; font-size: 11px;">Failed to load contracts</p>');
            });
        }, (err) => {
            $("#status-content").html('<p style="color: #ff6666;">Failed to load status</p>');
        });
    }
    
    /**
     * Crée le panneau de status
     */
    function createStatusPanel() {
        let panelHTML = `
            <div id="status-panel" data-system-panel="true" style="position: fixed; top: 80px; left: 20px; 
                background: rgba(0, 0, 0, 0.9); color: white; padding: 15px; 
                border-radius: 10px; border: 2px solid #00ffff; z-index: 9000; 
                min-width: 300px; max-width: 350px; max-height: 80vh; overflow-y: auto;
                box-shadow: 0 0 20px rgba(0, 255, 255, 0.5);">
                <h3 style="margin-top: 0; color: #00ffff; border-bottom: 2px solid #00ffff; padding-bottom: 10px; font-size: 18px;">
                    ⚡ STATUS PANEL
                </h3>
                <div style="margin-bottom: 15px;">
                    <input type="text" id="planet-search" placeholder="🔍 Search planets..." 
                        style="width: 100%; padding: 10px; background: rgba(0, 255, 255, 0.1); 
                        border: 1px solid #00ffff; border-radius: 5px; color: white; 
                        font-size: 13px; box-sizing: border-box;" />
                    <div id="search-results" style="margin-top: 10px; max-height: 200px; overflow-y: auto;"></div>
                </div>
                <div id="status-content" style="font-size: 13px;">
                    <p style="color: #aaa;">Loading...</p>
                </div>
            </div>
        `;
        
        if ($("#status-panel").length === 0) {
            $("body").append(panelHTML);
            updateStatusPanel();
            // Créer un nouveau intervalle
            statusUpdateInterval = setInterval(updateStatusPanel, 10000);
        }
    }
    
    /**
     * Nettoie l'intervalle
     */
    function cleanup() {
        if (statusUpdateInterval) {
            clearInterval(statusUpdateInterval);
            statusUpdateInterval = null;
        }
    }
    
    return {
        createStatusPanel,
        updateStatusPanel,
        cleanup
    };
}

/**
 * Met à jour les vaisseaux affichés sur le canvas
 * @param {Array} ships - Liste des vaisseaux
 */
function updateShipsOnCanvas(ships) {
    if (!globalCanvas || !globalPlanets.length) return;

    // Supprimer les anciens marqueurs de vaisseaux
    Object.values(shipCanvasObjects).forEach(obj => {
        if (obj && globalCanvas.canvas) {
            globalCanvas.canvas.remove(obj);
        }
    });
    shipCanvasObjects = {};

    // Grouper les vaisseaux par waypoint pour calculer le décalage
    const shipsByWaypoint = {};
    ships.forEach(ship => {
        const waypointSymbol = ship.nav.waypointSymbol;
        if (!shipsByWaypoint[waypointSymbol]) {
            shipsByWaypoint[waypointSymbol] = [];
        }
        shipsByWaypoint[waypointSymbol].push(ship);
    });

    // Créer les marqueurs avec décalage
    Object.entries(shipsByWaypoint).forEach(([waypointSymbol, waypointShips]) => {
        const waypoint = globalPlanets.find(p => p.name === waypointSymbol);
        if (!waypoint) return;

        waypointShips.forEach((ship, index) => {
            createShipMarker(ship, waypoint.position, index, waypointShips.length);
        });
    });

    globalCanvas.canvas.renderAll();
}

/**
 * Crée un marqueur pour un vaisseau sur le canvas
 * @param {Object} ship - Données du vaisseau
 * @param {Object} position - Position {x, y}
 * @param {number} index - Index du vaisseau à ce waypoint
 * @param {number} totalAtWaypoint - Nombre total de vaisseaux à ce waypoint
 */
function createShipMarker(ship, position, index = 0, totalAtWaypoint = 1) {
    if (!globalCanvas) return;

    const canvasPos = globalCanvas.canvas_pos(position);

    // Calculer le décalage pour éviter le chevauchement
    // Décaler vers la droite de la planète
    const offsetDistance = 35; // Distance du centre de la planète
    let offsetX = 0;
    let offsetY = 0;

    if (totalAtWaypoint > 1) {
        // Plusieurs vaisseaux: les empiler verticalement à droite de la planète
        offsetX = offsetDistance;
        offsetY = (index - (totalAtWaypoint - 1) / 2) * 25; // Espacement vertical de 25px
    } else {
        // Un seul vaisseau: décaler à droite
        offsetX = offsetDistance;
        offsetY = 0;
    }

    // Déterminer le type de vaisseau pour l'icône
    const isSatellite = ship.frame?.symbol?.includes('PROBE') || ship.frame?.symbol?.includes('SATELLITE');
    const isMiner = ship.mounts?.some(m => m.symbol?.includes('MINING'));
    const isInTransit = ship.nav.status === 'IN_TRANSIT';

    // Choisir l'icône
    let emoji = '🚀';
    if (isSatellite) emoji = '📡';
    else if (isMiner) emoji = '⛏️';
    else if (isInTransit) emoji = '✈️';

    // Créer l'icône
    const icon = new fabric.Text(emoji, {
        fontSize: isSatellite ? 16 : 20,
        originX: 'center',
        originY: 'center'
    });

    // Label du vaisseau (nom court)
    const label = new fabric.Text(ship.symbol.split('-').pop(), {
        fontSize: 8,
        fill: '#ffffff',
        originX: 'center',
        originY: 'top',
        top: 12,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        shadow: 'rgba(0,0,0,1) 1px 1px 3px'
    });

    const group = new fabric.Group([icon, label], {
        left: canvasPos.x + offsetX,
        top: canvasPos.y + offsetY,
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: false,
        shipSymbol: ship.symbol
    });

    shipCanvasObjects[ship.symbol] = group;
    globalCanvas.canvas.add(group);
}
