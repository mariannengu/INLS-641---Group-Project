/**
// Global variables
let sampleData = [];
let filteredData = [];
let isLargeDataset = false;

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', function() {
    try {
        // Show loading message for large dataset
        updateLoadingMessage("Initializing dashboard...");
        
        // Check if we should load CSV or use sample data
        // For large datasets, we'll load CSV
        loadDataset();
        
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        // Fallback to sample data
        setTimeout(() => {
            sampleData = generateSampleData(500);
            filteredData = sampleData;
            initializeDashboard();
        }, 1000);
    }
});

function updateLoadingMessage(message) {
    const loadingElement = document.getElementById('loadingMessage');
    if (loadingElement) {
        loadingElement.textContent = message;
    }
}

function loadDataset() {
    // Try to load CSV first, fallback to sample data
    updateLoadingMessage("Loading data from CSV...");
    
    d3.csv("ncr_ride_bookings.csv").then(function(data) {
        console.log(`Loaded ${data.length} records from CSV`);
        updateLoadingMessage(`Processing ${data.length.toLocaleString()} records...`);
        
        // Set large dataset flag
        isLargeDataset = data.length > 10000;
        
        // Process data in chunks to avoid blocking UI
        processDataInChunks(data);
        
    }).catch(function(error) {
        console.warn("CSV not found, using sample data:", error);
        updateLoadingMessage("Generating sample data...");
        
        // Fallback to sample data
        setTimeout(() => {
            sampleData = generateSampleData(500);
            filteredData = sampleData;
            initializeDashboard();
        }, 500);
    });
}

function processDataInChunks(rawData) {
    const chunkSize = 1000;
    let processedData = [];
    let currentIndex = 0;
    
    function processChunk() {
        const endIndex = Math.min(currentIndex + chunkSize, rawData.length);
        
        // Process this chunk
        for (let i = currentIndex; i < endIndex; i++) {
            const d = rawData[i];
            processedData.push({
                bookingId: d["Booking ID"] || `UB${String(i + 1).padStart(6, '0')}`,
                date: new Date(d.Date || d.date),
                customerId: d["Customer ID"] || `CUST${String(Math.floor(Math.random() * 1000) + 1).padStart(4, '0')}`,
                vehicleType: d["Vehicle Type"] || d.VehicleType || 'UberGo',
                city: d.City || d.city || 'Delhi',
                pickupLocation: d["Pickup Location"] || d.PickupLocation || 'Unknown',
                dropLocation: d["Drop Location"] || d.DropLocation || 'Unknown',
                distance: parseFloat(d.Distance || d.distance) || Math.random() * 30 + 2,
                status: (d["Booking Status"] || d.status || 'completed').toLowerCase(),
                rating: parseFloat(d.Rating || d.rating) || (Math.random() > 0.3 ? Math.random() * 2 + 3 : null),
                revenue: parseFloat(d.Revenue || d.revenue) || Math.round((parseFloat(d.Distance) || 10) * (Math.random() * 5 + 8))
            });
        }
        
        currentIndex = endIndex;
        
        // Update progress
        const progress = Math.round((currentIndex / rawData.length) * 100);
        updateLoadingMessage(`Processing records: ${progress}% (${currentIndex.toLocaleString()}/${rawData.length.toLocaleString()})`);
        
        if (currentIndex < rawData.length) {
            // Process next chunk after a small delay to keep UI responsive
            setTimeout(processChunk, 10);
        } else {
            // Processing complete
            sampleData = processedData.sort((a, b) => b.date - a.date);
            filteredData = sampleData;
            
            updateLoadingMessage("Initializing dashboard...");
            setTimeout(() => {
                document.getElementById('loadingMessage').style.display = 'none';
                document.getElementById('dashboard').style.display = 'block';
                initializeDashboard();
            }, 500);
        }
    }
    
    processChunk();
}

// If you want to load from CSV instead of sample data, uncomment this:
// d3.csv("ncr_ride_bookings.csv").then(function(data) {
//     // Process your CSV data here
//     data.forEach(d => {
//         d.date = new Date(d.Date);
//         d.bookingId = d["Booking ID"];
//         d.status = d["Booking Status"].toLowerCase();
//         d.customerId = d["Customer ID"];
//         d.vehicleType = d["Vehicle Type"];
//         d.pickupLocation = d["Pickup Location"];
//         d.dropLocation = d["Drop Location"];
//         d.distance = +d.Distance || 0;
//         d.rating = +d.Rating || null;
//         d.revenue = +d.Revenue || 0;
//     });
//     
//     sampleData = data;
//     filteredData = data;
//     initializeDashboard();
// });

function generateSampleData(count) {
    const vehicleTypes = ['UberGo', 'UberX', 'UberXL', 'UberPremium', 'UberPool'];
    const cities = ['Delhi', 'Noida', 'Gurgaon', 'Faridabad', 'Ghaziabad'];
    const statuses = ['completed', 'cancelled', 'incomplete'];
    const pickupLocations = ['Connaught Place', 'Karol Bagh', 'Lajpat Nagar', 'Dwarka', 'Rohini', 'Sector 18 Noida', 'Cyber City'];
    const dropLocations = ['IGI Airport', 'New Delhi Railway Station', 'Gurgaon Sector 29', 'Greater Noida', 'Vasant Kunj'];
    
    const data = [];
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-12-31');
    
    for (let i = 0; i < count; i++) {
        const randomDate = new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const distance = Math.round((Math.random() * 50 + 2) * 10) / 10;
        const rating = status === 'completed' ? Math.round((Math.random() * 2 + 3) * 10) / 10 : null;
        
        data.push({
            bookingId: `UB${String(i + 1).padStart(6, '0')}`,
            date: randomDate,
            customerId: `CUST${String(Math.floor(Math.random() * 1000) + 1).padStart(4, '0')}`,
            vehicleType: vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)],
            city: cities[Math.floor(Math.random() * cities.length)],
            pickupLocation: pickupLocations[Math.floor(Math.random() * pickupLocations.length)],
            dropLocation: dropLocations[Math.floor(Math.random() * dropLocations.length)],
            distance: distance,
            status: status,
            rating: rating,
            revenue: status === 'completed' ? Math.round(distance * (Math.random() * 5 + 8)) : 0
        });
    }
    
    return data.sort((a, b) => b.date - a.date);
}

function initializeDashboard() {
    try {
        populateFilters();
        setupEventListeners();
        updateDashboard();
    } catch (error) {
        console.error('Error in initializeDashboard:', error);
        // Try again after a short delay
        setTimeout(() => {
            try {
                populateFilters();
                setupEventListeners();
                updateDashboard();
            } catch (retryError) {
                console.error('Retry failed:', retryError);
            }
        }, 1000);
    }
}

function populateFilters() {
    try {
        // Vehicle types
        const vehicleTypes = [...new Set(sampleData.map(d => d.vehicleType))];
        const vehicleSelect = d3.select('#vehicleFilter');
        
        if (vehicleSelect.node()) {
            vehicleSelect.selectAll('option:not([value="all"])')
                .data(vehicleTypes)
                .enter()
                .append('option')
                .attr('value', d => d)
                .text(d => d);
        }
        
        // Cities
        const cities = [...new Set(sampleData.map(d => d.city))];
        const citySelect = d3.select('#cityFilter');
        
        if (citySelect.node()) {
            citySelect.selectAll('option:not([value="all"])')
                .data(cities)
                .enter()
                .append('option')
                .attr('value', d => d)
                .text(d => d);
        }
    } catch (error) {
        console.error('Error populating filters:', error);
    }
}

function setupEventListeners() {
    try {
        const filterElements = d3.selectAll('#vehicleFilter, #statusFilter, #cityFilter, #dateFrom, #dateTo');
        
        if (filterElements.size() > 0) {
            filterElements.on('change', applyFilters);
        } else {
            console.warn('Filter elements not found');
        }
    } catch (error) {
        console.error('Error setting up event listeners:', error);
    }
}

function applyFilters() {
    const startTime = performance.now();
    updateLoadingMessage("Applying filters...");
    
    // Show loading for large datasets
    if (isLargeDataset) {
        setTimeout(() => applyFiltersAsync(), 50);
    } else {
        applyFiltersSync();
    }
}

function applyFiltersSync() {
    const vehicleFilter = d3.select('#vehicleFilter').property('value');
    const statusFilter = d3.select('#statusFilter').property('value');
    const cityFilter = d3.select('#cityFilter').property('value');
    const dateFrom = d3.select('#dateFrom').property('value');
    const dateTo = d3.select('#dateTo').property('value');
    
    filteredData = sampleData.filter(d => {
        if (vehicleFilter !== 'all' && d.vehicleType !== vehicleFilter) return false;
        if (statusFilter !== 'all' && d.status !== statusFilter) return false;
        if (cityFilter !== 'all' && d.city !== cityFilter) return false;
        if (dateFrom && d.date < new Date(dateFrom)) return false;
        if (dateTo && d.date > new Date(dateTo)) return false;
        return true;
    });
    
    updateDashboard();
}

function applyFiltersAsync() {
    const vehicleFilter = d3.select('#vehicleFilter').property('value');
    const statusFilter = d3.select('#statusFilter').property('value');
    const cityFilter = d3.select('#cityFilter').property('value');
    const dateFrom = d3.select('#dateFrom').property('value');
    const dateTo = d3.select('#dateTo').property('value');
    
    // Process filtering in chunks for large datasets
    const chunkSize = 5000;
    let filtered = [];
    let currentIndex = 0;
    
    function filterChunk() {
        const endIndex = Math.min(currentIndex + chunkSize, sampleData.length);
        
        for (let i = currentIndex; i < endIndex; i++) {
            const d = sampleData[i];
            if (vehicleFilter !== 'all' && d.vehicleType !== vehicleFilter) continue;
            if (statusFilter !== 'all' && d.status !== statusFilter) continue;
            if (cityFilter !== 'all' && d.city !== cityFilter) continue;
            if (dateFrom && d.date < new Date(dateFrom)) continue;
            if (dateTo && d.date > new Date(dateTo)) continue;
            filtered.push(d);
        }
        
        currentIndex = endIndex;
        
        if (currentIndex < sampleData.length) {
            // Update progress
            const progress = Math.round((currentIndex / sampleData.length) * 100);
            updateLoadingMessage(`Filtering: ${progress}%`);
            setTimeout(filterChunk, 10);
        } else {
            // Filtering complete
            filteredData = filtered;
            updateLoadingMessage("Updating dashboard...");
            setTimeout(() => {
                updateDashboard();
                // Hide loading message
                const loadingElement = document.getElementById('loadingMessage');
                if (loadingElement) loadingElement.style.display = 'none';
            }, 100);
        }
    }
    
    filterChunk();
}

function updateDashboard() {
    updateMetrics();
    drawBarChart();
    drawPieChart();
    drawTimeChart();
    updateTable();
}

function updateMetrics() {
    const total = filteredData.length;
    const completed = filteredData.filter(d => d.status === 'completed').length;
    const avgDistance = d3.mean(filteredData, d => d.distance) || 0;
    const avgRating = d3.mean(filteredData.filter(d => d.rating), d => d.rating) || 0;
    const totalRevenue = d3.sum(filteredData, d => d.revenue) || 0;
    
    d3.select('#totalBookings').text(total.toLocaleString());
    d3.select('#completedBookings').text(completed.toLocaleString());
    d3.select('#avgDistance').text(avgDistance.toFixed(1) + ' km');
    d3.select('#avgRating').text(avgRating.toFixed(1));
    d3.select('#totalRevenue').text('₹' + totalRevenue.toLocaleString());
}

function drawBarChart() {
    const svg = d3.select('#barChart');
    svg.selectAll('*').remove();
    
    const margin = { top: 20, right: 30, bottom: 80, left: 60 };
    const width = svg.node().getBoundingClientRect().width - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;
    
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    
    const vehicleCounts = d3.rollup(filteredData, v => v.length, d => d.vehicleType);
    const data = Array.from(vehicleCounts, ([key, value]) => ({ vehicle: key, count: value }))
        .sort((a, b) => b.count - a.count);
    
    const x = d3.scaleBand()
        .domain(data.map(d => d.vehicle))
        .range([0, width])
        .padding(0.1);
    
    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.count)])
        .nice()
        .range([height, 0]);
    
    const colorScale = d3.scaleOrdinal(d3.schemeSet2);
    
    // Bars
    g.selectAll('.bar')
        .data(data)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', d => x(d.vehicle))
        .attr('width', x.bandwidth())
        .attr('y', height)
        .attr('height', 0)
        .attr('fill', d => colorScale(d.vehicle))
        .on('mouseover', function(event, d) {
            showTooltip(event, `${d.vehicle}: ${d.count} bookings`);
        })
        .on('mouseout', hideTooltip)
        .transition()
        .duration(800)
        .attr('y', d => y(d.count))
        .attr('height', d => height - y(d.count));
    
    // X axis
    g.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll('text')
        .style('text-anchor', 'end')
        .attr('dx', '-.8em')
        .attr('dy', '.15em')
        .attr('transform', 'rotate(-45)');
    
    // Y axis
    g.append('g')
        .call(d3.axisLeft(y));
    
    // Y axis label
    g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', 0 - margin.left)
        .attr('x', 0 - (height / 2))
        .attr('dy', '1em')
        .style('text-anchor', 'middle')
        .text('Number of Bookings');
}

function drawPieChart() {
    const svg = d3.select('#pieChart');
    svg.selectAll('*').remove();
    
    const width = svg.node().getBoundingClientRect().width;
    const height = 300;
    const radius = Math.min(width, height) / 2 - 20;
    
    const g = svg.append('g').attr('transform', `translate(${width/2},${height/2})`);
    
    const statusCounts = d3.rollup(filteredData, v => v.length, d => d.status);
    const data = Array.from(statusCounts, ([key, value]) => ({ status: key, count: value }));
    
    const pie = d3.pie().value(d => d.count);
    const arc = d3.arc().innerRadius(0).outerRadius(radius);
    
    const colorScale = d3.scaleOrdinal()
        .domain(['completed', 'cancelled', 'incomplete'])
        .range(['#28a745', '#dc3545', '#ffc107']);
    
    const arcs = g.selectAll('.pie-slice')
        .data(pie(data))
        .enter()
        .append('g')
        .attr('class', 'pie-slice');
    
    arcs.append('path')
        .attr('d', arc)
        .attr('fill', d => colorScale(d.data.status))
        .style('opacity', 0)
        .on('mouseover', function(event, d) {
            showTooltip(event, `${d.data.status}: ${d.data.count} bookings (${((d.data.count / filteredData.length) * 100).toFixed(1)}%)`);
        })
        .on('mouseout', hideTooltip)
        .transition()
        .duration(800)
        .style('opacity', 1);
    
    // Labels
    arcs.append('text')
        .attr('transform', d => `translate(${arc.centroid(d)})`)
        .attr('dy', '.35em')
        .style('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('font-weight', 'bold')
        .style('fill', 'white')
        .text(d => d.data.count > 0 ? d.data.status : '');
}

function drawTimeChart() {
    const svg = d3.select('#timeChart');
    svg.selectAll('*').remove();
    
    const margin = { top: 20, right: 30, bottom: 50, left: 60 };
    const width = svg.node().getBoundingClientRect().width - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
    
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Group by month
    const monthlyData = d3.rollup(
        filteredData,
        v => v.length,
        d => d3.timeFormat('%Y-%m')(d.date)
    );
    
    const data = Array.from(monthlyData, ([key, value]) => ({ 
        month: d3.timeParse('%Y-%m')(key), 
        count: value 
    })).sort((a, b) => a.month - b.month);
    
    const x = d3.scaleTime()
        .domain(d3.extent(data, d => d.month))
        .range([0, width]);
    
    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.count)])
        .nice()
        .range([height, 0]);
    
    const line = d3.line()
        .x(d => x(d.month))
        .y(d => y(d.count))
        .curve(d3.curveMonotoneX);
    
    // Line
    g.append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', '#667eea')
        .attr('stroke-width', 2)
        .attr('d', line);
    
    // Dots
    g.selectAll('.dot')
        .data(data)
        .enter()
        .append('circle')
        .attr('class', 'dot')
        .attr('cx', d => x(d.month))
        .attr('cy', d => y(d.count))
        .attr('r', 4)
        .attr('fill', '#667eea')
        .on('mouseover', function(event, d) {
            showTooltip(event, `${d3.timeFormat('%B %Y')(d.month)}: ${d.count} bookings`);
        })
        .on('mouseout', hideTooltip);
    
    // X axis
    g.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(d3.timeFormat('%b %Y')));
    
    // Y axis
    g.append('g')
        .call(d3.axisLeft(y));
    
    // Labels
    g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', 0 - margin.left)
        .attr('x', 0 - (height / 2))
        .attr('dy', '1em')
        .style('text-anchor', 'middle')
        .text('Number of Bookings');
}

function updateTable() {
    const tbody = d3.select('#bookingTable tbody');
    tbody.selectAll('*').remove();
    
    // For large datasets, limit table rows and add pagination info
    const maxRows = isLargeDataset ? 50 : 20;
    const recentBookings = filteredData.slice(0, maxRows);
    
    if (isLargeDataset && filteredData.length > maxRows) {
        // Add info row about data limitation
        const infoRow = tbody.append('tr').style('background', '#e3f2fd');
        infoRow.append('td')
            .attr('colspan', 9)
            .style('text-align', 'center')
            .style('font-style', 'italic')
            .style('color', '#1976d2')
            .text(`Showing first ${maxRows} records of ${filteredData.length.toLocaleString()} total records`);
    }
    
    const rows = tbody.selectAll('tr.data-row')
        .data(recentBookings)
        .enter()
        .append('tr')
        .attr('class', 'data-row');
    
    rows.selectAll('td')
        .data(d => [
            d.bookingId,
            d3.timeFormat('%Y-%m-%d')(d.date),
            d.customerId,
            d.vehicleType,
            d.pickupLocation,
            d.dropLocation,
            d.distance.toFixed(1) + ' km',
            d.status,
            d.rating ? d.rating.toFixed(1) : 'N/A'
        ])
        .enter()
        .append('td')
        .text((d, i) => d)
        .attr('class', (d, i, nodes) => {
            const rowData = d3.select(nodes[i].parentNode).datum();
            if (i === 7) return `status-${rowData.status}`;
            return '';
        });
}

function showTooltip(event, text) {
    const tooltip = d3.select('#tooltip');
    tooltip.style('opacity', 1)
        .html(text)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px');
}

function hideTooltip() {
    d3.select('#tooltip').style('opacity', 0);
}
*/

