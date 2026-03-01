import {
    AngularNodeAppEngine,
    createNodeRequestHandler,
    isMainModule,
    writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import http from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import { Game, type GameDifficulty } from './game';
import { EventHandler } from './eventhandler';
import { RestHandler } from './resthandler';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();
const server = http.createServer(app);

const graceMs = Number(process.env['SOCKET_GRACE_MS'] ?? 60000);
const game = new Game(Number.isFinite(graceMs) ? graceMs : 60000);
let eventHandler: EventHandler;
const restHandler = new RestHandler(game, (direction, playerName) => {
    console.log(`Resting choice: ${playerName} chose ${direction}.`);
    restHandler.endRest();
    eventHandler.startEvent(direction);
}, () => {
    eventHandler.prepareRestPreviews();
});
eventHandler = new EventHandler(game, () => {
    restHandler.startRest();
});

const wss = new WebSocketServer({ server });

wss.on('connection', (socket) => {
    console.log('A socket connected.');
    socket.on('message', (raw) => {
        try {
            const data = JSON.parse(raw.toString()) as {
                type?: string;
                name?: string;
                itemName?: string;
                optionIndex?: number;
                eatAmount?: number;
                targetName?: string;
                quantity?: number;
                direction?: string;
                optionChoice?: string;
                accused?: string;
                vote?: boolean;
                difficulty?: GameDifficulty;
            };

            if (data.type === 'join' && data.name) {
                console.log('A player joined.');
                console.log("Number of open sockets:", game.clients.size + 1);
                const trimmedName = data.name.trim();
                if (!trimmedName) {
                    return;
                }

                game.addPlayer(socket, trimmedName);

                if (game.gamePlayers) {
                    game.sendGameTo(socket);
                }

                if (eventHandler.eventActive) {
                    eventHandler.sendEventTo(socket);
                }

                if (restHandler.restActive) {
                    restHandler.sendRestTo(socket);
                }
            }

            if (data.type === 'start' && socket === game.hostSocket && !game.gamePlayers) {
                const difficulty: GameDifficulty =
                    data.difficulty === 'beginner' || data.difficulty === 'expert' ? data.difficulty : 'normal';
                if (!game.startGame(difficulty)) {
                    return;
                }

                console.log('Game started.');
                eventHandler.resetForNewGame();
                restHandler.resetForNewGame();
                restHandler.startRest();
            }

            if (data.type === 'moveToFloor' && data.itemName && game.gamePlayers) {
                const clientInfo = game.clients.get(socket);
                if (!clientInfo) {
                    return;
                }

                game.moveToFloor(clientInfo, data.itemName);
            }

            if (data.type === 'moveToInventory' && data.itemName && game.gamePlayers) {
                const clientInfo = game.clients.get(socket);
                if (!clientInfo) {
                    return;
                }

                game.moveToInventory(clientInfo, data.itemName);
            }

            if (data.type === 'useItem' && data.itemName && game.gamePlayers) {
                console.log(`${data.name} is trying to use ${data.itemName}.`);
                const clientInfo = game.clients.get(socket);
                if (!clientInfo) {
                    return;
                }

                const options = game.getItemOptions(clientInfo, data.itemName) ?? [];
                if (options.length === 0) {
                    game.useItem(clientInfo, data.itemName);
                } else if (socket.readyState === socket.OPEN) {
                    socket.send(JSON.stringify({
                        type: 'item-options',
                        itemName: data.itemName,
                        options,
                    }));
                    console.log(`Sent options for ${data.itemName} to ${clientInfo.name}.`);
                }
            }

            if (data.type === 'useItemOption' && data.itemName && typeof data.optionIndex === 'number' && game.gamePlayers) {
                const clientInfo = game.clients.get(socket);
                if (!clientInfo) {
                    return;
                }

                game.useItemWithOption(clientInfo, data.itemName, data.optionIndex);
            }

            if (data.type === 'vote' && typeof data.optionIndex === 'number' && eventHandler.eventActive) {
                const clientInfo = game.clients.get(socket);
                if (!clientInfo) {
                    return;
                }

                const lastVote = eventHandler.handleVote(socket, clientInfo, data.optionIndex, data.quantity);
                if (lastVote) {
                    console.log('Event concluded.');
                    game.broadcastGame();
                }
            }

            if (data.type === 'continue' && game.gamePlayers) {
                throw new Error('Use rest:continue instead of continue for resting continues.');
            }

            if (data.type === 'rest:continue' && typeof data.direction === 'string' && game.gamePlayers) {
                const clientInfo = game.clients.get(socket);
                if (!clientInfo) {
                    return;
                }

                const direction = data.direction === 'left' ? 'left' : 'right';
                restHandler.handleContinueVote(clientInfo, direction);
            }

            if (data.type === 'event:preview' && typeof data.direction === 'string') {
                const clientInfo = game.clients.get(socket);
                if (!clientInfo) {
                    return;
                }

                if (clientInfo.name !== game.demonName && clientInfo.scouting === 'neither') {
                    return;
                }

                const direction = data.direction === 'left' ? 'left' : 'right';
                eventHandler.sendPreviewTo(socket, direction);
            }

            if (data.type === 'event:request') {
                eventHandler.handleEventRequest(socket);
            }

            if (data.type === 'event:continue' && game.gamePlayers) {
                const clientInfo = game.clients.get(socket);
                if (!clientInfo) {
                    return;
                }

                eventHandler.handleEventEndContinue(clientInfo);
            }

            if (data.type === 'rest:request') {
                restHandler.handleRestRequest(socket);
            }

            if (data.type === 'rest:pick' && typeof data.optionIndex === 'number') {
                const clientInfo = game.clients.get(socket);
                if (!clientInfo) {
                    return;
                }

                restHandler.handleSkillPick(clientInfo, data.optionIndex, data.targetName, data.optionChoice);
                restHandler.sendRestTo(socket);
            }

            if (data.type === 'rest:accuse' && typeof data.accused === 'string' && game.gamePlayers) {
                const clientInfo = game.clients.get(socket);
                if (!clientInfo) {
                    return;
                }

                restHandler.handleAccuse(clientInfo, data.accused);
            }

            if (data.type === 'accuse:vote' && typeof data.vote === 'boolean' && game.gamePlayers) {
                const clientInfo = game.clients.get(socket);
                if (!clientInfo) {
                    return;
                }

                restHandler.handleAccuseVote(clientInfo, data.vote);
            }

            if (data.type === 'rest:eat' && typeof data.eatAmount === 'number') {
                const clientInfo = game.clients.get(socket);
                if (!clientInfo) {
                    return;
                }

                restHandler.handleEat(clientInfo, data.eatAmount);
                restHandler.sendRestTo(socket);
                game.broadcastGame();
            }
        } catch {
            // Ignore malformed messages
        }
    });

    socket.on('close', () => {
        if (game.clients.has(socket)) {
            console.log('A socket disconnected.');
            console.log("Number of open sockets:", game.clients.size - 1);
                if (game.clients.size === 1) {
                    game.resetGameState();
                    eventHandler.resetAll();
                    restHandler.resetAll();
                }
            game.markDisconnected(socket, (player) => {
                eventHandler.handleDisconnect(player);
                restHandler.handleDisconnect(player);
            });
        }
    });
});

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
app.use(
    express.static(browserDistFolder, {
        maxAge: '1y',
        index: false,
        redirect: false,
    }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
    angularApp
        .handle(req)
        .then((response) =>
            response ? writeResponseToNodeResponse(response, res) : next(),
        )
        .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
    const port = process.env['PORT'] || 4000;
    server.listen(port, () => {
        console.log(`Node Express server listening on http://localhost:${port}`);
    });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
