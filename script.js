// Import Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth, GithubAuthProvider, GoogleAuthProvider, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getDatabase, ref, push, onChildAdded, query, orderByChild, set, get, equalTo } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";

const header = document.querySelector('.header')
fetch('./header.html')
.then(res=>res.text())
.then(data=>{
    header.innerHTML=data
    const parser = new DOMParser()
    const doc = parser.parseFromString(data, 'text/html')
    eval(doc.querySelector('script').textContent)
})
const footer = document.querySelector('.footer')
fetch('./footer.html')
.then(res=>res.text())
.then(data=>{
    footer.innerHTML=data
    const parser = new DOMParser()
    const doc = parser.parseFromString(data, 'text/html')
    eval(doc.querySelector('script').textContent)
})
const chat = document.querySelector('.chat')
fetch('./chat.html')
.then(res=>res.text())
.then(data=>{
    chat.innerHTML=data
    const parser = new DOMParser()
    const doc = parser.parseFromString(data, 'text/html')
    eval(doc.querySelector('script').textContent)
})
const login = document.querySelector('.login')
fetch('./login.html')
.then(res=>res.text())
.then(data=>{
    login.innerHTML=data
    const parser = new DOMParser()
    const doc = parser.parseFromString(data, 'text/html')
    eval(doc.querySelector('script').textContent)
})
const user = document.querySelector('.user')
fetch('./user.html')
.then(res=>res.text())
.then(data=>{
    user.innerHTML=data
    const parser = new DOMParser()
    const doc = parser.parseFromString(data, 'text/html')
    eval(doc.querySelector('script').textContent)
})

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDzku7AoSdbF7GzZTJEtVj5beyl1MnrTAk",
    authDomain: "minecraft-generators.firebaseapp.com",
    databaseURL: "https://minecraft-generators-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "minecraft-generators",
    storageBucket: "minecraft-generators.appspot.com",
    messagingSenderId: "191346462383",
    appId: "1:191346462383:web:6c8759e5ee2f676594ce5a",
    measurementId: "G-QJT1XPTPDZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// Global variables
let currentUser = null;
let username = null;
let messagesRef = null;
const developerUsername = "nos";
let currentLanguage = 'en';
let isSettingUsername = false;
let hasSetUsername = false;
let unreadMessages = 0;
let isChatOpen = false;

// DOM elements
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const messagesList = document.getElementById('chat-messages');
const chatContainer = document.getElementById('chat-container');
const chatButton = document.querySelector('.chat-button');
const loginButton = document.getElementById('login-btn');
const loginModal = document.getElementById('login-modal');
const closeLoginModal = document.getElementById('close-login-modal');
const googleLoginBtn = document.getElementById('login-google');
const githubLoginBtn = document.getElementById('login-github');
const themeSwitcher = document.getElementById('theme-switcher');
const body = document.body;
const languageSwitcher = document.getElementById('language-switcher');
const usernameModal = document.getElementById('username-modal');
const usernameInput = document.getElementById('username-input');
const setUsernameBtn = document.getElementById('setUsernameBtn');
const closeUsernameModal = document.getElementById('close-username-modal');

// Auth Providers
const githubProvider = new GithubAuthProvider();
const googleProvider = new GoogleAuthProvider();

// Event Listeners
chatButton.addEventListener('click', toggleChat);
loginButton.addEventListener('click', handleLoginButtonClick);
closeLoginModal.addEventListener('click', () => loginModal.style.display = 'none');
googleLoginBtn.addEventListener('click', () => signInWithProvider(googleProvider));
githubLoginBtn.addEventListener('click', () => signInWithProvider(githubProvider));
sendButton.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', handleMessageInputKeypress);
themeSwitcher.addEventListener('click', toggleTheme);
languageSwitcher.addEventListener('click', toggleLanguage);
setUsernameBtn.addEventListener('click', handleSetUsername);
closeUsernameModal.addEventListener('click', () => {
    usernameModal.style.display = 'none';
    signOut(auth);
});

// Dropdown Menu Redirection
document.querySelectorAll('.dropdown-content a').forEach(link => {
    link.addEventListener('click', handleGeneratorRedirect);
});

// Initialize the page
window.addEventListener('DOMContentLoaded', initializePage);

// Firebase Auth State Change
auth.onAuthStateChanged(handleAuthStateChange);