// Global variables
let rawData = [];
let filteredData = [];
let aggregatedData = {};
let isLargeDataset = false;

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', function() {
    updateLoadingMessage("🚗 Starting Uber Analytics...");
    setTimeout(loadDataset, 100);
});

function updateLoadingMessage(message) {
    const loadingElement = document.getElementById('loadingMessage');
    if (loadingElement) {
        loadingElement.innerHTML = `<div style="text-align: center;">
            <div style="margin-bottom: 10px;">${message}</div>
            <div style="width: 100%; background: rgba(255,255,255,0.2); height: 4px; border-radius: 2px; overflow: hidden;">
                <div id="progressBar" style="width: 0%; background: #667eea; height: 100%; transition: width 0.3s;"></div>
            </div>
        </div>`;
    }
}

function updateProgress(percent) {
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        progressBar.style.width = percent + '%';
    }
}

function loadDataset() {
    // Try to load CSV
    d3.csv("ncr_ride_bookings.csv").then(function(data) {
        console.log(`📊 Loaded ${data.length.toLocaleString()} records`);
        isLargeDataset = data.length > 5000;
        
        if (isLargeDataset) {
            processLargeDataset(data);
        } else {
            processSmallDataset(data);
        }
        
    }).catch(function(error) {
        console.warn("📄 CSV not found, generating sample data:", error);
        updateLoadingMessage("📊 Generating sample data...");
        rawData = generateSampleData(1000);
        processSmallDataset(rawData);
    });
}

