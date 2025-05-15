from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import os
from dotenv import load_dotenv
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

TOGETHER_API_KEY = os.getenv('TOGETHER_API_KEY')
TOGETHER_API_URL = 'https://api.together.xyz/v1/chat/completions'

def validate_api_key():
    if not TOGETHER_API_KEY:
        logger.error("API key not configured")
        return False
    return True

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"}), 200

@app.route('/chat', methods=['POST'])
def chat():
    try:
        # Validate API key first
        if not validate_api_key():
            return jsonify({
                "status": "error",
                "message": "Server configuration error"
            }), 500

        data = request.json
        user_message = data.get('message', '').strip()
        
        if not user_message:
            return jsonify({
                "status": "error",
                "message": "Message cannot be empty"
            }), 400

        headers = {
            "Authorization": f"Bearer {TOGETHER_API_KEY}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }

        payload = {
            "model": "mistralai/Mixtral-8x7B-Instruct-v0.1",
            "messages": [{"role": "user", "content": user_message}],
            "temperature": 0.7,
            "max_tokens": 1024,
            "stop": ["</s>"]
        }

        logger.info(f"Sending request to Together AI: {payload}")
        response = requests.post(
            TOGETHER_API_URL,
            json=payload,
            headers=headers,
            timeout=30  # 30 seconds timeout
        )

        response.raise_for_status()
        response_data = response.json()
        
        if 'choices' not in response_data or len(response_data['choices']) == 0:
            raise ValueError("Invalid response format from API")

        ai_response = response_data['choices'][0]['message']['content']
        logger.info(f"Received response: {ai_response[:100]}...")

        return jsonify({
            "status": "success",
            "response": ai_response
        })

    except requests.exceptions.RequestException as e:
        logger.error(f"API request failed: {str(e)}")
        status_code = e.response.status_code if e.response else 500
        return jsonify({
            "status": "error",
            "message": f"API request failed: {str(e)}"
        }), status_code
        
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return jsonify({
            "status": "error",
            "message": f"An unexpected error occurred: {str(e)}"
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)