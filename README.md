# Course_Content

# Smart Learning Module Backend

## Setup Instructions
1. Clone the repository.
2. Create and activate a virtual environment:
   `python -m venv venv`
   `venv\Scripts\Activate.ps1` (For PowerShell)
3. Install dependencies:
   `pip install -r requirements.txt`
4. Set `MOCK_MODE = True` at the top of `app.py` to develop locally without requiring active Google Cloud permissions.
5. Execute `python app.py` to generate the mock JSON layouts and video routing structures in the `output/` folder.
