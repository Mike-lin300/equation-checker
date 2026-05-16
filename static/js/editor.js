/**
 * 编辑器模块
 * 提供解题步骤的编辑、公式输入、实时预览等功能
 */

// 当前步骤数据
let stepsData = [];

// 记录最后激活的输入框
let lastActiveInput = null;

/**
 * 初始化编辑器模块
 */
function initEditorModule() {
  console.log('初始化编辑器模块...');
  
  // 绑定事件
  bindEditorEvents();
  
  // 添加初始步骤
  const container = document.getElementById('stepsContainer');
  if (container && container.children.length === 0) {
    addStep();
  }
  
  console.log('编辑器模块初始化完成');
}

/**
 * 绑定编辑器相关事件
 */
function bindEditorEvents() {
  // 1. 添加步骤按钮
  const addStepBtn = document.getElementById('addStepBtn');
  if (addStepBtn) {
    addStepBtn.addEventListener('click', () => addStep());
  }
  
  // 2. 公式面板切换按钮
  const toggleFormulaPanelBtn = document.getElementById('toggleFormulaPanelBtn');
  if (toggleFormulaPanelBtn) {
    toggleFormulaPanelBtn.addEventListener('click', toggleFormulaPanel);
  }
  
  // 3. 公式快捷输入按钮
  const formulaButtons = document.querySelectorAll('.formula-btn');
  formulaButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const symbol = btn.dataset.symbol;
      const template = btn.dataset.template;
      const action = btn.dataset.action;
      
      if (action === 'square') {
        applySquare();
      } else if (action === 'sqrt') {
        applySqrt();
      } else if (action === 'parentheses') {
        applyParentheses();
      } else if (symbol) {
        insertSymbol(symbol);
      } else if (template) {
        insertTemplate(template);
      }
    });
  });
  
  // 4. 示例加载按钮
  const sampleButtons = {
    'sampleFactorBtn': loadFactorizationSample,
    'sampleSquareRootBtn': loadSquareRootSample,
    'sampleCompletingBtn': loadCompletingSquareSample,
    'sampleFormulaBtn': loadFormulaMethodSample
  };
  
  for (const [btnId, loadFunc] of Object.entries(sampleButtons)) {
    const btn = document.getElementById(btnId);
    if (btn) {
      btn.addEventListener('click', loadFunc);
    }
  }
  
  // 5. 提交诊断按钮
  const diagnoseBtn = document.getElementById('diagnoseBtn');
  if (diagnoseBtn) {
    diagnoseBtn.addEventListener('click', submitForDiagnosis);
  }
  
  // 6. 重置按钮
  const resetBtn = document.getElementById('resetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', resetSystem);
  }
  
  // 7. OCR 相关事件
  initOcrEvents();
}

/**
 * 添加步骤
 */
