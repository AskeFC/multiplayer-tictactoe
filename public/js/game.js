const socket                        = io('http://localhost:3000')
const X_CLASS                       = 'x'
const CIRCLE_CLASS                  = 'circle'

let userShape
let currentTurn
let userName                        = getCookie('name')
let typingTimer

// name elements
const promptUserNameContainer       = document.querySelector('.prompt-user-name-container')
const userNameInput                 = document.querySelector('.user-name-input')
const userNameInputSubmit           = document.querySelector('.user-name-input-submit')
// index page elements
const joinGameList                 = document.getElementById('join-game-list')
// game elements
const board                         = document.getElementById('board')
const cellElements                  = document.querySelectorAll('[data-cell]')
const turnMessage                   = document.getElementById('turnMessage')
// win/draw window
const winningMessageElement         = document.getElementById('winningMessage')
const winningMessageTextElement     = document.querySelector('[data-winning-message-text]')
const restartButton                 = document.getElementById('restartButton')
// chat elements
const chat                          = document.querySelector('.chat')
const messageContainer              = document.getElementById('message-container')
const typingFeedback                = document.getElementById('typing-feedback')
const messageForm                   = document.getElementById('send-container')
const messageInput                  = document.getElementById('message-input')



//Check if user's name is set
if (!userName ||  !userName === "") {
    promptUserNameContainer.classList.add('show')

    //Listen for username submit and create a name cookie
    userNameInputSubmit.addEventListener("click", createUserNameCookie)
} else {
    promptUserNameContainer.classList.remove('show')
}


//If user goes on game page
if (chat != null) {
    socket.emit('new-user', gameName, userName)

    //Listen for keys to give typing feedback
    messageInput.addEventListener('keypress', () => {
        socket.emit('typing', gameName)
    })

    //Listen for chat submit to send message
    messageForm.addEventListener('submit', e => {
        sendChatMessage(e)
    })
}

//SOCKET.IO RESPONSES
socket.on('game-created', gameName => {
    //Create a card for the new game and append it to the list
    let gameCard = createGameCard(gameName)
    joinGameList.append(gameCard)
})

socket.on('user-connected', user => {
    userShape = user.role

    if(userShape == "spec"){
        turnMessage.innerText = "You are spectating"
    }else {
        turnMessage.innerText = "Waiting for opponent..."
    }

    appendMessage('game', 'You connected')
    setShapeColour()
})

socket.on('other-user-connected', user => {
    appendMessage('game', `${user.name} connected`)
})

socket.on('start-game', data => {
    currentTurn = data.turn

    startGame()
    swapTurns()
    appendMessage('game', 'Game Has Started !')
})

socket.on('typing', data => {
    //Give feedback when someone is typing
    typingFeedback.innerText = `${data.name} is typing...`

    typingTimer = setTimeout(() => {
        typingFeedback.innerText = ""
    }, 5000)
})

socket.on('chat-message', data => {
    appendMessage('other', `${data.fromUser}: ${data.message}`)
})

socket.on('place-mark', data => {
    currentTurn = data.game.turn
    let cell = document.getElementById(data.cell)

    //Get the tiles that have already been clicked
    let checkedTiles = []
    for (key in data.game.tiles) {
        if (data.game.tiles[key].checked) {
            checkedTiles.push(data.game.tiles[key])
        }
    }

    swapTurns()
    placeMark(checkedTiles, cell, data.pastTurn)
})

socket.on('win', shape => {
    winningMessageTextElement.innerText = gameEndMessage(shape, true)
})

socket.on('draw', () => {
    winningMessageTextElement.innerText = gameEndMessage()
})

socket.on('request-restart', () => {
    appendMessage('game', 'Other player wants to play again')
})

// socket.on('user-reconnected', data => {
//     startGame()
//     swapTurns()
//     fillCheckedTiles(data.tiles) 
// })

socket.on('other-user-reconnected', data => {
    appendMessage('game', `${data.user.name} has reconnected`)
})

socket.on('user-disconnected', user => {
    appendMessage('game', `${user.name} has left!`)

    if(user.role !== "spec") {
        cellElements.forEach(cell => {
            cell.removeEventListener('click', handleClick)
            cell.classList.add('none')
        })
        turnMessage.innerText = "Waiting for opponent..."
    }
})

// FUNCTIONS ONLY FROM HERE ON
function startGame() {
    //Show hidden items from winning or draw screen
    winningMessageElement.classList.remove('show')
    turnMessage.classList.remove('hide')
    board.classList.remove('hide')

    //Make sure game board is empty
    cellElements.forEach(cell => {
        cell.classList.remove(X_CLASS)
        cell.classList.remove(CIRCLE_CLASS)
    })

    //Assign the hover for the user's shape
    board.classList.add(userShape)
}

function handleClick(e) {
    const cell = e.target

    socket.emit('place-mark', { gameName: gameName, cell: cell.id, currentTurn: currentTurn })
    
    placeMark([], cell, currentTurn)
}

