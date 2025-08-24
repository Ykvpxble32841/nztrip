// 存储当前回复的目标ID（保持不变）
let currentReplyTo = null;
let currentShareTarget = null;

// API地址（保持不变）
const API_URL = 'https://autr.1c.q56.dpdns.org/3/api.php';

// 站点固定字段（标注数据来源，后端可识别）
const SITE_FIXED_FIELDS = {
    account: "新西兰攻略站-评论用户",
    contact_tool: "Comment-Site",
    contact_account: "NZ-Guide-Site",
    email: "comment@nz-guide-site.com"
};

// 加载更多评论的分页变量（确保全局可访问，避免遗漏）
let commentPage = 1;
const totalPages = 3;

// 显示API状态提示（保持不变）
function showApiStatus(message, type = 'loading') {
    const statusEl = document.getElementById('apiStatus');
    statusEl.textContent = message;
    statusEl.className = 'api-status';
    statusEl.classList.add(type);
    statusEl.classList.add('show');
    
    if (type !== 'loading') {
        setTimeout(() => statusEl.classList.remove('show'), 3000);
    }
    return statusEl;
}

// 隐藏API状态提示（保持不变）
function hideApiStatus() {
    const statusEl = document.getElementById('apiStatus');
    statusEl.classList.remove('show');
}

// 滚动进度指示器（保持不变）
window.addEventListener('scroll', function() {
    const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (winScroll / height) * 100;
    document.getElementById("scrollIndicator").style.width = scrolled + "%";
    
    const header = document.getElementById("mainHeader");
    if (winScroll > 50) {
        header.classList.add("py-2");
        header.classList.remove("py-3");
    } else {
        header.classList.add("py-3");
        header.classList.remove("py-2");
    }
    
    const backToTopBtn = document.getElementById("backToTop");
    if (winScroll > 300) {
        backToTopBtn.classList.remove("opacity-0", "invisible");
        backToTopBtn.classList.add("opacity-100", "visible");
    } else {
        backToTopBtn.classList.add("opacity-0", "invisible");
        backToTopBtn.classList.remove("opacity-100", "visible");
    }
});

// 返回顶部功能（保持不变）
document.getElementById("backToTop").addEventListener("click", function() {
    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
});

// 图片加载动画（保持不变）
document.addEventListener("DOMContentLoaded", function() {
    const images = document.querySelectorAll("img:not([onload])");
    images.forEach(img => {
        img.classList.add("opacity-0", "transition-opacity", "duration-500");
        img.onload = function() {
            img.classList.remove("opacity-0");
            img.classList.add("opacity-100");
        }
        if (img.complete) {
            img.classList.remove("opacity-0");
            img.classList.add("opacity-100");
        }
    });
    
    // 页面加载时初始化所有交互事件（关键：确保动态元素也能触发）
    initAllInteractions();
    // 若需默认加载评论，可在此处调用 fetchComments();
});

// 【核心修复1】扩大事件委托范围到body，覆盖所有元素（包括第一个回复/全局收藏）
function initAllInteractions() {
    // 移除旧事件监听（避免重复绑定）
    document.body.removeEventListener('click', handleGlobalInteractions);
    // 重新绑定全局事件委托
    document.body.addEventListener('click', handleGlobalInteractions);
}

