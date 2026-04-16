const UNSPLASH_ACCESS_KEY = 'cHoGjaTOY5aZzvdpeoDEm-UPen6xPAEwAWwi_G8q59A';

const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const resultsGrid = document.getElementById('resultsGrid');
const errorMsg = document.getElementById('errorMsg');
const favoritesList = document.getElementById('favoritesList');
const itineraryForm = document.getElementById('itineraryForm');
const itineraryDest = document.getElementById('itineraryDest');
const itineraryNotes = document.getElementById('itineraryNotes');
const itineraryList = document.getElementById('itineraryList');
const regionBtns = document.querySelectorAll('.region-btn');
const detailsModal = document.getElementById('detailsModal');
const modalBody = document.getElementById('modalBody');
const closeBtn = document.querySelector('.close-btn');

let favorites = JSON.parse(localStorage.getItem('travelFavorites')) || [];
let itinerary = JSON.parse(localStorage.getItem('travelItinerary')) || [];

function init() {
    renderFavorites();
    renderItinerary();
}

async function fetchDestination(query) {
    errorMsg.textContent = '';
    resultsGrid.innerHTML = '<p>Loading...</p>';
    
    try {
        const countryRes = await fetch(`https://restcountries.com/v3.1/name/${query}`);
        if (countryRes.ok) {
            const data = await countryRes.json();
            return renderResults(data, 'country');
        }

        const cityRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${query}&count=5`);
        if (cityRes.ok) {
            const cityData = await cityRes.json();
            if (cityData.results && cityData.results.length > 0) {
                return renderResults(cityData.results, 'city');
            }
        }

        throw new Error('Destination not found. Please try another search.');
    } catch (error) {
        errorMsg.textContent = error.message;
        resultsGrid.innerHTML = '';
    }
}

async function fetchByRegion(region) {
    try {
        errorMsg.textContent = '';
        resultsGrid.innerHTML = '<p>Loading...</p>';
        const response = await fetch(`https://restcountries.com/v3.1/region/${region}`);
        if (!response.ok) throw new Error('Region data unavailable');
        const data = await response.json();
        renderResults(data.slice(0, 10), 'country');
    } catch (error) {
        errorMsg.textContent = error.message;
        resultsGrid.innerHTML = '';
    }
}

async function fetchImage(query) {
    try {
        if (!UNSPLASH_ACCESS_KEY || UNSPLASH_ACCESS_KEY === 'YOUR_UNSPLASH_ACCESS_KEY') return null;
        const response = await fetch(`https://api.unsplash.com/search/photos?query=${query}&client_id=${UNSPLASH_ACCESS_KEY}&per_page=1`);
        const data = await response.json();
        return data.results.length > 0 ? data.results[0].urls.regular : null;
    } catch (error) {
        console.error('Unsplash fetch error:', error);
        return null;
    }
}

