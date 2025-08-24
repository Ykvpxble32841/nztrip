(function() {
    // 配置参数（可根据需要修改）
    const CONFIG = {
        trackingEndpoint: 'https://go.goautrip.com/wp-admin/new/user_agent_logger.php',
        debug: false
    };

    // 工具函数
    function log(message, type = 'info') {
        if (CONFIG.debug) {
            const logFunc = type === 'error' ? console.error : console.log;
            logFunc(`[Tracker] ${message}`);
        }
    }

    // 创建跟踪请求
    function trackVisit() {
        try {
            const img = new Image();
            const timestamp = Date.now();
            
            // 构建参数
            const params = new URLSearchParams({
                t: timestamp,
                referer: document.referrer || 'Direct Access',
                page: window.location.href
            });
            
            img.src = `${CONFIG.trackingEndpoint}?${params}`;
            
            // 事件处理
            img.onload = () => log('Tracking request sent');
            img.onerror = () => log('Failed to send tracking request', 'error');
            
        } catch (error) {
            log(`Tracking error: ${error.message}`, 'error');
        }
    }

    // 页面加载后初始化
    document.addEventListener('DOMContentLoaded', trackVisit);
})();