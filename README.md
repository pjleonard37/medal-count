# Olympic Medals Interactive Map

An interactive web visualization of Summer and Winter Olympic medal counts by country (1896-2016), built with Mapbox GL JS and styled with authentic Olympic colors.

## Features

- **Interactive choropleth map** showing combined medal counts by country with YlOrRd color scheme
- **Unified year slider** to explore both Summer (☀️) and Winter (❄️) Olympic Games (1896-2016)
- **Dual Olympics support** - Years with both games show combined totals on the map
- **Medal breakdown popups** with separate horizontal bar charts for Summer and Winter medals
- **Olympic-themed design** with authentic ring colors (blue, yellow, black, green, red) and professional styling
- **Historical country handling** - medals from USSR, East Germany, Yugoslavia, etc. mapped to modern boundaries with visual indicators
- **Global quantile classification** for consistent color scale across all years
- **Accessible controls** with emoji indicators and responsive design

## Quick Start

### 1. Prerequisites

- Modern web browser with JavaScript enabled
- Python 3.6+ (for data processing)
- Mapbox account for API token

### 2. Get Mapbox Access Token

1. Create an account at [mapbox.com](https://www.mapbox.com/)
2. Go to your [Account page](https://account.mapbox.com/)
3. Copy your default public access token
4. Open `app.js` and replace `YOUR_MAPBOX_TOKEN_HERE` with your token:

```javascript
const MAPBOX_TOKEN = 'pk.eyJ1IjoieW91cnVzZ...';
```

### 3. Download Olympic Data

1. Create a free account at [Kaggle](https://www.kaggle.com/)
2. Download the dataset: [120 years of Olympic history: athletes and results](https://www.kaggle.com/datasets/heesoo37/120-years-of-olympic-history-athletes-and-results)
3. Extract `athlete_events.csv` from the downloaded ZIP file
4. Create the directory structure and place the file:

```bash
mkdir -p data/raw
# Move the downloaded CSV file
mv ~/Downloads/athlete_events.csv data/raw/
```

### 4. Process the Data

Install Python dependencies:

```bash
pip install pandas
```

Run the data processing script:

```bash
python process_data.py
```

This will:
- Filter for both Summer and Winter Olympics
- Aggregate athlete-level data into country medal totals
- Map IOC country codes to ISO codes
- Handle historical countries (USSR → Russia, etc.)
- Calculate global quantile breaks for choropleth
- Output `data/summer_medals.json` and `data/winter_medals.json`

Expected output:
```
Loading data from data/raw/athlete_events.csv...
Total records: 271116
Summer Olympics records: 222552
Winter Olympics records: 48564
Medal records: 39783 (Summer), 5684 (Winter)

Aggregating medals by year and country...

==================================================
STATISTICS
==================================================
Summer Games: 29 years, 75 countries, 33691 medals
Winter Games: 22 years, 39 countries, 5684 medals
Year range: 1896 - 2016
```

### 5. Run the Application

Since this is a static web application, you can run it using any local web server:

**Option 1: Python HTTP Server**
```bash
python -m http.server 8000
```

**Option 2: Node.js http-server**
```bash
npx http-server -p 8000
```

**Option 3: VS Code Live Server**
- Install the "Live Server" extension
- Right-click `index.html` and select "Open with Live Server"

Then open your browser to `http://localhost:8000`

## Project Structure

```
Olympics/
├── index.html              # Main HTML structure
├── styles.css              # Olympic-themed styling
├── app.js                  # Map logic with unified data structure
├── process_data.py         # Data processing script
├── data/
│   ├── raw/
│   │   └── athlete_events.csv    # Raw Kaggle data (not included)
│   ├── summer_medals.json        # Processed Summer Olympics data
│   ├── winter_medals.json        # Processed Winter Olympics data
│   └── ioc_iso_mapping.json      # Country code reference
└── README.md
```

## Data Sources

- **Primary**: [120 years of Olympic history](https://www.kaggle.com/datasets/heesoo37/120-years-of-olympic-history-athletes-and-results) (CC0 Public Domain)
- **Coverage**: Summer Olympics (1896-2016) and Winter Olympics (1924-2014)
- **Records**: 271,116 athlete-event records (222,552 Summer, 48,564 Winter)

## Historical Country Mapping

The visualization handles historical countries by mapping them to modern successors:

| Historical Country | Modern ISO | Display Name | Note |
|-------------------|-----------|--------------|------|
| USSR (URS) | RU (Russia) | USSR (1952-1988) | Primary successor state |
| East Germany (GDR) | DE (Germany) | East Germany (1968-1988) | Reunified 1990 |
| West Germany (FRG) | DE (Germany) | West Germany (1968-1988) | Reunified 1990 |
| Czechoslovakia (TCH) | CZ (Czech Rep.) | Czechoslovakia (1920-1992) | Split 1993 |
| Yugoslavia (YUG) | RS (Serbia) | Yugoslavia (1920-1992) | Dissolved 1990s |

Countries with historical medals are marked with an asterisk (*) in popups.

## Design

**Olympic Theme**: The application uses authentic Olympic colors:
- Header gradient: Blue → Green → Red (Olympic ring colors)
- Accent stripe: All five ring colors (Blue, Yellow, Black, Green, Red)
- Primary accent: Olympic Blue (#0085C7)
- Typography: Bold, uppercase styling inspired by Olympic branding

## Technical Highlights

- **Unified data structure**: Pre-computed Summer + Winter combinations for optimal performance
- **Smart binning**: Custom quantile breaks (15%, 35%, 55%, 70%, 82%, 91%, 96%, 99%) for better visual distribution
- **Debounced updates**: 150ms delay prevents excessive re-renders during slider interaction
- **Accessible controls**: ARIA labels and clear visual indicators
- **Mapbox Standard Style**: Monochrome theme with Natural Earth projection

## Technologies

- [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/) v3.18.0 - Interactive maps
- Python 3.9+ with pandas - Data processing
- Vanilla JavaScript - No frameworks, production-ready code

## License

Code: MIT License  
Data: CC0 Public Domain (Kaggle dataset)

## Contributing

Feel free to open issues or submit pull requests for improvements!