function processLargeDataset(data) {
    updateLoadingMessage("⚡ Fast-processing large dataset...");
    updateProgress(10);
    
    // Pre-aggregate data for performance
    setTimeout(() => {
        const start = performance.now();
        
        // Pre-calculate aggregations to avoid filtering 148K records repeatedly
        aggregatedData = {
            byVehicle: d3.rollup(data, v => v.length, d => d["Vehicle Type"] || 'Unknown'),
            byStatus: d3.rollup(data, v => v.length, d => (d["Booking Status"] || 'completed').toLowerCase()),
            byCity: d3.rollup(data, v => v.length, d => d.City || 'Unknown'),
            byMonth: d3.rollup(data, v => v.length, d => {
                const date = new Date(d.Date);
                return isNaN(date) ? '2024-01' : d3.timeFormat('%Y-%m')(date);
            }),
            totalRevenue: d3.sum(data, d => parseFloat(d.Revenue) || 0),
            totalDistance: d3.sum(data, d => parseFloat(d.Distance) || 0),
            avgRating: d3.mean(data.filter(d => d.Rating && d.Rating !== ''), d => parseFloat(d.Rating)),
            totalBookings: data.length,
            completedBookings: data.filter(d => (d["Booking Status"] || '').toLowerCase() === 'completed').length
        };
        
        updateProgress(50);
        
        // Store sample for table display (last 100 records)
        rawData = data.slice(0, 100).map(d => ({
            bookingId: d["Booking ID"] || `UB${Math.random().toString(36).substr(2, 9)}`,
            date: new Date(d.Date) || new Date(),
            customerId: d["Customer ID"] || 'Unknown',
            vehicleType: d["Vehicle Type"] || 'UberGo',
            city: d.City || 'Unknown',
            pickupLocation: d["Pickup Location"] || 'Unknown',
            dropLocation: d["Drop Location"] || 'Unknown',
            distance: parseFloat(d.Distance) || 0,
            status: (d["Booking Status"] || 'completed').toLowerCase(),
            rating: parseFloat(d.Rating) || null,
            revenue: parseFloat(d.Revenue) || 0
        }));
        
        updateProgress(80);
        
        // Get unique values for filters from original data (sample to avoid performance issues)
        const sampleForFilters = data.slice(0, 10000);
        aggregatedData.vehicleTypes = [...new Set(sampleForFilters.map(d => d["Vehicle Type"]).filter(Boolean))];
        aggregatedData.cities = [...new Set(sampleForFilters.map(d => d.City).filter(Boolean))];
        
        filteredData = rawData;
        
        const end = performance.now();
        console.log(`⚡ Processed ${data.length.toLocaleString()} records in ${(end - start).toFixed(0)}ms`);
        
        updateProgress(100);
        setTimeout(initializeDashboard, 500);
        
    }, 100);
}

