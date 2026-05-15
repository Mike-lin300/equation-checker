import os
import requests
import json
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # 允许前端跨域请求

# API_KEY = "sk-c52c2f25eb064559a13e4069ec2131e5"
API_KEY = os.getenv("DEEPSEEK_API_KEY")
if not API_KEY:
    raise Exception("请在环境变量中设置 DEEPSEEK_API_KEY")

# 提示词模板（把用户步骤设为占位符）
SYSTEM_PROMPT = """
你是初中数学教师，负责批改一元二次方程解题过程。用户会按顺序给出解题步骤，每行一步。请判断：
1. 整个过程是否正确。
2. 如果错误，指出哪一步到哪一步出了问题，并归类错误类型（如：移项变号错误、因式分解错误、配方法出错、公式法b²-4ac计算错误、开方丢根、舍根不当等）。
3. 如果正确，输出"完全正确"。
4. 最后，如果出错，推荐3道同类的一元二次方程练习题，只给题目，不包含解答。
输出格式：严格JSON对象，包含字段：correct(布尔), error_step(字符串), error_type(字符串), hint(字符串), exercises(字符串数组，3个题目)。
"""


@app.route('/')
def index():
    return app.send_static_file('index.html')


@app.route('/solver')
def solver():
    return app.send_static_file('solver.html')


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
    app.run(debug=True, port=5000)