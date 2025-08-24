document.addEventListener('DOMContentLoaded', function() {
  // 配置中心
  const config = {
    position: 'middle',
    buttons: [
      {
        id: 'wxp-btn-1',
        enabled: false,           // 第一个按钮默认关闭
        displayDevice: 'all',
        mode: 'modal',
        link: '/indexhk',
        modalId: 'wxp-modal',
        openInNewTab: false,      // 链接在当前窗口打开
        image: {
          src: 'static/picture/ft.png',
          alt: '繁体',
          title: '点击切换繁体',
          size: {
            pc: { width: '100px', height: '100px' },
            mobile: { width: '30px', height: '30px' }
          }
        }
      },
      {
        id: 'wxp-btn-2',
        enabled: true,
        displayDevice: 'all',
        mode: 'link',
        link: 'https://wa.me/61493385079?text=我想了解澳洲的相关行程',
        modalId: 'wxp-modal',
        openInNewTab: true,       // 链接在新窗口打开
        image: {
          src: 'static/picture/ws.png', // 第二组图片（透明PNG）
          alt: 'WhatsApp',
          title: '点击联系我们WhatsApp',
          size: {
            pc: { width: '100px', height: '100px' },
            mobile: { width: '50px', height: '50px' }
          }
        }
      },
      {
        id: 'wxp-btn-3',
        enabled: true,
        displayDevice: 'mobile',
        mode: 'modal',
        link: 'https://example.com/help',
        modalId: 'wxp-modal',
        openInNewTab: false,      // 链接在当前窗口打开
        image: {
          src: 'static/picture/wx.png', // 第三组图片（透明PNG）
          alt: 'Wechat',
          title: '点击联系我们Wechat',
          size: {
            pc: { width: '100px', height: '100px' },
            mobile: { width: '50px', height: '50px' }
          }
        }
      }
    ]
  };

  // 工具函数
  function isMobile() {
    return window.innerWidth < 768;
  }

  function getDeviceSize(imageConfig) {
    return isMobile() ? imageConfig.size.mobile : imageConfig.size.pc;
  }

  function checkImageExists(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = src;
    });
  }

  // 图片预加载（优化显示速度）
  function preloadImages() {
    return new Promise((resolve) => {
      const imagePaths = config.buttons.map(btn => btn.image.src);
      let loadedCount = 0;
      
      if (imagePaths.length === 0) {
        resolve();
        return;
      }
      
      imagePaths.forEach(src => {
        const img = new Image();
        img.src = src;
        img.onload = img.onerror = () => {
          loadedCount++;
          if (loadedCount === imagePaths.length) resolve();
        };
      });
    });
  }

  // 创建按钮
  async function createButtons() {
    const btnContainer = document.getElementById('wxp-btn-container');
    if (!btnContainer) {
      console.error('按钮容器不存在');
      return;
    }
    
    for (const btnConfig of config.buttons) {
      const imageExists = await checkImageExists(btnConfig.image.src);
      const imageSrc = imageExists ? btnConfig.image.src : 
        `https://picsum.photos/${isMobile() ? '60/60' : '100/40'}?random=${Math.random()}`;
      
      const btn = document.createElement('div');
      btn.id = btnConfig.id;
      btn.className = 'wxp-btn-item';
      
      const img = document.createElement('img');
      img.className = 'wxp-btn-image';
      img.src = imageSrc;
      img.alt = btnConfig.image.alt;
      img.title = btnConfig.image.title;
      
      const size = getDeviceSize(btnConfig.image);
      img.style.width = size.width;
      img.style.height = size.height;
      
      btn.appendChild(img);
      btnContainer.appendChild(btn);
    }
  }

  // 初始化按钮显示
  function initButtonVisibility() {
    const btnContainer = document.getElementById('wxp-btn-container');
    if (!btnContainer) return;
    
    btnContainer.classList.remove('top', 'middle', 'bottom');
    btnContainer.classList.add(config.position);

    config.buttons.forEach(btnConfig => {
      const btn = document.getElementById(btnConfig.id);
      if (!btn) return;

      if (!btnConfig.enabled) {
        btn.classList.add('hidden');
        return;
      }

      const shouldShow = 
        btnConfig.displayDevice === 'all' ||
        (btnConfig.displayDevice === 'pc' && !isMobile()) ||
        (btnConfig.displayDevice === 'mobile' && isMobile());

      btn.classList.toggle('hidden', !shouldShow);
      
      if (shouldShow) {
        const img = btn.querySelector('img');
        const size = getDeviceSize(btnConfig.image);
        img.style.width = size.width;
        img.style.height = size.height;
      }
    });
  }

  // 弹窗控制
  function openModal(targetModalId) {
    const modal = document.getElementById(targetModalId);
    const overlay = document.getElementById('wxp-overlay');
    
    if (modal && overlay) {
      modal.classList.add('active');
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeModal() {
    const modal = document.getElementById('wxp-modal');
    const overlay = document.getElementById('wxp-overlay');
    
    if (modal && overlay) {
      modal.classList.remove('active');
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  // 绑定事件（含超链接打开方式控制）
  function bindEvents() {
    // 按钮点击事件
    config.buttons.forEach(btnConfig => {
      const btn = document.getElementById(btnConfig.id);
      if (!btn || !btnConfig.enabled) return;

      btn.addEventListener('click', () => {
        if (btnConfig.mode === 'modal') {
          openModal(btnConfig.modalId);
        } else {
          // 根据配置决定超链接打开方式
          if (btnConfig.openInNewTab === false) {
            window.location.href = btnConfig.link; // 当前窗口打开
          } else {
            window.open(btnConfig.link, '_blank'); // 新窗口打开（默认）
          }
        }
      });
    });

    // 确定按钮关闭弹窗
    const confirmBtn = document.getElementById('wxp-confirm-btn');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', closeModal);
    }

    // ESC键关闭弹窗
    document.addEventListener('keydown', (e) => {
      const modal = document.getElementById('wxp-modal');
      if (e.key === 'Escape' && modal && modal.classList.contains('active')) {
        closeModal();
      }
    });
  }

  // 初始化流程
  (async function init() {
    await preloadImages();  // 预加载图片
    await createButtons();  // 创建按钮
    initButtonVisibility(); // 设置按钮显示状态
    bindEvents();           // 绑定事件
  })();

  // 窗口大小变化时重新适配
  window.addEventListener('resize', initButtonVisibility);
});