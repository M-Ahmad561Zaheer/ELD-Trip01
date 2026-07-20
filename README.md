
````md
# ELD Trip Planner

A full-stack Electronic Logging Device trip planning application built with Django REST Framework and React.

The application accepts a driver's current location, pickup location, drop-off location, and current cycle hours used. It calculates the route, applies Hours of Service rules, adds required stops, and generates daily ELD logs.

## Live Application

Frontend:

```text
https://eldtrip.vercel.app
````

Backend API:

```text
https://eld-trip01.vercel.app
```

Backend health endpoint:

```text
https://eld-trip01.vercel.app/api/health/
```

Admin panel:

```text
https://eld-trip01.vercel.app/admin/
```

---

## Project Overview

The ELD Trip Planner is designed for property-carrying commercial drivers operating under the 70-hour / 8-day Hours of Service cycle.

The application:

* Calculates a driving route between the entered locations
* Applies Hours of Service limits
* Adds fuel, rest, pickup, and drop-off stops
* Calculates daily driving and duty hours
* Generates daily ELD log sheets
* Displays the route and stops on an interactive map
* Saves generated trip plans in the database

---

## Features

### Trip Planning

Users can enter:

* Current location
* Pickup location
* Drop-off location
* Current cycle hours used

The system returns:

* Total route distance
* Estimated trip duration
* Route geometry
* Pickup and drop-off stops
* Fuel stops
* Rest stops
* Daily driving schedule
* Daily ELD log sheets
* Remaining cycle hours

### Interactive Map

The frontend displays:

* Complete driving route
* Current location
* Pickup location
* Drop-off location
* Fuel stops
* Rest stops
* Stop details and coordinates

### Hours of Service Calculation

The backend applies the following assumptions:

* Property-carrying commercial driver
* 70-hour / 8-day cycle
* Maximum 11 hours of driving per shift
* Maximum 14-hour duty window
* 30-minute break after 8 hours of driving
* 10 consecutive hours off duty
* 34-hour cycle restart when required
* 1 hour for pickup
* 1 hour for drop-off
* Fuel stop every 1,000 miles
* No split sleeper berth calculation
* No adverse driving condition extension

### ELD Daily Logs

The application generates daily logs with the following duty statuses:

* Off Duty
* Sleeper Berth
* Driving
* On Duty, Not Driving

Each daily log includes:

* Date
* Duty status timeline
* Total driving hours
* Total on-duty hours
* Total off-duty hours
* Total sleeper berth hours
* Daily activity segments

### Trip History

Generated trip plans are stored in PostgreSQL and can be managed through the Django admin panel.

---

## Technology Stack

### Frontend

* React
* TypeScript
* Vite
* Leaflet
* React Leaflet
* HTML5
* CSS3

### Backend

* Python
* Django
* Django REST Framework
* PostgreSQL
* WhiteNoise
* Django CORS Headers
* dj-database-url

### External Services

* OpenStreetMap Nominatim for geocoding
* OSRM for route calculation
* OpenStreetMap tiles for map display

### Deployment

* Frontend: Vercel
* Backend: Vercel
* Database: Neon PostgreSQL

---

## Repository Structure

```text
Trip/
│
├── backend/
│   ├── config/
│   │   ├── settings.py
│   │   ├── urls.py
│   │   ├── wsgi.py
│   │   └── asgi.py
│   │
│   ├── trips/
│   │   ├── migrations/
│   │   ├── services/
│   │   │   ├── geocoding_service.py
│   │   │   ├── routing_service.py
│   │   │   ├── hos_engine.py
│   │   │   ├── route_geometry_service.py
│   │   │   └── log_generator.py
│   │   │
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── urls.py
│   │   └── views.py
│   │
│   ├── .env.example
│   ├── .python-version
│   ├── manage.py
│   ├── requirements.txt
│   └── vercel.json
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ELDLog.tsx
│   │   │   ├── TripForm.tsx
│   │   │   ├── TripMap.tsx
│   │   │   └── TripSummary.tsx
│   │   │
│   │   ├── api.ts
│   │   ├── types.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   │
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── vercel.json
│
├── .gitignore
└── README.md
```

---

## API Endpoints

### Root Endpoint

```http
GET /
```

Example response:

```json
{
  "success": true,
  "message": "ELD Trip Planner Backend API",
  "endpoints": {
    "admin": "/admin/",
    "health": "/api/health/",
    "plan_trip": "/api/trips/plan/"
  }
}
```

### Health Check

```http
GET /api/health/
```

Example response:

```json
{
  "success": true,
  "status": "healthy"
}
```

### Plan Trip

```http
POST /api/trips/plan/
```

Request body:

```json
{
  "current_location": "New York, NY",
  "pickup_location": "Chicago, IL",
  "dropoff_location": "Los Angeles, CA",
  "current_cycle_used": 20
}
```

Example response structure:

```json
{
  "success": true,
  "locations": {
    "current": {},
    "pickup": {},
    "dropoff": {}
  },
  "route": {
    "distance_miles": 0,
    "duration_hours": 0,
    "geometry": []
  },
  "schedule": [],
  "stop_markers": [],
  "daily_logs": [],
  "hos": {}
}
```

---

## Local Development

## Prerequisites

Install the following before running the project:

* Python 3.12 or later
* Node.js 18 or later
* npm
* Git

---

## Clone the Repository

```bash
git clone https://github.com/M-Ahmad561Zaheer/ELD-Trip01.git
cd Trip
```

---

## Backend Setup

Open the backend directory:

```bash
cd backend
```

Create a virtual environment:

### Windows

```powershell
py -m venv ../.venv
../.venv/Scripts/activate
```

### macOS or Linux

```bash
python3 -m venv ../.venv
source ../.venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create a local environment file:

```bash
copy .env.example .env
```

On macOS or Linux:

```bash
cp .env.example .env
```

Add the following variables to `backend/.env`:

```env
SECRET_KEY=your-local-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

DATABASE_URL=

CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
CSRF_TRUSTED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

NOMINATIM_USER_AGENT=ELDTripPlanner/1.0 (contact: your-email@example.com)
OSRM_BASE_URL=https://router.project-osrm.org
```

When `DATABASE_URL` is empty, Django uses the local SQLite database.

Run migrations:

```bash
py manage.py migrate
```

Create an admin user:

```bash
py manage.py createsuperuser
```

Run the backend:

```bash
py manage.py runserver
```

The backend will be available at:

```text
http://127.0.0.1:8000
```

---

## Frontend Setup

Open another terminal:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
copy .env.example .env
```

On macOS or Linux:

```bash
cp .env.example .env
```

Add the following variable:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Run the frontend:

```bash
npm run dev
```

The frontend will be available at:

```text
http://localhost:5173
```

---

## Environment Variables

### Backend Variables

| Variable               | Description                            |
| ---------------------- | -------------------------------------- |
| `SECRET_KEY`           | Django secret key                      |
| `DEBUG`                | Enables or disables Django debug mode  |
| `ALLOWED_HOSTS`        | Comma-separated backend hostnames      |
| `DATABASE_URL`         | PostgreSQL connection string           |
| `CORS_ALLOWED_ORIGINS` | Allowed frontend origins               |
| `CSRF_TRUSTED_ORIGINS` | Trusted CSRF origins                   |
| `NOMINATIM_USER_AGENT` | User agent used for Nominatim requests |
| `OSRM_BASE_URL`        | OSRM routing service URL               |

### Frontend Variables

| Variable            | Description                    |
| ------------------- | ------------------------------ |
| `VITE_API_BASE_URL` | Base URL of the Django backend |

---

## Production Environment Configuration

### Backend

The following environment variables are required in the backend Vercel project:

```env
SECRET_KEY=your-production-secret-key
DEBUG=False
ALLOWED_HOSTS=.vercel.app

DATABASE_URL=your-neon-postgresql-connection-string

CORS_ALLOWED_ORIGINS=https://eldtrip.vercel.app
CSRF_TRUSTED_ORIGINS=https://eldtrip.vercel.app

