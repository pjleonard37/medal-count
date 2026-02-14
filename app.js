mapboxgl.accessToken = 'pk.eyJ1IjoicGpsZW9uYXJkMzciLCJhIjoiY21rbGZmY2FyMDRodjNmb3RreDR2ZzhseSJ9.N_8NKdQ-3U4u34NsZF4eSA';

// Global state
let medalData = {}; // Unified medal data by year
let currentYear = 2016;
let quantileBreaks = [];
let updateTimer = null;
let olympicYears = [];

// Configuration constants
const DEBOUNCE_DELAY = 150; // ms delay for slider updates

// YlOrRd color palette (Yellow-Orange-Red)
const COLOR_PALETTE = {
    noData: '#f0f0f0',
    colors: [
        '#fff7ec', // Lightest
        '#fee8c8',
        '#fdd49e',
        '#fdbb84',
        '#fc8d59',
        '#ef6548',
        '#d7301f',
        '#b30000',
        '#7f0000'  // Darkest
    ]
};

// Historical countries mapped to modern countries
const HISTORICAL_COUNTRIES = {
    'RU': ['USSR', 'Unified Team'],
    'DE': ['East Germany', 'West Germany'],
    'CZ': ['Czechoslovakia'],
    'RS': ['Yugoslavia', 'Serbia and Montenegro']
};

// Initialize map
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/standard',
    config: {
        basemap: {
            theme: 'monochrome'
        }
    },
    center: [0, 5],
    zoom: 1.2,
    projection: 'naturalEarth'
});

// Load data and initialize visualization
async function init() {
    try {
        // Load both summer and winter medal data
        const [summerResponse, winterResponse] = await Promise.all([
            fetch('data/summer_medals.json'),
            fetch('data/winter_medals.json')
        ]);

        if (!summerResponse.ok || !winterResponse.ok) {
            throw new Error('Failed to load medal data');
        }

        const summerMedals = await summerResponse.json();
        const winterMedals = await winterResponse.json();

        // Build unified medal data structure
        medalData = buildUnifiedMedalData(summerMedals, winterMedals);

        // Build list of all Olympic years
        const cancelledYears = [1916, 1940, 1944];
        olympicYears = [...new Set([...Object.keys(medalData).map(Number), ...cancelledYears])].sort((a, b) => a - b);

        // Calculate global quantile breaks
        calculateQuantileBreaks();

        // Hide loading indicator
        document.getElementById('loading').style.display = 'none';

        // Set up map
        map.on('load', () => {
            // Add atmospheric fog effect
            map.setFog({
                'range': [0.8, 8],
                'color': '#d4e6f1',
                'horizon-blend': 0.5,
                'high-color': '#add8e6',
                'space-color': '#1e3a5f',
                'star-intensity': 0.15
            });

            addCountryLayer();
            setupInteractions();
            updateLegend();
        });

        // Set up slider
        setupYearSlider();

    } catch (error) {
        console.error('Error initializing app:', error);
        document.getElementById('loading').style.display = 'none';
        document.getElementById('error').style.display = 'block';
    }
}

