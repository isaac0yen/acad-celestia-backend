# Celestia Backend

A modern REST API built with FastAPI.

## Setup

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Create a `.env` file with:
```
DATABASE_URL=sqlite:///./app.db
SECRET_KEY=your-secret-key
```

4. Run migrations:
```bash
alembic upgrade head
```

5. Start the server:
```bash
uvicorn app.main:app --reload
```

Visit http://localhost:8000/docs for interactive API documentation.