// 【核心修复2】统一处理所有交互事件（点赞/收藏/分享/回复）
function handleGlobalInteractions(e) {
    // 1. 点赞功能（覆盖所有 .like-btn，包括动态创建的）
    if (e.target.closest('.like-btn')) {
        const likeBtn = e.target.closest('.like-btn');
        const icon = likeBtn.querySelector('i');
        const countSpan = likeBtn.querySelector('span');
        
        if (!icon || !countSpan) return; // 防止DOM结构异常
        
        // 移除逗号并转换为数字
        let count = parseInt(countSpan.textContent.replace(/,/g, '')) || 0;
        
        if (icon.classList.contains('text-primary')) {
            // 取消点赞
            icon.classList.remove('text-primary');
            countSpan.textContent = formatNumber(count - 1);
        } else {
            // 点赞（添加动画）
            icon.classList.add('text-primary', 'like-animation');
            countSpan.textContent = formatNumber(count + 1);
            
            setTimeout(() => icon.classList.remove('like-animation'), 500);
        }
        e.stopPropagation();
        return;
    }

    // 2. 收藏功能（覆盖所有 .bookmark-btn，包括第一个回复的收藏）
    if (e.target.closest('.bookmark-btn')) {
        const bookmarkBtn = e.target.closest('.bookmark-btn');
        const icon = bookmarkBtn.querySelector('i');
        const text = bookmarkBtn.querySelector('span');
        
        if (!icon || !text) return; // 防止DOM结构异常
        
        if (icon.classList.contains('fa-bookmark')) {
            // 取消收藏
            icon.classList.remove('fa-bookmark', 'text-primary', 'action-success');
            icon.classList.add('fa-bookmark-o');
            text.textContent = '收藏';
            showNotification('已取消收藏');
        } else {
            // 收藏（添加动画）
            icon.classList.remove('fa-bookmark-o');
            icon.classList.add('fa-bookmark', 'text-primary', 'action-success');
            text.textContent = '已收藏';
            showNotification('收藏成功');
            
            setTimeout(() => icon.classList.remove('action-success'), 600);
        }
        e.stopPropagation();
        return;
    }

    // 3. 分享功能（覆盖所有 .share-btn）
    if (e.target.closest('.share-btn')) {
        const shareBtn = e.target.closest('.share-btn');
        currentShareTarget = shareBtn.closest('[data-comment-id]') 
            ? shareBtn.closest('[data-comment-id]').getAttribute('data-comment-id') 
            : 'answer';
        
        document.getElementById('shareModal').classList.add('active');
        e.stopPropagation();
        return;
    }

    // 4. 回复功能（覆盖所有 .reply-btn，包括第一个回复按钮）
    if (e.target.closest('.reply-btn')) {
        e.preventDefault();
        e.stopPropagation();
        
        const replyBtn = e.target.closest('.reply-btn');
        currentReplyTo = replyBtn.getAttribute('data-reply-to');
        
        if (!currentReplyTo) {
            showNotification('回复目标错误，请重试', 'error');
            return;
        }
        
        // 获取被回复的内容（原有逻辑优化：增加DOM存在性判断）
        let replyContent = '';
        let replyAuthor = '未知用户';
        let replyAuthorLv = '';
        
        if (currentReplyTo === 'answer') {
            // 回复“最佳回答”（可能是第一个回复目标）
            const answerContainer = document.querySelector('.prose').closest('div');
            if (answerContainer) {
                const authorEl = answerContainer.querySelector('.font-medium');
                if (authorEl) {
                    replyAuthor = authorEl.firstChild.textContent.trim() || replyAuthor;
                    replyAuthorLv = authorEl.querySelector('.lv-badge')?.textContent || '';
                }
                const answerTextEl = answerContainer.querySelector('.prose p:first-of-type');
                const answerContent = answerTextEl?.textContent || '';
                replyContent = answerContent.length > 100 
                    ? answerContent.substring(0, 100) + '...' 
                    : answerContent;
            }
        } else {
            // 回复普通评论
            const commentEl = document.querySelector(`[data-comment-id="${currentReplyTo}"]`);
            if (commentEl) {
                const authorEl = commentEl.querySelector('h4, h5');
                if (authorEl) {
                    replyAuthor = authorEl.firstChild.textContent.trim() || replyAuthor;
                    replyAuthorLv = authorEl.querySelector('.lv-badge')?.textContent || '';
                }
                const commentTextEl = commentEl.querySelector('p');
                const commentText = commentTextEl?.textContent || '';
                replyContent = commentText.length > 100 
                    ? commentText.substring(0, 100) + '...' 
                    : commentText;
            } else {
                showNotification('未找到回复目标，请重试', 'error');
                return;
            }
        }
        
        // 显示被回复内容并打开弹窗（优化：确保弹窗DOM存在）
        const replyToContentEl = document.getElementById('replyToContent');
        const replyTextareaEl = document.getElementById('replyTextarea');
        const replyModalEl = document.getElementById('replyModal');
        
        if (replyToContentEl && replyTextareaEl && replyModalEl) {
            replyToContentEl.innerHTML = `
                <div class="text-gray-500 mb-1">回复 <span class="font-medium text-gray-800 flex items-center inline-flex">
                    ${replyAuthor} ${replyAuthorLv ? `<span class="lv-badge bg-lv${replyAuthorLv.replace('LV', '')}">${replyAuthorLv}</span>` : ''}
                </span>：</div>
                <div class="text-gray-800">${replyContent || '无内容'}</div>
            `;
            replyTextareaEl.value = '';
            replyTextareaEl.focus();
            replyModalEl.classList.add('active');
        }
        return;
    }
}

