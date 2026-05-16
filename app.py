import os
import requests
import json
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # 允许前端跨域请求

API_KEY = os.getenv("DEEPSEEK_API_KEY")
if not API_KEY:
    raise Exception("请在环境变量中设置 DEEPSEEK_API_KEY")

# Qwen-VL API Key（用于视觉理解）
DASHSCOPE_API_KEY = os.getenv("DASHSCOPE_API_KEY")

# OCR 识别提示词
OCR_SYSTEM_PROMPT = """请识别图片中的数学解题步骤，按行输出。
要求：
1. 每行一个步骤
2. 不要添加行号、解释或额外文字
3. 保留“解：”等开头
"""

# 提示词
SYSTEM_PROMPT = """
你是初中数学教师，负责批改一元二次方程的解题过程。用户会按顺序给出解题步骤，每行一步，行号从1开始。
完成判题，特别说明的要求：
要求1:每次判题必须检查题解是否完整，即最后一行是否有解的形式，若无则必须判错。
要求2:求得解必须把解代回第一行方程验算，如果错误必须判错。

输出格式为严格的JSON对象，包含以下字段：
{
  "correct": boolean,
  "error_step": string,     // 例如 "第2步" 或 "第2步到第3步"，正确时为空字符串
  "error_type": string,     // 从下方错误类型列表中选择，正确时为空字符串
  "hint": string,           // 错误的详细解释和修正建议，正确时为空字符串
  "exercises": [string, string, string]  // 正确时为空数组
}

请按以下方式输出JSON：
如果错误：
   - 指出第一个关键错误发生的步骤（如 "第2步" 或 "第2步到第3步"）。
   - 从下方"错误类型列表"中选择最匹配的一类，填写error_type。
   - 在 hint 中详细说明：具体哪里错了、为什么错、正确的做法是什么。
   - 推荐3道与该错误类型相关、难度适合的同类一元二次方程练习题（只给题目，不包含解答）。
如果hint中说明了多个错误：
   - 整理并更新输出的JSON，使得错误步骤为第一个错误发生的步骤，hint指出该位置的详细信息
如果完全正确且解完整：
   - correct 为 true
   - error_step、error_type 和 hint 设为空字符串 ""
   - exercises 设为空数组 []

"错误类型列表（请严格使用以下分类名称）":
[
  "步骤缺失或未完成",
  "符号或移项错误",
  "因式分解错误",
  "配方错误",
  "公式法应用错误",
  "根求解不完整或丢失"
  "其他错误类型"
]

针对示例（判题前先读）：
示例1（步骤缺失或未完成）：
输入：
第1步：x²+6x=1
第2步：x²+6x+9=1+9
第3步：(x+3)²=10
输出：
{
  "correct": false,
  "error_step": "第3步",
  "error_type": "步骤缺失或未完成",
  "hint": "步骤变换合法。但未能写出最终解。应当继续求解，x+3=±√10，x=-3±√10等",
  "exercises": ["x²+8x+5=0", "x²-4x+1=0", "3x²+6x-2=0"]
}

示例2（配方错误）：
输入：
第1步：x²+6x=1
第2步：x²+6x+9=1+9
第3步：(x+3)²=11
第4步：x+3=x+3=±√11，x=-3±√11
输出：
{
  "correct": false,
  "error_step": "第2步到第3步",
  "error_type": "配方错误",
  "hint": "配方时，等式右边应为1+9=10，而非11。正确步骤：(x+3)²=10，进而x+3=±√10，x=-3±√10。",
  "exercises": ["x²+8x+5=0", "x²-4x+1=0", "3x²+6x-2=0"]
}

示例3（公式法应用错误）：
输入：
第1步：2x²+3x-1=0
第2步：a=2, b=3, c=-1
第3步：Δ=b²-4ac=9+8=18>0
第4步：x=(-b±√Δ)/2a
第5步：x=(-3±3√2)/4
第6步：x₁=(-3+3√2)/4, x₂=(-3-3√2)/4
输出：
{
  "correct": false,
  "error_step": "第3步",
  "error_type": "公式法应用错误",
  "hint": "计算判别式时，9+8结果应为17而非18。正确步骤：Δ=b²-4ac=9+8=17>0。",
  "exercises": ["3x²-4x-2=0", "4x²+2x-1=0", "5x²-3x-1=0"]
}

"""


@app.route('/')
def solver():
    return app.send_static_file('solver.html')


