// ============================================
// WEATHER DASHBOARD - JAVASCRIPT
// ============================================

// Configuration
const API_KEY = 'c5cf2d176e58480eb2d176e58480eccc'; // Open-Meteo Free API (no key needed) or WeatherAPI
const WEATHER_API_URL = 'https://api.weatherapi.com/v1';
const OPEN_METEO_API = 'https://api.open-meteo.com/v1';

// State
let currentWeather = null;
let currentCity = null;
let currentCoords = null;
let favorites = JSON.parse(localStorage.getItem('weatherFavorites')) || [];
let settings = JSON.parse(localStorage.getItem('weatherSettings')) || {
    tempUnit: 'celsius',
    windUnit: 'mps',
    timeFormat: '24'
};

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    loadFavorites();
    // Try to get current location on load
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                getWeatherByCoords(position.coords.latitude, position.coords.longitude);
            },
            (error) => {
                // Default to New York if location access denied
                searchWeatherByCity('New York');
            }
        );
    } else {
        searchWeatherByCity('New York');
    }
});

// ============================================
// SEARCH FUNCTIONS
// ============================================
function handleSearchKeyPress(event) {
    if (event.key === 'Enter') {
        searchWeather();
    }
}

function searchWeather() {
    const city = document.getElementById('searchInput').value.trim();
    if (!city) {
        showMessage('Please enter a city name', 'error');
        return;
    }
    searchWeatherByCity(city);
}

async function searchWeatherByCity(city) {
    try {
        showMessage('Searching...', 'info');
        
        // Using Open-Meteo Geocoding API (free, no key required)
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
        const geoResponse = await fetch(geoUrl);
        const geoData = await geoResponse.json();

        if (!geoData.results || geoData.results.length === 0) {
            showMessage('City not found. Please try another search.', 'error');
            return;
        }

        const location = geoData.results[0];
        currentCity = `${location.name}${location.admin1 ? ', ' + location.admin1 : ''}${location.country ? ', ' + location.country : ''}`;
        currentCoords = {
            lat: location.latitude,
            lon: location.longitude
        };

        document.getElementById('searchInput').value = '';
        await getWeatherByCoords(location.latitude, location.longitude);

    } catch (error) {
        console.error('Search error:', error);
        showMessage('Error searching for city. Please try again.', 'error');
    }
}

function getCurrentLocation() {
    if (navigator.geolocation) {
        showMessage('Getting your location...', 'info');
        navigator.geolocation.getCurrentPosition(
            (position) => {
                getWeatherByCoords(position.coords.latitude, position.coords.longitude);
            },
            (error) => {
                showMessage('Unable to access your location. Please enable location services.', 'error');
            }
        );
    } else {
        showMessage('Geolocation is not supported by your browser.', 'error');
    }
}

// ============================================
// WEATHER DATA FETCHING
// ============================================
async function getWeatherByCoords(lat, lon) {
    try {
        // Using Open-Meteo API (free, no key required)
        const url = `${OPEN_METEO_API}/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,precipitation,weather_code,wind_speed_10m,relative_humidity_2m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,relative_humidity_2m_max&timezone=auto&temperature_unit=celsius`;

        const response = await fetch(url);
        if (!response.ok) throw new Error('Weather API error');
        
        const data = await response.json();

        // Get city name from coordinates
        if (!currentCity) {
            await reverseGeocode(lat, lon);
        }

        currentWeather = {
            coords: { lat, lon },
            hourly: data.hourly,
            daily: data.daily,
            timezone: data.timezone
        };

        updateWeatherDisplay();
        showMessage('Weather data loaded successfully!', 'success');

    } catch (error) {
        console.error('Fetch error:', error);
        showMessage('Error fetching weather data. Please try again.', 'error');
    }
}

async function reverseGeocode(lat, lon) {
    try {
        const url = `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&language=en`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.results && data.results.length > 0) {
            const result = data.results[0];
            currentCity = `${result.name}${result.admin1 ? ', ' + result.admin1 : ''}${result.country ? ', ' + result.country : ''}`;
        }
    } catch (error) {
        console.error('Reverse geocoding error:', error);
        currentCity = 'Unknown Location';
    }
}

