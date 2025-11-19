# Windows Command Prompt Quickstart

Copy-paste these commands in **Windows Command Prompt** to install prerequisites, set up the Python/Django backend, and run the frontend:

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