@app.route('/demo')
def index():
    return app.send_static_file('index.html')


@app.route('/VLtest')
def vl_test():
    return app.send_static_file('vltest.html')


@app.route('/api/check', methods=['POST'])
def check():
    data = request.json
    steps = data.get('steps', [])
    steps_text = '\n'.join([f"第{i+1}步: {s}" for i, s in enumerate(steps)])

    payload = {
        "model": "deepseek-reasoner",
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": steps_text}
        ],
        "temperature": 0.1,
        "max_tokens": 2000
    }

    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }

    try:
        resp = requests.post(
            "https://api.deepseek.com/v1/chat/completions",
            json=payload,
            headers=headers,
            timeout=45  # 推理模型可能稍慢，增加超时
        )
        if resp.status_code != 200:
            return jsonify({"error": f"API调用失败，状态码 {resp.status_code}"}), 500

        result = resp.json()
        content = result['choices'][0]['message']['content']
        # 清理可能的多余字符（保证是纯JSON）
        # 简单找第一个 { 和最后一个 }
        start = content.find('{')
        end = content.rfind('}')
        if start != -1 and end != -1:
            content = content[start:end + 1]
        parsed = json.loads(content)
        return jsonify(parsed)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


"""
//已废弃的方案（原模型为deepseek-chat）
@app.route('/api/check', methods=['POST'])
def check():
    data = request.json
    steps = data.get('steps', [])  # 前端发来类似 ["x²-5x+6=0", "(x-2)(x-3)=0", "x=2或3"]

    # 把步骤拼成易读的文本
    steps_text = '\\n'.join([f"第{i + 1}步: {s}" for i, s in enumerate(steps)])

    payload = {
        "model": "deepseek-chat",
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": steps_text}
        ],
        "temperature": 0.1,
        "response_format": {"type": "json_object"}
    }
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }

    try:
        resp = requests.post(
            "https://api.deepseek.com/v1/chat/completions",
            json=payload,
            headers=headers,
            timeout=30
        )
        if resp.status_code != 200:
            return jsonify({"error": f"API调用失败，状态码 {resp.status_code}"}), 500

        result = resp.json()
        content = result['choices'][0]['message']['content']
        # 清理可能的多余字符（保证是纯JSON）
        # 简单找第一个 { 和最后一个 }
        start = content.find('{')
        end = content.rfind('}')
        if start != -1 and end != -1:
            content = content[start:end + 1]
        parsed = json.loads(content)
        return jsonify(parsed)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
"""

@app.route('/api/ocr', methods=['POST'])
def ocr_recognize():
    """使用 Qwen-VL 模型进行图片 OCR 识别"""
    if not DASHSCOPE_API_KEY:
        return jsonify({"error": "请配置 DASHSCOPE_API_KEY 环境变量"}), 500
    
    try:
        # 获取上传的图片
        if 'image' not in request.files:
            return jsonify({"error": "未找到图片文件"}), 400
        
        image_file = request.files['image']
        if image_file.filename == '':
            return jsonify({"error": "未选择图片"}), 400
        
        # 读取图片并转换为 base64
        import base64
        image_data = image_file.read()
        image_base64 = base64.b64encode(image_data).decode('utf-8')
        
        # 调用 Qwen-VL API（使用后端预设提示词）
        payload = {
            "model": "qwen3-vl-plus",
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_base64}"
                            }
                        },
                        {
                            "type": "text",
                            "text": OCR_SYSTEM_PROMPT
                        }
                    ]
                }
            ]
        }
        
        headers = {
            "Authorization": f"Bearer {DASHSCOPE_API_KEY}",
            "Content-Type": "application/json"
        }
        
        resp = requests.post(
            "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
            json=payload,
            headers=headers,
            timeout=60
        )
        
        if resp.status_code != 200:
            return jsonify({"error": f"API调用失败，状态码 {resp.status_code}: {resp.text}"}), 500
        
        result = resp.json()
        content = result['choices'][0]['message']['content']
        
        return jsonify({
            "success": True,
            "result": content,
            "usage": result.get('usage', {})
        })
        
    except Exception as e:
        return jsonify({"error": f"OCR识别失败: {str(e)}"}), 500


# 把前端静态文件也放一起托管（可选，方便部署）
import os as _os

if _os.path.exists("static"):
    app.static_folder = 'static'

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get("PORT", 5000)), debug=False)
