// 留言表单提交逻辑（增强调试版）
document.getElementById('messageForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const name = document.getElementById('name').value;
    const content = document.getElementById('content').value;
    const statusDiv = document.getElementById('messageStatus');
    
    // 清空状态信息
    statusDiv.innerHTML = '';
    
    // 显示加载中
    statusDiv.innerHTML = '<p>提交中...</p>';
    
    console.log('准备提交表单:', { name, content });
    
    // 发送数据到API
    fetch('https://autr.1c.q56.dpdns.org/3/api.php', {  // 替换为A站的实际域名
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, content }),
        credentials: 'include'
    })
    .then(res => {
        console.log('响应状态:', res.status);
        console.log('响应头:', res.headers);
        
        // 检查HTTP状态码
        if (!res.ok) {
            throw new Error(`HTTP错误，状态码: ${res.status}`);
        }
        
        return res.json();
    })
    .then(data => {
        console.log('API响应:', data);
        
        if (data.status === 'success') {
            statusDiv.innerHTML = '<div class="success">留言提交成功！</div>';
            document.getElementById('messageForm').reset();
        } else {
            statusDiv.innerHTML = `<div class="error">提交失败: ${data.message}</div>`;
        }
    })
    .catch(err => {
        console.error('Fetch错误:', err);
        console.error('错误堆栈:', err.stack);
        statusDiv.innerHTML = `<div class="error">提交失败: ${err.message}</div>`;
    });
});