// Build unified medal data structure from summer and winter datasets
function buildUnifiedMedalData(summerMedals, winterMedals) {
    const unified = {};

    // Get all years from both datasets
    const allYears = new Set([...Object.keys(summerMedals), ...Object.keys(winterMedals)]);

    allYears.forEach(year => {
        const summerData = summerMedals[year] || {};
        const winterData = winterMedals[year] || {};
        const hasSummer = summerMedals.hasOwnProperty(year);
        const hasWinter = winterMedals.hasOwnProperty(year);

        unified[year] = {};

        // Get all countries that participated in either or both
        const allCountries = new Set([...Object.keys(summerData), ...Object.keys(winterData)]);

        allCountries.forEach(isoCode => {
            const summer = summerData[isoCode];
            const winter = winterData[isoCode];

            // If both seasons exist for this year and country
            if (summer && winter) {
                unified[year][isoCode] = {
                    gold: summer.gold + winter.gold,
                    silver: summer.silver + winter.silver,
                    bronze: summer.bronze + winter.bronze,
                    historical: summer.historical || winter.historical,
                    display_name: summer.display_name || winter.display_name,
                    seasons: {
                        summer: { gold: summer.gold, silver: summer.silver, bronze: summer.bronze },
                        winter: { gold: winter.gold, silver: winter.silver, bronze: winter.bronze }
                    }
                };
            }
            // Only summer for this country
            else if (summer) {
                unified[year][isoCode] = {
                    gold: summer.gold,
                    silver: summer.silver,
                    bronze: summer.bronze,
                    historical: summer.historical,
                    display_name: summer.display_name,
                    season: 'summer'
                };
            }
            // Only winter for this country
            else if (winter) {
                unified[year][isoCode] = {
                    gold: winter.gold,
                    silver: winter.silver,
                    bronze: winter.bronze,
                    historical: winter.historical,
                    display_name: winter.display_name,
                    season: 'winter'
                };
            }
        });
    });

    return unified;
}

// Calculate quantile breaks from medal data
function calculateQuantileBreaks() {
    const allMedalCounts = [];

    // Collect all medal counts from unified data
    Object.values(medalData).forEach(yearData => {
        Object.values(yearData).forEach(country => {
            const total = country.gold + country.silver + country.bronze;
            if (total > 0) {
                allMedalCounts.push(total);
            }
        });
    });

    // Sort for break calculation
    allMedalCounts.sort((a, b) => a - b);

    const max = Math.max(...allMedalCounts);
    console.log('Medal count range:', Math.min(...allMedalCounts), 'to', max);

    // Use natural breaks (inspired by Jenks) for better visual distribution
    // This creates more intuitive groupings based on data clustering
    quantileBreaks = [
        Math.ceil(allMedalCounts[Math.floor(allMedalCounts.length * 0.15)]),  // ~15th percentile
        Math.ceil(allMedalCounts[Math.floor(allMedalCounts.length * 0.35)]),  // ~35th percentile
        Math.ceil(allMedalCounts[Math.floor(allMedalCounts.length * 0.55)]),  // ~55th percentile
        Math.ceil(allMedalCounts[Math.floor(allMedalCounts.length * 0.70)]),  // ~70th percentile
        Math.ceil(allMedalCounts[Math.floor(allMedalCounts.length * 0.82)]),  // ~82nd percentile
        Math.ceil(allMedalCounts[Math.floor(allMedalCounts.length * 0.91)]),  // ~91st percentile
        Math.ceil(allMedalCounts[Math.floor(allMedalCounts.length * 0.96)]),  // ~96th percentile
        Math.ceil(allMedalCounts[Math.floor(allMedalCounts.length * 0.99)])   // ~99th percentile
    ];

    // Ensure breaks are unique and ascending
    quantileBreaks = [...new Set(quantileBreaks)].sort((a, b) => a - b);
}

// Determine which Olympics occurred in a given year
function getOlympicsForYear(year) {
    const cancelledYears = [1916, 1940, 1944];
    if (cancelledYears.includes(year)) {
        return { cancelled: true, hasSummer: false, hasWinter: false };
    }

    const yearData = medalData[year.toString()];
    if (!yearData) {
        return { cancelled: false, hasSummer: false, hasWinter: false };
    }

    // Check if any country has season-specific data
    let hasSummer = false;
    let hasWinter = false;

    for (const country of Object.values(yearData)) {
        if (country.seasons) {
            hasSummer = true;
            hasWinter = true;
            break;
        } else if (country.season === 'summer') {
            hasSummer = true;
        } else if (country.season === 'winter') {
            hasWinter = true;
        }
    }

    return { cancelled: false, hasSummer, hasWinter };
}

// Get current year's medal data
function getCurrentMedalData() {
    return medalData[currentYear.toString()] || {};
}

// Get color based on medal count using quantile breaks
function getColorForMedalCount(count) {
    if (count === 0 || count === null || count === undefined) {
        return COLOR_PALETTE.noData;
    }

    for (let i = 0; i < quantileBreaks.length; i++) {
        if (count <= quantileBreaks[i]) {
            return COLOR_PALETTE.colors[i];
        }
    }

    return COLOR_PALETTE.colors[COLOR_PALETTE.colors.length - 1];
}