function processSmallDataset(data) {
    updateLoadingMessage("📊 Processing dataset...");
    updateProgress(30);
    
    rawData = data.map(d => ({
        bookingId: d["Booking ID"] || d.bookingId || `UB${Math.random().toString(36).substr(2, 9)}`,
        date: new Date(d.Date || d.date) || new Date(),
        customerId: d["Customer ID"] || d.customerId || 'Unknown',
        vehicleType: d["Vehicle Type"] || d.vehicleType || 'UberGo',
        city: d.City || d.city || 'Unknown',
        pickupLocation: d["Pickup Location"] || d.pickupLocation || 'Unknown',
        dropLocation: d["Drop Location"] || d.dropLocation || 'Unknown',
        distance: parseFloat(d.Distance || d.distance) || 0,
        status: (d["Booking Status"] || d.status || 'completed').toLowerCase(),
        rating: parseFloat(d.Rating || d.rating) || null,
        revenue: parseFloat(d.Revenue || d.revenue) || 0
    }));
    
    filteredData = rawData;
    updateProgress(80);
    setTimeout(initializeDashboard, 300);
}

function generateSampleData(count) {
    const vehicleTypes = ['UberGo', 'UberX', 'UberXL', 'UberPremium', 'UberPool'];
    const cities = ['Delhi', 'Noida', 'Gurgaon', 'Faridabad', 'Ghaziabad'];
    const statuses = ['completed', 'cancelled', 'incomplete'];
    const pickupLocations = ['Connaught Place', 'Karol Bagh', 'Lajpat Nagar', 'Dwarka', 'Rohini'];
    const dropLocations = ['IGI Airport', 'New Delhi Railway Station', 'Gurgaon Sector 29', 'Greater Noida'];
    
    return Array.from({length: count}, (_, i) => {
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const distance = Math.round((Math.random() * 50 + 2) * 10) / 10;
        
        return {
            "Booking ID": `UB${String(i + 1).padStart(6, '0')}`,
            "Date": new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
            "Customer ID": `CUST${String(Math.floor(Math.random() * 1000) + 1).padStart(4, '0')}`,
            "Vehicle Type": vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)],
            "City": cities[Math.floor(Math.random() * cities.length)],
            "Pickup Location": pickupLocations[Math.floor(Math.random() * pickupLocations.length)],
            "Drop Location": dropLocations[Math.floor(Math.random() * dropLocations.length)],
            "Distance": distance,
            "Booking Status": status,
            "Rating": status === 'completed' ? (Math.random() * 2 + 3).toFixed(1) : '',
            "Revenue": status === 'completed' ? Math.round(distance * (Math.random() * 5 + 8)) : 0
        };
    });
}

