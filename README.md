# Windows Command Prompt Local Run Guide

Use these commands in **Windows Command Prompt** to set up Python, Node, and run the Django backend alongside the React frontend.

```
winget install --id Python.Python.3.12 -s winget
winget install --id OpenJS.NodeJS.LTS -s winget
npm install -g pnpm

cd path\to\project
py -m venv venv
venv\Scripts\activate
pip install -r backend\requirements.txt
python backend\manage.py migrate
python backend\manage.py runserver 0.0.0.0:8000  REM keep this window open

REM New Command Prompt window
cd path\to\project
pnpm install
pnpm dev
REM Optional production build:
pnpm build
```

> Keep the backend terminal running while using the app. Use a second Command Prompt for the frontend commands.
