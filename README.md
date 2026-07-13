# 🚀 Course Creator Backend Setup Guide
   
This guide walks you through setting up and running the live Gemini-powered Python backend on your local machine, plus how to test it.
   
---
   
## 📋 Prerequisites
   
Ensure you have Python 3.11+ installed. You will need your own free developer API key to run the live model without encountering enterprise cloud blocks.

## Setup Instructions
1. Clone the repository.
2. Create and activate a virtual environment:
   `python -m venv venv`
   `venv\Scripts\Activate.ps1` (For PowerShell)
3. Install dependencies:
   `pip install -r requirements.txt`
   
   ### Get Your Free Gemini API Key
   1. Go to [aistudio.google.com](https://aistudio.google.com).
   2. Click the **"Create API Key"** button.
   3. If prompted to choose a project, select **"Create project"** / **"Create new project"** from the dropdown to initialize a free background sandbox.
   4. Copy the generated API key string.

  
4. For Windows
   `set GEMINI_API_KEY="your_actual_copied_api_key_here"`
   `python app.py`

   For Mac/Linux
   `export GEMINI_API_KEY="your_actual_copied_api_key_here"`
   `python app.py`
4. Set `MOCK_MODE = False` at the top of `app.py` to develop locally without requiring active Google Cloud permissions.
5. Execute `python app.py`

6. Testing the API Endpoints (PowerShell)
      To verify the pipeline is working end-to-end before integrating it into the frontend interface, open a second, separate PowerShell window and run these       verification commands:
      
      1. Test Server Health
      Run this command to make sure the backend server is reachable and live:
      
      PowerShell
      `Invoke-RestMethod -Uri [http://127.0.0.1:5000/api/health](http://127.0.0.1:5000/api/health) -Method GET`
      Expected Response: {"status": "ok", "mock_mode": false}
      
      2. Test Content Generation (Live Gemini Call)
      Run this command to trigger a mock request for course generation. This calls the live Gemini 3.5 engine, generates structured data, and auto-saves it into       your SQLite course_content_creator.db database:
      
      PowerShell
      `Invoke-RestMethod -Uri [http://127.0.0.1:5000/api/generate](http://127.0.0.1:5000/api/generate) -Method POST -ContentType "application/json" -Body '{"admin_uid": "admin-uid-demo", "topic": "Introduction to Machine Learning"}'`
      Expected Response: A clean JSON output containing course_id, markdown-formatted lesson_text, an array of exactly 3 multiple-choice questions inside quiz_json, and an embed-ready layout-compatible video_url.