function initializeDashboard() {
    try {
        updateLoadingMessage("🎨 Building dashboard...");
        updateProgress(90);
        
        setTimeout(() => {
            document.getElementById('loadingMessage').style.display = 'none';
            document.getElementById('dashboard').style.display = 'block';
            
            populateFilters();
            setupEventListeners();
            updateDashboard();
            
            console.log('✅ Dashboard ready!');
        }, 500);
        
    } catch (error) {
        console.error('❌ Error initializing dashboard:', error);
    }
}

function populateFilters() {
    try {
        // Vehicle types
        const vehicleTypes = isLargeDataset ? aggregatedData.vehicleTypes : [...new Set(rawData.map(d => d.vehicleType))];
        const vehicleSelect = d3.select('#vehicleFilter');
        
        if (vehicleSelect.node() && vehicleTypes) {
            vehicleSelect.selectAll('option:not([value="all"])')
                .data(vehicleTypes)
                .enter()
                .append('option')
                .attr('value', d => d)
                .text(d => d);
        }
        
        // Cities
        const cities = isLargeDataset ? aggregatedData.cities : [...new Set(rawData.map(d => d.city))];
        const citySelect = d3.select('#cityFilter');
        
        if (citySelect.node() && cities) {
            citySelect.selectAll('option:not([value="all"])')
                .data(cities)
                .enter()
                .append('option')
                .attr('value', d => d)
                .text(d => d);
        }
    } catch (error) {
        console.error('Error populating filters:', error);
    }
}