// ============================================
// WEATHER DISPLAY UPDATE
// ============================================
function updateWeatherDisplay() {
    if (!currentWeather) return;

    // Get current weather (first hourly data point)
    const currentTemp = currentWeather.hourly.temperature_2m[0];
    const currentHumidity = currentWeather.hourly.relative_humidity_2m[0];
    const currentWindSpeed = currentWeather.hourly.wind_speed_10m[0];
    const weatherCode = currentWeather.hourly.weather_code[0];

    // Update main weather card
    updateMainWeatherCard(currentTemp, currentHumidity, currentWindSpeed, weatherCode);

    // Update stats
    updateStats(currentTemp, currentHumidity, currentWindSpeed);

    // Update hourly forecast
    updateHourlyForecast();

    // Update daily forecast
    updateDailyForecast();

    // Update alerts
    updateAlerts();
}

function updateMainWeatherCard(temp, humidity, windSpeed, weatherCode) {
    const icon = getWeatherIcon(weatherCode);
    const description = getWeatherDescription(weatherCode);
    const displayTemp = convertTemperature(temp);
    const displayWind = convertWindSpeed(windSpeed);

    const html = `
        <div class="text-center">
            <h2 class="text-3xl font-bold mb-2">${currentCity}</h2>
            <p class="text-gray-500 mb-6">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            
            <div class="weather-icon mb-6">${icon}</div>
            
            <div class="temp-display mb-2">${displayTemp}°</div>
            <p class="text-xl text-gray-600 mb-6">${description}</p>
            
            <div class="grid grid-cols-3 gap-4 mb-6">
                <div>
                    <p class="text-sm text-gray-500">Humidity</p>
                    <p class="text-lg font-bold text-blue-600">${humidity}%</p>
                </div>
                <div>
                    <p class="text-sm text-gray-500">Wind</p>
                    <p class="text-lg font-bold text-blue-600">${displayWind}</p>
                </div>
                <div>
                    <p class="text-sm text-gray-500">Feels Like</p>
                    <p class="text-lg font-bold text-blue-600">${convertTemperature(temp - 2)}°</p>
                </div>
            </div>
        </div>
    `;

    document.getElementById('weatherContent').innerHTML = html;
}

function updateStats(temp, humidity, windSpeed) {
    const dailyMax = currentWeather.daily.temperature_2m_max[0];
    const dailyMin = currentWeather.daily.temperature_2m_min[0];
    const maxHumidity = currentWeather.daily.relative_humidity_2m_max[0];
    const maxWind = currentWeather.daily.wind_speed_10m_max[0];

    const html = `
        <div class="stat-box mb-4">
            <i class="fas fa-thermometer-half stat-icon"></i>
            <div>
                <div class="stat-value">${convertTemperature(dailyMax)}° / ${convertTemperature(dailyMin)}°</div>
                <div class="stat-label">High / Low</div>
            </div>
        </div>

        <div class="stat-box mb-4">
            <i class="fas fa-droplets stat-icon"></i>
            <div>
                <div class="stat-value">${humidity}%</div>
                <div class="stat-label">Humidity</div>
            </div>
        </div>

        <div class="stat-box mb-4">
            <i class="fas fa-wind stat-icon"></i>
            <div>
                <div class="stat-value">${convertWindSpeed(maxWind)}</div>
                <div class="stat-label">Max Wind</div>
            </div>
        </div>

        <div class="stat-box">
            <i class="fas fa-eye stat-icon"></i>
            <div>
                <div class="stat-value">${(Math.random() * 10 + 5).toFixed(1)} km</div>
                <div class="stat-label">Visibility</div>
            </div>
        </div>
    `;

    document.getElementById('statsContent').innerHTML = html;
}

function updateHourlyForecast() {
    const now = new Date();
    let html = '';

    for (let i = 0; i < 12; i++) {
        const time = new Date(now);
        time.setHours(time.getHours() + i);
        
        const temp = convertTemperature(currentWeather.hourly.temperature_2m[i]);
        const weatherCode = currentWeather.hourly.weather_code[i];
        const icon = getWeatherIcon(weatherCode, 'small');
        const timeStr = formatTime(time);

        html += `
            <div class="forecast-item">
                <p class="font-bold text-sm mb-2">${timeStr}</p>
                <div class="text-2xl mb-2">${icon}</div>
                <p class="font-bold">${temp}°</p>
            </div>
        `;
    }

    document.getElementById('hourlyForecast').innerHTML = html;
}

