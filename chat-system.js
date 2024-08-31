import { auth, database, currentUser, username, hasSetUsername, githubProvider, googleProvider, checkUsername } from './main.js';
import { getAuth, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { ref, push, onChildAdded, query, orderByChild, set, get, equalTo } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";

let messagesRef = null;
let isChatOpen = false;
let unreadMessages = 0;
const developerUsername = "nos";

document.addEventListener('DOMContentLoaded', () => {
    const chatButton = document.querySelector('.chat-button');
    const sendButton = document.getElementById('send-button');
    const messageInput = document.getElementById('message-input');
    const loginModal = document.getElementById('login-modal');
    const closeLoginModal = document.getElementById('close-login-modal');
    const googleLoginBtn = document.getElementById('login-google');
    const githubLoginBtn = document.getElementById('login-github');
    const usernameModal = document.getElementById('username-modal');
    const setUsernameBtn = document.getElementById('setUsernameBtn');
    const closeUsernameModal = document.getElementById('close-username-modal');

    if (chatButton) chatButton.addEventListener('click', toggleChat);
    if (sendButton) sendButton.addEventListener('click', sendMessage);
    if (messageInput) messageInput.addEventListener('keypress', handleMessageInputKeypress);
    if (closeLoginModal) closeLoginModal.addEventListener('click', () => loginModal.style.display = 'none');
    if (googleLoginBtn) googleLoginBtn.addEventListener('click', () => signInWithProvider(googleProvider));
    if (githubLoginBtn) githubLoginBtn.addEventListener('click', () => signInWithProvider(githubProvider));
    if (setUsernameBtn) setUsernameBtn.addEventListener('click', handleSetUsername);
    if (closeUsernameModal) closeUsernameModal.addEventListener('click', () => {
        usernameModal.style.display = 'none';
        signOut(auth);
    });

    // Listen for login button clicks from the header
    document.addEventListener('loginButtonClicked', handleLoginButtonClick);
    // Listen for removeMessagesListener event from main.js
    document.addEventListener('removeMessagesListener', removeMessagesListener);
});

function toggleChat() {
    const chatContainer = document.getElementById('chat-container');
    isChatOpen = !isChatOpen;
    chatContainer.style.display = isChatOpen ? 'flex' : 'none';
    if (isChatOpen) {
        scrollChatToBottom();
        clearUnreadIndicator();
    }
}

function handleLoginButtonClick() {
    if (currentUser) {
        signOut(auth).then(() => {
            removeMessagesListener();
        }).catch(error => {
            console.error("Error signing out:", error);
        });
    } else {
        document.getElementById('login-modal').style.display = 'flex';
    }
}

function signInWithProvider(provider) {
    signInWithPopup(auth, provider).then(result => {
        document.getElementById('login-modal').style.display = 'none';
        checkUsername();
    }).catch(error => {
        console.error(`Error during ${provider.providerId} login:`, error);
    });
}

function handleSetUsername() {
    const newUsername = document.getElementById('username-input').value.trim();
    if (newUsername) {
        saveUsername(newUsername);
    } else {
        showUsernameError('Username cannot be empty');
    }
}

function saveUsername(newUsername) {
    const usernamesRef = ref(database, 'users');
    const usernameQuery = query(usernamesRef, orderByChild('username'), equalTo(newUsername));

    get(usernameQuery).then(snapshot => {
        if (snapshot.exists()) {
            showUsernameError('Username already exists. Please choose another one.');
            document.getElementById('username-input').value = '';
            document.getElementById('username-input').focus();
        } else {
            set(ref(database, `users/${currentUser.uid}`), {
                username: newUsername
            }).then(() => {
                username = newUsername;
                hasSetUsername = true;
                document.getElementById('username-modal').style.display = 'none';
                loadMessages();
            }).catch(error => {
                console.error("Error saving username:", error);
                showUsernameError('Error saving username. Please try again.');
            });
        }
    }).catch(error => {
        console.error("Error checking username uniqueness:", error);
        showUsernameError('Error checking username. Please try again.');
    });
}

function showUsernameError(message) {
    const errorElement = document.getElementById('username-error');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

function loadMessages() {
    if (messagesRef) {
        return;
    }
    messagesRef = query(ref(database, 'messages'), orderByChild('timestamp'));
    
    const loadTimestamp = new Date().getTime();
    
    onChildAdded(messagesRef, (snapshot) => {
        const message = snapshot.val();
        displayMessage(message);
        
        if (new Date(message.timestamp).getTime() > loadTimestamp) {
            handleNewMessage(message);
        }
    });
}

function handleNewMessage(message) {
    if (!isChatOpen) {
        showUnreadIndicator();
    }
    if (isChatOpen && isScrolledToBottom()) {
        scrollChatToBottom();
    }
}

function isScrolledToBottom() {
    const messagesList = document.getElementById('chat-messages');
    return messagesList.scrollHeight - messagesList.clientHeight <= messagesList.scrollTop + 1;
}

function removeMessagesListener() {
    if (messagesRef) {
        messagesRef = null;
    }
    const messagesList = document.getElementById('chat-messages');
    if (messagesList) {
        messagesList.innerHTML = '';
    }
}

function convertToLocalTime(isoTimestamp) {
    const date = new Date(isoTimestamp);
    return date.toLocaleString();
}

function displayMessage(message) {
    const messagesList = document.getElementById('chat-messages');
    const li = document.createElement('li');
    li.className = message.sender === username ? 'sent' : 'received';

    if (message.sender === developerUsername) {
        li.classList.add('developer');
    }

    const messageHeader = document.createElement('div');
    messageHeader.className = 'message-header';

    const img = document.createElement('img');
    img.src = message.avatar || 'default-avatar.png';
    img.alt = message.sender;

    const usernameSpan = document.createElement('span');
    usernameSpan.className = 'username';
    usernameSpan.textContent = message.sender;

    messageHeader.appendChild(img);
    messageHeader.appendChild(usernameSpan);

    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    messageContent.textContent = message.content;

    const messageTime = document.createElement('div');
    messageTime.className = 'message-time';
    messageTime.textContent = convertToLocalTime(message.timestamp);

    li.appendChild(messageHeader);
    li.appendChild(messageContent);
    li.appendChild(messageTime);

    messagesList.appendChild(li);
    scrollChatToBottom();
}

function sendMessage() {
    const messageInput = document.getElementById('message-input');
    if (username && messageInput.value.trim()) {
        const timestamp = new Date().toISOString();

        push(ref(database, 'messages'), {
            sender: username,
            avatar: currentUser?.photoURL || "default-avatar.png",
            content: messageInput.value,
            timestamp: timestamp
        }).then(() => {
            messageInput.value = '';
            messageInput.focus();
            scrollChatToBottom();
        }).catch(error => {
            console.error("Error sending message:", error);
        });
    }
}

function handleMessageInputKeypress(e) {
    if (e.key === 'Enter') {
        sendMessage();
        e.preventDefault();
    }
}

function showUnreadIndicator() {
    unreadMessages++;
    const unreadDot = document.querySelector('.chat-button .unread-dot');
    if (unreadDot) {
        unreadDot.style.display = 'block';
    }
}

function clearUnreadIndicator() {
    unreadMessages = 0;
    const unreadDot = document.querySelector('.chat-button .unread-dot');
    if (unreadDot) {
        unreadDot.style.display = 'none';
    }
}

function scrollChatToBottom() {
    const messagesList = document.getElementById('chat-messages');
    messagesList.scrollTop = messagesList.scrollHeight;
}

window.addEventListener('focus', () => {
    if (isChatOpen) {
        clearUnreadIndicator();
    }
});