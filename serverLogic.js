'use strict';

const setUserRole = (game) => {
    //Set circle or X for user
    if (!game.roles['circle'].taken) {
        game.roles['circle'].taken = true;
        return 'circle';
    };
    if (!game.roles['x'].taken) {
        game.roles['x'].taken = true;
        return 'x';
    };

    return 'spec';
};

const initGame = (game) => {
    game.active = true;
    game.tiles = {};
    game.turn = 'circle';
    game.roles['circle'].turn = true;
    game.roles['x'].turn = false;
    game.restart = 0;

    let tileCount = 0;
    while (tileCount < 9) {
        game.tiles[`cell${tileCount}`] = {
            id: `cell${tileCount}`
            ,checked: false
            ,shape: null
        };
        tileCount++;
    };

    //Reset user restarts
    for (var userId in game.users) {
        game.users[userId].restart = false;
    };

    return game;
};

const swapTurns = (currentTurn) => {
    if (currentTurn === "circle") { return "x"; };
    if (currentTurn === "x") { return "circle"; };
    return;
};

const checkState = (game) => {
    const WINNING_COMBINATIONS = [
        ['cell0', 'cell1', 'cell2'],
        ['cell3', 'cell4', 'cell5'],
        ['cell6', 'cell7', 'cell8'],
        ['cell0', 'cell3', 'cell6'],
        ['cell1', 'cell4', 'cell7'],
        ['cell2', 'cell5', 'cell8'],
        ['cell0', 'cell4', 'cell8'],
        ['cell2', 'cell4', 'cell6']
    ];

    let win = WINNING_COMBINATIONS.some(combination => {
        return combination.every(index => {
            return game.tiles[index].shape == game.turn;
        });
    });

    if (win) { return true; };

    for (var tileId in game.tiles) {
        if (game.tiles[tileId].checked === false) { return undefined; };
    };

    return false;
};

const getUserGames = (games, socketId) => {
    return Object.entries(games).reduce((names, [name, game]) => {
        if (game !== null) {
            if (game.users[socketId] != null) names.push(name);
            return names;
        };
        return [];
    }, []);
};

export {
    setUserRole,
    initGame,
    swapTurns,
    checkState,
    getUserGames
};