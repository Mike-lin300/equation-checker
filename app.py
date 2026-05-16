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

# 提示词
SYSTEM_PROMPT = """
你是初中数学教师，负责批改一元二次方程的解题过程。用户会按顺序给出解题步骤，每行一步，行号从1开始。

请按以下流程判断并输出JSON：

1. 先判断解题是否完整，检查最后一行是否有根的结果如（x_1=...,x_2=...），如果不完整，应该判定错误
给出未完成示例：
输入：
第1步：x²-5x+6=0
第2步：(x-2)(x-3)=0
第3步：x-2=0或x-3=0
判定输出：
{
  "correct": false,
  "error_step": "-",
  "error_type": "解题未完成",
  "hint": "解题未完成：已分解成两个因式，但未写出x=2和x=3，请补充最终解。",
  "exercises": []
}
完整后，再判断是否正确。

2. 如果错误：
   - 指出第一个关键错误发生的步骤（如 "第2步" 或 "第2步到第3步"）。
   - 从下方"错误类型列表"中选择最匹配的一类，填写error_type。
   - 在 hint 中详细说明：具体哪里错了、为什么错、正确的做法是什么。
   - 推荐3道与该错误类型相关、难度适合的同类一元二次方程练习题（只给题目，不包含解答）。
3. 如果完全正确且完整：
   - correct 为 true
   - error_step、error_type 和 hint 设为空字符串 ""
   - exercises 设为空数组 []

输出格式为严格的JSON对象，包含以下字段：
{
  "correct": boolean,
  "error_step": string,     // 例如 "第2步" 或 "第2步到第3步"，正确时为空字符串
  "error_type": string,     // 从下方错误类型列表中选择，正确时为空字符串
  "hint": string,           // 错误的详细解释和修正建议，正确时为空字符串
  "exercises": [string, string, string]  // 正确时为空数组
}

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
"""


@app.route('/')
def solver():
    return app.send_static_file('solver.html')


@app.route('/demo')
def index():
    return app.send_static_file('index.html')


@app.route('/api/check', methods=['POST'])
def check():
    data = request.json
    steps = data.get('steps', [])  # 前端发来类似 ["x²-5x+6=0", "(x-2)(x-3)=0", "x=2或3"]

    # 把步骤拼成易读的文本
    steps_text = '\n'.join([f"第{i + 1}步: {s}" for i, s in enumerate(steps)])

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


# 把前端静态文件也放一起托管（可选，方便部署）
import os as _os

if _os.path.exists("static"):
    app.static_folder = 'static'

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get("PORT", 5000)), debug=False)
