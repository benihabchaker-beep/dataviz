# Tranco Rank Comparer

A web application for visualizing and comparing historical website popularity rankings.

## Features

### 📊 Data Visualization
- **Timeline View**: Compare rank evolution over time for multiple domains
- **Stability Matrix**: Analyze domain stability vs popularity with bubble chart
- **Interactive Zoom**: Use mouse wheel to zoom, drag to select regions, Shift+drag to pan
- **Export Options**: Export charts as PNG or standalone HTML files

### 📤 Data Sources
The application supports two data sources:

1. **Database (Tranco)**: Query historical rank data from SQLite database
2. **CSV Files**: Upload your own CSV files with rank data

### 🔄 File Upload System

#### Upload CSV Files
1. Navigate to the upload page (`/upload.html`)
2. Drag & drop or select a CSV file
3. The domain name is automatically extracted from the filename

#### CSV Format
Files should be named `domain.csv` (e.g., `wikipedia.org.csv`) and contain:
```csv
date,rank
2022-03,10
2022-04,12
2022-05,15
```

Date formats supported:
- `YYYY-MM-DD` (e.g., 2022-03-15)
- `YYYY-MM` (e.g., 2022-03) - automatically converts to first day of month

#### API Endpoints

**Upload File**
```
POST /api/upload
Content-Type: multipart/form-data
Body: file (CSV), domain (optional)
```

**List Available Domains**
```
GET /api/domains/files
Response: { domains: [{ domain, filename, size, modified }] }
```

**Get Ranks from File**
```
GET /api/ranks/file?domain=example.com&start_date=2022-01-01&end_date=2022-12-31
Response: { domain, ranks: [{ date, rank }] }
```

**Get Ranks from Database**
```
GET /api/ranks?domain=example.com&start_date=2022-01-01&end_date=2022-12-31
Response: { domain, ranks: [{ date, rank }] }
```

### 🚀 Running the Application

1. Install dependencies:
```bash
pip install flask flask-cors
```

2. Start the server:
```bash
python app.py
```

3. Open browser to `http://localhost:8000`

### 📁 Directory Structure
```
.
├── app.py              # Flask backend
├── index.html          # Main visualization page
├── upload.html         # File upload page
├── script.js           # Frontend logic
├── style.css           # Styling
├── data/              # CSV files directory
│   ├── wikipedia.org.csv
│   ├── youtube.com.csv
│   └── ...
└── tranco.db          # SQLite database (optional)
```

### 🎨 Features

- **Dark Theme**: Modern, eye-friendly dark interface
- **Responsive Design**: Works on desktop and mobile
- **French Sidebar**: Context and usage tips in French
- **Auto-completion**: Suggests available domains as you type
- **Dual Data Source**: Automatically tries files first, then falls back to database

### 🔧 Configuration

File upload settings in `app.py`:
- Max file size: 16MB
- Allowed extensions: .csv only
- Upload folder: `data/`

## License

Data provided by [Tranco List](https://tranco-list.eu)