// Functions
function toggleChat() {
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
            currentUser = null;
            username = null;
            hasSetUsername = false;
            removeMessagesListener();
        }).catch(error => {
            console.error("Error signing out:", error);
        });
    } else {
        loginModal.style.display = 'flex';
    }
}

function signInWithProvider(provider) {
    signInWithPopup(auth, provider).then(result => {
        currentUser = result.user;
        loginModal.style.display = 'none';
        checkUsername();
    }).catch(error => {
        console.error(`Error during ${provider.providerId} login:`, error);
    });
}

function handleAuthStateChange(user) {
    if (user) {
        currentUser = user;
        loginButton.innerHTML = `<i class="fas fa-sign-out-alt"></i>`;
        loginButton.setAttribute('aria-label', 'Logout');
        if (!hasSetUsername) {
            checkUsername();
        }
    } else {
        loginButton.innerHTML = `<i class="fas fa-user"></i>`;
        loginButton.setAttribute('aria-label', 'Login');
        currentUser = null;
        username = null;
        hasSetUsername = false;
        removeMessagesListener();
    }
}

function checkUsername() {
    if (isSettingUsername || hasSetUsername) return;
    
    isSettingUsername = true;
    const userRef = ref(database, `users/${currentUser.uid}`);
    get(userRef).then(snapshot => {
        if (snapshot.exists()) {
            username = snapshot.val().username;
            hasSetUsername = true;
            loadMessages();
        } else {
            showUsernameModal();
        }
    }).catch(error => {
        console.error("Error checking username:", error);
        showUsernameModal();
    }).finally(() => {
        isSettingUsername = false;
    });
}

function showUsernameModal() {
    usernameModal.style.display = 'flex';
    usernameInput.focus();
}

function handleSetUsername() {
    const newUsername = usernameInput.value.trim();
    if (newUsername) {
        saveUsername(newUsername);
    } else {
        showUsernameError(translations.usernameEmpty[currentLanguage]);
    }
}