function addStep(content = '') {
  const container = document.getElementById('stepsContainer');
  if (!container) return;
  
  const stepCount = container.children.length + 1;
  
  const stepDiv = document.createElement('div');
  stepDiv.className = 'flex items-start gap-3 p-3 rounded-lg transition-all';
  stepDiv.style.animation = 'slideIn 0.3s ease-out';
  
  stepDiv.innerHTML = `
    <div class="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-sm">
      ${stepCount}
    </div>
    <div class="flex-1">
      <!-- 快捷按钮面板（默认隐藏） -->
      <div class="quick-buttons hidden mb-2 p-2 bg-slate-50 rounded border border-slate-200">
        <div class="flex flex-wrap gap-1">
          <button class="quick-btn bg-white border border-slate-200 px-2 py-1 rounded text-sm hover:border-blue-400 hover:bg-blue-50" data-symbol="+">+</button>
          <button class="quick-btn bg-white border border-slate-200 px-2 py-1 rounded text-sm hover:border-blue-400 hover:bg-blue-50" data-symbol="-">−</button>
          <button class="quick-btn bg-white border border-slate-200 px-2 py-1 rounded text-sm hover:border-blue-400 hover:bg-blue-50" data-symbol="=">=</button>
          <button class="quick-btn bg-white border border-slate-200 px-2 py-1 rounded text-sm hover:border-blue-400 hover:bg-blue-50" data-symbol="x^2">x²</button>
          <button class="quick-btn bg-white border border-slate-200 px-2 py-1 rounded text-sm hover:border-blue-400 hover:bg-blue-50" data-action="square">( )²</button>
          <button class="quick-btn bg-white border border-slate-200 px-2 py-1 rounded text-sm hover:border-blue-400 hover:bg-blue-50" data-action="sqrt">√</button>
          <button class="quick-btn bg-white border border-slate-200 px-2 py-1 rounded text-sm hover:border-blue-400 hover:bg-blue-50" data-symbol="\\pm ">±</button>
          <button class="quick-btn bg-white border border-slate-200 px-2 py-1 rounded text-sm hover:border-blue-400 hover:bg-blue-50" data-symbol="\\Delta">Δ</button>
        </div>
      </div>
      <textarea
        class="step-input w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base resize-none transition-all"
        rows="2"
        placeholder="输入解题步骤，如：x²-4x+3=0"
        spellcheck="false"
      >${content}</textarea>
      <div class="step-preview mt-2 p-2 bg-white rounded border border-slate-200 text-sm" style="min-height: 30px;"></div>
    </div>
    <button onclick="removeStep(this)" class="flex-shrink-0 w-8 h-8 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded flex items-center justify-center transition-colors">
      <i data-lucide="trash-2" class="w-4 h-4"></i>
    </button>
  `;
  
  container.appendChild(stepDiv);
  
  // 绑定输入事件
  const textarea = stepDiv.querySelector('.step-input');
  const quickButtons = stepDiv.querySelector('.quick-buttons');
  
  textarea.addEventListener('input', function() {
    updateStepPreview(this);
    updateTotalPreview();
  });
  
  // 聚焦时显示快捷按钮
  textarea.addEventListener('focus', function() {
    lastActiveInput = this;
    quickButtons.classList.remove('hidden');
  });
  
  // 失焦时隐藏快捷按钮（检测是否点击了按钮）
  textarea.addEventListener('blur', function() {
    setTimeout(() => {
      const activeElement = document.activeElement;
      const isQuickButton = activeElement && activeElement.classList.contains('quick-btn');
      
      if (!isQuickButton) {
        quickButtons.classList.add('hidden');
      }
    }, 150);
  });
  
  // 绑定快捷按钮事件
  const buttons = quickButtons.querySelectorAll('.quick-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const symbol = btn.dataset.symbol;
      const action = btn.dataset.action;
      
      if (action === 'square') {
        applySquare();
      } else if (action === 'sqrt') {
        applySqrt();
      } else if (symbol) {
        insertSymbol(symbol);
      }
      
      textarea.focus();
    });
    
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
    });
  });
  
  // 重新初始化图标
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
  
  // 更新该步骤的预览
  updateStepPreview(textarea);
}

/**
 * 删除步骤
 */
function removeStep(btn) {
  const stepDiv = btn.closest('.flex.items-start');
  stepDiv.remove();
  
  // 重新编号
  renumberSteps();
  
  // 更新预览
  updateTotalPreview();
}

/**
 * 重新编号步骤
 */
function renumberSteps() {
  const steps = document.querySelectorAll('#stepsContainer > div');
  steps.forEach((step, index) => {
    const badge = step.querySelector('.bg-blue-100');
    if (badge) {
      badge.textContent = index + 1;
    }
  });
}

/**
 * 切换公式面板
 */
function toggleFormulaPanel() {
  const panel = document.getElementById('formulaPanel');
  const toggleText = document.getElementById('panelToggleText');
  const toggleIcon = document.getElementById('panelToggleIcon');
  
  if (!panel || !toggleText || !toggleIcon) return;
  
  if (panel.classList.contains('hidden')) {
    panel.classList.remove('hidden');
    toggleText.textContent = '收起';
    toggleIcon.style.transform = 'rotate(0deg)';
  } else {
    panel.classList.add('hidden');
    toggleText.textContent = '展开';
    toggleIcon.style.transform = 'rotate(180deg)';
  }
}

/**
 * 插入符号
 */
