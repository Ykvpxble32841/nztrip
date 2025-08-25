// 独立的JavaScript模块
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('messageForm');
    const statusMessage = document.getElementById('statusMessage');
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        resetErrors();
        
        if (!validateForm()) {
            return;
        }
        
        try {
            showStatus('loading', '正在提交留言...');
            
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            
            const response = await fetch('https://go.goautrip.com/newzealand/33/api.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams(data)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                showStatus('success', '留言提交成功！');
                form.reset();
            } else {
                showStatus('error', `提交失败: ${result.error}`);
            }
        } catch (error) {
            showStatus('error', `发生错误: ${error.message}`);
            console.error('完整错误信息:', error);
        }
    });
    
    function validateForm() {
        let isValid = true;
        
        const name = document.getElementById('name').value.trim();
        if (name === '') {
            showError('name', '请输入您的姓名');
            isValid = false;
        }
        
        const phone = document.getElementById('phone').value.trim();
        if (phone !== '' && !/^[\d\s\-\+\(\)]+$/.test(phone)) {
            showError('phone', '请输入有效的电话号码');
            isValid = false;
        }
        
        const email = document.getElementById('email').value.trim();
        if (email !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showError('email', '请输入有效的Email地址');
            isValid = false;
        }
        
        const content = document.getElementById('content').value.trim();
        if (content === '') {
            showError('content', '请输入留言内容');
            isValid = false;
        }
        
        return isValid;
    }
    
    function showError(fieldId, message) {
        const errorElement = document.getElementById(`${fieldId}Error`);
        errorElement.textContent = message;
        document.getElementById(fieldId).classList.add('border-danger');
    }
    
    function resetErrors() {
        document.querySelectorAll('.validation-error').forEach(el => {
            el.textContent = '';
        });
        document.querySelectorAll('input, textarea').forEach(el => {
            el.classList.remove('border-danger');
        });
    }
    
    function showStatus(type, message) {
        statusMessage.className = `status-message ${type} show`;
        statusMessage.innerHTML = message;
    }
});