function swapTurns() {
    let currentTurnText
    cellElements.forEach(cell => {
        cell.removeEventListener('click', handleClick)

        if(userShape === "spec"){
            currentTurnText = "You are spectating"
        } else if(userShape != currentTurn) {
            cell.classList.add('none')
            currentTurnText = "It's Your Opponent's Turn"
        } else {
            cell.classList.remove('none')
            cell.addEventListener('click', handleClick, {once: true})
            currentTurnText = "It's Your Turn!"
        }
    })

    turnMessage.innerText = currentTurnText
}

function requestRematch() {
    socket.emit('request-restart', gameName)
}

function placeMark(checkedTiles, cell, currentClass){
    if (checkedTiles.length !== 0) {
        checkedTiles.forEach(tile => {
            document.getElementById(tile.id).removeEventListener('click', handleClick)
        })
    }
    cell.classList.add(currentClass)


}

function getCookie(cname) {
    var name = cname + "="
    var decodedCookie = decodeURIComponent(document.cookie)
    var ca = decodedCookie.split(';')
    for(var i = 0; i <ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
        c = c.substring(1)
        }
        if (c.indexOf(name) == 0) {
        return c.substring(name.length, c.length)
        }
    }
    return ""
}

function appendMessage(origin, message){
    const messageElement = document.createElement('div')
    messageElement.classList.add('chatMessage')
    messageElement.innerText = message

    const messageTimeStamp = document.createElement('div')
    messageTimeStamp.innerText = getCurrentTime()

    messageContainer.append(messageElement)

    //Append a class for the message type, self message, player message, game message
    if (origin === "game") {
        messageElement.classList.add('gameMessage')
    } else if (origin === "other") {
        messageElement.classList.add('otherMessage')
    } else if (origin === "self") {
        messageElement.classList.add('selfMessage')
    }

    chatAutoScrollNewMessage()
}

function getCurrentTime() {
    let currentTime = new Date()
    let hours = convert12to24(currentTime.getHours())
    let minutes = convert2digits(currentTime.getMinutes())
    let seconds = convert2digits(currentTime.getSeconds())

    return `${hours.hour}:${minutes}:${seconds}${hours.ampm}`
}

function convert12to24(hours) {
    if (hours == 0) return { hour: '12', ampm: 'am' }
    if (hours >= 1 && hours <= 12 ) return { hour: hours.toString(), ampm: 'am' }
    return { hour:(hours - 12).toString(), ampm: 'pm' }
}

function convert2digits(minutes) {
    return (minutes < 10) ? `${0}${minutes}` : minutes.toString()
}

function createGameCard(gameName) {
    //Add a new game to the list on the homepage
    const gameElement = document.createElement('div')
    gameElement.classList.add('game-card')

    const gameTitle = document.createElement('h4')
    gameTitle.innerText = gameName

    const gameLink = document.createElement('a')
    gameLink.href = `/${gameName}`
    gameLink.innerText = 'join'

    gameElement.append(gameTitle)
    gameElement.append(gameLink)
    return gameElement
}

function chatAutoScrollNewMessage() {
    let hiddenChatArea = messageContainer.scrollHeight - messageContainer.clientHeight

    if(messageContainer.scrollHeight > messageContainer.clientHeight) {
        messageContainer.scrollTop = hiddenChatArea
    }
}

function gameEndMessage(shape = "", win = false) {
    if(userShape === 'spec') {
        return restartButton.style.display = 'none'
    }

    restartButton.removeEventListener('click', requestRematch)
    restartButton.addEventListener('click', requestRematch)

    winningMessageElement.classList.add('show')
    turnMessage.classList.add('hide')
    board.classList.add('hide')

    if(win) { 
        return `${shape}'s Win!`
    }

    return 'Its a Draw!'
}

function fillCheckedTiles(tiles) {
    tiles.forEach( tile => {
        if (tile.checked) {
            let checkedTile = document.getElementById(tile.id)
            checkedTile.classList.add(tile.shape)
        }
    })                                                              
}

function setShapeColour(){
    let css
    if (userShape === 'circle' || userShape == 'spec') {
        css = `                
            .cell.x::before,
            .cell.x::after {
                background-color: rgb(156, 31, 31);
            }
        
            .cell.circle::before{
                background-color: #187bcd;
                float: right;
            }
        `,
        head = document.head || document.getElementsByTagName('head')[0],
        style = document.createElement('style')
 
    }else if (userShape === 'x') {
        css = `                
            .cell.x::before,
            .cell.x::after {
                background-color: #187bcd;
            }
            
            .cell.circle::before{
                background-color: rgb(156, 31, 31);
                float: left;
            }
        `,
        head = document.head || document.getElementsByTagName('head')[0],
        style = document.createElement('style')
    }
    
    head.appendChild(style)
    style.type = 'text/css'
    style.appendChild(document.createTextNode(css))
}

function sendChatMessage(e) {
    const message = messageInput.value
    e.preventDefault()

    appendMessage('self', `You: ${message}`)
    messageInput.value = ''

    socket.emit('send-chat-message', {
        gameName: gameName,
        message: message
    })
}

function createUserNameCookie() {
    userName = userNameInput.value

    document.cookie = `name=${userName}`
    promptUserNameContainer.classList.remove('show')
}