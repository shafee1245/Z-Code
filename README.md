# Z-Code - Enterprise QR Code Generator SaaS Platform

A production-ready, full-stack QR Code Generator platform (similar to Bitly/Flowcode) built with Next.js 14, FastAPI, and Supabase. Features dynamic QR codes, real-time analytics, custom styling, and high-resolution PNG generation with ultra-fast redirect links.

## 🚀 Features

- **Dynamic QR Codes**: Generate trackable QR codes with custom colors, styling, and branding
- **Live Customizer**: Real-time preview with instant updates as you customize
- **Advanced Analytics**: Track scans by time, device, country with interactive charts
- **Ultra-Fast Redirects**: HTTP 302 redirects with asynchronous analytics logging
- **High-Resolution Exports**: Generate crisp PNG QR codes with optional logo overlay
- **Row Level Security**: Complete data isolation with Supabase RLS policies
- **Modern UI/UX**: Beautiful SaaS dashboard built with Tailwind CSS

## 📁 Project Structure

```text
qr-generator-saas/
├── .env.example
├── README.md
├── supabase/
│   └── migrations/
│       └── 20261015000000_init_schema.sql
├── apps/
│   ├── web/                         # Next.js 14+ App Router Frontend
│   │   └── src/
│   │       ├── app/page.tsx         # Advanced Dashboard with Live Customizer & Analytics
│   │       └── components/          # QRCodeCanvas.tsx, Customizer.tsx, AnalyticsCharts.tsx
│   └── api/                         # FastAPI Python Backend
│       └── src/
│           ├── main.py              # Core API endpoints, CORS, dynamic short-link engine
│           └── models.py            # DB connection & SQLAlchemy models
└── infrastructure/
    └── docker-compose.yml           # Local dev stack (Postgres, API, Web)
```

## 🛠 Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Recharts, Lucide Icons
- **Backend**: FastAPI, Python 3.12, SQLAlchemy, Pydantic, Pillow, qrcode
- **Database**: PostgreSQL (Supabase)
- **Deployment**: Vercel (Frontend), Railway/Render (Backend), Supabase (DB + Auth)

---

## 🏃 Local Development

### Prerequisites

- Node.js 20+ and npm 10+
- Python 3.12+
- Docker Compose v2 (optional, for full stack)
- Git

### Option 1: Docker Compose (Recommended)

1. Clone the repository
```bash
git clone <repository-url>
cd qr-generator-saas
```

2. Copy environment variables
```bash
cp .env.example .env
```

3. Start all services
```bash
docker compose -f infrastructure/docker-compose.yml up --build
```

4. Access the applications:
- Web App: [http://localhost:3000](http://localhost:3000)
- API: [http://localhost:8000](http://localhost:8000)
- API Docs: [http://localhost:8000/docs](http://localhost:8000/docs)
- PostgreSQL: localhost:5432

### Option 2: Manual Setup

#### Backend (FastAPI)

1. Navigate to API directory
```bash
cd apps/api
```

2. Create and activate virtual environment
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies
```bash
pip install -r requirements.txt
```

4. Start the server
```bash
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend (Next.js)

1. Navigate to web directory
```bash
cd apps/web
```

2. Install dependencies
```bash
npm install
```

3. Start development server
```bash
npm run dev
```

---

## 🗄️ Supabase Setup

### 1. Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Create a new project
3. Note down your project URL, anon key, and service role key

### 2. Run Database Migrations

#### Using Supabase CLI (Recommended)

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref <your-project-ref>

# Run migrations
supabase db push
```

#### Using SQL Editor

1. Go to your Supabase project > SQL Editor
2. Copy the contents of `supabase/migrations/20261015000000_init_schema.sql`
3. Execute the SQL script

### 3. Configure Environment Variables

Update your `.env` file with Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres
```

---

## 🔧 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Health check endpoint |
| POST | `/api/generate` | Generate QR code with styling, returns PNG as base64 + short link |
| GET | `/s/{slug}` | Dynamic short link redirect (302) with async scan logging |
| GET | `/api/analytics/{slug}` | Get aggregated scan analytics for dashboard |
| GET | `/api/qrcodes` | List all QR codes (optional user_id filter) |

### Example: Generate QR Code

```bash
curl -X POST http://localhost:8000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "target_url": "https://example.com",
    "fill_color": "#123b32",
    "back_color": "#ffffff",
    "rounded_modules": false,
    "center_logo_overlay": false,
    "title": "My QR Code"
  }'
```

Response includes `qr_code_image` (base64 encoded PNG), `short_slug`, and `short_url`.

---

## 🚀 Production Deployment

### 1. Deploy Backend to Railway/Render

#### Railway
1. Connect your GitHub repo to [Railway](https://railway.app/)
2. Create a new service from `apps/api`
3. Set build command: `pip install -r requirements.txt`
4. Set start command: `uvicorn src.main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables from `.env.example`
6. Deploy

#### Render
1. Create a new Web Service on [Render](https://render.com/)
2. Connect repository, set root directory to `apps/api`
3. Build Command: `pip install -r requirements.txt`
4. Start Command: `gunicorn src.main:app -w 4 -k uvicorn.workers.UvicornWorker`
5. Add environment variables

### 2. Deploy Frontend to Vercel

1. Import project to [Vercel](https://vercel.com/)
2. Set root directory to `apps/web`
3. Configure environment variables:
```env
NEXT_PUBLIC_API_URL=https://your-api-url.com
NEXT_PUBLIC_APP_URL=https://your-app-url.com
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```
4. Deploy

### 3. Connect to Supabase Cloud

1. Use your Supabase cloud project credentials in production
2. Ensure RLS policies are properly configured (already in migrations)
3. Enable database backups in Supabase dashboard
4. Set up proper CORS origins for your production domains

---

## 🔒 Security Best Practices

- **Environment Variables**: Never commit `.env` files. Use secure secret management in production
- **Row Level Security**: RLS is enabled on all tables - users only access their own data
- **Service Role Key**: Keep `SUPABASE_SERVICE_ROLE_KEY` secure, only use in backend
- **CORS**: Configure `CORS_ORIGINS` to only allow trusted domains
- **Input Validation**: All API inputs are validated using Pydantic models
- **Rate Limiting**: Consider adding rate limiting for public endpoints in production

---

## 🧪 Testing & Quality

```bash
# Frontend linting
cd apps/web && npm run lint

# Frontend build
cd apps/web && npm run build

# API tests (if configured)
cd apps/api && pytest
```

---

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

**Built with ❤️ for production use**
## Production Deployment

### Required Environment Variables

#### Vercel (Frontend)
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- NEXT_PUBLIC_API_URL

#### Railway (Backend)
- API_SECRET_KEY
- API_BASE_URL
- FRONTEND_URL
- WEB_ORIGIN
- CORS_ORIGINS
- DATABASE_URL
- JWT_SECRET
- SUPABASE_SERVICE_ROLE_KEY
- ENVIRONMENT=production
- NODE_ENV=production
