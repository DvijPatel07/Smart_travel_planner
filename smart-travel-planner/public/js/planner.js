if (typeof checkAuth === 'function') {
    checkAuth();
} else {
    console.error('checkAuth() not found. Ensure auth.js loads before planner.js');
}

const tripSelector = document.getElementById('trip-selector'); // Make sure this exists!
const cityForm = document.getElementById('city-search-form');
const cityInput = document.getElementById('city-input');
const placesResults = document.getElementById('places-results');

let tripsList = [];
let activeTripId = null;

// STEP 1: Load the user's trips and fill dropdown
async function fetchTrips() {
    if (!tripSelector) {
        console.error('Trip selector dropdown not found!');
        return;
    }
    try {
        const response = await fetch(`${API_URL}/trips.php?action=list`, {
            headers: getAuthHeaders()
        });
        const data = await response.json();
        if (data.success && data.trips.length > 0) {
            tripsList = data.trips;
            tripSelector.innerHTML = '';
            tripsList.forEach(trip => {
                const option = document.createElement('option');
                option.value = trip.id;
                option.textContent = `${trip.trip_name} (${trip.destination})`;
                tripSelector.appendChild(option);
            });
            // Default to latest trip
            activeTripId = tripsList[0].id;
            tripSelector.value = activeTripId;
        } else {
            tripSelector.innerHTML = '<option value="">No trips found</option>';
            activeTripId = null;
        }
    } catch (error) {
        tripSelector.innerHTML = '<option value="">Error loading trips</option>';
        activeTripId = null;
        console.error('Failed to fetch trips:', error);
    }
}
if (tripSelector) {
    tripSelector.addEventListener('change', () => {
        activeTripId = tripSelector.value;
    });
}
fetchTrips();

if (cityForm) {
    cityForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const city = cityInput ? cityInput.value.trim() : '';
        if (!city) {
            placesResults.innerHTML = '<p>Please enter a city name.</p>';
            return;
        }
        placesResults.innerHTML = '<p>Loading places...</p>';
        try {
            const url = `${API_URL}/places.php?action=search&city=${encodeURIComponent(city)}`;
            const response = await fetch(url, { headers: getAuthHeaders() });
            const text = await response.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch (err) {
                console.error('JSON parse error:', err, text);
                placesResults.innerHTML = '<p>Server error: could not parse response.</p>';
                return;
            }
            if (data.success) {
                if (!data.places || data.places.length === 0) {
                    placesResults.innerHTML = '<p>No places found for this city.</p>';
                } else {
                    displayPlaces(data.places);
                }
            } else {
                placesResults.innerHTML = `<p>Error: ${data.message}</p>`;
            }
        } catch (err) {
            placesResults.innerHTML = '<p>Failed to fetch places. Please try again later.</p>';
            console.error('Fetch error:', err);
        }
    });
}

function displayPlaces(places) {
    placesResults.innerHTML = '';
    places.forEach(p => {
        const name = p.display_name || 'Unknown name';
        const lat = p.lat || '';
        const lon = p.lon || '';
        const placeCard = document.createElement('div');
        placeCard.className = 'place-card';
        placeCard.innerHTML = `
            <h4>${name}</h4>
            <p><strong>Latitude:</strong> ${lat}</p>
            <p><strong>Longitude:</strong> ${lon}</p>
            <button class="btn btn-small btn-primary">Add to Trip</button>
        `;
        // SAFETY: only add listener if button exists
        const button = placeCard.querySelector('button');
        if (button) {
            button.addEventListener('click', () => {
                addPlaceToTrip(name, '', '', lat, lon, p);
            });
        }
        placesResults.appendChild(placeCard);
    });
}

async function addPlaceToTrip(placeName, placeType, address, lat, lon, apiData) {
    if (!activeTripId) {
        alert("No active trip found. Please create a trip first!");
        return;
    }
    const placePayload = {
        trip_id: parseInt(activeTripId, 10),
        place_name: placeName,
        place_type: placeType,
        address: address,
        latitude: lat,
        longitude: lon,
        api_data: apiData
    };
    try {
        const response = await fetch(`${API_URL}/places.php?action=add`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(placePayload)
        });
        const data = await response.json();
        if (data.success) {
            alert('Place successfully added to trip!');
        } else {
            alert('Failed to add place: ' + data.message);
        }
    } catch (error) {
        alert('Failed to add place. Please try again later.');
        console.error('Add place error:', error);
    }
}