// Add country layer with choropleth styling
function addCountryLayer() {
    // Add source for country polygons using Mapbox Countries tileset
    map.addSource('countries', {
        type: 'vector',
        url: 'mapbox://mapbox.country-boundaries-v1'
    });

    // Worldview filter for disputed borders (US perspective)
    const WORLDVIEW = 'US';
    const worldviewFilter = [
        'all',
        ['==', ['get', 'disputed'], 'false'],
        [
            'any',
            ['==', 'all', ['get', 'worldview']],
            ['in', WORLDVIEW, ['get', 'worldview']]
        ]
    ];

    // Add fill layer for countries
    map.addLayer({
        id: 'country-fills',
        type: 'fill',
        slot: 'middle',
        source: 'countries',
        'source-layer': 'country_boundaries',
        paint: {
            'fill-color': COLOR_PALETTE.noData,
            'fill-opacity': 0.8
        },
        filter: worldviewFilter
    });

    // Initial update
    updateMapColors();
}

// Update map colors based on current year
function updateMapColors() {
    const yearData = getCurrentMedalData();

    // If no data for this year, set everything to noData color
    if (Object.keys(yearData).length === 0) {
        map.setPaintProperty('country-fills', 'fill-color', COLOR_PALETTE.noData);
        return;
    }

    // Build a match expression that defines the color for every country
    // Use ISO 3166-1 code as the lookup key
    const matchExpression = ['match', ['get', 'iso_3166_1']];

    // Add each country with its color based on medal count
    Object.keys(yearData).forEach(isoCode => {
        const country = yearData[isoCode];
        const totalMedals = country.gold + country.silver + country.bronze;
        const color = getColorForMedalCount(totalMedals);

        matchExpression.push(isoCode, color);
    });

    // Last value is the default color for countries with no data
    matchExpression.push(COLOR_PALETTE.noData);

    // Update the fill color
    map.setPaintProperty('country-fills', 'fill-color', matchExpression);
}