NOMINATIM_USER_AGENT=ELDTripPlanner/1.0 (contact: your-email@example.com)
OSRM_BASE_URL=https://router.project-osrm.org
```

### Frontend

The following environment variable is required in the frontend Vercel project:

```env
VITE_API_BASE_URL=https://eld-trip01.vercel.app
```

---

## Database

The application uses:

* SQLite for local development
* Neon PostgreSQL for production

The database stores generated trip plan information and Django admin data.

Apply production migrations using:

```powershell
$env:DATABASE_URL="your-neon-postgresql-url"
py manage.py migrate
```

Create a production admin user using:

```powershell
$env:DATABASE_URL="your-neon-postgresql-url"
py manage.py createsuperuser
```

Remove the temporary PowerShell environment variable after completing the operation:

```powershell
Remove-Item Env:DATABASE_URL
```

---

## Deployment

## Backend Deployment on Vercel

1. Import the GitHub repository into Vercel.
2. Set the root directory to:

```text
backend
```

3. Select Django as the framework.
4. Add all required backend environment variables.
5. Deploy the project.
6. Run database migrations against the Neon database.

Backend URL:

```text
https://eld-trip01.vercel.app
```

## Frontend Deployment on Vercel

1. Import the same GitHub repository as a new Vercel project.
2. Set the root directory to:

```text
frontend
```

3. Select Vite as the framework.
4. Add `VITE_API_BASE_URL`.
5. Deploy the project.

Frontend URL:

```text
https://eldtrip.vercel.app
```

---

## Application Workflow

1. The user enters trip details in the React frontend.
2. The frontend sends the trip details to the Django API.
3. The backend geocodes all entered locations.
4. OSRM calculates the route and route geometry.
5. The HOS engine applies driving and duty limits.
6. Fuel, rest, pickup, and drop-off stops are generated.
7. Daily ELD logs are created.
8. The generated trip is stored in PostgreSQL.
9. The frontend displays the route, schedule, stops, and logs.

---

## Hours of Service Logic

The HOS calculation engine tracks:

* Available driving hours
* Available duty window
* Current cycle hours
* Required break time
* Required off-duty rest
* Pickup duty time
* Drop-off duty time
* Fuel stop time
* Remaining route duration
* Daily and cycle limits

A new driving period begins only after the required off-duty rest has been completed.

A 34-hour restart is added when the remaining cycle hours are insufficient to continue the trip.

---

## External API Usage

### Nominatim

Nominatim converts location names into geographic coordinates.

A valid user agent is provided with every request to comply with the service usage requirements.

### OSRM

OSRM calculates:

* Route distance
* Route duration
* Route geometry
* Coordinate path

Public OSRM services are used for development and assessment demonstration purposes.

---

## Security

The project includes:

* Environment-based secret configuration
* Production debug mode disabled
* Secure session cookies
* Secure CSRF cookies
* HTTPS proxy configuration
* CORS origin restrictions
* CSRF trusted origin restrictions
* WhiteNoise static file handling
* Environment files excluded from Git

Never commit the following files:

```text
.env
db.sqlite3
.venv/
venv/
```

Never expose database passwords, API secrets, or Django secret keys in the repository.

---

## Testing

Run Django system checks:

```bash
py manage.py check
```

Run backend tests:

```bash
py manage.py test
```

Build the frontend:

```bash
npm run build
```

Preview the frontend production build:

```bash
npm run preview
```

---

## Known Limitations

* Public Nominatim and OSRM services may enforce rate limits.
* Route results depend on third-party service availability.
* Traffic conditions are not included.
* Split sleeper berth rules are not implemented.
* Adverse driving condition extensions are not implemented.
* Ferry, border, toll, and weather-related delays are not calculated.
* Fuel stops are calculated based on distance intervals rather than live fuel station data.

---

## Future Improvements

Potential improvements include:

* Live traffic integration
* Real fuel station search
* PDF export for ELD logs
* Driver authentication
* Saved trip history dashboard
* Editable trip schedules
* Multiple vehicle profiles
* Real-time weather alerts
* FMCSA data integration

These improvements are outside the current assessment scope.

---

## Assessment Deliverables

This repository includes:

* Django REST Framework backend
* React and TypeScript frontend
* Interactive route map
* Hours of Service calculation
* Fuel and rest stop generation
* Daily ELD log generation
* PostgreSQL database integration
* Live frontend deployment
* Live backend deployment
* GitHub source code

---

## Author

**Ahmad Zaheer**

Full Stack Developer

Technologies:

* React
* TypeScript
* Python
* Django
* Django REST Framework
* PostgreSQL
* REST APIs

---

## License

This project was developed as a technical assessment and demonstration project.

It is intended for educational, evaluation, and portfolio purposes.

````



