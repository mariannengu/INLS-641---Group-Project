let dashboardData = [];
let filteredData = [];
let allDates = [];

document.addEventListener('DOMContentLoaded', function() {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.dashboard-section');

    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            navLinks.forEach(l => l.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            this.classList.add('active');
            const sectionId = this.getAttribute('data-section');
            document.getElementById(sectionId).classList.add('active');
        });
    });

    loadCSVData();
});

function loadCSVData() {
    showLoading();
    
    d3.csv('ncr_ride_bookings.csv').then(function(data) {
        dashboardData = data.map(d => ({
            date: d.Date,
            time: d.Time,
            bookingId: d['Booking ID'].replace(/"/g, ''),
            bookingStatus: d['Booking Status'],
            customerId: d['Customer ID'].replace(/"/g, ''),
            vehicleType: d['Vehicle Type'],
            pickupLocation: d['Pickup Location'],
            dropLocation: d['Drop Location'],
            avgVTAT: d['Avg VTAT'] === 'null' ? null : parseFloat(d['Avg VTAT']),
            avgCTAT: d['Avg CTAT'] === 'null' ? null : parseFloat(d['Avg CTAT']),
            cancelledByCustomer: d['Cancelled Rides by Customer'] === 'null' ? null : parseInt(d['Cancelled Rides by Customer']),
            customerCancelReason: d['Reason for cancelling by Customer'],
            cancelledByDriver: d['Cancelled Rides by Driver'] === 'null' ? null : parseInt(d['Cancelled Rides by Driver']),
            driverCancelReason: d['Driver Cancellation Reason'],
            incompleteRides: d['Incomplete Rides'] === 'null' ? null : parseInt(d['Incomplete Rides']),
            incompleteReason: d['Incomplete Rides Reason'],
            bookingValue: d['Booking Value'] === 'null' ? null : parseFloat(d['Booking Value']),
            rideDistance: d['Ride Distance'] === 'null' ? null : parseFloat(d['Ride Distance']),
            driverRating: d['Driver Ratings'] === 'null' ? null : parseFloat(d['Driver Ratings']),
            customerRating: d['Customer Rating'] === 'null' ? null : parseFloat(d['Customer Rating']),
            paymentMethod: d['Payment Method']
        }));

        filteredData = [...dashboardData];
        allDates = [...new Set(dashboardData.map(d => d.date).filter(d => d))].sort();
        
        populateDateDropdowns();
        updateDashboard();
        
    }).catch(function(error) {
        console.error('Error loading CSV:', error);
        showError('Failed to load CSV data. Please ensure ncr_ride_bookings.csv is in the same directory as this HTML file.');
    });
}

function showLoading() {
    document.getElementById('total-bookings').innerHTML = '<div style="font-size: 18px;">Loading...</div>';
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error';
    errorDiv.innerHTML = message;
    document.querySelector('.main-content').insertBefore(errorDiv, document.querySelector('.dashboard-section'));
}

function updateDashboard() {
    updateKPIs();
    updateVehicleTypeChart('vehicle-type-chart');          // Vehicle Type section
    updateVehicleTypeChart('vehicle-type-chart-overall');  // Overall section
}


function updateKPIs() {
    const totalBookings = filteredData.length;
    const completedRides = filteredData.filter(d => d.bookingStatus === 'Completed').length;
    const avgDistance = d3.mean(filteredData.filter(d => d.rideDistance !== null), d => d.rideDistance) || 0;
    const avgRating = d3.mean(filteredData.filter(d => d.driverRating !== null), d => d.driverRating) || 0;
    const validRevenueData = filteredData.filter(d => d.bookingValue !== null && !isNaN(d.bookingValue));
    const totalRevenue = d3.sum(validRevenueData, d => d.bookingValue) || 0;

    document.getElementById('total-bookings').textContent = totalBookings.toLocaleString();
    document.getElementById('completed-rides').textContent = completedRides.toLocaleString();
    document.getElementById('avg-distance').textContent = avgDistance.toFixed(1) + ' km';
    document.getElementById('avg-rating').textContent = avgRating.toFixed(1);
    document.getElementById('total-revenue').textContent = '$' + totalRevenue.toLocaleString();
}

function updateVehicleTypeChart(containerId = 'vehicle-type-chart') {
    const vehicleTypeCounts = d3.rollup(filteredData, v => v.length, d => d.vehicleType);
    const chartData = Array.from(vehicleTypeCounts, ([vehicleType, count]) => ({ vehicleType, count }))
        .sort((a, b) => b.count - a.count);

    d3.select(`#${containerId}`).selectAll('*').remove();

    // Create tooltip if it doesn't exist
    let tooltip = d3.select('body').select('.chart-tooltip');
    if (tooltip.empty()) {
        tooltip = d3.select('body')
            .append('div')
            .attr('class', 'chart-tooltip')
            .style('position', 'absolute')
            .style('opacity', 0)
            .style('background-color', 'rgba(0, 0, 0, 0.8)')
            .style('color', 'white')
            .style('padding', '10px 15px')
            .style('border-radius', '8px')
            .style('font-size', '14px')
            .style('pointer-events', 'none')
            .style('z-index', '1000')
            .style('box-shadow', '0 4px 6px rgba(0,0,0,0.3)');
    }

    const margin = { top: 20, right: 30, bottom: 80, left: 70 };
    const width = document.getElementById(containerId).clientWidth - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const svg = d3.select(`#${containerId}`)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
        .domain(chartData.map(d => d.vehicleType))
        .range([0, width])
        .padding(0.3);

    const y = d3.scaleLinear()
        .domain([0, d3.max(chartData, d => d.count)])
        .nice()
        .range([height, 0]);

    const color = d3.scaleOrdinal()
        .domain(chartData.map(d => d.vehicleType))
        .range(['#78A2D2', '#6B94C5', '#5A83B4', '#FEFFAF', '#F5F59F', '#EBEB8F']);

    // Bars with animation and hover interactions
    const bars = svg.selectAll('.bar')
        .data(chartData)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', d => x(d.vehicleType))
        .attr('y', height)  // Start from bottom
        .attr('width', x.bandwidth())
        .attr('height', 0)  // Start with 0 height
        .attr('fill', d => color(d.vehicleType))
        .attr('opacity', 0)
        .style('cursor', 'pointer')  // Show it's clickable
        .on('mouseover', function(event, d) {
            // Highlight the bar
            d3.select(this)
                .transition()
                .duration(200)
                .attr('opacity', 1);
            
            // Show tooltip
            tooltip
                .style('opacity', 1)
                .html(`<strong>${d.vehicleType}</strong><br/>Bookings: ${d.count.toLocaleString()}`)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px');
        })
        .on('mousemove', function(event) {
            // Update tooltip position as mouse moves
            tooltip
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px');
        })
        .on('mouseout', function() {
            // Reset bar opacity
            d3.select(this)
                .transition()
                .duration(200)
                .attr('opacity', 0.8);
            
            // Hide tooltip
            tooltip.style('opacity', 0);
        })
        .transition()  // Add transition
        .duration(800)  // 800ms animation
        .delay((d, i) => i * 100)  // Stagger each bar by 100ms
        .ease(d3.easeCubicOut)  // Smooth easing
        .attr('y', d => y(d.count))
        .attr('height', d => height - y(d.count))
        .attr('opacity', 0.8);

    // X axis
    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll('text')
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end')
        .style('font-size', '12px')
        .style('fill', '#333');

    // Y axis
    svg.append('g')
        .call(d3.axisLeft(y))
        .selectAll('text')
        .style('font-size', '12px')
        .style('fill', '#333');

    // X axis label
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', height + margin.bottom - 10)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('font-weight', 'bold')
        .style('fill', '#333')
        .text('Vehicle Type');

    // Y axis label
    svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -height / 2)
        .attr('y', -margin.left + 20)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('font-weight', 'bold')
        .style('fill', '#333')
        .text('Number of Bookings');
}


function populateDateDropdowns() {
    const sections = ['overall', 'vehicle-type', 'revenue', 'booking-status'];
    
    sections.forEach(section => {
        const startSelect = document.getElementById(`start-date-${section}`);
        const endSelect = document.getElementById(`end-date-${section}`);
        
        startSelect.innerHTML = '<option value="">All Dates</option>';
        endSelect.innerHTML = '<option value="">All Dates</option>';
        
        allDates.forEach(date => {
            const option1 = document.createElement('option');
            option1.value = date;
            option1.textContent = date;
            startSelect.appendChild(option1);
            
            const option2 = document.createElement('option');
            option2.value = date;
            option2.textContent = date;
            endSelect.appendChild(option2);
        });
    });
}

function applyDateFilter(section) {
    const startDate = document.getElementById(`start-date-${section}`).value;
    const endDate = document.getElementById(`end-date-${section}`).value;
    
    if (!startDate && !endDate) {
        filteredData = [...dashboardData];
    } else if (startDate && !endDate) {
        filteredData = dashboardData.filter(d => d.date >= startDate);
    } else if (!startDate && endDate) {
        filteredData = dashboardData.filter(d => d.date <= endDate);
    } else {
        filteredData = dashboardData.filter(d => d.date >= startDate && d.date <= endDate);
    }
    
    const filterInfo = document.getElementById(`filter-info-${section}`);
    if (!startDate && !endDate) {
        filterInfo.textContent = 'Showing all data';
    } else if (startDate && endDate) {
        filterInfo.textContent = `Filtered: ${startDate} to ${endDate} (${filteredData.length} records)`;
    } else if (startDate) {
        filterInfo.textContent = `Filtered: From ${startDate} (${filteredData.length} records)`;
    } else {
        filterInfo.textContent = `Filtered: Until ${endDate} (${filteredData.length} records)`;
    }
    
    updateDashboard();
}

function resetDateFilter(section) {
    document.getElementById(`start-date-${section}`).value = '';
    document.getElementById(`end-date-${section}`).value = '';
    filteredData = [...dashboardData];
    document.getElementById(`filter-info-${section}`).textContent = 'Showing all data';
    updateDashboard();
}