function insertSymbol(symbol) {
  let targetInput = lastActiveInput;
  
  if (!targetInput) {
    const inputs = document.querySelectorAll('.step-input');
    if (inputs.length > 0) {
      targetInput = inputs[0];
      lastActiveInput = targetInput;
    }
  }
  
  if (targetInput) {
    const start = targetInput.selectionStart;
    const end = targetInput.selectionEnd;
    const text = targetInput.value;
    
    targetInput.value = text.substring(0, start) + symbol + text.substring(end);
    
    const cursorPos = start + symbol.length;
    targetInput.setSelectionRange(cursorPos, cursorPos);
    targetInput.focus();
    
    updateStepPreview(targetInput);
    updateTotalPreview();
  }
}

/**
 * 插入模板
 */
function insertTemplate(type) {
  let template = '';
  
  switch(type) {
    case 'quadratic':
      template = 'ax² + bx + c = 0';
      break;
    case 'vertex':
      template = 'a(x-h)² + k = 0';
      break;
    case 'factor':
      template = '(x-x₁)(x-x₂) = 0';
      break;
    case 'discriminant':
      template = '(x + _)² = _';
      break;
  }
  
  insertSymbol(template);
}

/**
 * 应用平方操作
 */
function applySquare() {
  wrapWithPattern('', '(', ')', '^2', true);
}

/**
 * 应用根号操作
 */
function applySqrt() {
  wrapWithPattern('', '\\sqrt{', '}', '', false);
}

/**
 * 应用括号操作
 */
function applyParentheses() {
  wrapWithPattern('', '(', ')', '', false);
}

/**
 * 通用包裹函数
 */
function wrapWithPattern(prefix, openBracket, closeBracket, suffix, autoWrapPrevious = true) {
  let targetInput = lastActiveInput;
  
  if (!targetInput) {
    const inputs = document.querySelectorAll('.step-input');
    if (inputs.length > 0) {
      targetInput = inputs[0];
      lastActiveInput = targetInput;
    }
  }
  
  if (targetInput) {
    const start = targetInput.selectionStart;
    const end = targetInput.selectionEnd;
    const text = targetInput.value;
    
    if (start !== end) {
      const selectedText = text.substring(start, end);
      const wrapped = `${prefix}${openBracket}${selectedText}${closeBracket}${suffix}`;
      targetInput.value = text.substring(0, start) + wrapped + text.substring(end);
      
      const cursorPos = start + wrapped.length;
      targetInput.setSelectionRange(cursorPos, cursorPos);
    } else if (autoWrapPrevious) {
      const beforeCursor = text.substring(0, start);
      const afterCursor = text.substring(end);
      
      const match = beforeCursor.match(/([a-zA-Z0-9_\)]+)$/);
      
      if (match) {
        const expr = match[1];
        const wrapped = `${prefix}${openBracket}${expr}${closeBracket}${suffix}`;
        const newBefore = beforeCursor.substring(0, beforeCursor.length - expr.length);
        targetInput.value = newBefore + wrapped + afterCursor;
        
        const cursorPos = newBefore.length + wrapped.length;
        targetInput.setSelectionRange(cursorPos, cursorPos);
      } else {
        const emptyTemplate = `${prefix}${openBracket}${closeBracket}${suffix}`;
        targetInput.value = beforeCursor + emptyTemplate + afterCursor;
        
        const cursorPos = start + prefix.length + openBracket.length;
        targetInput.setSelectionRange(cursorPos, cursorPos);
      }
    } else {
      const emptyTemplate = `${prefix}${openBracket}${closeBracket}${suffix}`;
      const beforeCursor = text.substring(0, start);
      const afterCursor = text.substring(end);
      targetInput.value = beforeCursor + emptyTemplate + afterCursor;
      
      const cursorPos = start + prefix.length + openBracket.length;
      targetInput.setSelectionRange(cursorPos, cursorPos);
    }
    
    targetInput.focus();
    updateStepPreview(targetInput);
    updateTotalPreview();
  }
}

/**
 * 更新单个步骤的预览
 */
function updateStepPreview(textarea) {
  const stepDiv = textarea.closest('.flex.items-start');
  if (!stepDiv) return;
  
  const preview = stepDiv.querySelector('.step-preview');
  if (!preview) return;
  
  const content = textarea.value.trim();
  
  if (content) {
    const latexContent = convertToLatex(content);
    preview.innerHTML = `$$${latexContent}$$`;
    
    if (window.MathJax && MathJax.typesetPromise) {
      MathJax.typesetPromise([preview]).catch((err) => {
        console.warn('MathJax渲染错误:', err);
      });
    }
  } else {
    preview.innerHTML = '<span class="text-slate-400 text-xs">预览将显示在这里</span>';
  }
}