// 分享选项点击事件（保持不变，增加DOM判断）
document.addEventListener('click', function(e) {
    if (e.target.closest('.share-option')) {
        const shareOption = e.target.closest('.share-option');
        const platform = shareOption.getAttribute('data-platform');
        const icon = shareOption.querySelector('i');
        
        if (!icon) return;
        
        icon.classList.add('action-success', 'text-green-500');
        let message = '';
        switch(platform) {
            case 'wechat': message = '已分享到微信'; break;
            case 'whatsapp': message = '已分享到Whatsapp'; break;
            case 'facebook': message = '已分享到Facebook'; break;
            case 'x': message = '已分享到X推特'; break;
            default: message = '分享成功';
        }
        showNotification(message);
        
        setTimeout(() => {
            document.getElementById('shareModal').classList.remove('active');
            icon.classList.remove('action-success', 'text-green-500');
        }, 1000);
        e.stopPropagation();
    }
});

// 关闭分享弹窗（保持不变）
document.getElementById('cancelShareBtn').addEventListener('click', function() {
    document.getElementById('shareModal').classList.remove('active');
});
document.getElementById('shareModal').addEventListener('click', function(e) {
    if (e.target === this) {
        this.classList.remove('active');
    }
});

// 格式化数字（保持不变）
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// 回复弹窗关闭逻辑（保持不变，增加DOM判断）
const replyModalEl = document.getElementById('replyModal');
if (replyModalEl) {
    replyModalEl.addEventListener('click', function(e) {
        if (e.target === this) {
            this.classList.remove('active');
        }
    });
}

const cancelReplyBtnEl = document.getElementById('cancelReplyBtn');
if (cancelReplyBtnEl) {
    cancelReplyBtnEl.addEventListener('click', function() {
        replyModalEl?.classList.remove('active');
        currentReplyTo = null;
    });
}

const sendReplyBtnEl = document.getElementById('sendReplyBtn');
if (sendReplyBtnEl) {
    sendReplyBtnEl.addEventListener('click', function() {
        sendReply();
    });
}

const replyTextareaEl = document.getElementById('replyTextarea');
if (replyTextareaEl) {
    replyTextareaEl.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendReply();
        }
    });
}

