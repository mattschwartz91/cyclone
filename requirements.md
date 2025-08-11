# Project Requirements

## Quick Start

For a quick development setup, run:
```sh
./start-dev.sh
```

This script will automatically install dependencies and start the development server.

## Manual Setup

### Frontend (client)

**Main dependencies:**
- react@^18.2.0
- react-dom@^18.2.0
- react-router-dom@^6.30.1
- leaflet@^1.9.4
- react-leaflet@^4.2.1
- framer-motion@^12.23.12
- lucide-react@^0.536.0
- react-google-autocomplete@^2.7.5
- react-just-parallax@^3.1.16
- scroll-lock@^2.1.5

**Dev dependencies:**
- @vitejs/plugin-react@^4.7.0
- tailwindcss@^3.4.1
- postcss@^8.4.31
- autoprefixer@^10.4.21
- vite@^6.3.5

**Install:**
```sh
cd client
npm install
```

If you need to manually install any missing packages:
```sh
npm install react@^18.2.0 react-dom@^18.2.0 react-router-dom@^6.30.1 leaflet@^1.9.4 react-leaflet@^4.2.1 framer-motion@^12.23.12 lucide-react@^0.536.0 react-google-autocomplete@^2.7.5 react-just-parallax@^3.1.16 scroll-lock@^2.1.5
npm install -D @vitejs/plugin-react@^4.7.0 tailwindcss@^3.4.1 postcss@^8.4.31 autoprefixer@^10.4.21 vite@^6.3.5
```

---

## Backend (server)

**Main dependencies:**
- express@^5.1.0
- cors@^2.8.5
- sqlite3@^5.1.7
- bcrypt@^6.0.0
- express-session@^1.18.2
- dotenv@^17.2.1
- axios@^1.6.0

**Python dependencies (for OSM routing):**
- requests>=2.28.0
- osmnx>=1.3.0  
- networkx>=2.8.0
- scikit-learn>=1.0.0

**Install:**
```sh
cd server
npm install

# Set up Python environment (recommended)
./setup_env.sh

# Run setup and validation script
node setup.js
```

**Manual Python setup:**
```sh
cd server
pip3 install -r requirements.txt
```

If you need to manually install any missing Node.js packages:
```sh
npm install express@^5.1.0 cors@^2.8.5 sqlite3@^5.1.7 bcrypt@^6.0.0 express-session@^1.18.2 dotenv@^17.2.1 axios@^1.6.0
```

## Environment Configuration

After running the setup scripts, make sure to:

1. Update the `.env` file with your actual API keys:
   - `GRAPHHOPPER_API_KEY` - Get from https://www.graphhopper.com/

2. Ensure Python 3 and pip3 are installed on your system

## Development

- **Frontend development server**: `cd client && npm run dev`
- **Backend server**: `cd server && node server.js`
- **Full development setup**: `./start-dev.sh` (from project root)