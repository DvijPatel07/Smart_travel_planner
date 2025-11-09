// Authentication
checkAuth();
const user = JSON.parse(localStorage.getItem('user'));

if (document.getElementById('username-display')) {
    document.getElementById('username-display').textContent = user.username;
}

async function loadTrips() {
    try {
        const response = await fetch(`${API_URL}/trips.php?action=list`, {
            headers: getAuthHeaders()
        });

        const data = await response.json();

        if (data.success) {
            displayTrips(data.trips);
        }
    } catch (error) {
        console.error('Failed to load trips:', error);
    }
}

function displayTrips(trips) {
    const container = document.getElementById('trips-container');
    if (!container) return;
    if (trips.length === 0) {
        container.innerHTML = '<p>No trips yet. Create your first trip!</p>';
        return;
    }
    container.innerHTML = trips.map(trip => `
        <div class="trip-card" onclick="viewTrip(${trip.id})">
            <h3>${trip.trip_name}</h3>
            <p><i class="fas fa-map-marker-alt"></i> ${trip.destination}</p>
            <p><i class="fas fa-calendar"></i> ${formatDate(trip.start_date)} - ${formatDate(trip.end_date)}</p>
            <p class="creator">By ${trip.creator_name}</p>
        </div>
    `).join('');
}

window.viewTrip = function(tripId) {
    window.location.href = `trip.html?id=${tripId}`;
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Create new trip
if (document.getElementById('create-trip-form')) {
    document.getElementById('create-trip-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const tripData = {
            trip_name: document.getElementById('trip-name').value,
            destination: document.getElementById('destination').value,
            start_date: document.getElementById('start-date').value,
            end_date: document.getElementById('end-date').value,
            description: document.getElementById('description').value
        };

        try {
            const response = await fetch(`${API_URL}/trips.php?action=create`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(tripData)
            });

            const data = await response.json();

            if (data.success) {
                alert('Trip created successfully!');
                // --- reload list of trips instead of redirecting
                document.getElementById('create-trip-form').reset();
                loadTrips();
            } else {
                alert(data.message);
            }
        } catch (error) {
            alert('Failed to create trip');
        }
    });
}

// Load trips on page load
if (document.getElementById('trips-container')) {
    loadTrips();
}
