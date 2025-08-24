(function() {
    // 配置参数
    const DEFAULT_CONFIG = {
        apiUrl: 'https://autr.1c.q56.dpdns.org/6/a-server.php',
        buttonColor: '#165dff',
        buttonText: '💬',
        position: 'bottom-right',
        width: '350px',
        height: '450px',
        autoOpen: false,
        onOpen: () => {},
        onClose: () => {},
        onMessage: (message) => {}
    };

    window.BChatWidget = {
        init: function(config) {
            return new ChatWidget(config);
        }
    };

    class ChatWidget {
        constructor(config) {
            this.config = { ...DEFAULT_CONFIG, ...config, autoOpen: false };
            this.clientId = localStorage.getItem('b_chat_client_id') || 'client_' + Math.random().toString(36).substr(2, 8);
            this.isOpen = false;
            this.lastPollTime = 0;
            this.pollingTimer = null;
            
            localStorage.setItem('b_chat_client_id', this.clientId);
            this.createStyles();
            this.createButton();
            this.createWindow();
            this.bindEvents();
        }
        
        createStyles() {
            const style = document.createElement('style');
            style.textContent = `
                .b-chat-button {
                    position: fixed;
                    z-index: 9999;
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                    transition: all 0.3s ease;
                }
                
                .b-chat-window {
                    position: fixed;
                    z-index: 9998;
                    border-radius: 8px;
                    box-shadow: 0 5px 20px rgba(0,0,0,0.15);
                    display: none;
                    flex-direction: column;
                    background-color: white;
                    opacity: 0;
                    transform: translateY(20px);
                    transition: all 0.3s ease;
                }
                
                .b-chat-window.active {
                    display: flex;
                    opacity: 1;
                    transform: translateY(0);
                }
                
                .chat-title {
                    padding: 15px;
                    border-radius: 8px 8px 0 0;
                }
                
                .close-chat {
                    float: right;
                    cursor: pointer;
                }
                
                .chat-messages {
                    flex: 1;
                    overflow-y: auto;
                    padding: 15px;
                }
                
                .chat-input {
                    display: flex;
                    border-top: 1px solid #ddd;
                }
                
                .user-input {
                    flex: 1;
                    padding: 10px;
                    border: none;
                    outline: none;
                    transition: all 0.2s ease;
                }
                
                .send-btn {
                    padding: 0 15px;
                    border: none;
                    cursor: pointer;
                    background: ${this.config.buttonColor};
                    color: white;
                    transition: all 0.2s ease;
                    position: relative;
                    overflow: hidden;
                }
                
                .send-btn:active {
                    transform: scale(0.95);
                }
                
                .message {
                    margin-bottom: 15px;
                    max-width: 70%;
                    clear: both;
                }
                
                .user {
                    float: right;
                    margin-left: auto;
                }
                
                .agent {
                    float: left;
                    margin-right: auto;
                }
                
                .message-sender {
                    font-size: 12px;
                    margin-bottom: 3px;
                }
                
                .message-content {
                    padding: 8px 12px;
                    border-radius: 8px;
                    position: relative;
                    word-wrap: break-word;
                }
                
                .message-time {
                    font-size: 10px;
                    margin-top: 5px;
                }
                
                .user .message-content {
                    background: ${this.config.buttonColor};
                    color: white;
                    border-top-right-radius: 0;
                }
                
                .agent .message-content {
                    background: #f1f1f1;
                    border-top-left-radius: 0;
                }
                
                .system .message-content {
                    background: #ffebee;
                    color: #b71c1c;
                }
                
                .user .message-content::after {
                    content: '';
                    position: absolute;
                    right: -8px;
                    top: 0;
                    border-top: 8px solid #165dff;
                    border-right: 8px solid transparent;
                }
                
                .agent .message-content::after {
                    content: '';
                    position: absolute;
                    left: -8px;
                    top: 0;
                    border-top: 8px solid #f1f1f1;
                    border-left: 8px solid transparent;
                }
                
                .user .message-time {
                    text-align: right;
                }
                
                .agent .message-time, .system .message-time {
                    text-align: left;
                }
                
                .chat-messages::-webkit-scrollbar {
                    width: 6px;
                }
                
                .chat-messages::-webkit-scrollbar-track {
                    background: #f1f1f1;
                }
                
                .chat-messages::-webkit-scrollbar-thumb {
                    background: #c1c1c1;
                    border-radius: 3px;
                }
                
                .chat-messages::-webkit-scrollbar-thumb:hover {
                    background: #a1a1a1;
                }
            `;
            document.head.appendChild(style);
        }
        
        createButton() {
            this.chatButton = document.createElement('div');
            this.chatButton.className = 'b-chat-button';
            
            Object.assign(this.chatButton.style, {
                backgroundColor: this.config.buttonColor,
                color: 'white',
                fontSize: '24px'
            });
            
            switch(this.config.position) {
                case 'bottom-right':
                    this.chatButton.style.bottom = '30px';
                    this.chatButton.style.right = '30px';
                    break;
                case 'bottom-left':
                    this.chatButton.style.bottom = '30px';
                    this.chatButton.style.left = '30px';
                    break;
                case 'top-right':
                    this.chatButton.style.top = '30px';
                    this.chatButton.style.right = '30px';
                    break;
                case 'top-left':
                    this.chatButton.style.top = '30px';
                    this.chatButton.style.left = '30px';
                    break;
            }
            
            this.chatButton.textContent = this.config.buttonText;
            document.body.appendChild(this.chatButton);
        }
        
        createWindow() {
            this.chatWindow = document.createElement('div');
            this.chatWindow.className = 'b-chat-window';
            
            Object.assign(this.chatWindow.style, {
                width: this.config.width,
                height: this.config.height
            });
            
            switch(this.config.position) {
                case 'bottom-right':
                    this.chatWindow.style.bottom = '100px';
                    this.chatWindow.style.right = '30px';
                    break;
                case 'bottom-left':
                    this.chatWindow.style.bottom = '100px';
                    this.chatWindow.style.left = '30px';
                    break;
                case 'top-right':
                    this.chatWindow.style.top = '100px';
                    this.chatWindow.style.right = '30px';
                    break;
                case 'top-left':
                    this.chatWindow.style.top = '100px';
                    this.chatWindow.style.left = '30px';
                    break;
            }
            
            this.chatWindow.innerHTML = `
                <div class="chat-title" style="background: ${this.config.buttonColor}; color: white;">
                    <span>在线客服</span>
                    <span class="close-chat">×</span>
                </div>
                <div class="chat-messages">
                    <div class="system-message" style="text-align: center; color: #666; font-size: 12px; margin-bottom: 10px;">
                        您好！请问有什么可以帮助您的？
                    </div>
                </div>
                <div class="chat-input">
                    <input type="text" class="user-input" placeholder="输入消息...">
                    <button class="send-btn">发送</button>
                </div>
            `;
            
            document.body.appendChild(this.chatWindow);
        }
        
        bindEvents() {
            this.chatButton.addEventListener('click', () => {
                this.isOpen ? this.close() : this.open();
            });
            
            this.chatWindow.querySelector('.close-chat').addEventListener('click', () => {
                this.close();
            });
            
            // 优化发送按钮点击事件
            const sendBtn = this.chatWindow.querySelector('.send-btn');
            sendBtn.addEventListener('click', () => {
                // 立即显示发送状态
                sendBtn.disabled = true;
                sendBtn.textContent = '发送中...';
                
                this.sendMessage().finally(() => {
                    // 恢复按钮状态
                    sendBtn.disabled = false;
                    sendBtn.textContent = '发送';
                });
            });
            
            // 优化输入框回车发送
            const userInput = this.chatWindow.querySelector('.user-input');
            userInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    sendBtn.click(); // 复用按钮点击逻辑
                }
            });
            
            // 优化输入框高度调整
            userInput.addEventListener('input', function() {
                this.style.height = 'auto';
                this.style.height = Math.min(this.scrollHeight, 120) + 'px';
            });
        }
        
        open() {
            this.chatWindow.classList.add('active');
            this.chatButton.style.transform = 'rotate(45deg)';
            this.isOpen = true;
            this.loadHistory();
            this.startPolling();
            this.config.onOpen();
        }
        
        close() {
            this.chatWindow.classList.remove('active');
            this.chatButton.style.transform = 'rotate(0)';
            this.isOpen = false;
            this.stopPolling();
            this.config.onClose();
        }
        
        async sendMessage() {
            const input = this.chatWindow.querySelector('.user-input');
            const content = input.value.trim();
            if (!content) return;
            
            // 立即清空输入框并显示消息
            input.value = '';
            input.style.height = 'auto';
            const messageTime = this.formatDateTime(new Date());
            this.addMessage('user', content, messageTime);
            
            try {
                // 发送请求到服务器
                const data = await this.apiRequest('user_send', { content });
                
                if (!data.success) {
                    // 发送失败，恢复输入框内容
                    input.value = content;
                    this.addMessage('system', '消息发送失败，请重试', messageTime);
                }
            } catch (err) {
                // 网络错误，恢复输入框内容
                input.value = content;
                this.addMessage('system', '网络错误，请检查连接', messageTime);
                console.error('发送请求失败:', err);
            }
        }
        
        apiRequest(action, data = {}) {
            const requestData = {
                action,
                client_id: this.clientId,
                ...data
            };
            
            return fetch(this.config.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            })
            .then(res => {
                if (!res.ok) throw new Error(`HTTP错误: ${res.status}`);
                return res.json();
            });
        }
        
        addMessage(sender, content, time) {
            const messagesDiv = this.chatWindow.querySelector('.chat-messages');
            const msgDiv = document.createElement('div');
            let messageClass = 'message';
            if (sender === 'user') messageClass += ' user';
            else if (sender === 'agent') messageClass += ' agent';
            else messageClass += ' system';
            
            msgDiv.className = messageClass;
            msgDiv.innerHTML = `
                <div class="message-sender">${sender === 'user' ? '我' : sender === 'agent' ? '客服' : '系统'}</div>
                <div class="message-content">${content}</div>
                <div class="message-time">${time}</div>
            `;
            
            // 使用requestAnimationFrame优化DOM操作
            requestAnimationFrame(() => {
                messagesDiv.appendChild(msgDiv);
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            });
        }
        
        loadHistory() {
            this.apiRequest('messages')
                .then(data => {
                    if (!data.success || !data.messages || !data.messages.length) return;
                    
                    const messagesDiv = this.chatWindow.querySelector('.chat-messages');
                    
                    // 使用DocumentFragment减少DOM重绘
                    const fragment = document.createDocumentFragment();
                    
                    data.messages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
                    data.messages.forEach(msg => {
                        const sender = msg.sender === 'agent' ? 'agent' : 'user';
                        const timestamp = msg.timestamp ? new Date(msg.timestamp * 1000) : new Date();
                        
                        const msgDiv = document.createElement('div');
                        let messageClass = 'message';
                        if (sender === 'user') messageClass += ' user';
                        else if (sender === 'agent') messageClass += ' agent';
                        
                        msgDiv.className = messageClass;
                        msgDiv.innerHTML = `
                            <div class="message-sender">${sender === 'user' ? '我' : '客服'}</div>
                            <div class="message-content">${msg.content}</div>
                            <div class="message-time">${this.formatDateTime(timestamp)}</div>
                        `;
                        
                        fragment.appendChild(msgDiv);
                    });
                    
                    // 一次性添加到DOM
                    messagesDiv.innerHTML = '';
                    messagesDiv.appendChild(fragment);
                    
                    const lastMessage = data.messages[data.messages.length - 1];
                    this.lastPollTime = lastMessage.timestamp || Math.floor(Date.now() / 1000);
                })
                .catch(err => {
                    this.addMessage('system', '加载历史消息失败', this.formatDateTime(new Date()));
                });
        }
        
        formatDateTime(date) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day} ${hours}:${minutes}`;
        }
        
        startPolling() {
            this.stopPolling();
            this.pollingTimer = setInterval(() => {
                this.apiRequest('user_poll', { last_timestamp: this.lastPollTime })
                    .then(data => {
                        if (!data.success || !data.messages.length) return;
                        
                        this.lastPollTime = Math.floor(Date.now() / 1000);
                        
                        // 使用DocumentFragment优化多条消息添加
                        const fragment = document.createDocumentFragment();
                        
                        data.messages.forEach(msg => {
                            const timestamp = msg.timestamp ? new Date(msg.timestamp * 1000) : new Date();
                            
                            const msgDiv = document.createElement('div');
                            msgDiv.className = 'message agent';
                            msgDiv.innerHTML = `
                                <div class="message-sender">客服</div>
                                <div class="message-content">${msg.content}</div>
                                <div class="message-time">${this.formatDateTime(timestamp)}</div>
                            `;
                            
                            fragment.appendChild(msgDiv);
                        });
                        
                        // 一次性添加到DOM
                        const messagesDiv = this.chatWindow.querySelector('.chat-messages');
                        messagesDiv.appendChild(fragment);
                        messagesDiv.scrollTop = messagesDiv.scrollHeight;
                    });
            }, 3000);
        }
        
        stopPolling() {
            if (this.pollingTimer) clearInterval(this.pollingTimer);
        }
    }
    
    window.BChatWidget.init({});
})();