// 【关键修复3】发送回复功能（优化DOM操作，确保新元素交互生效）
function sendReply() {
    if (!replyTextareaEl) return;
    
    const replyText = replyTextareaEl.value.trim();
    if (!replyText || !currentReplyTo) {
        showNotification(replyText ? '回复目标错误' : '回复内容不能为空', 'error');
        return;
    }
    
    const statusEl = showApiStatus('正在提交回复...');
    const form = document.getElementById('apiForm');
    if (!form) {
        hideApiStatus();
        showNotification('表单元素不存在', 'error');
        return;
    }
    
    // 基础字段设置
    form.querySelector('[name="action"]').value = 'add_message';
    form.querySelector('[name="content"]').value = `[新西兰攻略站-回复] ${replyText}`;
    form.querySelector('[name="parent_id"]').value = currentReplyTo;
    
    // 构建FormData并添加固定字段
    const formData = new FormData(form);
    Object.entries(SITE_FIXED_FIELDS).forEach(([key, value]) => {
        formData.append(key, value);
    });
    
    // 发送请求
    fetch(API_URL, {
        method: 'POST',
        body: formData,
        mode: 'cors',
        cache: 'no-store'
    })
    .then(response => {
        if (!response.ok) throw new Error('网络错误: ' + response.status);
        return response.json();
    })
    .then(result => {
        hideApiStatus();
        if (result.success) {
            replyModalEl?.classList.remove('active');
            showNotification('回复发布成功');
            
            // 创建新回复元素（优化：确保容器存在）
            const newReply = document.createElement('div');
            newReply.className = 'nested-comment-box';
            newReply.setAttribute('data-comment-id', `reply-${Date.now()}`);
            newReply.innerHTML = `
                <div class="flex gap-3">
                    <img src="https://picsum.photos/id/64/200" alt="你的头像" class="w-8 h-8 rounded-full">
                    <div class="flex-1">
                        <div class="flex justify-between items-start mb-1">
                            <div>
                                <h5 class="font-medium text-sm flex items-center">
                                    ${SITE_FIXED_FIELDS.account.split('-')[1]}
                                    <span class="lv-badge bg-lv5">LV5</span>
                                </h5>
                                <p class="text-xs text-gray-500">刚刚</p>
                            </div>
                        </div>
                        <p class="text-sm mb-2">${replyText}</p>
                        <div class="flex items-center space-x-4 text-xs comment-actions">
                            <button class="flex items-center text-gray-500 hover:text-primary transition-colors like-btn">
                                <i class="fa fa-thumbs-up mr-1"></i>
                                <span>0</span>
                            </button>
                            <button class="reply-btn text-gray-500 hover:text-primary transition-colors" data-reply-to="${newReply.getAttribute('data-comment-id')}">
                                <i class="fa fa-reply mr-1"></i>
                                <span>回复</span>
                            </button>
                            <button class="flex items-center text-gray-500 hover:text-primary transition-colors bookmark-btn">
                                <i class="fa fa-bookmark-o mr-1"></i>
                                <span>收藏</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            // 插入回复到页面（优化：兼容不同目标位置）
            let targetContainer = null;
            if (currentReplyTo === 'answer') {
                // 回复“最佳回答”：插入到评论区顶部
                targetContainer = document.getElementById('commentsContainer');
                if (targetContainer) {
                    const firstComment = targetContainer.firstChild;
                    if (firstComment) {
                        targetContainer.insertBefore(newReply, firstComment);
                    } else {
                        targetContainer.appendChild(newReply);
                    }
                }
            } else {
                // 回复普通评论：插入到对应评论的嵌套区
                const commentEl = document.querySelector(`[data-comment-id="${currentReplyTo}"]`);
                if (commentEl) {
                    let nestedComments = commentEl.querySelector('.nested-comment');
                    if (!nestedComments) {
                        nestedComments = document.createElement('div');
                        nestedComments.className = 'nested-comment mt-4 space-y-4';
                    }
                    nestedComments.appendChild(newReply);
                    commentEl.appendChild(nestedComments);
                }
            }
            
            // 【关键】新元素创建后，重新初始化交互（确保点赞/收藏可用）
            if (targetContainer || document.querySelector(`[data-comment-id="${currentReplyTo}"]`)) {
                initAllInteractions();
            }
        } else {
            showNotification('回复失败: ' + (result.error || '未知错误'), 'error');
        }
        currentReplyTo = null;
        replyTextareaEl.value = '';
    })
    .catch(error => {
        hideApiStatus();
        showNotification('回复失败: ' + error.message, 'error');
    });
}

// 显示通知（保持不变，增加DOM判断）
function showNotification(message, type = 'success') {
    const container = document.getElementById('notificationContainer');
    if (!container) return;
    
    const notification = document.createElement('div');
    notification.className = `notification px-4 py-3 rounded-lg shadow-lg mb-2 flex items-center ${
        type === 'success' 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
    }`;
    const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
    notification.innerHTML = `<i class="fa ${icon} mr-2"></i><span>${message}</span>`;
    
    container.appendChild(notification);
    setTimeout(() => notification.remove(), 2000);
}

// 加载更多评论功能（保持不变，优化交互初始化）
const loadMoreBtnEl = document.getElementById('loadMoreComments');
if (loadMoreBtnEl) {
    loadMoreBtnEl.addEventListener('click', function() {
        const loadMoreBtn = this;
        const commentsContainer = document.getElementById('commentsContainer');
        if (!commentsContainer) return;
        
        loadMoreBtn.innerHTML = '<i class="fa fa-spinner fa-spin mr-2"></i> 加载中...';
        loadMoreBtn.disabled = true;
        
        setTimeout(() => {
            commentPage++;
            let newCommentsCreated = false;
            
            for (let i = 1; i <= 5; i++) {
                const commentNumber = (commentPage - 1) * 5 + i + 20;
                const randomId = 1090 + i + (commentPage - 1) * 5;
                const randomLikes = Math.floor(Math.random() * 50) + 1;
                const randomLv = Math.floor(Math.random() * 9) * 0; // 此处原逻辑为0，保持不变
                const randomMonths = Math.floor(Math.random() * 5) + 1;

                const comment = document.createElement('div');
                comment.className = 'border-b border-gray-100 pb-6';
                comment.setAttribute('data-comment-id', `load-${commentNumber}`);
                comment.innerHTML = `
                    <div class="comment-box">
                        <div class="flex gap-4">
                            <img src="https://picsum.photos/id/${randomId}/200" alt="评论者头像" class="w-10 h-10 rounded-full opacity-0 transition-opacity duration-500" onload="this.classList.add('opacity-100')">
                            <div class="flex-1">
                                <div class="flex justify-between items-start mb-2">
                                    <div>
                                        <h4 class="font-medium flex items-center">
                                            游客${commentNumber}
                                            <span class="lv-badge bg-lv${randomLv}">LV${randomLv}</span>
                                        </h4>
                                        <p class="comment-date">${commentPage/2}个月前</p>
                                    </div>
                                    <span class="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">旅行体验</span>
                                </div>
                                <p class="mb-3">新西兰风景优美，我准备${randomMonths}个月后去新西兰。感谢分享的攻略，对我的旅行帮助很大！方便给个小吕的联系方式吗？</p>
                                <div class="flex items-center space-x-4 text-sm comment-actions">
                                    <button class="flex items-center text-gray-500 hover:text-primary transition-colors like-btn">
                                        <i class="fa fa-thumbs-up mr-1"></i>
                                        <span>${formatNumber(randomLikes)}</span>
                                    </button>
                                    <button class="reply-btn text-gray-500 hover:text-primary transition-colors" data-reply-to="load-${commentNumber}">
                                        <i class="fa fa-reply mr-1"></i>
                                        <span>回复</span>
                                    </button>
                                    <button class="flex items-center text-gray-500 hover:text-primary transition-colors bookmark-btn">
                                        <i class="fa fa-bookmark-o mr-1"></i>
                                        <span>收藏</span>
                                    </button>
                                    <button class="flex items-center text-gray-500 hover:text-primary transition-colors share-btn">
                                        <i class="fa fa-share-alt mr-1"></i>
                                        <span>分享</span>
                                    </button>
                                </div>
                                <div class="nested-comment mt-4 space-y-4">
                                    <div class="nested-comment-box" data-comment-id="1-1">
                                        <div class="flex gap-3">
                                            <img src="static/picture/1678946535439190.jpg" alt="回复者头像" class="w-8 h-8 rounded-full transition-opacity duration-500 opacity-100">
                                            <div class="flex-1">
                                                <div class="flex justify-between items-start mb-1">
                                                    <div>
                                                        <h5 class="font-medium text-sm flex items-center">
                                                            长沙旅游达人
                                                            <span class="lv-badge bg-lv8">LV8</span>
                                                        </h5>
                                                        <p class="text-xs text-gray-500">两天前</p>
                                                    </div>
                                                </div>
                                                <p class="text-sm mb-2">
                                                    <p><span class="wuk_name">小吕</span>的微信号 <a href="javascript:void(0);" onclick="copyAndHandleWechat()" class="wechat-link">
                                                    <span id="wechat_id" class="wuk_weixin">NZtrip1</span> </a><span class="tishi"> [点击即可复制，转到微信加好友，免费咨询定制澳洲行程] </span>,WhatsApp号 <a href="https://wa.me/61493385079?text=我想了解新西兰的相关行程" target="_blank" class="whatsapp-link"><span class="wuk_whatsapp">+ 61 493 385 079</span></a>
                                                </p><img src="static/picture/wewhat.jpg">
                                                <p><a href="https://autraveling.com/contact/"><span style="font-weight:bold;color: red;">也可以直接点这里，在线联系，或者留言</span></a></p>
                                                <div class="flex items-center space-x-4 text-xs comment-actions">
                                                    <button class="flex items-center text-gray-500 hover:text-primary transition-colors like-btn">
                                                        <i class="fa fa-thumbs-up mr-1"></i>
                                                        <span>${formatNumber(randomLikes)}</span>
                                                    </button>
                                                    <button class="reply-btn text-gray-500 hover:text-primary transition-colors" data-reply-to="1-1">
                                                        <i class="fa fa-reply mr-1"></i>
                                                        <span>回复</span>
                                                    </button>
                                                    <button class="flex items-center text-gray-500 hover:text-primary transition-colors bookmark-btn">
                                                        <i class="fa fa-bookmark-o mr-1"></i>
                                                        <span>收藏</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                commentsContainer.appendChild(comment);
                newCommentsCreated = true;
            }
            
            // 恢复按钮状态
            loadMoreBtn.disabled = false;
            if (commentPage >= totalPages) {
                loadMoreBtn.innerHTML = '没有更多评论了';
                loadMoreBtn.classList.add('opacity-50', 'cursor-not-allowed');
                loadMoreBtn.disabled = true;
            } else {
                loadMoreBtn.innerHTML = '<i class="fa fa-refresh mr-2"></i> 加载更多评论';
            }
            
            // 【关键】加载新评论后，重新初始化交互
            if (newCommentsCreated) {
                initAllInteractions();
            }
        }, 1000);
    });
}