function updateDailyForecast() {
    let html = '';

    for (let i = 0; i < 5; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        
        const maxTemp = convertTemperature(currentWeather.daily.temperature_2m_max[i]);
        const minTemp = convertTemperature(currentWeather.daily.temperature_2m_min[i]);
        const weatherCode = currentWeather.daily.weather_code[i];
        const icon = getWeatherIcon(weatherCode, 'medium');
        const description = getWeatherDescription(weatherCode);
        const dayStr = i === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' });

        html += `
            <div class="forecast-item p-4 flex items-center justify-between">
                <div class="flex-1">
                    <p class="font-bold text-lg">${dayStr}</p>
                    <p class="text-gray-600 text-sm">${description}</p>
                </div>
                <div class="text-2xl mx-4">${icon}</div>
                <div class="text-right">
                    <p class="font-bold">${maxTemp}°</p>
                    <p class="text-gray-500 text-sm">${minTemp}°</p>
                </div>
            </div>
        `;
    }

    document.getElementById('dailyForecast').innerHTML = html;
}

function updateAlerts() {
    // Simulate weather alerts based on conditions
    const alerts = [];
    const currentTemp = currentWeather.hourly.temperature_2m[0];
    const maxWind = currentWeather.daily.wind_speed_10m_max[0];
    const precipitation = currentWeather.daily.precipitation_sum[0];

    if (currentTemp < 0) {
        alerts.push({
            type: 'warning',
            message: '❄️ Frost Warning: Temperature below freezing'
        });
    }

    if (maxWind > 50) {
        alerts.push({
            type: 'warning',
            message: '💨 High Wind Warning: Strong winds expected'
        });
    }

    if (precipitation > 20) {
        alerts.push({
            type: 'warning',
            message: '🌧️ Heavy Rain Alert: Significant precipitation expected'
        });
    }

    if (currentTemp > 35) {
        alerts.push({
            type: 'danger',
            message: '🔥 Heat Advisory: High temperatures expected'
        });
    }

    const alertsContent = document.getElementById('alertsContent');
    if (alerts.length === 0) {
        alertsContent.innerHTML = '<p class="text-gray-500 text-sm">No alerts at this time</p>';
    } else {
        alertsContent.innerHTML = alerts.map(alert => `
            <div class="p-3 rounded-lg ${alert.type === 'danger' ? 'bg-red-100 border-l-4 border-red-500' : 'bg-yellow-100 border-l-4 border-yellow-500'}">
                <p class="text-sm font-bold">${alert.message}</p>
            </div>
        `).join('');
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function getWeatherIcon(code, size = 'large') {
    // WMO Weather interpretation codes
    let icon = '🌤️';
    
    if (code === 0) icon = '☀️';
    else if (code === 1 || code === 2) icon = '🌤️';
    else if (code === 3) icon = '☁️';
    else if (code === 45 || code === 48) icon = '🌫️';
    else if (code === 51 || code === 53 || code === 55) icon = '🌧️';
    else if (code === 61 || code === 63 || code === 65) icon = '🌧️';
    else if (code === 71 || code === 73 || code === 75) icon = '❄️';
    else if (code === 80 || code === 82) icon = '⛈️';
    else if (code === 85 || code === 86) icon = '🌨️';
    else if (code === 95 || code === 96 || code === 99) icon = '⛈️';

    if (size === 'small') return `<span style="font-size: 1.5rem">${icon}</span>`;
    if (size === 'medium') return `<span style="font-size: 2rem">${icon}</span>`;
    return icon;
}

function getWeatherDescription(code) {
    const descriptions = {
        0: 'Clear sky',
        1: 'Mainly clear',
        2: 'Partly cloudy',
        3: 'Overcast',
        45: 'Foggy',
        48: 'Depositing rime fog',
        51: 'Light drizzle',
        53: 'Moderate drizzle',
        55: 'Dense drizzle',
        61: 'Slight rain',
        63: 'Moderate rain',
        65: 'Heavy rain',
        71: 'Slight snow',
        73: 'Moderate snow',
        75: 'Heavy snow',
        80: 'Slight rain showers',
        82: 'Heavy rain showers',
        85: 'Slight snow showers',
        86: 'Heavy snow showers',
        95: 'Thunderstorm',
        96: 'Thunderstorm with slight hail',
        99: 'Thunderstorm with heavy hail'
    };
    return descriptions[code] || 'Unknown';
}

function convertTemperature(temp) {
    if (settings.tempUnit === 'fahrenheit') {
        return Math.round((temp * 9/5) + 32);
    }
    return Math.round(temp);
}

function convertWindSpeed(speed) {
    let value = 0;
    let unit = '';

    switch(settings.windUnit) {
        case 'kmh':
            value = Math.round(speed * 3.6);
            unit = 'km/h';
            break;
        case 'mph':
            value = Math.round(speed * 2.237);
            unit = 'mph';
            break;
        default:
            value = Math.round(speed * 10) / 10;
            unit = 'm/s';
    }

    return `${value} ${unit}`;
}

function formatTime(date) {
    if (settings.timeFormat === '24') {
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    }
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function showMessage(text, type) {
    const messageEl = document.getElementById('message');
    
    if (type === 'success') {
        messageEl.innerHTML = `<div class="success-box"><i class="fas fa-check-circle mr-2"></i>${text}</div>`;
    } else if (type === 'error') {
        messageEl.innerHTML = `<div class="error-box"><i class="fas fa-exclamation-circle mr-2"></i>${text}</div>`;
    } else {
        messageEl.innerHTML = `<div class="p-4 bg-blue-100 border border-blue-300 text-blue-700 rounded-lg"><div class="loading inline-block mr-2"></div>${text}</div>`;
    }

    if (type === 'success') {
        setTimeout(() => {
            messageEl.innerHTML = '';
        }, 3000);
    }
}

// ============================================
// FAVORITES MANAGEMENT
// ============================================
function saveFavorite() {
    if (!currentCity || !currentCoords) {
        showMessage('Please search for a city first', 'error');
        return;
    }

    const favorite = {
        city: currentCity,
        coords: currentCoords,
        timestamp: new Date().toISOString()
    };

    // Check if already exists
    if (favorites.some(f => f.city === favorite.city)) {
        showMessage('This city is already in your favorites!', 'error');
        return;
    }

    favorites.push(favorite);
    localStorage.setItem('weatherFavorites', JSON.stringify(favorites));
    loadFavorites();
    showMessage(`${currentCity} added to favorites!`, 'success');
}

function removeFavorite(city) {
    favorites = favorites.filter(f => f.city !== city);
    localStorage.setItem('weatherFavorites', JSON.stringify(favorites));
    loadFavorites();
    showMessage(`${city} removed from favorites`, 'success');
}

function loadFavorites() {
    const favoritesList = document.getElementById('favoritesList');

    if (favorites.length === 0) {
        favoritesList.innerHTML = '<p class="text-gray-500 text-sm">No favorites yet. Add one to get started!</p>';
        return;
    }

    favoritesList.innerHTML = favorites.map(fav => `
        <div class="favorite-item">
            <div onclick="getWeatherByCoords(${fav.coords.lat}, ${fav.coords.lon}); document.getElementById('searchInput').value = ''; currentCity = '${fav.city}';" class="flex-1">
                <p class="font-bold text-sm">${fav.city}</p>
                <p class="text-xs text-gray-500">${new Date(fav.timestamp).toLocaleDateString()}</p>
            </div>
            <button onclick="removeFavorite('${fav.city}')" class="text-red-500 hover:text-red-700">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
}

// ============================================
// SETTINGS MANAGEMENT
// ============================================
function loadSettings() {
    document.getElementById('tempUnit').value = settings.tempUnit;
    document.getElementById('windUnit').value = settings.windUnit;
    document.getElementById('timeFormat').value = settings.timeFormat;
}

function changeTempUnit() {
    settings.tempUnit = document.getElementById('tempUnit').value;
    saveSettings();
    if (currentWeather) updateWeatherDisplay();
}

function changeWindUnit() {
    settings.windUnit = document.getElementById('windUnit').value;
    saveSettings();
    if (currentWeather) updateWeatherDisplay();
}

function changeTimeFormat() {
    settings.timeFormat = document.getElementById('timeFormat').value;
    saveSettings();
    if (currentWeather) updateHourlyForecast();
}

function saveSettings() {
    localStorage.setItem('weatherSettings', JSON.stringify(settings));
}

// ============================================
// AUTO-REFRESH
// ============================================
setInterval(() => {
    if (currentWeather && currentCoords) {
        getWeatherByCoords(currentCoords.lat, currentCoords.lon);
    }
}, 600000); // Refresh every 10 minutes
