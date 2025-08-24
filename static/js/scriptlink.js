document.addEventListener('DOMContentLoaded', function() {
    const API_URL = 'https://autr.1c.q56.dpdns.org/3/api.php'; 

    // DOM元素（保持不变）
    const popup = document.getElementById('infoPopup');
    const popupLinks = document.querySelectorAll('.popup-link');
    const closeBtn = document.getElementById('closePopupBtn');
    const messageForm = document.getElementById('messageForm');
    const formContainer = document.getElementById('formContainer');
    const statusContainer = document.getElementById('statusContainer');
    const statusMessage = document.getElementById('statusMessage');
    const successContainer = document.getElementById('successContainer');
    const welcomeName = document.getElementById('welcomeName');
    const welcomeContact = document.getElementById('welcomeContact');
    const submitBtn = document.getElementById('submitBtn');
    
    // 表单字段映射（核心：确保与API参数名一致）
    // key: 表单元素ID，value: API需要的参数名（必须与后端完全匹配）
    const API_PARAMS = {
        account: 'account',         // 账号参数名
        email: 'email',             // 邮箱参数名
        contact_tool: 'contact_tool', // 通讯工具参数名
        contact_account: 'contact_account', // 通讯账号参数名
        content: 'content'          // 留言内容参数名
    };

    const errorElements = {
        account: document.getElementById('accountError'),
        email: document.getElementById('emailError'),
        contact_tool: document.getElementById('contactToolError'),
        contact_account: document.getElementById('contactAccountError'),
        content: document.getElementById('contentError')
    };

    // ===== 弹窗交互（保持不变） =====
    popupLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            if (!popup) return console.error('未找到弹窗元素');
            popup.classList.add('active');
            document.body.style.overflow = 'hidden';
            resetFormState();
        });
    });

    function hidePopup() {
        if (popup) {
            popup.classList.remove('active');
            document.body.style.overflow = '';
        }
    }
    closeBtn?.addEventListener('click', hidePopup);
    popup?.addEventListener('click', e => e.target === popup && hidePopup());
    document.addEventListener('keydown', e => e.key === 'Escape' && popup?.classList.contains('active') && hidePopup());

    // ===== 表单验证（保持不变） =====
    function validateField(fieldId, value) {
        let error = '';
        switch(fieldId) {
            case 'account':
                if (!value.trim()) error = '请输入账号（不能为空）';
                else if (value.length < 2) error = '账号长度不能少于2个字符';
                break;
            case 'email':
                const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!value.trim()) error = '请输入邮箱（不能为空）';
                else if (!emailReg.test(value)) error = '请输入有效的邮箱（如：xxx@xxx.com）';
                break;
            case 'contact_tool':
                if (!value) error = '请选择通讯工具';
                break;
            case 'contact_account':
                if (!value.trim()) error = '请输入通讯账号（不能为空）';
                else if (value.length < 3) error = '通讯账号长度不能少于3个字符';
                break;
            case 'content':
                if (!value.trim()) error = '请输入留言内容（不能为空）';
                else if (value.length < 10) error = '留言内容不能少于10个字符';
                break;
        }
        if (errorElements[fieldId]) {
            errorElements[fieldId].textContent = error;
            errorElements[fieldId].classList.toggle('hidden', !error);
        }
        return !error;
    }

    Object.keys(errorElements).forEach(fieldId => {
        const field = document.getElementById(fieldId);
        field?.addEventListener('input', function() {
            validateField(fieldId, this.value);
            if (submitBtn) submitBtn.disabled = false;
        });
    });

    function validateForm() {
        let isAllValid = true;
        Object.keys(errorElements).forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (!field) {
                console.error(`表单字段缺失：ID="${fieldId}"（检查HTML）`);
                isAllValid = false;
                return;
            }
            const isValid = validateField(fieldId, field.value);
            if (!isValid) isAllValid = false;
        });
        console.log(`表单验证结果：${isAllValid ? '通过' : '未通过'}`);
        return isAllValid;
    }

    // ===== 核心修复：确保数据正确传输到API =====
    messageForm?.addEventListener('submit', async function(e) {
        e.preventDefault();
        if (!validateForm()) return;

        // 禁用按钮
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa fa-spinner fa-spin mr-2"></i> 提交中...';
        }

        // 显示状态
        formContainer?.classList.add('opacity-50');
        statusContainer?.classList.remove('hidden');
        if (statusMessage) {
            statusMessage.innerHTML = '<i class="fa fa-spinner fa-spin mr-2"></i> 正在准备数据...';
            statusMessage.className = 'status-message bg-blue-50 text-blue-700 p-3 rounded';
        }

        try {
            // 1. 手动收集数据（解决FormData自动收集失败问题）
            const formData = new FormData();
            let missingFields = [];

            // 遍历字段映射，手动添加参数（确保API能识别）
            Object.entries(API_PARAMS).forEach(([fieldId, apiParam]) => {
                const field = document.getElementById(fieldId);
                if (field) {
                    const value = field.value.trim();
                    formData.append(apiParam, value); // 用API需要的参数名
                    console.log(`已添加参数：${apiParam}=${value}`); // 调试用
                } else {
                    missingFields.push(fieldId); // 记录缺失的字段
                }
            });

            // 检查是否有缺失字段
            if (missingFields.length > 0) {
                throw new Error(`表单字段缺失：${missingFields.join(', ')}（请检查HTML元素ID）`);
            }

            // 2. 添加API必须的action参数
            formData.append('action', 'add_message');
            console.log('已添加必要参数：action=add_message');

            // 3. 验证数据是否为空（防止空提交）
            const dataEntries = Array.from(formData.entries());
            const hasValidData = dataEntries.some(([key, value]) => value.trim() !== '' && key !== 'action');
            if (!hasValidData) {
                throw new Error('表单数据为空，请填写至少一项内容');
            }

            // 4. 提交到API（优化跨域配置）
            statusMessage.innerHTML = '<i class="fa fa-spinner fa-spin mr-2"></i> 正在发送数据到API...';
            const response = await fetch(API_URL, {
                method: 'POST',
                body: formData,
                mode: 'cors',
                // 仅当API明确需要登录态时保留，否则注释（避免跨域失败）
                // credentials: 'include', 
                timeout: 15000
            });

            // 5. 检查API响应状态
            console.log(`API响应状态码：${response.status}`);
            if (!response.ok) {
                // 尝试获取API返回的错误详情
                let errorText = '';
                try {
                    errorText = await response.text(); // 即使状态码错误，也获取返回内容
                    console.log('API错误详情：', errorText);
                } catch (e) {}
                throw new Error(`API请求失败（状态码：${response.status}），详情：${errorText.slice(0, 100)}`);
            }

            // 6. 解析API返回结果
            let result;
            try {
                result = await response.json();
                console.log('API返回数据：', result);
            } catch (e) {
                throw new Error('API返回格式错误（不是JSON），无法解析');
            }

            // 7. 处理成功/失败
            if (result.success) {
                statusContainer?.classList.add('hidden');
                formContainer?.classList.add('hidden');
                successContainer?.classList.remove('hidden');
                const account = document.getElementById('account')?.value.trim() || '用户';
                welcomeName.textContent = `您好，${account}！`;
                welcomeContact.textContent = `${document.getElementById('contact_tool')?.value}（${document.getElementById('contact_account')?.value}）`;
                setTimeout(hidePopup, 5000);
            } else {
                throw new Error(`提交失败：${result.error || 'API未返回错误原因'}`);
            }

        } catch (error) {
            // 错误处理
            console.error('数据传输失败详情：', error);
            if (statusMessage) {
                statusMessage.innerHTML = `<i class="fa fa-exclamation-circle mr-2"></i> ${error.message}`;
                statusMessage.className = 'status-message bg-red-50 text-red-700 p-3 rounded';
            }
            formContainer?.classList.remove('opacity-50');
        } finally {
            // 恢复按钮状态
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '提交留言';
            }
        }
    });

    // 重置表单状态
    function resetFormState() {
        messageForm?.reset();
        Object.values(errorElements).forEach(el => el?.classList.add('hidden'));
        formContainer?.classList.remove('hidden', 'opacity-50');
        statusContainer?.classList.add('hidden');
        successContainer?.classList.add('hidden');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '提交留言';
        }
    }
});