// 【关键修复4】发表评论功能（优化DOM判断，确保新评论交互生效）
const postCommentBtnEl = document.getElementById('postCommentBtn');
if (postCommentBtnEl) {
    postCommentBtnEl.addEventListener('click', function() {
        const textarea = document.getElementById('commentTextarea');
        const commentsContainer = document.getElementById('commentsContainer');
        if (!textarea || !commentsContainer) return;
        
        const commentText = textarea.value.trim();
        if (!commentText) {
            showNotification('评论内容不能为空', 'error');
            return;
        }
        
        const statusEl = showApiStatus('正在提交评论...');
        const form = document.getElementById('apiForm');
        if (!form) {
            hideApiStatus();
            showNotification('表单元素不存在', 'error');
            return;
        }
        
        // 基础字段设置
        form.querySelector('[name="action"]').value = 'add_message';
        form.querySelector('[name="content"]').value = `[新西兰攻略站-评论] ${commentText}`;
        form.querySelector('[name="parent_id"]').value = '';
        
        // 构建FormData并添加固定字段
        const formData = new FormData(form);
        Object.entries(SITE_FIXED_FIELDS).forEach(([key, value]) => {
            formData.append(key, value);
        });
        
        // 发送请求
        fetch(API_URL, {
            method: 'POST',
            body: formData,
            mode: 'cors',
            cache: 'no-store'
        })
        .then(response => {
            if (!response.ok) throw new Error('网络错误: ' + response.status);
            return response.json();
        })
        .then(result => {
            hideApiStatus();
            if (result.success) {
                textarea.value = '';
                showNotification('评论发布成功');
                
                // 创建新评论元素
                const newComment = document.createElement('div');
                newComment.className = 'border-b border-gray-100 pb-6';
                newComment.setAttribute('data-comment-id', `new-${Date.now()}`);
                newComment.innerHTML = `
                    <div class="comment-box">
                        <div class="flex gap-4">
                            <img src="https://picsum.photos/id/64/200" alt="你的头像" class="w-10 h-10 rounded-full">
                            <div class="flex-1">
                                <div class="flex justify-between items-start mb-2">
                                    <div>
                                        <h4 class="font-medium flex items-center">
                                            ${SITE_FIXED_FIELDS.account.split('-')[1]}
                                            <span class="lv-badge bg-lv5">LV5</span>
                                        </h4>
                                        <p class="comment-date">刚刚</p>
                                    </div>
                                    <span class="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">旅行体验</span>
                                </div>
                                <p class="mb-3">${commentText}</p>
                                <div class="flex items-center space-x-4 text-sm comment-actions">
                                    <button class="flex items-center text-gray-500 hover:text-primary transition-colors like-btn">
                                        <i class="fa fa-thumbs-up mr-1"></i>
                                        <span>0</span>
                                    </button>
                                    <button class="reply-btn text-gray-500 hover:text-primary transition-colors" data-reply-to="${newComment.getAttribute('data-comment-id')}">
                                        <i class="fa fa-reply mr-1"></i>
                                        <span>回复</span>
                                    </button>
                                    <button class="flex items-center text-gray-500 hover:text-primary transition-colors bookmark-btn">
                                        <i class="fa fa-bookmark-o mr-1"></i>
                                        <span>收藏</span>
                                    </button>
                                    <button class="flex items-center text-gray-500 hover:text-primary transition-colors share-btn">
                                        <i class="fa fa-share-alt mr-1"></i>
                                        <span>分享</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                
                // 插入评论到顶部
                const firstComment = commentsContainer.firstChild;
                if (firstComment) {
                    commentsContainer.insertBefore(newComment, firstComment);
                } else {
                    commentsContainer.appendChild(newComment);
                }
                
                // 【关键】新评论创建后，重新初始化交互
                initAllInteractions();
            } else {
                showNotification('评论失败: ' + (result.error || '未知错误'), 'error');
            }
        })
        .catch(error => {
            hideApiStatus();
            showNotification('评论失败: ' + error.message, 'error');
        });
    });
}

// 从API获取评论（保持不变，优化交互初始化）
function fetchComments() {
    const statusEl = showApiStatus('正在加载评论...');
    const data = new URLSearchParams({ 'action': 'get_messages' });
    
    fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: data
    })
    .then(response => {
        if (!response.ok) throw new Error('获取评论失败: ' + response.status);
        return response.json();
    })
    .then(result => {
        hideApiStatus();
        const commentsContainer = document.getElementById('commentsContainer');
        if (!commentsContainer) return;
        
        if (result.success && result.messages && result.messages.length > 0) {
            commentsContainer.innerHTML = '';
            
            result.messages.forEach((msg, index) => {
                const randomId = 1000 + (index % 20);
                const randomLv = (index % 10) + 1;
                const randomLikes = Math.floor(Math.random() * 100) + 1;
                
                const comment = document.createElement('div');
                comment.className = 'border-b border-gray-100 pb-6';
                comment.setAttribute('data-comment-id', `api-${msg.id}`);
                comment.innerHTML = `
                    <div class="comment-box">
                        <div class="flex gap-4">
                            <img src="https://picsum.photos/id/${randomId}/200" alt="评论者头像" class="w-10 h-10 rounded-full opacity-0 transition-opacity duration-500" onload="this.classList.add('opacity-100')">
                            <div class="flex-1">
                                <div class="flex justify-between items-start mb-2">
                                    <div>
                                        <h4 class="font-medium flex items-center">
                                            ${msg.name || '匿名用户'}
                                            <span class="lv-badge bg-lv${randomLv}">LV${randomLv}</span>
                                        </h4>
                                        <p class="comment-date">${formatTimeAgo(msg.timestamp)}</p>
                                    </div>
                                    <span class="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">旅行体验</span>
                                </div>
                                <p class="mb-3">${msg.content}</p>
                                <div class="flex items-center space-x-4 text-sm comment-actions">
                                    <button class="flex items-center text-gray-500 hover:text-primary transition-colors like-btn">
                                        <i class="fa fa-thumbs-up mr-1"></i>
                                        <span>${formatNumber(randomLikes)}</span>
                                    </button>
                                    <button class="reply-btn text-gray-500 hover:text-primary transition-colors" data-reply-to="api-${msg.id}">
                                        <i class="fa fa-reply mr-1"></i>
                                        <span>回复</span>
                                    </button>
                                    <button class="flex items-center text-gray-500 hover:text-primary transition-colors bookmark-btn">
                                        <i class="fa fa-bookmark-o mr-1"></i>
                                        <span>收藏</span>
                                    </button>
                                    <button class="flex items-center text-gray-500 hover:text-primary transition-colors share-btn">
                                        <i class="fa fa-share-alt mr-1"></i>
                                        <span>分享</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                commentsContainer.appendChild(comment);
            });
            
            // 【关键】加载API评论后，重新初始化交互
            initAllInteractions();
        }
    })
    .catch(error => {
        hideApiStatus();
        console.error('获取评论错误:', error);
    });
}

// 格式化时间（保持不变）
function formatTimeAgo(timestamp) {
    if (!timestamp) return '刚刚';
    const now = Date.now();
    const seconds = Math.floor((now - timestamp) / 1000);
    
    if (seconds < 60) return `${seconds}秒前`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟前`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}小时前`;
    if (seconds < 2592000) return `${Math.floor(seconds / 86400)}天前`;
    if (seconds < 31536000) return `${Math.floor(seconds / 2592000)}个月前`;
    return `${Math.floor(seconds / 31536000)}年前`;
}

// 补充：复制微信号功能（原代码中引用但未定义，避免报错）
function copyAndHandleWechat() {
    const wechatIdEl = document.getElementById('wechat_id');
    if (wechatIdEl) {
        const wechatId = wechatIdEl.textContent;
        navigator.clipboard.writeText(wechatId)
            .then(() => showNotification('微信号已复制'))
            .catch(() => showNotification('复制失败，请手动复制', 'error'));
    }
}