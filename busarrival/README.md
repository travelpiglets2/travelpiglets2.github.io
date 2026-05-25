# 🚌 Bus Stop Live Arrivals — Documentation

> **File:** `bus_stop_97039_gps.html`
> **Version:** 1.0
> **Last Updated:** 25 May 2026

---

## Table of Contents

1. [Overview](#1-overview)
2. [Features](#2-features)
3. [Technology Stack](#3-technology-stack)
4. [External APIs](#4-external-apis)
5. [Configuration](#5-configuration)
6. [Application Architecture](#6-application-architecture)
7. [UI Components](#7-ui-components)
8. [Bus Arrival Card Details](#8-bus-arrival-card-details)
9. [Color Coding](#9-color-coding)
10. [Map Details](#10-map-details)
11. [How to Use](#11-how-to-use)
12. [CORS & Hosting Notes](#12-cors--hosting-notes)
13. [Browser Requirements](#13-browser-requirements)
14. [File Structure](#14-file-structure)
15. [Troubleshooting](#15-troubleshooting)

---

## 1. Overview

**Bus Stop Live Arrivals** is a single-page web application that provides **real-time bus arrival information** for bus stops in **Singapore**. It displays an interactive map with live bus positions, countdown timers for incoming buses, and detailed arrival cards — all in a modern dark-themed interface.

### Target Audience
- Singapore commuters who want to check live bus arrival times
- Users who need to quickly find the nearest bus stop via GPS

---

## 2. Features

| Feature | Description |
|---|---|
| **Live Bus Arrivals** | Real-time arrival data for all bus services at a given stop |
| **Interactive Map** | Leaflet.js map showing the bus stop location and live positions of incoming buses |
| **GPS Nearest Stop** | Detects user's GPS location and shows the 5 nearest bus stops with distances |
| **Bus Priority Ordering** | Configurable priority list ensures preferred buses (2, 5, 4, 24) always appear at the top |
| **Auto-Refresh** | Automatically refreshes arrival data every 60 seconds with a visual countdown bar |
| **Manual Refresh** | "Refresh Now" button for on-demand data refresh |
| **Bus Stop Search** | Input any bus stop ID to switch to that stop's arrivals |
| **Responsive Design** | Adapts to mobile and desktop screen sizes |
| **Dark Theme** | Eye-friendly dark UI with cyan accent colors |
| **Animated Cards** | Smooth fade-in animations when bus cards are rendered |
| **Dynamic Legend** | Map legend updates automatically based on active bus services |

---

## 3. Technology Stack

| Technology | Purpose |
|---|---|
| **HTML5** | Page structure and semantic markup |
| **CSS3** | Styling, animations, responsive grid layout, dark theme |
| **JavaScript (Vanilla ES5)** | Application logic, API calls, DOM manipulation |
| **Leaflet.js v1.9.4** | Interactive map rendering |
| **OpenStreetMap** | Map tile provider |

### External Dependencies (CDN)
- Leaflet CSS: `https://unpkg.com/leaflet@1.9.4/dist/leaflet.css`
- Leaflet JS: `https://unpkg.com/leaflet@1.9.4/dist/leaflet.js`

---

## 4. External APIs

### 4.1 Bus Stop Database API

| Property | Value |
|---|---|
| **URL** | `https://data.busrouter.sg/v1/stops.json` |
| **Method** | GET |
| **Cache** | `force-cache` |
| **Purpose** | Loads the complete database of all Singapore bus stops |

**Response Format:**
```json
{
  "stopId": [longitude, latitude, "Stop Name", "Road Name"],
  "97039":  [103.74528, 1.34039, "Jurong East Int", "Jurong East Ave 1"]
}
```

> ⚠️ **Important:** Index `0` = **longitude**, Index `1` = **latitude** (not the typical lat/lng order).

### 4.2 Bus Arrivals API

| Property | Value |
|---|---|
| **URL** | `https://arrivelah2.busrouter.sg/?id={stopId}` |
| **Method** | GET |
| **Cache** | `no-store` (always fresh data) |
| **Purpose** | Fetches live bus arrival data for a specific stop |

**Response Format:**
```json
{
  "services": [
    {
      "no": "2",
      "operator": "SBST",
      "next":  { "time": "ISO8601", "lat": 1.34, "lng": 103.74, "load": "SEA", "type": "DD", "feature": "WAB", "monitored": 1 },
      "next2": { ... },
      "next3": { ... }
    }
  ]
}
```

Each service provides up to **3 arrival slots**: `next`, `next2`, and `next3`.

---

## 5. Configuration

The following variables are defined at the top of the `<script>` block and can be customized:

### 5.1 `REFRESH_SEC`
```javascript
var REFRESH_SEC = 60;
```
- **Description:** Auto-refresh interval in seconds
- **Default:** `60` (1 minute)
- **Effect:** Controls how often arrival data is re-fetched and the countdown timer duration

### 5.2 `PRIORITY_ORDER`
```javascript
var PRIORITY_ORDER = ["2", "5", "4", "24"];
```
- **Description:** Array of bus service numbers to display first, in the specified order
- **Default:** `["2", "5", "4", "24"]`
- **Effect:** These buses appear at the top of the bus card grid (if they serve the current stop). All other buses are listed below in their default order.

### 5.3 `COLOR_PALETTE`
```javascript
var COLOR_PALETTE = [
    "#4fc3f7","#4caf50","#ffd166","#ff6b6b","#ce93d8",
    "#f39c12","#48cae4","#ff8a65","#a5d6a7","#80cbc4",
    "#ffb3c6","#b0bec5"
];
```
- **Description:** Colors assigned to bus markers on the map
- **Effect:** Each bus service is assigned a unique color from this palette (cycles if more buses than colors)

### 5.4 `currentStopId`
```javascript
var currentStopId = "97039";
```
- **Description:** The default bus stop loaded on page initialization
- **Default:** `"97039"`

---

## 6. Application Architecture

### 6.1 Initialization Flow

```
Page Load
  │
  ├─► fetchStopsData()         ── Load full bus stop database (cached)
  │     │
  │     ├─► loadCurrentStop()  ── Extract lat/lng/name/road for current stop
  │     └─► updateHeaderInfo() ── Update header with stop name & road
  │
  ├─► fetchData()              ── Fetch live arrivals for current stop
  │     │
  │     ├─► sortServices()     ── Sort by priority order
  │     ├─► renderMap()        ── Plot bus stop + live bus positions on map
  │     └─► renderCards()      ── Generate bus arrival cards in grid
  │
  └─► startAutoRefresh()       ── Start 60s countdown timer
```

### 6.2 Core Functions

#### `fetchStopsData()`
- Fetches the full Singapore bus stop database from the Stops API
- Stores data in the global `stopsData` object
- Called once on page load with `force-cache` for efficiency
- Required for GPS nearest stop feature and stop name resolution

#### `loadCurrentStop()`
- Extracts latitude, longitude, name, and road for `currentStopId` from `stopsData`
- Populates the `currentStopInfo` object: `{ lat, lng, name, road }`

#### `fetchData()`
- Fetches live arrival data from the Arrivals API (no-store cache)
- Calls `sortServices()` to apply priority ordering
- Triggers `renderMap()` and `renderCards()` to update the UI
- Updates the "Last updated" timestamp in SGT (Singapore Time)

#### `sortServices(services)`
- **Priority sorting logic:**
  1. Iterates through `PRIORITY_ORDER` array
  2. Extracts matching services into a `prioritised` array (maintaining priority order)
  3. Collects remaining services into a `rest` array
  4. Returns `prioritised.concat(rest)`
- **Handles gracefully** when priority buses don't serve the current stop (they're simply skipped)

#### `renderMap(services)`
- Clears existing bus markers
- Places the **bus stop marker** (red, labeled "STOP")
- Plots **live bus positions** for each service's `next`, `next2`, `next3` slots
- Only plots buses with valid coordinates and `monitored === 1` (live tracking)
- Centers the map on the bus stop at zoom level 15

#### `renderCards(services)`
- Generates HTML bus arrival cards for each service
- Each card shows up to 3 arrivals (Next, 2nd, 3rd) with:
  - Formatted arrival time (HH:MM in SGT)
  - Countdown in minutes
  - Color-coded countdown indicator
  - Tags: Live/Est, Load, Type, WAB

#### `goToStop()`
- Reads the bus stop ID from the input field
- Resets color assignments
- Loads the new stop data and triggers a manual refresh

### 6.3 GPS Nearest Stop Feature

The GPS feature is encapsulated in an **IIFE (Immediately Invoked Function Expression)** at the bottom of the file.

#### How It Works:
1. User clicks **"📍 Nearest Stop"** button
2. A **modal dialog** opens with a "Detecting your location…" message
3. The browser's **Geolocation API** (`navigator.geolocation.getCurrentPosition`) requests the user's GPS coordinates
4. A **blue dot marker** ("You are here") is placed on the map at the user's location
5. The **Haversine formula** calculates the distance from the user to every bus stop in the database
6. Results are sorted by distance (nearest first)
7. The **top 5 nearest stops** are displayed in the modal as cards, each showing:
   - Bus Stop ID
   - Stop Name
   - Road Name
   - Distance (meters or kilometers)
   - A **"Go →"** button to switch to that stop

#### Haversine Formula
```javascript
function haversine(lat1, lon1, lat2, lon2) {
    var R = 6371000; // Earth's radius in metres
    // ... calculates great-circle distance between two GPS points
}
```
- Returns distance in **metres**
- Used to calculate proximity to all bus stops in the database

#### Geolocation Options
```javascript
{ enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
```
- **High accuracy** enabled (uses GPS if available)
- **10-second timeout**
- **No cached positions** (always fresh)

### 6.4 Auto-Refresh & Countdown Timer

| Function | Purpose |
|---|---|
| `startAutoRefresh()` | Sets a repeating interval to call `fetchData()` every `REFRESH_SEC` seconds |
| `startCountdown()` | Counts down from `REFRESH_SEC` to 0, updating the progress bar and text |
| `updateCountdownUI()` | Updates the progress bar width and countdown text (e.g., "45s") |
| `manualRefresh()` | Clears existing timers, fetches data immediately, restarts auto-refresh |

---

## 7. UI Components

### 7.1 Header
- **Title:** Displays "Bus Stop {ID} - {Stop Name}" (dynamically updated)
- **Subtitle:** Shows road name and "Real-time Bus Arrivals"
- **Bus Stop Input:** Text field to enter any bus stop ID (max 6 characters)
- **"Go →" Button:** Navigates to the entered bus stop
- **"📍 Nearest Stop" Button:** Opens the GPS nearest stop modal
- **Last Updated:** Shows the timestamp of the last data refresh in SGT

### 7.2 Refresh Bar
- **Countdown Label:** "Next refresh in"
- **Progress Bar:** Animated bar that depletes over 60 seconds
- **Countdown Text:** Shows remaining seconds (e.g., "42s")
- **"↻ Refresh Now" Button:** Triggers an immediate data refresh (disabled during loading, shows spinner)

### 7.3 Status Banner
- **Loading State:** Blue background with spinner animation
- **Error State:** Red background with error message and CORS troubleshooting tips
- **Success State:** Hidden (no banner shown)

### 7.4 Interactive Map
- **Height:** 420px
- **Zoom Level:** 15 (~1 km radius view)
- **Bus Stop Marker:** Red circle labeled "STOP" with popup showing stop details
- **Bus Markers:** Colored circles labeled with bus number, with popup showing arrival details
- **My Location Dot:** Blue pulsing dot (shown after GPS detection)

### 7.5 Bus Arrival Cards Grid
- **Layout:** Responsive CSS grid (`repeat(auto-fit, minmax(280px, 1fr))`)
- **Card Structure:**
  - **Header:** Bus badge (colored), bus number, operator name
  - **Arrivals List:** Up to 3 rows (Next, 2nd, 3rd) with time, countdown, and tags

### 7.6 Legend
- Explains map markers, bus colors, and tag abbreviations
- Dynamically updates bus color entries based on active services

### 7.7 GPS Modal
- **Backdrop:** Semi-transparent dark overlay (click to close)
- **Modal Box:** Centered dialog with close button
- **Stop Cards:** Up to 5 nearest stops with distance and "Go →" buttons
- **Status Messages:** "Detecting your location…", "Finding nearest stops…", or error messages

---

## 8. Bus Arrival Card Details

### 8.1 Arrival Slots

| Slot | Label | Description |
|---|---|---|
| `next` | **Next** | The very next bus arrival |
| `next2` | **2nd** | The second upcoming arrival |
| `next3` | **3rd** | The third upcoming arrival |

### 8.2 Tags

#### Load (Crowdedness)

| Tag | Full Name | Color | Description |
|---|---|---|---|
| **SEA** | Seats Available | 🟢 Green | Seats are available |
| **SDA** | Standing Available | 🟡 Yellow | All seats taken, standing room available |
| **LSD** | Limited Standing | 🔴 Red | Very crowded, limited standing space |

#### Bus Type

| Tag | Full Name | Color | Description |
|---|---|---|---|
| **DD** | Double Deck | 🔵 Blue | Double-decker bus |
| **SD** | Single Deck | 🟣 Purple | Single-deck bus |

#### Accessibility

| Tag | Full Name | Color | Description |
|---|---|---|---|
| **WAB** | Wheelchair Accessible | 🟢 Teal | Bus is wheelchair accessible |

#### Tracking Status

| Tag | Full Name | Color | Description |
|---|---|---|---|
| **• Live** | Live Tracking | 🟢 Green | Bus position is monitored in real-time (`monitored === 1`) |
| **Est.** | Estimated | ⚪ Grey | Estimated arrival time (not live-tracked) |

---

## 9. Color Coding

### 9.1 Arrival Countdown Colors

| Condition | Color | CSS Class | Meaning |
|---|---|---|---|
| ≤ 3 minutes | 🔴 Red (`#ff6b6b`) | `arriving-soon` | Bus is arriving very soon — hurry! |
| 4–10 minutes | 🟡 Yellow (`#ffd166`) | `arriving-mid` | Bus arriving in a few minutes |
| > 10 minutes | 🟢 Green (`#06d6a0`) | `arriving-late` | Plenty of time |

### 9.2 Bus Marker Colors

Each bus service is assigned a unique color from the `COLOR_PALETTE` array for map markers, card badges, and legend entries. Colors are assigned in order and cycle if there are more services than palette entries.

---

## 10. Map Details

| Property | Value |
|---|---|
| **Map Library** | Leaflet.js v1.9.4 |
| **Tile Provider** | OpenStreetMap (`{s}.tile.openstreetmap.org`) |
| **Default Center** | `[1.3521, 103.8198]` (Singapore) |
| **Zoom Level** | 15 (~1 km radius) |
| **Max Zoom** | 19 |
| **Stop Marker** | Red circle (38px), labeled "STOP", with popup |
| **Bus Markers** | Colored circles (36px), labeled with bus number, with popup |
| **My Location Dot** | Blue pulsing dot (16px) with "You are here" popup |

---

## 11. How to Use

### Step 1: Start a Local Server
To avoid CORS (Cross-Origin Resource Sharing) issues, serve the file via a local HTTP server:

```bash
# Navigate to the folder containing the HTML file
cd /path/to/folder

# Start a simple Python HTTP server
python -m http.server 8080
```

### Step 2: Open in Browser
Navigate to:
```
http://localhost:8080/bus_stop_97039_gps.html
```

### Step 3: View Bus Arrivals
- The app loads **Bus Stop 97039** by default
- The **map** shows the bus stop and live bus positions
- **Bus arrival cards** display upcoming buses with countdown timers

### Step 4: Search for a Different Stop
1. Enter a bus stop ID (e.g., `12345`) in the input field
2. Click **"Go →"** or press **Enter**

### Step 5: Find Nearest Bus Stop (GPS)
1. Click **"📍 Nearest Stop"**
2. Allow location access when prompted by the browser
3. Review the **5 nearest bus stops** shown in the modal
4. Click **"Go →"** on the desired stop

### Step 6: Refresh Data
- **Automatic:** Data refreshes every 60 seconds (watch the progress bar)
- **Manual:** Click **"↻ Refresh Now"** for immediate refresh

---

## 12. CORS & Hosting Notes

### The Problem
The application fetches data from external APIs (`busrouter.sg`). When opened directly as a file (`file:///...`), browsers block these requests due to **CORS (Cross-Origin Resource Sharing)** policies.

### The Solution
Serve the file through an HTTP server:

```bash
# Option 1: Python 3
python -m http.server 8080

# Option 2: Node.js (if installed)
npx http-server -p 8080

# Option 3: PHP (if installed)
php -S localhost:8080
```

Then open `http://localhost:8080/bus_stop_97039_gps.html`.

### Error Handling
If CORS blocks the requests, the app displays a helpful error banner:
> ⚠ Live data blocked by CORS. Run: `python -m http.server 8080` then open `http://localhost:8080/bus_stop_97039.html`

---

## 13. Browser Requirements

| Requirement | Details |
|---|---|
| **Modern Browser** | Chrome, Firefox, Edge, Safari (latest versions recommended) |
| **JavaScript** | Must be enabled |
| **Geolocation API** | Required for GPS Nearest Stop feature |
| **Internet Connection** | Required for map tiles (OpenStreetMap) and live bus data APIs |
| **HTTPS or localhost** | Geolocation API requires a secure context (`https://` or `localhost`) |

---

## 14. File Structure

The application is a **single self-contained HTML file** with all CSS and JavaScript embedded inline.

```
bus_stop_97039_gps.html
│
├── <head>
│   ├── Meta tags (charset, viewport)
│   ├── Page title
│   ├── Leaflet.js CSS (CDN)
│   └── <style> — All CSS styles (~200 lines)
│       ├── Global reset & body
│       ├── Header & input styles
│       ├── Refresh bar & countdown
│       ├── Status banner & spinner
│       ├── Map container
│       ├── Bus card grid & cards
│       ├── Arrival rows & tags
│       ├── Legend
│       ├── GPS button
│       ├── GPS modal & backdrop
│       ├── Stop cards in modal
│       ├── My-location dot
│       └── Responsive breakpoints
│
├── <body>
│   ├── <header> — Title, subtitle, stop input, GPS button, last updated
│   ├── .refresh-bar — Countdown timer, progress bar, refresh button
│   ├── #status-banner — Loading/error messages
│   ├── .main-container
│   │   ├── #map — Leaflet map container
│   │   ├── #bus-grid — Bus arrival cards grid
│   │   └── .legend — Map & tag legend
│   │
│   ├── <script> (Leaflet.js CDN)
│   │
│   ├── <script> — Main application logic (~300 lines)
│   │   ├── Configuration variables
│   │   ├── Color management
│   │   ├── sortServices() — Priority sorting
│   │   ├── Map setup (Leaflet)
│   │   ├── Icon factory
│   │   ├── Stop marker management
│   │   ├── Helper functions (fmtTime, minutesUntil, etc.)
│   │   ├── renderMap() / renderCards()
│   │   ├── updateBusLegend()
│   │   ├── Status & loading management
│   │   ├── fetchStopsData() / fetchData()
│   │   ├── Countdown timer
│   │   ├── goToStop()
│   │   └── Initialization
│   │
│   ├── GPS Modal HTML — Backdrop, modal box, stop list container
│   │
│   └── <script> — GPS Nearest Stop feature (IIFE, ~80 lines)
│       ├── Haversine distance calculation
│       ├── Modal open/close
│       ├── findNearest() — Sorts all stops by distance
│       ├── renderStops() — Displays top 5 nearest stops
│       ├── placeMyLocationDot() — Adds blue dot to map
│       └── Event listeners (GPS button, close button, backdrop)
```

---

## 15. Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| "Live data blocked by CORS" | File opened directly (`file:///`) | Serve via HTTP server (see [Section 12](#12-cors--hosting-notes)) |
| "Bus Stop ID not found" | Invalid stop ID entered | Verify the bus stop ID (5-digit code found on physical bus stop signs) |
| GPS "Location access was denied" | Browser permission denied | Allow location access in browser settings |
| GPS "Position could not be determined" | Weak GPS signal / indoor use | Move to an area with better GPS signal |
| Map tiles not loading | No internet connection | Ensure you have an active internet connection |
| Priority buses not on top | Bus doesn't serve that stop | Priority sorting only applies to buses that actually serve the current stop |
| Stale arrival data | Auto-refresh paused/failed | Click "↻ Refresh Now" or reload the page |

---

## License

This application uses data from [BusRouter SG](https://busrouter.sg/) and map tiles from [OpenStreetMap](https://www.openstreetmap.org/). Please refer to their respective terms of use.

---

*Documentation generated on 25 May 2026.*
