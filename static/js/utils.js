/**
 * 工具函数模块
 * 提供通用的辅助功能
 */

/**
 * 初始化Lucide图标
 */
function initIcons() {
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
    console.log('Lucide图标初始化完成');
  } else {
    console.warn('Lucide库未加载');
  }
}

/**
 * 等待MathJax加载完成
 */
function waitForMathJax() {
  return new Promise((resolve, reject) => {
    if (window.MathJax && MathJax.startup && MathJax.startup.promise) {
      MathJax.startup.promise
        .then(() => {
          console.log('MathJax加载完成');
          resolve();
        })
        .catch((err) => {
          console.warn('MathJax加载失败:', err);
          resolve(); // 即使失败也继续
        });
    } else {
      console.warn('MathJax未配置，跳过初始化');
      resolve();
    }
  });
}

/**
 * 渲染MathJax公式
 */
function renderMathJax(element) {
  if (window.MathJax && MathJax.typesetPromise) {
    return MathJax.typesetPromise([element])
      .then(() => {
        console.log('MathJax渲染完成');
      })
      .catch((err) => {
        console.warn('MathJax渲染错误:', err);
      });
  }
  return Promise.resolve();
}

/**
 * 显示提示信息
 */
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white z-50 slide-in`;
  
  if (type === 'success') {
    toast.classList.add('bg-green-600');
  } else if (type === 'error') {
    toast.classList.add('bg-red-600');
  } else {
    toast.classList.add('bg-blue-600');
  }
  
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

/**
 * 滚动到指定元素
 */
function scrollToElement(elementId, behavior = 'smooth') {
  const element = document.getElementById(elementId);
  if (element) {
    element.scrollIntoView({ behavior: behavior });
  }
}

/**
 * 显示/隐藏元素
 */
function toggleVisibility(elementId, show = null) {
  const element = document.getElementById(elementId);
  if (element) {
    if (show === null) {
      element.classList.toggle('hidden');
    } else if (show) {
      element.classList.remove('hidden');
    } else {
      element.classList.add('hidden');
    }
  }
}

/**
 * 禁用/启用按钮
 */
function setButtonDisabled(buttonId, disabled) {
  const button = document.getElementById(buttonId);
  if (button) {
    button.disabled = disabled;
  }
}

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
  // 初始化图标
  setTimeout(() => {
    initIcons();
  }, 100);
  
  // 等待MathJax
  waitForMathJax();
});