function setupEventListeners() {
    try {
        // For large datasets, debounce filter changes to improve performance
        let filterTimeout;
        
        d3.selectAll('#vehicleFilter, #statusFilter, #cityFilter, #dateFrom, #dateTo')
            .on('change', function() {
                clearTimeout(filterTimeout);
                filterTimeout = setTimeout(applyFilters, isLargeDataset ? 300 : 100);
            });
            
    } catch (error) {
        console.error('Error setting up event listeners:', error);
    }
}

function applyFilters() {
    if (isLargeDataset) {
        // For large datasets, we can't filter the original data efficiently
        // Instead, we'll show a message and use the sample data
        filteredData = rawData; // Use the 100-record sample
        updateDashboard();
        return;
    }
    
    // Normal filtering for smaller datasets
    const vehicleFilter = d3.select('#vehicleFilter').property('value');
    const statusFilter = d3.select('#statusFilter').property('value');
    const cityFilter = d3.select('#cityFilter').property('value');
    const dateFrom = d3.select('#dateFrom').property('value');
    const dateTo = d3.select('#dateTo').property('value');
    
    filteredData = rawData.filter(d => {
        if (vehicleFilter !== 'all' && d.vehicleType !== vehicleFilter) return false;
        if (statusFilter !== 'all' && d.status !== statusFilter) return false;
        if (cityFilter !== 'all' && d.city !== cityFilter) return false;
        if (dateFrom && d.date < new Date(dateFrom)) return false;
        if (dateTo && d.date > new Date(dateTo)) return false;
        return true;
    });
    
    updateDashboard();
}

