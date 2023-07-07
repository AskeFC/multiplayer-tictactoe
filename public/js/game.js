'use strict';

const socket                        = io('http://localhost:3000');
const X_CLASS                       = 'x';
const CIRCLE_CLASS                  = 'circle';

let userShape;
let currentTurn;
let typingTimer;
let score = {
    'x': {
        wins: 0
    },
    'circle': {
        wins: 0
    }
};
let xScore = 0;
let circleScore = 0;

// name elements
const promptUserNameContainer       = document.querySelector('.prompt-user-name-container');
const userNameInput                 = document.querySelector('.user-name-input');
const userNameInputSubmit           = document.querySelector('.user-name-input-submit');
// index page elements
const joinGameList                  = document.getElementById('join-game-list');
// game elements
const board                         = document.getElementById('board');
const cellElements                  = document.querySelectorAll('[data-cell]');
const turnMessage                   = document.getElementById('turnMessage');
const winCounterContainer           = document.getElementById('win-counter-container');
const xScoreText                    = document.getElementById('x-score');
const circleScoreText               = document.getElementById('circle-score');
// win/draw window
const winningMessageElement         = document.getElementById('winningMessage');
const winningMessageTextElement     = document.querySelector('[data-winning-message-text]');
const restartButton                 = document.getElementById('restartButton');
// chat elements
const chat                          = document.querySelector('.chat');
const messageContainer              = document.getElementById('message-container');
const typingFeedback                = document.getElementById('typing-feedback');
const messageForm                   = document.getElementById('send-container');
const messageInput                  = document.getElementById('message-input');

let userName                        = getCookie('name');

const createUserNameCookie= () => {
    userName = userNameInput.value;

    document.cookie = `name=${userName}`;
    promptUserNameContainer.classList.remove('show');
};

//Check if user's name is set
if (!userName ||  !userName === "") {
    promptUserNameContainer.classList.add('show');

    //Listen for username submit and create a name cookie
    userNameInputSubmit.addEventListener("click", createUserNameCookie);
} else {
    promptUserNameContainer.classList.remove('show');
};


//If user goes on game page
if (chat != null) {
    socket.emit('new-user', gameName, userName);

    //Listen for keys to give typing feedback
    messageInput.addEventListener('keypress', () => {
        socket.emit('typing', gameName);
    });

    //Listen for chat submit to send message
    messageForm.addEventListener('submit', e => {
        sendChatMessage(e);
    });
};

//SOCKET.IO RESPONSES
socket.on('game-created', gameName => {
    //Create a card for the new game and append it to the list
    let gameCard = createGameCard(gameName);
    joinGameList.append(gameCard);
});

socket.on('user-connected', (users, userId) => {
    userShape = users[userId].role;

    if (userShape == "spec") {
        turnMessage.innerText = "You are spectating";
    } else {
        turnMessage.innerText = "Waiting for opponent...";
    };

    appendMessage('game', 'You connected');
    setShapeColour();
    setGameScore(users);
});

socket.on('other-user-connected', user => {
    appendMessage('game', `${user.name} connected`);
});

socket.on('start-game', data => {
    currentTurn = data.turn;

    startGame();
    swapTurns();
    appendMessage('game', 'Game Has Started !');
});

socket.on('typing', data => {
    //Give feedback when someone is typing
    typingFeedback.innerText = `${data.name} is typing...`;

    typingTimer = setTimeout(() => {
        typingFeedback.innerText = "";
    }, 5000);
});

socket.on('chat-message', data => {
    appendMessage('other', `${data.fromUser}: ${data.message}`);
});

socket.on('place-mark', data => {
    currentTurn = data.game.turn;
    let cell = document.getElementById(data.cell);

    //Get the tiles that have already been clicked
    let checkedTiles = [];
    for (key in data.game.tiles) {
        if (data.game.tiles[key].checked) {
            checkedTiles.push(data.game.tiles[key]);
        };
    };

    swapTurns();
    placeMark(checkedTiles, cell, data.pastTurn);
});

socket.on('win', (shape, users) => {
    winningMessageTextElement.innerText = gameEndMessage(shape, true);

    setGameScore(users);
});

socket.on('draw', () => {
    winningMessageTextElement.innerText = gameEndMessage();
});

socket.on('request-restart', () => {
    appendMessage('game', 'Other player wants to play again');
});

// socket.on('user-reconnected', data => {
//     startGame()
//     swapTurns()
//     fillCheckedTiles(data.tiles) 
// })

socket.on('other-user-reconnected', data => {
    appendMessage('game', `${data.user.name} has reconnected`);
});

socket.on('user-disconnected', user => {
    appendMessage('game', `${user.name} has left!`);

    if (user.role !== "spec") {
        cellElements.forEach(cell => {
            cell.removeEventListener('click', handleClick);
            cell.classList.add('none');
        });
        turnMessage.innerText = "Waiting for opponent...";
    };
});

// FUNCTIONS ONLY FROM HERE ON
const startGame = () => {
    //Show hidden items from winning or draw screen
    winningMessageElement.classList.remove('show');
    turnMessage.classList.remove('hide');
    board.classList.remove('hide');
    winCounterContainer.classList.remove('hide');

    //Make sure game board is empty
    cellElements.forEach(cell => {
        cell.classList.remove(X_CLASS);
        cell.classList.remove(CIRCLE_CLASS);
    });

    //Assign the hover for the user's shape
    board.classList.add(userShape);

    setGameScore();
};