/**
 * 更新总预览（组合所有步骤）
 */
function updateTotalPreview() {
  const previewArea = document.getElementById('previewArea');
  if (!previewArea) return;
  
  const inputs = document.querySelectorAll('.step-input');
  const allContent = [];
  
  inputs.forEach(input => {
    const content = input.value.trim();
    if (content) {
      allContent.push(content);
    }
  });
  
  if (allContent.length > 0) {
    const latexLines = allContent.map(content => {
      const latex = convertToLatex(content);
      return `$$${latex}$$`;
    });
    
    previewArea.innerHTML = `<div class="math-display">${latexLines.join('<br/>')}</div>`;
    
    if (window.MathJax && MathJax.typesetPromise) {
      MathJax.typesetPromise([previewArea]).catch((err) => {
        console.warn('MathJax渲染错误:', err);
      });
    }
  } else {
    previewArea.innerHTML = '<p class="text-slate-400 text-sm italic">输入内容后将在这里预览渲染效果</p>';
  }
}

/**
 * 将文本转换为LaTeX格式
 */
function convertToLatex(text) {
  let latex = text;
  
  // 处理上标
  latex = latex.replace(/x\^2/g, 'x^{2}');
  latex = latex.replace(/x\^3/g, 'x^{3}');
  latex = latex.replace(/\^2/g, '^{2}');
  latex = latex.replace(/\^3/g, '^{3}');
  
  // 处理下标
  latex = latex.replace(/x_1/g, 'x_{1}');
  latex = latex.replace(/x_2/g, 'x_{2}');
  
  // 处理根号
  latex = latex.replace(/sqrt\{([^}]+)\}/g, '\\sqrt{$1}');
  latex = latex.replace(/sqrt/g, '\\sqrt{}');
  
  // 处理分数
  latex = latex.replace(/frac\{([^}]+)\}\{([^}]+)\}/g, '\\frac{$1}{$2}');
  
  // 处理特殊符号
  latex = latex.replace(/times/g, '\\times');
  latex = latex.replace(/div/g, '\\div');
  latex = latex.replace(/pm/g, '\\pm');
  latex = latex.replace(/Delta/g, '\\Delta');
  
  // 处理Unicode字符
  latex = latex.replace(/²/g, '^{2}');
  latex = latex.replace(/³/g, '^{3}');
  latex = latex.replace(/√/g, '\\sqrt{}');
  latex = latex.replace(/×/g, '\\times');
  latex = latex.replace(/÷/g, '\\div');
  latex = latex.replace(/±/g, '\\pm');
  latex = latex.replace(/Δ/g, '\\Delta');
  latex = latex.replace(/₁/g, '_{1}');
  latex = latex.replace(/₂/g, '_{2}');
  
  return latex;
}

/**
 * 加载因式分解法示例
 */
function loadFactorizationSample() {
  const container = document.getElementById('stepsContainer');
  if (container) {
    container.innerHTML = '';
  }
  
  const sampleSteps = [
    '解：x²-5x+6=0',
    '(x-2)(x-3)=0',
    'x-2=0 或 x-3=0',
    'x₁=2, x₂=3'
  ];
  
  sampleSteps.forEach(step => addStep(step));
  
  // 延迟更新总预览，确保所有步骤都已添加
  setTimeout(() => {
    updateTotalPreview();
  }, 100);
}

/**
 * 加载直接开平方法示例
 */
function loadSquareRootSample() {
  const container = document.getElementById('stepsContainer');
  if (container) {
    container.innerHTML = '';
  }
  
  const sampleSteps = [
    '解：(x+3)²=16',
    'x+3=±4',
    'x+3=4 或 x+3=-4',
    'x₁=1, x₂=-7'
  ];
  
  sampleSteps.forEach(step => addStep(step));
  
  // 延迟更新总预览，确保所有步骤都已添加
  setTimeout(() => {
    updateTotalPreview();
  }, 100);
}