// Set up map interactions (hover, click)
function setupInteractions() {
    // Change cursor on hover
    map.on('mouseenter', 'country-fills', () => {
        map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'country-fills', () => {
        map.getCanvas().style.cursor = '';
    });

    // Click to show popup
    map.on('click', 'country-fills', (e) => {
        if (e.features.length > 0) {
            showMedalPopup(e.features[0], e.lngLat);
        }
    });
}

// Show medal breakdown popup
function showMedalPopup(feature, lngLat) {
    const isoCode = feature.properties.iso_3166_1;
    const yearData = getCurrentMedalData();
    const countryName = feature.properties.name_en || 'Unknown';
    const countryData = yearData[isoCode];

    if (!countryData) {
        new mapboxgl.Popup()
            .setLngLat(lngLat)
            .setHTML(`
                <div class="popup-title">${countryName}</div>
                <p style="color: #999; font-size: 0.9rem;">No medals in ${currentYear}</p>
            `)
            .addTo(map);
        return;
    }

    const { gold, silver, bronze, historical, display_name, seasons } = countryData;
    const total = gold + silver + bronze;

    // Build popup HTML - use country name from map, add asterisk only if historical
    let popupHTML = `
        <div class="popup-title">
            ${countryName}${historical ? '*' : ''}
        </div>
    `;

    // If both Summer and Winter data exist, show them separately
    if (seasons) {
        const { summer, winter } = seasons;

        // Summer Olympics section
        const summerTotal = summer.gold + summer.silver + summer.bronze;
        const summerGoldPct = (summer.gold / summerTotal) * 100;
        const summerSilverPct = (summer.silver / summerTotal) * 100;
        const summerBronzePct = (summer.bronze / summerTotal) * 100;

        popupHTML += `
        <div class="medal-breakdown">
            <h4>${currentYear} Summer Olympics ☀️</h4>
            
            <div class="medal-chart">
                <div class="medal-bar-container">
                    ${summer.gold > 0 ? `<div class="medal-bar gold" style="width: ${summerGoldPct}%">${summer.gold}</div>` : ''}
                    ${summer.silver > 0 ? `<div class="medal-bar silver" style="width: ${summerSilverPct}%">${summer.silver}</div>` : ''}
                    ${summer.bronze > 0 ? `<div class="medal-bar bronze" style="width: ${summerBronzePct}%">${summer.bronze}</div>` : ''}
                </div>
                
                <div class="medal-counts">
                    <div class="medal-count-item">
                        <span class="medal-icon gold"></span>
                        <span>${summer.gold} Gold</span>
                    </div>
                    <div class="medal-count-item">
                        <span class="medal-icon silver"></span>
                        <span>${summer.silver} Silver</span>
                    </div>
                    <div class="medal-count-item">
                        <span class="medal-icon bronze"></span>
                        <span>${summer.bronze} Bronze</span>
                    </div>
                </div>
            </div>
            
            <div style="margin-top: 0.5rem; font-weight: 600; font-size: 0.95rem;">
                Total: ${summerTotal} medals
            </div>
        </div>
        `;

        // Winter Olympics section
        const winterTotal = winter.gold + winter.silver + winter.bronze;
        const winterGoldPct = (winter.gold / winterTotal) * 100;
        const winterSilverPct = (winter.silver / winterTotal) * 100;
        const winterBronzePct = (winter.bronze / winterTotal) * 100;

        popupHTML += `
        <div class="medal-breakdown" style="margin-top: 1rem;">
            <h4>${currentYear} Winter Olympics ❄️</h4>
            
            <div class="medal-chart">
                <div class="medal-bar-container">
                    ${winter.gold > 0 ? `<div class="medal-bar gold" style="width: ${winterGoldPct}%">${winter.gold}</div>` : ''}
                    ${winter.silver > 0 ? `<div class="medal-bar silver" style="width: ${winterSilverPct}%">${winter.silver}</div>` : ''}
                    ${winter.bronze > 0 ? `<div class="medal-bar bronze" style="width: ${winterBronzePct}%">${winter.bronze}</div>` : ''}
                </div>
                
                <div class="medal-counts">
                    <div class="medal-count-item">
                        <span class="medal-icon gold"></span>
                        <span>${winter.gold} Gold</span>
                    </div>
                    <div class="medal-count-item">
                        <span class="medal-icon silver"></span>
                        <span>${winter.silver} Silver</span>
                    </div>
                    <div class="medal-count-item">
                        <span class="medal-icon bronze"></span>
                        <span>${winter.bronze} Bronze</span>
                    </div>
                </div>
            </div>
            
            <div style="margin-top: 0.5rem; font-weight: 600; font-size: 0.95rem;">
                Total: ${winterTotal} medals
            </div>
        </div>
        `;

        // Combined total
        popupHTML += `
        <div style="margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid #e0e0e0; font-weight: 700; font-size: 1rem;">
            Combined Total: ${total} medals
        </div>
        `;
    } else {
        // Only one season - show single breakdown
        const goldPct = (gold / total) * 100;
        const silverPct = (silver / total) * 100;
        const bronzePct = (bronze / total) * 100;

        // Determine season label
        const olympics = getOlympicsForYear(currentYear);
        let seasonLabel = '';
        if (olympics.hasSummer && !olympics.hasWinter) seasonLabel = 'Summer';
        else if (olympics.hasWinter && !olympics.hasSummer) seasonLabel = 'Winter';

        popupHTML += `
        <div class="medal-breakdown">
            <h4>${currentYear} ${seasonLabel} Olympics</h4>
            
            <div class="medal-chart">
                <div class="medal-bar-container">
                    ${gold > 0 ? `<div class="medal-bar gold" style="width: ${goldPct}%">${gold}</div>` : ''}
                    ${silver > 0 ? `<div class="medal-bar silver" style="width: ${silverPct}%">${silver}</div>` : ''}
                    ${bronze > 0 ? `<div class="medal-bar bronze" style="width: ${bronzePct}%">${bronze}</div>` : ''}
                </div>
                
                <div class="medal-counts">
                    <div class="medal-count-item">
                        <span class="medal-icon gold"></span>
                        <span>${gold} Gold</span>
                    </div>
                    <div class="medal-count-item">
                        <span class="medal-icon silver"></span>
                        <span>${silver} Silver</span>
                    </div>
                    <div class="medal-count-item">
                        <span class="medal-icon bronze"></span>
                        <span>${bronze} Bronze</span>
                    </div>
                </div>
            </div>
            
            <div style="margin-top: 0.5rem; font-weight: 600; font-size: 0.95rem;">
                Total: ${total} medals
            </div>
        </div>
        `;
    }

    if (historical && HISTORICAL_COUNTRIES[isoCode]) {
        const historicalList = HISTORICAL_COUNTRIES[isoCode].join(', ');
        popupHTML += `
            <div class="popup-note">
                *Includes medals from: ${historicalList}
            </div>
        `;
    }

    new mapboxgl.Popup()
        .setLngLat(lngLat)
        .setHTML(popupHTML)
        .addTo(map);
}

// Set up year slider
function setupYearSlider() {
    const slider = document.getElementById('year-slider');
    const yearDisplay = document.getElementById('year-display');

    // Configure slider to use Olympic years only
    slider.min = 0;
    slider.max = olympicYears.length - 1;
    slider.step = 1;
    slider.value = olympicYears.indexOf(currentYear);

    slider.addEventListener('input', (e) => {
        const index = parseInt(e.target.value);
        const year = olympicYears[index];
        currentYear = year;

        // Debounce map updates
        clearTimeout(updateTimer);
        updateTimer = setTimeout(() => {
            updateMapColors();
            updateInfoBar();
        }, DEBOUNCE_DELAY);
    });

    // Initialize info bar
    updateInfoBar();
}

// Update legend with gradient
function updateLegend() {
    // Set max medal count
    const allMedalCounts = [];
    Object.values(medalData).forEach(yearData => {
        Object.values(yearData).forEach(country => {
            const total = country.gold + country.silver + country.bronze;
            if (total > 0) allMedalCounts.push(total);
        });
    });
    const maxMedals = Math.max(...allMedalCounts);

    // Update all tick labels
    document.getElementById('max-medal-count').textContent = `${maxMedals}`;
    document.getElementById('three-quarter-medal-count').textContent = Math.round(maxMedals * 0.75);
    document.getElementById('half-medal-count').textContent = Math.round(maxMedals * 0.5);
    document.getElementById('quarter-medal-count').textContent = Math.round(maxMedals * 0.25);
}

// Update info bar stats
function updateInfoBar() {
    const yearData = getCurrentMedalData();
    const olympics = getOlympicsForYear(currentYear);

    // Count countries with medals
    const countryCount = Object.keys(yearData).length;
    document.getElementById('country-count').textContent = countryCount || '—';

    // Calculate total medals
    let totalMedals = 0;
    Object.values(yearData).forEach(country => {
        totalMedals += country.gold + country.silver + country.bronze;
    });
    document.getElementById('total-medals').textContent = totalMedals || '—';

    // Update year display
    const yearDisplay = document.getElementById('year-display');
    const cancelledYears = [1916, 1940, 1944];

    if (cancelledYears.includes(currentYear)) {
        yearDisplay.innerHTML = `&#10060; ${currentYear}`;
    } else if (olympics.hasSummer && olympics.hasWinter) {
        yearDisplay.innerHTML = `&#9728;&#65039; &#10052;&#65039; ${currentYear}`;
    } else if (olympics.hasSummer) {
        yearDisplay.innerHTML = `&#9728;&#65039; ${currentYear}`;
    } else if (olympics.hasWinter) {
        yearDisplay.innerHTML = `&#10052;&#65039; ${currentYear}`;
    } else {
        yearDisplay.innerHTML = `&#9728;&#65039; ${currentYear}`;
    }
}

// Start the app
init();
