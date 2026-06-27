NGO Intelligence Dashboard

## Backend setup

From the project root:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn backend.main:app --reload
```

Open the API docs in a browser:

```powershell
start http://127.0.0.1:8000/docs
```

Seed sample data:

```powershell
python -m backend.seed_data
```

If you are already inside the `backend` directory, go back to the project root before starting Uvicorn:

```powershell
cd ..
uvicorn backend.main:app --reload
```

## Frontend setup

In a second terminal, from the project root:

```powershell
cd frontend
npm install
npm run dev
```

The frontend reads backend data from `http://127.0.0.1:8000` by default. To use a different backend URL:

```powershell
$env:VITE_API_BASE_URL="http://127.0.0.1:8000"
npm run dev
```
