from flask import Flask, request, jsonify
from flask_cors import CORS
from tranco import Tranco
import datetime
import os

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)  # Enable CORS for all routes

# Initialize Tranco with caching
CACHE_DIR = os.path.join(os.getcwd(), '.tranco_cache')
if not os.path.exists(CACHE_DIR):
    os.makedirs(CACHE_DIR)

t = Tranco(cache=True, cache_dir=CACHE_DIR)

# In-memory cache to speed up repeated queries for the same dates
# Key: date_str, Value: TrancoList object
MEM_CACHE = {}
MAX_CACHE_SIZE = 50 

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/<path:path>')
def static_files(path):
    return app.send_static_file(path)

@app.route('/api/ranks', methods=['GET'])
def get_ranks():
    domain = request.args.get('domain')
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')

    if not domain or not start_date_str or not end_date_str:
        return jsonify({'error': 'Missing parameters'}), 400

    try:
        start_date = datetime.datetime.strptime(start_date_str, '%Y-%m-%d').date()
        end_date = datetime.datetime.strptime(end_date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400

    if start_date > end_date:
        return jsonify({'error': 'Start date must be before end date'}), 400
    
    # Limit range to prevent massive downloads
    delta = (end_date - start_date).days
    if delta > 365: 
         return jsonify({'error': 'Date range too large. Please limit to 1 year.'}), 400

    ranks = []
    current_date = start_date
    
    while current_date <= end_date:
        date_str = current_date.strftime('%Y-%m-%d')
        rank = -1
        
        # Check memory cache first
        tranco_list = MEM_CACHE.get(date_str)
        
        if not tranco_list:
            print(f"Loading list for {date_str} (might download if not on disk)...")
            try:
                # t.list() downloads or reads from disk cache
                tranco_list = t.list(date=date_str)
                
                # Manage cache size
                if len(MEM_CACHE) >= MAX_CACHE_SIZE:
                    # Remove oldest (arbitrary for now, or just random)
                    MEM_CACHE.pop(next(iter(MEM_CACHE)))
                
                MEM_CACHE[date_str] = tranco_list
            except Exception as e:
                print(f"Error fetching data for {date_str}: {e}")
                rank = None # None indicates not found or error (gap)
        
        if tranco_list:
             try:
                rank = tranco_list.rank(domain)
             except Exception:
                rank = None

        ranks.append({'date': date_str, 'rank': rank})
        current_date += datetime.timedelta(days=1)

    return jsonify({'domain': domain, 'ranks': ranks})

if __name__ == '__main__':
    app.run(debug=True, port=8000)