function saveUsername(newUsername) {
    const usernamesRef = ref(database, 'users');
    const usernameQuery = query(usernamesRef, orderByChild('username'), equalTo(newUsername));

    get(usernameQuery).then(snapshot => {
        if (snapshot.exists()) {
            showUsernameError(translations.usernameExists[currentLanguage]);
            usernameInput.value = '';
            usernameInput.focus();
        } else {
            set(ref(database, `users/${currentUser.uid}`), {
                username: newUsername
            }).then(() => {
                username = newUsername;
                hasSetUsername = true;
                usernameModal.style.display = 'none';
                loadMessages();
            }).catch(error => {
                console.error("Error saving username:", error);
                showUsernameError(translations.errorSavingUsername[currentLanguage]);
            });
        }
    }).catch(error => {
        console.error("Error checking username uniqueness:", error);
        showUsernameError(translations.errorCheckingUsername[currentLanguage]);
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
    // If the chat is open and the user is at the bottom, scroll to the new message
    if (isChatOpen && isScrolledToBottom()) {
        scrollChatToBottom();
    }
}

function isScrolledToBottom() {
    return messagesList.scrollHeight - messagesList.clientHeight <= messagesList.scrollTop + 1;
}

function removeMessagesListener() {
    if (messagesRef) {
        messagesRef = null;
    }
    messagesList.innerHTML = '';
}

function convertToLocalTime(isoTimestamp) {
    const date = new Date(isoTimestamp);
    return date.toLocaleString();
}

function displayMessage(message) {
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

function toggleTheme() {
    if (body.getAttribute('data-theme') === 'light') {
        body.setAttribute('data-theme', 'dark');
    } else {body.setAttribute('data-theme', 'light');
    }
    savePreferences();
}

function toggleLanguage() {
    currentLanguage = currentLanguage === 'en' ? 'zh' : 'en';
    translatePage();
    savePreferences();
}

function savePreferences() {
    localStorage.setItem('theme', body.getAttribute('data-theme'));
    localStorage.setItem('language', currentLanguage);
}

function loadPreferences() {
    const savedTheme = localStorage.getItem('theme');
    const savedLanguage = localStorage.getItem('language');

    if (savedTheme) {
        body.setAttribute('data-theme', savedTheme);
    }
    if (savedLanguage) {
        currentLanguage = savedLanguage;
        translatePage();
    }
}

function translatePage() {
    Object.keys(translations).forEach(key => {
        const element = document.getElementById(key);
        if (element) {
            element.textContent = translations[key][currentLanguage];
        }
    });
    document.getElementById('message-input').placeholder = translations.typeAMessage[currentLanguage];
    document.getElementById('username-input').placeholder = translations.enterUsername[currentLanguage];
}

function handleGeneratorRedirect(e) {
    e.preventDefault();
    const generator = e.target.closest('[data-generator]').getAttribute('data-generator');
    if (generator) {
        let targetUrl;
        switch (generator) {
            case 'text':
                targetUrl = 'https://nosmc.github.io/generator/text';
                break;
            case 'item':
                targetUrl = 'https://nosmc.github.io/generator/item';
                break;
            case 'entity':
                targetUrl = 'https://nosmc.github.io/generator/entity';
                break;
            default:
                console.error('Unknown generator type:', generator);
                return;
        }

        function linkExists(url, callback) {
            fetch(url, { method: 'HEAD' })
                .then(response => callback(response.ok))
                .catch(() => callback(false));
        }

        linkExists(targetUrl, function(exists) {
            if (exists) {
                window.location.href = targetUrl;
            } else {
                window.location.href = 'https://nosmc.github.io/';
            }
        });
    }
}

function initializePage() {
    loadPreferences();
    translatePage();
}

function showUnreadIndicator() {
    unreadMessages++;
    document.querySelector('.chat-button .unread-dot').style.display = 'block';
}

function clearUnreadIndicator() {
    unreadMessages = 0;
    document.querySelector('.chat-button .unread-dot').style.display = 'none';
}

window.addEventListener('focus', () => {
    if (isChatOpen) {
        clearUnreadIndicator();
    }
});

function scrollChatToBottom() {
    messagesList.scrollTop = messagesList.scrollHeight;
}

const translations = {
    headerTitle: {
        en: "Minecraft Datapack Generator",
        zh: "Minecraft 資料包生成器"
    },
    home: {
        en: "Home",
        zh: "主頁"
    },
    generators: {
        en: "Generators",
        zh: "生成器"
    },
    generatorText: {
        en: "Text",
        zh: "文字"
    },
    generatorItem: {
        en: "Item",
        zh: "物品"
    },
    generatorEntity: {
        en: "Entity",
        zh: "實體"
    },
    chatTitle: {
        en: "Chat",
        zh: "聊天"
    },
    sendButtonText: {
        en: "Send",
        zh: "發送"
    },
    typeAMessage: {
        en: "Type a message...",
        zh: "輸入消息..."
    },
    chooseLoginMethod: {
        en: "Choose a Login Method",
        zh: "選擇登錄方式"
    },
    loginWithGoogle: {
        en: "Login with Google",
        zh: "使用 Google 登錄"
    },
    loginWithGithub: {
        en: "Login with GitHub",
        zh: "使用 GitHub 登錄"
    },
    cancelLogin: {
        en: "Cancel",
        zh: "取"
    },
    youtube: {
        en: "YouTube",
        zh: "YouTube"
    },
    instagram: {
        en: "Instagram",
        zh: "Instagram"
    },
    discord: {
        en: "Discord",
        zh: "Discord"
    },
    developedBy: {
        en: "Developed by nos",
        zh: "由 nos 開發"
    },
    donate: {
        en: "Donate",
        zh: "捐贈"
    },
    setUsernameTitle: {
        en: "Set Your Username",
        zh: "設置您的用戶名"
    },
    enterUsername: {
        en: "Enter your username",
        zh: "輸入您的用戶名"
    },
    setUsernameBtn: {
        en: "Set Username",
        zh: "設置用戶名"
    },
    cancelSetUsername: {
        en: "Cancel",
        zh: "取消"
    },
    usernameEmpty: {
        en: "Username cannot be empty",
        zh: "用戶名不能為空"
    },
    usernameExists: {
        en: "Username already exists. Please choose another one.",
        zh: "用戶名已存在。請選擇另一個。"
    },
    errorSavingUsername: {
        en: "Error saving username. Please try again.",
        zh: "保存用戶名時出錯。請重試。"
    },
    errorCheckingUsername: {
        en: "Error checking username. Please try again.",
        zh: "檢查用戶名時出錯。請重試。"
    }
};

// Initialize the page
initializePage();