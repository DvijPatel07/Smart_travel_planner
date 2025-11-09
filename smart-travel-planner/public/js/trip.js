
// Check auth on load
checkAuth();

const tripTitle = document.getElementById('trip-title');
const tripInfo = document.getElementById('trip-info');
const tripMembers = document.getElementById('trip-members');
const tripPlaces = document.getElementById('trip-places');

const urlParams = new URLSearchParams(window.location.search);
const tripId = urlParams.get('id');

if (!tripId) {
    alert('Trip ID not specified.');
    window.location.href = 'dashboard.html';
}

function showLoadingState() {
    document.getElementById('trip-info').innerHTML = `
        <div class="skeleton-loading">
            <div class="skeleton"></div>
            <div class="skeleton"></div>
            <div class="skeleton"></div>
        </div>
    `;
    document.getElementById('trip-members').innerHTML = `
        <h3>Members</h3>
        <div class="skeleton-loading">
            <div class="skeleton"></div>
            <div class="skeleton"></div>
        </div>
    `;
    document.getElementById('trip-places').innerHTML = `
        <div class="skeleton-loading">
            <div class="skeleton"></div>
            <div class="skeleton"></div>
            <div class="skeleton"></div>
        </div>
    `;
}

async function loadTripDetails() {
    showLoadingState();
    
    try {
        const response = await fetch(`${API_URL}/trips.php?action=details&id=${tripId}`, {
            headers: getAuthHeaders()
        });
        const data = await response.json();

        if (data.success) {
            displayTrip(data.trip, data.members);
            loadPlaces();
        } else {
            notify(data.message || 'Failed to load trip details', 'error');
            setTimeout(() => window.location.href = 'dashboard.html', 2000);
        }
    } catch (error) {
        notify('Failed to load trip details. Redirecting...', 'error');
        setTimeout(() => window.location.href = 'dashboard.html', 2000);
    }
}

function displayTrip(trip, members) {
    tripTitle.textContent = trip.trip_name;

    tripInfo.innerHTML = `
        <p><strong>Destination:</strong> ${trip.destination}</p>
        <p><strong>Dates:</strong> ${formatDate(trip.start_date)} - ${formatDate(trip.end_date)}</p>
        <p><strong>Description:</strong> ${trip.description}</p>
    `;

    tripMembers.innerHTML = `<h3>Members</h3><ul>${members.map(m => `<li>${m.username} (${m.role})</li>`).join('')}</ul>`;
}

async function loadPlaces() {
    try {
        const response = await fetch(`${API_URL}/places.php?action=trip-places&trip_id=${tripId}`, {
            headers: getAuthHeaders()
        });
        const data = await response.json();

        if (data.success) {
            displayPlaces(data.places);
        } else {
            tripPlaces.innerHTML = `<p>${data.message}</p>`;
        }
    } catch (error) {
        tripPlaces.innerHTML = '<p>Failed to load places.</p>';
    }
}

function displayPlaces(places) {
    if (places.length === 0) {
        tripPlaces.innerHTML = '<p class="no-places">No places added to this trip yet.</p>';
        return;
    }
    let html = '<h3>Places to Visit</h3><div class="places-grid">';
    places.forEach(place => {
        html += `
            <div class="place-card fade-in">
                <div class="place-details">
                    <span class="date-badge">${place.place_type}</span>
                    <h4 class="place-title">${place.place_name}</h4>
                    <p class="place-description">${place.description || 'No description available.'}</p>
                    <div class="place-meta">
                        <span><i class="fas fa-map-marker-alt"></i> ${place.location || 'Location not specified'}</span>
                        <span><i class="fas fa-clock"></i> Best time: ${place.best_time || 'Any time'}</span>
                    </div>
                    <div class="action-buttons">
                        <button class="btn-action" onclick="editPlace(${place.id})">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn-action btn-secondary" onclick="deletePlaceConfirm(${place.id})">
                            <i class="fas fa-trash-alt"></i> Remove
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    html += '</div>';
    tripPlaces.innerHTML = html;
}

async function editPlace(placeId) {
    // Redirect to the place edit page
    window.location.href = `planner.html?edit=place&id=${placeId}&trip=${tripId}`;
}

async function deletePlaceConfirm(placeId) {
    if (confirm('Are you sure you want to remove this place from the trip?')) {
        try {
            const response = await fetch(`${API_URL}/places.php`, {
                method: 'DELETE',
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'delete',
                    place_id: placeId,
                    trip_id: tripId
                })
            });
            const data = await response.json();
            
            if (data.success) {
                loadPlaces(); // Reload the places list
            } else {
                alert(data.message || 'Failed to delete place');
            }
        } catch (error) {
            alert('Failed to delete place. Please try again.');
        }
    }
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

loadTripDetails();