const handleClick = (e) => {
    const cell = e.target;

    socket.emit('place-mark', { gameName: gameName, cell: cell.id, currentTurn: currentTurn });
    
    placeMark([], cell, currentTurn);
};

const swapTurns = () => {
    let currentTurnText;
    cellElements.forEach(cell => {
        cell.removeEventListener('click', handleClick);

        if (userShape === "spec") {
            currentTurnText = "You are spectating";
        } else if(userShape != currentTurn) {
            cell.classList.add('none');
            currentTurnText = "It's Your Opponent's Turn";
        } else {
            cell.classList.remove('none');
            cell.addEventListener('click', handleClick, {once: true});
            currentTurnText = "It's Your Turn!";
        };
    });

    turnMessage.innerText = currentTurnText;
};

const requestRematch = () => {
    socket.emit('request-restart', gameName);
};

const placeMark = (checkedTiles, cell, currentClass) => {
    if (checkedTiles.length !== 0) {
        checkedTiles.forEach(tile => {
            document.getElementById(tile.id).removeEventListener('click', handleClick);
        });
    };
    cell.classList.add(currentClass);
};

const appendMessage = (origin, message) => {
    const messageElement = document.createElement('div');
    messageElement.classList.add('chatMessage');
    messageElement.innerText = message;

    const messageTimeStamp = document.createElement('div');
    messageTimeStamp.innerText = getCurrentTime();

    messageContainer.append(messageElement);

    //Append a class for the message type, self message, player message, game message
    if (origin === "game") {
        messageElement.classList.add('gameMessage');
    } else if (origin === "other") {
        messageElement.classList.add('otherMessage');
    } else if (origin === "self") {
        messageElement.classList.add('selfMessage');
    };

    chatAutoScrollNewMessage();
};

const getCurrentTime = () => {
    let currentTime = new Date();
    let hours = convert12to24(currentTime.getHours());
    let minutes = convert2digits(currentTime.getMinutes());
    let seconds = convert2digits(currentTime.getSeconds());

    return `${hours.hour}:${minutes}:${seconds}${hours.ampm}`;
};

const convert12to24 = (hours) => {
    if (hours == 0) { return { hour: '12', ampm: 'am' }; };
    if (hours >= 1 && hours <= 12 ) { return { hour: hours.toString(), ampm: 'am' }; };
    return { hour:(hours - 12).toString(), ampm: 'pm' };
};

const convert2digits = (minutes) => {
    return (minutes < 10) ? `${0}${minutes}` : minutes.toString();
};

const createGameCard = (gameName) => {
    //Add a new game to the list on the homepage
    const gameElement = document.createElement('div');
    gameElement.classList.add('game-card');

    const gameTitle = document.createElement('h4');
    gameTitle.innerText = gameName;

    const gameLink = document.createElement('a');
    gameLink.href = `/${gameName}`;
    gameLink.innerText = 'join';

    gameElement.append(gameTitle);
    gameElement.append(gameLink);
    return gameElement;
};

const chatAutoScrollNewMessage= () => {
    let hiddenChatArea = messageContainer.scrollHeight - messageContainer.clientHeight;

    if (messageContainer.scrollHeight > messageContainer.clientHeight) {
        messageContainer.scrollTop = hiddenChatArea;
    };
};

const gameEndMessage = (shape = "", win = false) => {
    if (userShape === 'spec') {
        return restartButton.style.display = 'none';
    };

    restartButton.removeEventListener('click', requestRematch);
    restartButton.addEventListener('click', requestRematch);

    winningMessageElement.classList.add('show');
    turnMessage.classList.add('hide');
    board.classList.add('hide');
    winCounterContainer.classList.add('hide');

    if (win) {
        return `${shape}'s Win!`;
    };

    return 'Its a Draw!';
};

const fillCheckedTiles = (tiles) => {
    tiles.forEach( tile => {
        if (tile.checked) {
            let checkedTile = document.getElementById(tile.id);
            checkedTile.classList.add(tile.shape);
        };
    });
};

const setShapeColour= () => {
    let css;
    if (userShape === 'circle' || userShape == 'spec') {
        css = `
            .cell.x::before,
            .cell.x::after {
                background-color: rgb(156, 31, 31);
            }

            .cell.circle::before {
                background-color: #187BCD;
                float: right;
            }
        `,
        head = document.head || document.getElementsByTagName('head')[0],
        style = document.createElement('style');
     } else if (userShape === 'x') {
        css = `
            .cell.x::before,
            .cell.x::after {
                background-color: #187BCD;
            }

            .cell.circle::before {
                background-color: rgb(156, 31, 31);
                float: left;
            }
        `,
        head = document.head || document.getElementsByTagName('head')[0],
        style = document.createElement('style');
    };

    head.appendChild(style);
    style.type = 'text/css';
    style.appendChild(document.createTextNode(css));
};

const sendChatMessage = (e) => {
    const message = messageInput.value;
    e.preventDefault();

    appendMessage('self', `You: ${message}`);
    messageInput.value = '';

    socket.emit('send-chat-message', {
        gameName: gameName,
        message: message
    });
};

const setGameScore = (users = null) => {
    if (users) {
        for (let userId in users) {
            let userRole = users[userId].role;
            if (userRole === X_CLASS || userRole === CIRCLE_CLASS) {
                console.log(users[userId].wins + " - " + score[userRole].wins);
                score[userRole].wins = users[userId].wins;
            };
        };
    };

    xScoreText.innerText = `X's: ${score[X_CLASS].wins}`;
    circleScoreText.innerText = `O's: ${score[CIRCLE_CLASS].wins}`;
};