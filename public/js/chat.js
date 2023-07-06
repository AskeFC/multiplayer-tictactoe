const messageContainer = document.getElementById('message-container');
const roomContainer = document.getElementById('room-container');
const messageForm = document.getElementById('send-container');
const messageInput = document.getElementById('message-input');

const appendMessage = (message) => {
    const messageElement = document.createElement('div');
    messageElement.innerText = message;
    messageContainer.append(messageElement);
};

if (messageForm != null) {
    messageForm.addEventListener('submit', e => {
        e.preventDefault();
        const message = messageInput.value;
        appendMessage(`You: ${message}`);
        socket.emit('send-chat-message', { gameName: gameName, message: message });
        messageInput.value = '';
    });
};

socket.on('room-created', room => {
    const roomElement = document.createElement('div');
    roomElement.innerText = room;
    const roomLink = document.createElement('a');
    roomLink.href = `/${room}`;
    roomLink.innerText = 'join';
    roomContainer.append(roomElement);
    roomContainer.append(roomLink);
});

socket.on('chat-message', data => {
    appendMessage(`${data.fromUser}: ${data.message}`);
});

// Dark Mode Toggle
document.querySelector('.theme-toggle-button').addEventListener('click', () => {
    document.body.classList.toggle('dark');
});