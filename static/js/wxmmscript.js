// JS层面控制是否打开微信的开关
// true: 复制后自动打开微信
// false: 只复制，不打开微信
let autoOpenWechat = false;

// 你可以通过这个函数动态修改开关状态
function setAutoOpenWechat(enable) {
    autoOpenWechat = enable;
    console.log(`自动打开微信功能已${enable ? '开启' : '关闭'}`);
}

function copyAndHandleWechat() {
    // 获取要复制的微信号
    const wechatId = document.getElementById('wechat_id').textContent;
    
    // 使用Clipboard API复制
    navigator.clipboard.writeText(wechatId)
        .then(() => {
            showNotification('微信号已复制到剪贴板', 'success');
            // 根据JS开关状态决定是否打开微信
            if (autoOpenWechat) {
                attemptOpenWechat();
            }
        })
        .catch(err => {
            // 备用复制方法
            const copySuccess = fallbackCopyText(wechatId);
            if (copySuccess) {
                showNotification('微信号已复制到剪贴板', 'success');
                // 根据JS开关状态决定是否打开微信
                if (autoOpenWechat) {
                    attemptOpenWechat();
                }
            } else {
                showNotification('复制失败，请手动复制微信号', 'error');
            }
        });
}

function attemptOpenWechat() {
    // 尝试打开微信
    const wechatWindow = window.open('weixin://', '_blank');
    
    // 检查链接是否打开成功
    setTimeout(() => {
        if (wechatWindow && !wechatWindow.closed) {
            wechatWindow.close(); // 关闭空白窗口
            showNotification('无法自动打开微信，请手动打开微信并粘贴微信号添加', 'guide');
        } else if (!wechatWindow) {
            // 浏览器阻止了弹出窗口
            showNotification('弹出窗口被阻止，请允许弹出窗口后重试', 'error');
        }
    }, 500);
}

// 备用复制方法
function fallbackCopyText(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
        const successful = document.execCommand('copy');
        document.body.removeChild(textarea);
        return successful;
    } catch (err) {
        document.body.removeChild(textarea);
        return false;
    }
}

// 显示通知
function showNotification(message, type) {
    // 移除已存在的通知
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // 3秒后隐藏通知
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}
    