/**
 * 加载配方法示例
 */
function loadCompletingSquareSample() {
  const container = document.getElementById('stepsContainer');
  if (container) {
    container.innerHTML = '';
  }
  
  const sampleSteps = [
    '解：x²+6x-1=0',
    'x²+6x=1',
    'x²+6x+9=1+9',
    '(x+3)²=10',
    'x+3=±√10',
    'x₁=-3+√10, x₂=-3-√10'
  ];
  
  sampleSteps.forEach(step => addStep(step));
  
  // 延迟更新总预览，确保所有步骤都已添加
  setTimeout(() => {
    updateTotalPreview();
  }, 100);
}

/**
 * 加载公式法示例
 */
function loadFormulaMethodSample() {
  const container = document.getElementById('stepsContainer');
  if (container) {
    container.innerHTML = '';
  }
  
  const sampleSteps = [
    '解：x²+5x+6=0',
    'a=1, b=5, c=6',
    'Δ=b²-4ac=25-24=1>0',
    'x=(-b±√Δ)/2a',
    'x=(-5±1)/2',
    'x₁=-2, x₂=-3'
  ];
  
  sampleSteps.forEach(step => addStep(step));
  
  // 延迟更新总预览，确保所有步骤都已添加
  setTimeout(() => {
    updateTotalPreview();
  }, 100);
}

/**
 * 重置系统
 */
function resetSystem() {
  // 隐藏报告区域
  const reportSection = document.getElementById('reportSection');
  if (reportSection) {
    reportSection.classList.add('hidden');
  }

  // 清除所有步骤的高亮
  const stepDivs = document.querySelectorAll('#stepsContainer > div');
  stepDivs.forEach(div => div.classList.remove('step-correct', 'step-error'));

  // 清空所有步骤输入框的内容
  const inputs = document.querySelectorAll('.step-input');
  inputs.forEach(input => {
    input.value = '';
  });

  // 更新预览
  updateTotalPreview();
  
  // 重新渲染每个步骤的预览（清空）
  inputs.forEach(input => {
    updateStepPreview(input);
  });

  // 滚动到编辑区顶部
  const step2Section = document.getElementById('step2Section');
  if (step2Section) {
    step2Section.scrollIntoView({ behavior: 'smooth' });
  }
}

/**
 * 初始化 OCR 相关事件
 */
