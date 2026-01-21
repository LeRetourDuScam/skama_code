// Copyright © 2023 Entreprise SkamKraft
'use strict';

import { My } from "../commun/my.js";
import { SpaceTraders } from "./config.js";


export class Contract {
    constructor(data) {
        this.id = data.id;
        this.faction = data.factionSymbol;
        this.type = data.type;
        this.accepted = data.accepted;
        this.fulfilled = data.fulfilled;
        this.expiration = data.expiration;
        this.deadline = data.deadlineToAccept;
        this.terms = data.terms;
        this.paymentAccepted = data.terms.payment.onAccepted;
        this.paymentFulfill = data.terms.payment.onFulfilled;
        this.deliver = data.terms.deliver || [];
        this.tradeSymbol = data.terms.deliver[0]?.tradeSymbol || 'N/A';
        this.destination = data.terms.deliver[0]?.destinationSymbol || 'N/A';
    }

    static get(id, callback, error_handler) {
        const url = `${SpaceTraders.host}/my/contracts/${id}`;
        $.ajax({
            url: url,
            method: "GET",
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${My.agent.token}`,
            },
            success: (reponse) => {
                callback(new Contract(reponse.data));
            },
            error: (err) => {
                error_handler("Contract not found");
            }
        });
    }

    static list(limit, page, callback) {
        const url = `${SpaceTraders.host}/my/contracts`
        $.ajax({
            url: url,
            method: "GET",
            data: {
                limit: limit,
                page: page,
            },
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${My.agent.token}`,
            },
            success: (reponse) => {
                let contracts = [];
                reponse.data.forEach(contract => {
                    contracts.push(new Contract(contract));
                });
                callback(contracts);
            },
            error: (err) => {
                error_handler("Contract not found");
            }
        });
    }

    accept(callback, error_handler) {
        console.log("Accepting contract:", this.id);
        const url = `${SpaceTraders.host}/my/contracts/${this.id}/accept`
        $.ajax({
            url: url,
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
                Accept: "application/json",
                Authorization: `Bearer ${My.agent.token}`,
            },
            data: JSON.stringify({}),
            success: (reponse) => {
                this.accepted = true;
                callback(reponse);
            },
            error: (err) => {
                console.error("Failed to accept contract:", err);
                if (error_handler) {
                    error_handler(err);
                } else {
                    let errorMsg = "Contract acceptance failed";
                    if (err.responseJSON && err.responseJSON.error) {
                        errorMsg = err.responseJSON.error.message;
                    }
                    console.error(errorMsg);
                }
            }
        });


    }

    static deliver(contractId, token) {

        const url = `${SpaceTraders.host}/my/contracts/${contractId}/deliver`
        $.ajax({
            url: url,
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
                Accept: "application/json",
                Authorization: `Bearer ${My.agent.token}`,
            },
            success: (reponse) => {
                callback(reponse);
            },
            error: (err) => {
                error_handler("Contract not found");
            }
        });


    }

    static fulfill(contractId, callback, error_handler) {
        const url = `${SpaceTraders.host}/my/contracts/${contractId}/fulfill`
        $.ajax({
            url: url,
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
                Accept: "application/json",
                Authorization: `Bearer ${My.agent.token}`,
            },
            success: (reponse) => {
                if (callback) callback(reponse);
            },
            error: (err) => {
                if (error_handler) error_handler(err);
            }
        });
    }

    /**
     * Negotiate a new contract at a faction HQ
     * Ship must be docked at a faction headquarters waypoint
     */
    static negotiate(shipSymbol, callback, error_handler) {
        const url = `${SpaceTraders.host}/my/ships/${shipSymbol}/negotiate/contract`
        $.ajax({
            url: url,
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
                Accept: "application/json",
                Authorization: `Bearer ${My.agent.token}`,
            },
            data: JSON.stringify({}),
            success: (reponse) => {
                if (callback) callback(new Contract(reponse.data.contract));
            },
            error: (err) => {
                let errorMsg = "Failed to negotiate contract";
                if (err.responseJSON && err.responseJSON.error) {
                    errorMsg = err.responseJSON.error.message;
                }
                if (error_handler) error_handler(errorMsg);
            }
        });
    }

}