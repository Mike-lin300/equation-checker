/**
 * 主业务逻辑模块
 * 处理判题请求、报告渲染等功能
 */

/**
 * 提交判题请求
 */
async function submitForDiagnosis() {
  const inputs = document.querySelectorAll('.step-input');
  const steps = [];

  inputs.forEach((input) => {
    const content = input.value.trim();
    if (content) {
      steps.push(content);
    }
  });

  if (steps.length === 0) {
    showToast('请至少输入一个解题步骤！', 'error');
    return;
  }

  // 显示加载状态
  const diagnoseBtn = document.getElementById('diagnoseBtn');
  const originalText = diagnoseBtn.innerHTML;
  diagnoseBtn.disabled = true;
  diagnoseBtn.innerHTML = '<i data-lucide="loader-2" class="w-5 h-5 animate-spin inline-block"></i> 正在批改...';
  if (typeof lucide !== 'undefined') lucide.createIcons();

  try {
    const response = await fetch('/api/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ steps: steps })
    });

    if (!response.ok) {
      throw new Error(`服务器错误：${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    // 渲染报告
    renderReport(data, steps);
    showToast('批改完成！', 'success');
  } catch (err) {
    showToast('批改请求失败：' + err.message, 'error');
    console.error(err);
  } finally {
    // 恢复按钮
    diagnoseBtn.disabled = false;
    diagnoseBtn.innerHTML = originalText;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
}

/**
 * 渲染诊断报告
 */
function renderReport(result, steps) {
  // 1. 显示报告区域
  const reportSection = document.getElementById('reportSection');
  if (reportSection) {
    reportSection.classList.remove('hidden');
    scrollToElement('reportSection');
  }

  // 2. 整体判定
  const overallResult = document.getElementById('overallResult');
  if (overallResult) {
    if (result.correct) {
      overallResult.innerHTML = `
        <div class="bg-green-50 border border-green-300 rounded-lg p-4 flex items-start gap-3">
          <i data-lucide="check-circle-2" class="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5"></i>
          <div>
            <h3 class="text-lg font-bold text-green-800">完全正确</h3>
            <p class="text-green-700 text-sm">所有步骤变换合法，答案正确。</p>
          </div>
        </div>
      `;
    } else {
      overallResult.innerHTML = `
        <div class="bg-red-50 border border-red-300 rounded-lg p-4 flex items-start gap-3">
          <i data-lucide="x-circle" class="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5"></i>
          <div>
            <h3 class="text-lg font-bold text-red-800">发现错误</h3>
            <p class="text-red-700 text-sm">请查看下方详细诊断信息。</p>
          </div>
        </div>
      `;
    }
  }

  // 3. 错误精准定位
  const errorLocationDiv = document.getElementById('errorLocation');
  if (errorLocationDiv) {
    if (!result.correct && result.error_step) {
      const parsed = parseErrorStep(result.error_step);
      errorLocationDiv.innerHTML = `<p class="text-slate-700"><strong>${result.error_step}</strong></p>`;
      // 高亮步骤
      if (parsed.from >= 1 && parsed.to <= steps.length) {
        highlightSteps(parsed.from, parsed.to);
      }
    } else {
      errorLocationDiv.innerHTML = '<p class="text-slate-500">—</p>';
    }
  }

  // 4. 错误原因归类
  const errorClassificationDiv = document.getElementById('errorClassification');
  if (errorClassificationDiv) {
    if (!result.correct && result.error_type) {
      errorClassificationDiv.innerHTML = `
        <span class="inline-block bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
          ${result.error_type}
        </span>
      `;
    } else {
      errorClassificationDiv.innerHTML = '<p class="text-slate-500">—</p>';
    }
  }

  // 5. 详细诊断信息
  const detailedDiagnosisDiv = document.getElementById('detailedDiagnosis');
  if (detailedDiagnosisDiv) {
    if (!result.correct && result.hint) {
      detailedDiagnosisDiv.innerHTML = `<p class="text-slate-700">${result.hint}</p>`;
    } else {
      detailedDiagnosisDiv.innerHTML = '<p class="text-slate-500">暂无更多信息。</p>';
    }
  }

  // 6. 个性化强化练习
  const practiceDiv = document.getElementById('practiceQuestions');
  if (practiceDiv) {
    if (result.exercises && result.exercises.length > 0) {
      let html = '<div class="space-y-3">';
      result.exercises.forEach((q, index) => {
        html += `
          <div class="flex items-start gap-2 p-2 bg-white rounded border border-orange-100">
            <span class="flex-shrink-0 w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">${index + 1}</span>
            <div class="flex-1 text-slate-700 pt-0.5">$$${convertToLatex(q)}$$</div>
          </div>
        `;
      });
      html += '</div>';
      practiceDiv.innerHTML = html;
      // 重新渲染 LaTeX
      if (window.MathJax && MathJax.typesetPromise) {
        MathJax.typesetPromise([practiceDiv]).catch(console.warn);
      }
    } else {
      practiceDiv.innerHTML = '<p class="text-slate-500">暂无推荐题目。</p>';
    }
  }

  // 刷新图标
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

/**
 * 解析错误步骤字符串
 */
function parseErrorStep(errorStep) {
  const match = errorStep.match(/第(\d+)步到第(\d+)步/);
  if (match) {
    return { from: parseInt(match[1]), to: parseInt(match[2]) };
  }
  return { from: 0, to: 0 };
}

/**
 * 高亮指定的步骤
 */
function highlightSteps(from, to) {
  const stepDivs = document.querySelectorAll('#stepsContainer > div');
  stepDivs.forEach(div => {
    div.classList.remove('step-correct', 'step-error');
  });
  for (let i = from - 1; i < to; i++) {
    if (stepDivs[i]) {
      stepDivs[i].classList.add('step-error');
    }
  }
}