async function fetchWikipediaSummary(query) {
    try {
        const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`);
        if (response.ok) {
            const data = await response.json();
            return data.extract || "No specific cultural or tourist summary available at this time.";
        }
    } catch (error) {
        console.error('Wikipedia fetch error:', error);
    }
    return "No specific cultural or tourist summary available at this time.";
}

async function renderResults(items, type) {
    resultsGrid.innerHTML = '';
    
    for (const item of items) {
        const name = type === 'country' ? item.name.common : item.name;
        const subtitle = type === 'country' 
            ? `Capital: ${item.capital ? item.capital[0] : 'N/A'} | Region: ${item.region}`
            : `Country: ${item.country} | Region: ${item.admin1 || 'N/A'}`;
        
        const fallbackImg = `https://placehold.co/600x400/1D3557/F8F9FA?text=${encodeURIComponent(name)}`;
        const unsplashImg = await fetchImage(name);
        const imgUrl = unsplashImg || fallbackImg;

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <img src="${imgUrl}" alt="${name}">
            <div class="card-content">
                <h4>${name}</h4>
                <p>${subtitle}</p>
                <div class="card-actions">
                    <button class="btn-teal view-details-btn">View Details</button>
                    <button class="btn-coral save-btn">Save</button>
                </div>
            </div>
        `;

        card.querySelector('.save-btn').addEventListener('click', () => addFavorite(name));
        card.querySelector('.view-details-btn').addEventListener('click', () => showDetails(item, type));
        
        resultsGrid.appendChild(card);
    }
}

async function showDetails(item, type) {
    const name = type === 'country' ? item.name.common : item.name;
    modalBody.innerHTML = `<h2>Loading detailed information...</h2>`;
    detailsModal.style.display = 'block';

    const extraInfo = await fetchWikipediaSummary(name);

    if (type === 'country') {
        const currencies = item.currencies ? Object.values(item.currencies).map(c => c.name).join(', ') : 'N/A';
        const languages = item.languages ? Object.values(item.languages).join(', ') : 'N/A';
        
        modalBody.innerHTML = `
            <h2 style="margin-bottom: 1rem;">${name} <img src="${item.flags.svg}" alt="flag" style="width:40px; vertical-align:middle; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"></h2>
            <div style="line-height: 2;">
                <p><strong>Capital:</strong> ${item.capital ? item.capital[0] : 'N/A'}</p>
                <p><strong>Region:</strong> ${item.region}</p>
                <p><strong>Population:</strong> ${item.population.toLocaleString()}</p>
                <p><strong>Languages:</strong> ${languages}</p>
                <p><strong>Currency:</strong> ${currencies}</p>
            </div>
            <div class="extra-info-box">
                <strong>About ${name} (Culture & Tourism):</strong><br>
                <p style="margin-top: 0.5rem; line-height: 1.6;">${extraInfo}</p>
            </div>
        `;
    } else {
        modalBody.innerHTML = `
            <h2 style="margin-bottom: 1rem;">${name}</h2>
            <div style="line-height: 2;">
                <p><strong>Country:</strong> ${item.country}</p>
                <p><strong>State/Region:</strong> ${item.admin1 || 'N/A'}</p>
                <p><strong>Population:</strong> ${item.population ? item.population.toLocaleString() : 'N/A'}</p>
                <p><strong>Elevation:</strong> ${item.elevation ? item.elevation + 'm' : 'N/A'}</p>
                <p><strong>Coordinates:</strong> ${item.latitude}, ${item.longitude}</p>
            </div>
            <div class="extra-info-box">
                <strong>About ${name} (Culture & Tourism):</strong><br>
                <p style="margin-top: 0.5rem; line-height: 1.6;">${extraInfo}</p>
            </div>
        `;
    }
}

function addFavorite(name) {
    if (!favorites.includes(name)) {
        favorites.push(name);
        saveData();
        renderFavorites();
    }
}

function removeFavorite(name) {
    favorites = favorites.filter(fav => fav !== name);
    saveData();
    renderFavorites();
}

function renderFavorites() {
    favoritesList.innerHTML = '';
    favorites.forEach(fav => {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
            <span><strong>${fav}</strong></span>
            <button class="btn-coral" style="padding: 0.5rem 1rem; font-size: 0.8rem;">Remove</button>
        `;
        div.querySelector('button').addEventListener('click', () => removeFavorite(fav));
        favoritesList.appendChild(div);
    });
}

itineraryForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const dest = itineraryDest.value.trim();
    const notes = itineraryNotes.value.trim();
    if (dest && notes) {
        itinerary.push({ id: Date.now(), dest, notes });
        saveData();
        renderItinerary();
        itineraryForm.reset();
    }
});

function removeItineraryItem(id) {
    itinerary = itinerary.filter(item => item.id !== id);
    saveData();
    renderItinerary();
}

function renderItinerary() {
    itineraryList.innerHTML = '';
    itinerary.forEach(item => {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
            <div class="list-item-content">
                <strong>${item.dest}</strong>
                <span>${item.notes}</span>
            </div>
            <button class="btn-coral" style="padding: 0.5rem 1rem; font-size: 0.8rem;">Delete</button>
        `;
        div.querySelector('button').addEventListener('click', () => removeItineraryItem(item.id));
        itineraryList.appendChild(div);
    });
}

function saveData() {
    localStorage.setItem('travelFavorites', JSON.stringify(favorites));
    localStorage.setItem('travelItinerary', JSON.stringify(itinerary));
}

searchBtn.addEventListener('click', () => {
    if (searchInput.value.trim()) fetchDestination(searchInput.value.trim());
});

searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && searchInput.value.trim()) fetchDestination(searchInput.value.trim());
});

regionBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        fetchByRegion(e.target.dataset.region);
    });
});

closeBtn.addEventListener('click', () => {
    detailsModal.style.display = 'none';
});

window.addEventListener('click', (e) => {
    if (e.target === detailsModal) {
        detailsModal.style.display = 'none';
    }
});

init();