function updateDashboard() {
    updateMetrics();
    drawBarChart();
    drawPieChart();
    drawTimeChart();
    updateTable();
}

function updateMetrics() {
    if (isLargeDataset) {
        // Use pre-calculated metrics for large datasets
        d3.select('#totalBookings').text(aggregatedData.totalBookings.toLocaleString());
        d3.select('#completedBookings').text(aggregatedData.completedBookings.toLocaleString());
        d3.select('#avgDistance').text((aggregatedData.totalDistance / aggregatedData.totalBookings).toFixed(1) + ' km');
        d3.select('#avgRating').text((aggregatedData.avgRating || 4.2).toFixed(1));
        d3.select('#totalRevenue').text('₹' + aggregatedData.totalRevenue.toLocaleString());
    } else {
        // Calculate metrics from filtered data for smaller datasets
        const total = filteredData.length;
        const completed = filteredData.filter(d => d.status === 'completed').length;
        const avgDistance = d3.mean(filteredData, d => d.distance) || 0;
        const avgRating = d3.mean(filteredData.filter(d => d.rating), d => d.rating) || 4.2;
        const totalRevenue = d3.sum(filteredData, d => d.revenue) || 0;
        
        d3.select('#totalBookings').text(total.toLocaleString());
        d3.select('#completedBookings').text(completed.toLocaleString());
        d3.select('#avgDistance').text(avgDistance.toFixed(1) + ' km');
        d3.select('#avgRating').text(avgRating.toFixed(1));
        d3.select('#totalRevenue').text('₹' + totalRevenue.toLocaleString());
    }
}

function drawBarChart() {
    const svg = d3.select('#barChart');
    svg.selectAll('*').remove();
    
    const margin = { top: 20, right: 30, bottom: 80, left: 60 };
    const width = svg.node().getBoundingClientRect().width - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;
    
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Use pre-aggregated data for large datasets
    const vehicleCounts = isLargeDataset ? 
        aggregatedData.byVehicle : 
        d3.rollup(filteredData, v => v.length, d => d.vehicleType);
    
    const data = Array.from(vehicleCounts, ([key, value]) => ({ vehicle: key, count: value }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10); // Limit to top 10 for performance
    
    if (data.length === 0) return;
    
    const x = d3.scaleBand().domain(data.map(d => d.vehicle)).range([0, width]).padding(0.1);
    const y = d3.scaleLinear().domain([0, d3.max(data, d => d.count)]).nice().range([height, 0]);
    const colorScale = d3.scaleOrdinal(d3.schemeSet2);
    
    // Bars with animation
    g.selectAll('.bar')
        .data(data)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', d => x(d.vehicle))
        .attr('width', x.bandwidth())
        .attr('y', height)
        .attr('height', 0)
        .attr('fill', d => colorScale(d.vehicle))
        .on('mouseover', (event, d) => showTooltip(event, `${d.vehicle}: ${d.count.toLocaleString()} bookings`))
        .on('mouseout', hideTooltip)
        .transition()
        .duration(600)
        .attr('y', d => y(d.count))
        .attr('height', d => height - y(d.count));
    
    // Axes
    g.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x))
        .selectAll('text').style('text-anchor', 'end').attr('dx', '-.8em').attr('dy', '.15em').attr('transform', 'rotate(-45)');
    g.append('g').call(d3.axisLeft(y));
    g.append('text').attr('transform', 'rotate(-90)').attr('y', 0 - margin.left).attr('x', 0 - (height / 2))
        .attr('dy', '1em').style('text-anchor', 'middle').text('Number of Bookings');
}