function initOcrEvents() {
  const ocrBtn = document.getElementById('ocrBtn');
  const closeOcrBtn = document.getElementById('closeOcrBtn');
  const ocrSection = document.getElementById('ocrSection');
  const ocrUploadZone = document.getElementById('ocrUploadZone');
  const ocrImageInput = document.getElementById('ocrImageInput');
  const ocrRemoveImage = document.getElementById('ocrRemoveImage');
  const ocrRecognizeBtn = document.getElementById('ocrRecognizeBtn');
  const useOcrResultBtn = document.getElementById('useOcrResultBtn');
  
  let currentOcrImageFile = null;
  let ocrResultText = '';
  
  // 打开 OCR 面板
  if (ocrBtn) {
    ocrBtn.addEventListener('click', () => {
      ocrSection.classList.remove('hidden');
      ocrSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }
  
  // 关闭 OCR 面板
  if (closeOcrBtn) {
    closeOcrBtn.addEventListener('click', () => {
      ocrSection.classList.add('hidden');
      resetOcrForm();
    });
  }
  
  // 点击上传区域
  if (ocrUploadZone) {
    ocrUploadZone.addEventListener('click', () => {
      if (!currentOcrImageFile) {
        ocrImageInput.click();
      }
    });
  }
  
  // 文件选择
  if (ocrImageInput) {
    ocrImageInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        handleOcrImageFile(file);
      }
    });
  }
  
  // 拖拽事件
  if (ocrUploadZone) {
    ocrUploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      ocrUploadZone.classList.add('dragover');
    });
    
    ocrUploadZone.addEventListener('dragleave', () => {
      ocrUploadZone.classList.remove('dragover');
    });
    
    ocrUploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      ocrUploadZone.classList.remove('dragover');
      
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        handleOcrImageFile(file);
      }
    });
  }
  
  // 移除图片
  if (ocrRemoveImage) {
    ocrRemoveImage.addEventListener('click', (e) => {
      e.stopPropagation();
      resetOcrForm();
    });
  }
  
  // 处理图片文件
  function handleOcrImageFile(file) {
    currentOcrImageFile = file;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const previewImg = document.getElementById('ocrPreviewImg');
      const uploadPlaceholder = document.getElementById('ocrUploadPlaceholder');
      const imagePreview = document.getElementById('ocrImagePreview');
      
      previewImg.src = e.target.result;
      uploadPlaceholder.classList.add('hidden');
      imagePreview.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  }
  
  // 重置 OCR 表单
  function resetOcrForm() {
    currentOcrImageFile = null;
    ocrResultText = '';
    ocrImageInput.value = '';
    
    const uploadPlaceholder = document.getElementById('ocrUploadPlaceholder');
    const imagePreview = document.getElementById('ocrImagePreview');
    const resultSection = document.getElementById('ocrResultSection');
    
    uploadPlaceholder.classList.remove('hidden');
    imagePreview.classList.add('hidden');
    resultSection.classList.add('hidden');
  }
  
  // 开始识别
  if (ocrRecognizeBtn) {
    ocrRecognizeBtn.addEventListener('click', async () => {
      if (!currentOcrImageFile) {
        showToast('请先上传图片！', 'error');
        return;
      }
      
      const loadingState = document.getElementById('ocrLoadingState');
      const resultContent = document.getElementById('ocrResultContent');
      const errorState = document.getElementById('ocrErrorState');
      const resultText = document.getElementById('ocrResultText');
      const errorMessage = document.getElementById('ocrErrorMessage');
      
      // 显示加载状态
      document.getElementById('ocrResultSection').classList.remove('hidden');
      loadingState.classList.remove('hidden');
      resultContent.classList.add('hidden');
      errorState.classList.add('hidden');
      ocrRecognizeBtn.disabled = true;
      
      try {
        // 准备表单数据
        const formData = new FormData();
        formData.append('image', currentOcrImageFile);
        
        // 发送请求（不再传递 prompt 参数）
        const response = await fetch('/api/ocr', {
          method: 'POST',
          body: formData
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || '识别失败');
        }
        
        // 显示结果
        ocrResultText = data.result;
        resultText.textContent = data.result;
        
        loadingState.classList.add('hidden');
        resultContent.classList.remove('hidden');
        
      } catch (error) {
        loadingState.classList.add('hidden');
        errorState.classList.remove('hidden');
        errorMessage.textContent = error.message;
      } finally {
        ocrRecognizeBtn.disabled = false;
      }
    });
  }
  
  // 使用识别结果填充步骤
  if (useOcrResultBtn) {
    useOcrResultBtn.addEventListener('click', () => {
      if (!ocrResultText) {
        showToast('没有可使用的识别结果', 'error');
        return;
      }
      
      // 清空现有步骤
      const container = document.getElementById('stepsContainer');
      if (container) {
        container.innerHTML = '';
      }
      
      // 按行分割识别结果，并进行清理
      const lines = ocrResultText
        .split('\n')
        .map(line => line.trim())
        .filter(line => {
          // 过滤空行
          if (!line) return false;
          // 过滤可能的多余说明文字（如“识别结果”、“以下是...”等）
          const skipPatterns = [
            /^识别结果[:：]?$/,
            /^以下是[:：]?$/,
            /^我识别到的内容[:：]?$/,
            /^识别到的解题步骤[:：]?$/,
            /^输出结果[:：]?$/,
            /^result[:：]?$/i,
            /^recognized content[:：]?$/i
          ];
          return !skipPatterns.some(pattern => pattern.test(line));
        });
      
      if (lines.length === 0) {
        showToast('识别结果为空或格式不正确', 'error');
        return;
      }
      
      // 添加每个步骤
      lines.forEach(line => {
        addStep(line);
      });
      
      // 关闭 OCR 面板
      ocrSection.classList.add('hidden');
      resetOcrForm();
      
      showToast(`已填充 ${lines.length} 个步骤`, 'success');
      
      // 滚动到步骤区域
      if (container) {
        container.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }
}

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(() => {
    initEditorModule();
  }, 300);
});