function drawPieChart() {
    const svg = d3.select('#pieChart');
    svg.selectAll('*').remove();
    
    const width = svg.node().getBoundingClientRect().width;
    const height = 300;
    const radius = Math.min(width, height) / 2 - 20;
    
    const g = svg.append('g').attr('transform', `translate(${width/2},${height/2})`);
    
    const statusCounts = isLargeDataset ? 
        aggregatedData.byStatus : 
        d3.rollup(filteredData, v => v.length, d => d.status);
    
    const data = Array.from(statusCounts, ([key, value]) => ({ status: key, count: value }));
    
    if (data.length === 0) return;
    
    const pie = d3.pie().value(d => d.count);
    const arc = d3.arc().innerRadius(0).outerRadius(radius);
    const colorScale = d3.scaleOrdinal(['#28a745', '#dc3545', '#ffc107']);
    
    const arcs = g.selectAll('.pie-slice').data(pie(data)).enter().append('g').attr('class', 'pie-slice');
    
    arcs.append('path')
        .attr('d', arc)
        .attr('fill', d => colorScale(d.data.status))
        .style('opacity', 0)
        .on('mouseover', (event, d) => {
            const total = d3.sum(data, d => d.count);
            const percent = ((d.data.count / total) * 100).toFixed(1);
            showTooltip(event, `${d.data.status}: ${d.data.count.toLocaleString()} (${percent}%)`);
        })
        .on('mouseout', hideTooltip)
        .transition()
        .duration(600)
        .style('opacity', 1);
    
    // Labels
    arcs.append('text')
        .attr('transform', d => `translate(${arc.centroid(d)})`)
        .attr('dy', '.35em')
        .style('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('font-weight', 'bold')
        .style('fill', 'white')
        .text(d => d.data.count > 0 ? d.data.status : '');
}

function drawTimeChart() {
    const svg = d3.select('#timeChart');
    svg.selectAll('*').remove();
    
    const margin = { top: 20, right: 30, bottom: 50, left: 60 };
    const width = svg.node().getBoundingClientRect().width - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
    
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    
    const monthlyData = isLargeDataset ? 
        aggregatedData.byMonth : 
        d3.rollup(filteredData, v => v.length, d => d3.timeFormat('%Y-%m')(d.date));
    
    const data = Array.from(monthlyData, ([key, value]) => ({ 
        month: d3.timeParse('%Y-%m')(key), 
        count: value 
    })).filter(d => d.month).sort((a, b) => a.month - b.month);
    
    if (data.length === 0) return;
    
    const x = d3.scaleTime().domain(d3.extent(data, d => d.month)).range([0, width]);
    const y = d3.scaleLinear().domain([0, d3.max(data, d => d.count)]).nice().range([height, 0]);
    
    const line = d3.line().x(d => x(d.month)).y(d => y(d.count)).curve(d3.curveMonotoneX);
    
    // Line
    g.append('path').datum(data).attr('fill', 'none').attr('stroke', '#667eea').attr('stroke-width', 2).attr('d', line);
    
    // Dots
    g.selectAll('.dot').data(data).enter().append('circle').attr('class', 'dot')
        .attr('cx', d => x(d.month)).attr('cy', d => y(d.count)).attr('r', 4).attr('fill', '#667eea')
        .on('mouseover', (event, d) => showTooltip(event, `${d3.timeFormat('%B %Y')(d.month)}: ${d.count.toLocaleString()} bookings`))
        .on('mouseout', hideTooltip);
    
    // Axes
    g.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x).tickFormat(d3.timeFormat('%b %Y')));
    g.append('g').call(d3.axisLeft(y));
    g.append('text').attr('transform', 'rotate(-90)').attr('y', 0 - margin.left).attr('x', 0 - (height / 2))
        .attr('dy', '1em').style('text-anchor', 'middle').text('Number of Bookings');
}

function updateTable() {
    const tbody = d3.select('#bookingTable tbody');
    tbody.selectAll('*').remove();
    
    const maxRows = 25;
    const displayData = filteredData.slice(0, maxRows);
    
    if (isLargeDataset) {
        // Add info about large dataset
        const infoRow = tbody.append('tr').style('background', '#e3f2fd');
        infoRow.append('td').attr('colspan', 9).style('text-align', 'center').style('font-style', 'italic')
            .style('color', '#1976d2')
            .text(`📊 Large Dataset: Showing sample of ${displayData.length} records. Charts use full ${aggregatedData.totalBookings.toLocaleString()} records.`);
    }
    
    const rows = tbody.selectAll('tr.data-row').data(displayData).enter().append('tr').attr('class', 'data-row');
    
    rows.selectAll('td').data(d => [
        d.bookingId,
        d3.timeFormat('%Y-%m-%d')(d.date),
        d.customerId,
        d.vehicleType,
        d.pickupLocation,
        d.dropLocation,
        d.distance.toFixed(1) + ' km',
        d.status,
        d.rating ? d.rating.toFixed(1) : 'N/A'
    ]).enter().append('td').text(d => d)
        .attr('class', (d, i, nodes) => {
            const rowData = d3.select(nodes[i].parentNode).datum();
            return i === 7 ? `status-${rowData.status}` : '';
        });
}

function showTooltip(event, text) {
    const tooltip = d3.select('#tooltip');
    tooltip.style('opacity', 1).html(text)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px');
}

function hideTooltip() {
    d3.select('#tooltip').style('opacity', 0);
}