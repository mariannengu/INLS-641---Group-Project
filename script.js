// This dashboard uses D3.js (Data-Driven Documents) for data visualization (as instructed in project guidelines)
// D3.js Documentation: https://d3js.org

// GLOBAL DATA STORAGE VARIABLES 
// Note: these variables store the data for the different sections of the dashboard (i.e., Overall, Vehicle Type, Revenue, and Booking Status)
// We used separate filtered datasets so that each section can have independent date filtering (makes it easier later on!!)

let dashboardData = []; // Master dataset (stores all CSV data)
let filteredDataOverall = [];
let filteredDataVehicleType = [];
let filteredDataRevenue = [];
let filteredDataBookingStatus = [];
let allDates = []; // Array of all unique dates from the dataset

// PAGE INITIALIZATION (event listener runs when HTML page is fully loaded)
document.addEventListener('DOMContentLoaded', function() {
    // Getting all navigation links and dashboard sections
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.dashboard-section');

    // Setting up click handlers for navigation links 
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {

        // PREVENTING "DEFAULT LINK" BEHAVIOR
            e.preventDefault();

            // Removing 'active' class from all navigation links and section but adding 'active' class to clicked link
            navLinks.forEach(l => l.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            this.classList.add('active');

            // Getting section ID from the data-section attribute and then ---> SHOWING THAT SECTION
            const sectionId = this.getAttribute('data-section');
            document.getElementById(sectionId).classList.add('active');
            
            // WHEN YOU SWITCH TO SPECIFIC SECTIONS --> CHART RENDERS WITH CORRECT DIMENSIOSN WHEN SECTION BECOMES VISIBLE
            if (sectionId === 'vehicle-type-page') {
                updateVehicleTypeMetricChart();
            } else if (sectionId === 'revenue') {
                updateRevenueCharts();
            } else if (sectionId === 'booking-status') {
                updateBookingStatusCharts();
            }
        });
    });
    loadCSVData();
});

// CSV DATA LOADING
// Loading/parsing CSV, initializing dashboard, and transforming each row of CSV data into a structured object
// COLUMN IDS: Date,Time,Booking ID,Booking Status,Customer ID,Vehicle Type,Pickup Location,Drop Location,Avg VTAT,Avg CTAT,Cancelled Rides by Customer,Reason for cancelling by Customer,Cancelled Rides by Driver,Driver Cancellation Reason,Incomplete Rides,Incomplete Rides Reason,Booking Value,Ride Distance,Driver Ratings,Customer Rating,Payment Method
// FIRST ROW: 2024-03-23,12:29:38,"""CNR5884300""",No Driver Found,"""CID1982111""",eBike,Palam Vihar,Jhilmil,null,null,null,null,null,null,null,null,null,null,null,null,null

function loadCSVData() {
    showLoading();
    // Referencing https://d3-wiki.readthedocs.io/zh-cn/master/CSV/ for documentation on D3's way of loading/parsing CSV file
    d3.csv('ncr_ride_bookings.csv').then(function(data) {
        
        dashboardData = data.map(d => ({
            // Date and time info (clearly)
            date: d.Date,
            time: d.Time,

            // Booking identifiers (REMOVING QUOTES FROM IDS)
            bookingId: d['Booking ID'].replace(/"/g, ''),
            bookingStatus: d['Booking Status'],
            customerId: d['Customer ID'].replace(/"/g, ''),

            // Trip details
            vehicleType: d['Vehicle Type'],
            pickupLocation: d['Pickup Location'],
            dropLocation: d['Drop Location'],

            // Timing metrics (PARSING AS FLOATS, HANDLING 'NULL' VALUES)
            avgVTAT: d['Avg VTAT'] === 'null' ? null : parseFloat(d['Avg VTAT']),
            avgCTAT: d['Avg CTAT'] === 'null' ? null : parseFloat(d['Avg CTAT']),

            // Cancellation data (PARSE AS INTS!!!!!!)
            cancelledByCustomer: d['Cancelled Rides by Customer'] === 'null' ? null : parseInt(d['Cancelled Rides by Customer']),
            customerCancelReason: d['Reason for cancelling by Customer'],
            cancelledByDriver: d['Cancelled Rides by Driver'] === 'null' ? null : parseInt(d['Cancelled Rides by Driver']),
            driverCancelReason: d['Driver Cancellation Reason'],

            // Incomplete rides data
            incompleteRides: d['Incomplete Rides'] === 'null' ? null : parseInt(d['Incomplete Rides']),
            incompleteReason: d['Incomplete Rides Reason'],

            // Financial and trip metrics
            bookingValue: d['Booking Value'] === 'null' ? null : parseFloat(d['Booking Value']),
            rideDistance: d['Ride Distance'] === 'null' ? null : parseFloat(d['Ride Distance']),

            // Rating information (driverRating = customer's rating of the driver, customerRating = driver's rating of the customer)
            // this can get confusing so it's important to clarify!
            driverRating: d['Driver Ratings'] === 'null' ? null : parseFloat(d['Driver Ratings']),
            customerRating: d['Customer Rating'] === 'null' ? null : parseFloat(d['Customer Rating']),

            // Payment info
            paymentMethod: d['Payment Method']
        }));

        // This initializes all filteresd datasets with the complete dataset 
        filteredDataOverall = [...dashboardData];
        filteredDataVehicleType = [...dashboardData];
        filteredDataRevenue = [...dashboardData];
        filteredDataBookingStatus = [...dashboardData];
        
        // Extracting all unique dates and sort them chronologically
        // Referencing Stack Overflow to MAP AND SORT in one iteration in Java: https://stackoverflow.com/questions/2374756/map-and-sort-in-one-iteration-in-javascript
        allDates = [...new Set(dashboardData.map(d => d.date).filter(d => d))].sort();
        
        // Sets up date filter dropdowns with min/max dates and displays initial dashboard xP
        populateDateDropdowns();
        updateDashboardOverall();
        
    }).catch(function(error) {
        // Handles error handling during CSV loading
        // Using this to output a message to the console: https://developer.mozilla.org/en-US/docs/Web/API/console/error_static
        console.error('Error loading CSV:', error);
        showError('Failed to load CSV data. Please ensure ncr_ride_bookings.csv is in the same directory as this HTML file.');
    });
}

// UI HELPER FUNCTIONS

// Shows a loading indicator in the dashboard (csv file takes time to load because it has 148,000+ instances)
function showLoading() {
    document.getElementById('total-bookings').innerHTML = '<div style="font-size: 18px;">Loading...</div>';
}

// Displays an error to the user if there are any
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error';
    errorDiv.innerHTML = message;
    document.querySelector('.main-content').insertBefore(errorDiv, document.querySelector('.dashboard-section'));
}

// OVERVIEW SECTION (UPDATE)

// Updates all visualizations in the 'Overview' section
// FOUR TOTAL CHARTS: KPIs, Vehicle Type Bar Chart, Booking Status Pie Chart, and Time Series Line Chart
function updateDashboardOverall() {
    updateKPIs(filteredDataOverall);
    updateVehicleTypeChart('vehicle-type-chart-overall', filteredDataOverall);
    updateBookingStatusPieChart(filteredDataOverall);
    updateBookingsOverTimeChart(filteredDataOverall);
}

// KPI Calculations

// Calculating and displaying the Key Performance Indicators (KPIS)
function updateKPIs(data) {
// Counts total # of bookings
    const totalBookings = data.length;
    // Counts only COMPLETED rides
    const completedRides = data.filter(d => d.bookingStatus === 'Completed').length;
    // Calculates average distance (excluding null values if present)
    const avgDistance = d3.mean(data.filter(d => d.rideDistance !== null), d => d.rideDistance) || 0;
    // Calculates average driver rating (AGAIN: excluding null values)
    const avgRating = d3.mean(data.filter(d => d.driverRating !== null), d => d.driverRating) || 0;
    // Calculating total revenue (NEED TO filter valid values first)
    const validRevenueData = data.filter(d => d.bookingValue !== null && !isNaN(d.bookingValue));
    const totalRevenue = d3.sum(validRevenueData, d => d.bookingValue) || 0;

    // Updating the DOM elements with formatted values
    document.getElementById('total-bookings').textContent = totalBookings.toLocaleString();
    document.getElementById('completed-rides').textContent = completedRides.toLocaleString();
    document.getElementById('avg-distance').textContent = avgDistance.toFixed(1) + ' km';
    document.getElementById('avg-rating').textContent = avgRating.toFixed(1);
    document.getElementById('total-revenue').textContent = '₹' + totalRevenue.toLocaleString();
}

// BOOKING STATUS PIE CHART
// Creates an animated pie chart showing distribution of booking statuses

function updateBookingStatusPieChart(data) {
    // Referencing: https://observablehq.com/@d3/d3-group for d3.rollup
    // Note: d3.rollup lets you "reduce" each group by computing a corresponding summary value (e.g., sum or count)

    // Grouping data by booking status + count occurences
    const statusCounts = d3.rollup(data, v => v.length, d => d.bookingStatus);
    const total = data.length;
    
    // Transforming grouped data into an array with percentages
    const chartData = Array.from(statusCounts, ([status, count]) => ({
        status,
        count,
        percentage: (count / total * 100).toFixed(1)
        // REMOVE ANY STATUSES WITH 0 COUNT AND SORT BY COUNT DESCENDING
    })).filter(d => d.count > 0).sort((a, b) => b.count - a.count);

    // Clear any existing charts
    d3.select('#booking-status-pie-chart').selectAll('*').remove();

    // TOOLTIP ELEMENTS (creating + reusing)
    let tooltip = d3.select('body').select('.pie-tooltip');
    if (tooltip.empty()) {
        tooltip = d3.select('body')
            .append('div')
            .attr('class', 'pie-tooltip')
            .style('position', 'absolute')
            .style('opacity', 0)
            .style('background-color', 'rgba(0, 0, 0, 0.9)')
            .style('color', 'white')
            .style('padding', '12px 16px')
            .style('border-radius', '8px')
            .style('font-size', '14px')
            .style('pointer-events', 'none')
            .style('z-index', '1000')
            .style('box-shadow', '0 4px 6px rgba(0,0,0,0.3)');
    }

    // CHART DIMENSIONS
    const width = 240;
    const height = 240;
    const radius = Math.min(width, height) / 2 - 35;

    // Creating a container with flexbox layout for chart and legend
    // Using this to figure out how to use d3.select: https://d3js.org/d3-selection/selecting

    const container = d3.select('#booking-status-pie-chart')
        .append('div')
        .style('display', 'flex')
        .style('flex-direction', 'row')
        .style('align-items', 'center')
        .style('justify-content', 'center')
        .style('gap', '30px')
        .style('height', '100%');

        // CREATING SVG ELEMENT FOR PIE CHART
    const svg = container
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${width / 2},${height / 2})`);

        // Defining color scale for different statuses
    const color = d3.scaleOrdinal()
        .domain(chartData.map(d => d.status))
        .range(['#5BC589', '#F26138', '#FFC043', '#9A644C', '#3D7FF5', '#7956BF']);

        // Pie layout generator 
    const pie = d3.pie()
        .value(d => d.count)
        .sort(null);

        // Arc generator for the pie slices
    const arc = d3.arc()
        .innerRadius(0) // (FULL PIE - NOT DONUT)
        .outerRadius(radius);

        // Arc generator for label positioning (outside pie)
    const outerArc = d3.arc()
        .innerRadius(radius * 1.05)
        .outerRadius(radius * 1.05);

        // CREATE PIE SLICES
    const slices = svg.selectAll('path')
        .data(pie(chartData))
        .enter()
        .append('path')
        .attr('d', arc)
        .attr('fill', d => color(d.data.status))
        .attr('stroke', 'white')
        .style('stroke-width', '2px')
        .style('opacity', 0)
        .style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
            // ENLARGING SLICE SLIGHTLY
            d3.select(this)
                .transition()
                .duration(200)
                .style('opacity', 1)
                .attr('transform', function() {
                    const [x, y] = arc.centroid(d);
                    return `translate(${x * 0.1}, ${y * 0.1})`;
                });
            
                // SHOW TOOLTIP WITH DETAILS
            tooltip
                .style('opacity', 1)
                .html(`<strong>${d.data.status}</strong><br/>
                       Count: ${d.data.count.toLocaleString()}<br/>
                       Percentage: ${d.data.percentage}%`)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px');
        })
        .on('mousemove', function(event) {
            // Updating tooltip positionas mouse moves
            tooltip
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px');
        })
        .on('mouseout', function(event, d) {
            // Returning slice to normal size (if not clicked)
            d3.select(this)
                .transition()
                .duration(200)
                .style('opacity', 0.9)
                .attr('transform', 'translate(0, 0)');
            // HIDE TOOLTIP!
            tooltip.style('opacity', 0);
        });

        // Animating slices appearing with a growing effect 
    slices.transition()
        .duration(800)
        .delay((d, i) => i * 100)
        .style('opacity', 0.9)
        .attrTween('d', function(d) {
            // Referencing: https://d3js.org/d3-interpolate
            const interpolate = d3.interpolate({startAngle: 0, endAngle: 0}, d);
            return function(t) {
                return arc(interpolate(t));
            };
        });

        // Polylines connecting slices to percentage labels
    const polylines = svg.selectAll('polyline')
        .data(pie(chartData))
        .enter()
        .append('polyline')
        .attr('points', function(d) {
            // NEED TO: CALCULATE SLICE CENTER, ARC EDGE, LABEL POSITION
            const pos = outerArc.centroid(d);
            pos[0] = radius * 1.08 * (midAngle(d) < Math.PI ? 1 : -1);
            return [arc.centroid(d), outerArc.centroid(d), pos];
        })
        .style('fill', 'none')
        .style('stroke', '#333')
        .style('stroke-width', '1.5px')
        .style('opacity', 0);

        // Animating polylines appearing after slices
    polylines.transition()
        .duration(800)
        .delay((d, i) => i * 100 + 800)
        .style('opacity', 0.7);

// Creating percentage labels 
    const labels = svg.selectAll('text')
        .data(pie(chartData))
        .enter()
        .append('text')
        .attr('transform', function(d) {
            const pos = outerArc.centroid(d);
            pos[0] = radius * 1.08 * (midAngle(d) < Math.PI ? 1 : -1);
            return `translate(${pos})`;
        })
        .style('text-anchor', function(d) {
            // Anchoring text based on which side of chart it's on 
            return midAngle(d) < Math.PI ? 'start' : 'end';
        })
        .style('font-size', '10px')
        .style('font-weight', 'bold')
        .style('fill', '#333')
        .style('opacity', 0)
        .text(d => `${d.data.percentage}%`);

        // ANimating labels appearing
    labels.transition()
        .duration(800)
        .delay((d, i) => i * 100 + 800)
        .style('opacity', 1);

        // Legend to go next to pie chart!!
    const legend = container
        .append('div')
        .style('display', 'flex')
        .style('flex-direction', 'column')
        .style('gap', '8px')
        .style('padding', '10px');

        // ADDING LEGEND ITEMS
    chartData.forEach(d => {
        const legendItem = legend.append('div')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('gap', '8px')
            .style('cursor', 'pointer')
            // Highlighting corresponding slice on hover
            .on('mouseover', function() {
                svg.selectAll('path')
                    .filter(slice => slice.data.status === d.status)
                    .transition()
                    .duration(200)
                    .style('opacity', 1)
                    .attr('transform', function(slice) {
                        const [x, y] = arc.centroid(slice);
                        return `translate(${x * 0.1}, ${y * 0.1})`;
                    });
            })
            .on('mouseout', function() {
                svg.selectAll('path')
                    .filter(slice => slice.data.status === d.status)
                    .transition()
                    .duration(200)
                    .style('opacity', 0.9)
                    .attr('transform', 'translate(0, 0)');
            });

            // Color box indicator
        legendItem.append('div')
            .style('width', '14px')
            .style('height', '14px')
            .style('background-color', color(d.status))
            .style('border-radius', '2px')
            .style('flex-shrink', '0');

            // Label text
        legendItem.append('span')
            .style('font-size', '8px')
            .style('color', '#333')
            .style('white-space', 'nowrap')
            .text(`${d.status} (${d.percentage}%)`);
    });
    // Calculates middle angle of a pie slice
    function midAngle(d) {
        return d.startAngle + (d.endAngle - d.startAngle) / 2;
    }
}


// VEHICLE TYPE BAR CHART
// Creates an animated bar chart showing bookings by vehicle type
function updateVehicleTypeChart(containerId, data) {
    // Grouping data by vehicle type and count and then sorting descending by count
    const vehicleTypeCounts = d3.rollup(data, v => v.length, d => d.vehicleType);
    const chartData = Array.from(vehicleTypeCounts, ([vehicleType, count]) => ({ vehicleType, count }))
        .sort((a, b) => b.count - a.count);

        // Clear existing chart 0.0
    d3.select(`#${containerId}`).selectAll('*').remove();

    // CREATING/REUSING TOOLTIP (see explanation above!!)
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

    // Chart dimensions
    const container = document.getElementById(containerId);
    const margin = { top: 20, right: 30, bottom: 100, left: 90 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    // Creating SVG!
    const svg = d3.select(`#${containerId}`)
        .append('svg')
        .attr('width', container.clientWidth)
        .attr('height', 300)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

        // Create X scale (band scale for categories)
    const x = d3.scaleBand()
        .domain(chartData.map(d => d.vehicleType))
        .range([0, width])
        .padding(0.3); // space between bars (looks messy if it's directly next to eachother)

        // Create Y scale (linear scale for counts)
    const y = d3.scaleLinear()
        .domain([0, d3.max(chartData, d => d.count)])
        .nice()
        .range([height, 0]); // inverted (0 at bottom)

        // COLOR SCALE!!!!(uber brand colors)
    const color = d3.scaleOrdinal()
        .domain(chartData.map(d => d.vehicleType))
        .range(['#5BC589', '#F26138', '#FFC043', '#9A644C', '#3D7FF5', '#7956BF']);

        // Creating the actual bars
    const bars = svg.selectAll('.bar')
        .data(chartData)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', d => x(d.vehicleType))
        // Starting at bottom, start with height 0
        .attr('y', height)
        .attr('width', x.bandwidth())
        .attr('height', 0)
        .attr('fill', d => color(d.vehicleType))
        .attr('opacity', 0)
        .style('cursor', 'pointer')

        // HOVER EFFECTS (trying to make our dashboard interactive however we can)
        .on('mouseover', function(event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr('opacity', 1);
            
            tooltip
                .style('opacity', 1)
                .html(`<strong>${d.vehicleType}</strong><br/>Bookings: ${d.count.toLocaleString()}`)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px');
        })
        .on('mousemove', function(event) {
            tooltip
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px');
        })
        .on('mouseout', function() {
            d3.select(this)
                .transition()
                .duration(200)
                .attr('opacity', 0.8);
            
            tooltip.style('opacity', 0);
        });

        // Animating bars growing from bottom to top
    bars.transition()
        .duration(800)
        .delay((d, i) => i * 100) // stagger animation
        .ease(d3.easeCubicOut)
        .attr('y', d => y(d.count))
        .attr('height', d => height - y(d.count))
        .attr('opacity', 0.8);

        // Add X axis with rotated labels
    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll('text')
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end')
        .style('font-size', '12px')
        .style('fill', '#333');

        // Add Y axis
    svg.append('g')
        .call(d3.axisLeft(y))
        .selectAll('text')
        .style('font-size', '12px')
        .style('fill', '#333');

        // Add x axis label
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', height + margin.bottom - 10)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('font-weight', 'bold')
        .style('fill', '#333')
        .text('Vehicle Type');
// Add Y axis label too
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
// =====================================================================
// DATE FILTER SET UP (IMPORTANT AS IT AFFECTS OUR WHOLE DASHBOARD)
// =====================================================================

// Note: populates date input fields with min/max dates from the dataset
function populateDateDropdowns() {
    const sections = ['overall', 'vehicle-type-page', 'revenue', 'booking-status'];
    
    // Earliest date + latest date
    const minDate = allDates[0];
    const maxDate = allDates[allDates.length - 1];
    
    // Setting min/max attributes for ALL date inputs
    sections.forEach(section => {
        const startInput = document.getElementById(`start-date-${section}`);
        const endInput = document.getElementById(`end-date-${section}`);
        
        if (startInput && endInput) {
            startInput.min = minDate;
            startInput.max = maxDate;
            endInput.min = minDate;
            endInput.max = maxDate;
        }
    });
}

// DATE FILTERING
// Note: filters data based on selected date range for a specific section
function applyDateFilter(section) {
    const startDate = document.getElementById(`start-date-${section}`).value;
    const endDate = document.getElementById(`end-date-${section}`).value;
    
    let filteredData;
    // Handles different combinations of start/end dates
    if (!startDate && !endDate) {
        // No filters = show all data
        filteredData = [...dashboardData];
    } else if (startDate && !endDate) {
        // ONLY START DATE - SHOW FROM START DATE ONWARDS
        filteredData = dashboardData.filter(d => d.date >= startDate);
    } else if (!startDate && endDate) {
        // ONLY END DATE = SHOW UP TO END DATE
        filteredData = dashboardData.filter(d => d.date <= endDate);
    } else {
        // Both dates --> SHOW RANGE
        filteredData = dashboardData.filter(d => d.date >= startDate && d.date <= endDate);
    }
    
    // This updates the appropriate section's data and refrseh visualizations for Overall, Vehicle Type, Revenue, and Booking Status
    if (section === 'overall') {
        filteredDataOverall = filteredData;
        updateDashboardOverall();
    } else if (section === 'vehicle-type-page') {
        filteredDataVehicleType = filteredData;
        updateVehicleTypeMetricChart();
    } else if (section === 'revenue') {
        filteredDataRevenue = filteredData;
        updateRevenueCharts();
    } else if (section === 'booking-status') {
        filteredDataBookingStatus = filteredData;
        updateBookingStatusCharts();
    }

    // Update filter into display
    const filterInfo = document.getElementById(`filter-info-${section}`);
    if (filterInfo) {
        if (!startDate && !endDate) {
            filterInfo.textContent = 'Showing all data';
        } else if (startDate && endDate) {
            filterInfo.textContent = `Filtered: ${startDate} to ${endDate} (${filteredData.length} records)`;
        } else if (startDate) {
            filterInfo.textContent = `Filtered: From ${startDate} (${filteredData.length} records)`;
        } else {
            filterInfo.textContent = `Filtered: Until ${endDate} (${filteredData.length} records)`;
        }
    }
}

// Resets date filters and shows all date fro a section
function resetDateFilter(section) {
    const startInput = document.getElementById(`start-date-${section}`);
    const endInput = document.getElementById(`end-date-${section}`);
    const filterInfo = document.getElementById(`filter-info-${section}`);
    // Clears input values
    if (startInput) startInput.value = '';
    if (endInput) endInput.value = '';
    // Resets data to full dataset and update visualizations
    if (section === 'overall') {
        filteredDataOverall = [...dashboardData];
        updateDashboardOverall();
    } else if (section === 'vehicle-type-page') {
        filteredDataVehicleType = [...dashboardData];
        updateVehicleTypeMetricChart();
    } else if (section === 'revenue') {
        filteredDataRevenue = [...dashboardData];
        updateRevenueCharts();
    } else if (section === 'booking-status') {
        filteredDataBookingStatus = [...dashboardData];
        updateBookingStatusCharts();
    }
    
    // Updates filter info!! (showing all data tagline)
    if (filterInfo) {
        filterInfo.textContent = 'Showing all data';
    }
}

// VEHICLE TYPE METRIC ANALYSIS CHART
// Creates a bar chart showing different metrics by vehicle type
function updateVehicleTypeMetricChart() {
    const metric = document.getElementById('vehicle-metric-select').value;
    // Get selected metric from dropdown
    const data = filteredDataVehicleType;
    
    // NORMALIZE VEHICLE TYPES (COMBINING EBIKE + BIKE INTO ONE CATEGORY)
    const normalizedData = data.map(d => ({
        ...d,
        vehicleType: (d.vehicleType === 'eBike' || d.vehicleType === 'Bike') ? 'eBike/Bike' : d.vehicleType
    }));
    
    // Get unique vehicle types + calculate the selected metric for each vehicle type
    const vehicleTypes = [...new Set(normalizedData.map(d => d.vehicleType))];
    const chartData = [];
    
    vehicleTypes.forEach(vehicleType => {
        const vehicleData = normalizedData.filter(d => d.vehicleType === vehicleType);
        let value = 0;
        let label = '';
        
        switch(metric) {
            case 'totalBookingValue':
                // SUM OF ALL BOOKING VALUES
                value = d3.sum(vehicleData.filter(d => d.bookingValue !== null), d => d.bookingValue);
                label = 'Total Booking Value in Rupees (₹)';
                break;
            case 'successBookingValue':
                // SUM OF BOOKING VALUES FOR COMPLETED RIDES ONLY
                const successData = vehicleData.filter(d => d.bookingStatus === 'Completed' && d.bookingValue !== null);
                value = d3.sum(successData, d => d.bookingValue);
                label = 'Success Booking Value in Rupees (₹)';
                break;
            case 'avgDistance':
                // AVERAGE DISTANCE TRAVELLED IN KM
                value = d3.mean(vehicleData.filter(d => d.rideDistance !== null), d => d.rideDistance) || 0;
                label = 'Avg Distance Travelled (km)';
                break;
            case 'totalDistance':
                // TOTAL DISTANCE TRAVELLED IN KM
                value = d3.sum(vehicleData.filter(d => d.rideDistance !== null), d => d.rideDistance);
                label = 'Total Distance Travelled (km)';
                break;
            case 'avgDriverRating':
                // AVERAGE DRIVER + CUSTOMER RATING)
                value = d3.mean(vehicleData.filter(d => d.driverRating !== null), d => d.driverRating) || 0;
                label = 'Avg Driver Rating (Stars)';
                break;
            case 'avgCustomerRating':
                value = d3.mean(vehicleData.filter(d => d.customerRating !== null), d => d.customerRating) || 0;
                label = 'Avg Customer Rating (Stars)';
                break;
        }
        
        chartData.push({ vehicleType, value, label });
    });
    
    // Defining custom sort order from most to least prmium...
    const sortOrder = ['Go Mini', 'Go Sedan', 'Auto', 'eBike/Bike', 'UberXL', 'Premier Sedan'];
    
    // Sorting chart data according to CUSTOM ORDER
    chartData.sort((a, b) => {
        const indexA = sortOrder.indexOf(a.vehicleType);
        const indexB = sortOrder.indexOf(b.vehicleType);
        // If both not in sort order, keep equal
        if (indexA === -1 && indexB === -1) return 0;
        // If only A not in order, put it at the end
        if (indexA === -1) return 1;
        // If only B not in order, put it at end
        if (indexB === -1) return -1;
        // OTHERWISE --> sort by position in sortOrder array
        return indexA - indexB;
    });
    
    // Always have to clear any existing charts
    d3.select('#vehicle-type-metric-chart').selectAll('*').remove();
    
    // CREATE/REUSE TOOLTIP FOR HOVER INTERACTIONS
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
    
    // Setting up chart dimensions with margins for axes and labels
    const container = document.getElementById('vehicle-type-metric-chart');
    const margin = { top: 20, right: 30, bottom: 100, left: 90 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
    
    // Create SVG container for chart
    const svg = d3.select('#vehicle-type-metric-chart')
        .append('svg')
        .attr('width', container.clientWidth)
        .attr('height', 400)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
        // X SCALE (band scale for categorical vehicle types)     
        // https://d3js.org/d3-scale#scaleBand

    const x = d3.scaleBand()
        .domain(chartData.map(d => d.vehicleType))
        .range([0, width])
        .padding(0.3);
    // Y SCALE (linear scale for metric values)
    const y = d3.scaleLinear()
        .domain([0, d3.max(chartData, d => d.value)])
        .nice()
        .range([height, 0]);
    
        // Defining color scale for diff vehicle types
    const color = d3.scaleOrdinal()
        .domain(chartData.map(d => d.vehicleType))
        .range(['#5BC589', '#F26138', '#FFC043', '#9A644C', '#3D7FF5', '#7956BF']);
    
        // CREATING BARS FOR BAR CHART
    const bars = svg.selectAll('.bar')
        .data(chartData)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', d => x(d.vehicleType))
        .attr('y', height)
        .attr('width', x.bandwidth())
        .attr('height', 0)
        .attr('fill', d => color(d.vehicleType))
        .attr('opacity', 0)
        .style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr('opacity', 1);
            // FORMAT DISPLAY VALUE BASED ON METRIC TYPE
            const displayValue = metric.includes('Rating') ? d.value.toFixed(2) : 
                                 metric.includes('avg') && metric.includes('Distance') ? d.value.toFixed(2) + ' km' :
                                 metric.includes('Distance') ? d.value.toFixed(2) + ' km' :
                                 '₹' + d.value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
            
                                 // SHOW TOOLTIP WITH FORMATTED VALUE
            tooltip
                .style('opacity', 1)
                .html(`<strong>${d.vehicleType}</strong><br/>${d.label}: ${displayValue}`)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px');
        })
        .on('mousemove', function(event) {
            tooltip
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px');
        })
        .on('mouseout', function() {
            // Return bar to normal opacity
            d3.select(this)
                .transition()
                .duration(200)
                .attr('opacity', 0.8);
            
                // Hide tooltip 0.0
            tooltip.style('opacity', 0);
        });
    
    // Animate bars growing from bottom to top
    // Referencing: https://d3js.org/d3-transition
    bars.transition()
        .duration(800)
        .delay((d, i) => i * 100)
        .ease(d3.easeCubicOut)
        .attr('y', d => y(d.value))
        .attr('height', d => height - y(d.value))
        .attr('opacity', 0.8);
    
    // Add X axis with rotated labels for better readability
    // Referencing: https://d3js.org/d3-axis#axisBottom
    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll('text')
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end')
        .style('font-size', '12px')
        .style('fill', '#333');
    
    // Add Y axis
    // Referencing: https://d3js.org/d3-axis#axisLeft
    svg.append('g')
        .call(d3.axisLeft(y))
        .selectAll('text')
        .style('font-size', '12px')
        .style('fill', '#333');
    
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', height + margin.bottom - 10)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('font-weight', 'bold')
        .style('fill', '#333')
        .text('Vehicle Type');
    
    svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -height / 2)
        .attr('y', -margin.left + 20)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('font-weight', 'bold')
        .style('fill', '#333')
        .text(chartData[0].label);
}

// BOOKINGS OVER TIME LINE CHART
// Creating an animated area _ line chart that shows booking trends over time
// D3 Time Scales: https://d3js.org/d3-scale#scaleTime
// D3 Line & Area Shapes: https://d3js.org/d3-shape#lines
// D3 Time Format: https://d3js.org/d3-time-format
function updateBookingsOverTimeChart(data) {
    const bookingsByDate = d3.rollup(data, v => v.length, d => d.date);
    const chartData = Array.from(bookingsByDate, ([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));
    
    d3.select('#bookings-over-time-chart').selectAll('*').remove();
    
    // HANDLING EMPTY DATA CASE
    if (chartData.length === 0) {
        d3.select('#bookings-over-time-chart')
            .append('div')
            .style('text-align', 'center')
            .style('padding', '50px')
            .style('color', '#999')
            .text('No data available for selected date range');
        return;
    }
    
    // CREATING/REUSING TOOLTIP
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
    
    // Chart dimensions
    const container = document.getElementById('bookings-over-time-chart');
    const margin = { top: 20, right: 30, bottom: 80, left: 70 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
    
    // SVG CONTAINER!!
    const svg = d3.select('#bookings-over-time-chart')
        .append('svg')
        .attr('width', container.clientWidth)
        .attr('height', 400)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
        // To create X scale (time scale for dates ) --> referenced     // d3.extent() - finds min/max: https://d3js.org/d3-array#extent
    const x = d3.scaleTime()
        .domain(d3.extent(chartData, d => new Date(d.date)))
        .range([0, width]);
    
    const y = d3.scaleLinear()
        .domain([0, d3.max(chartData, d => d.count)])
        .nice()
        .range([height, 0]);
    
        // Adding grid lines for better readability
    svg.append('g')
        .attr('class', 'grid')
        .style('stroke', '#e0e0e0')
        .style('stroke-opacity', 0.5)
        .style('shape-rendering', 'crispEdges')
        .call(d3.axisLeft(y)
            .tickSize(-width) // Extending ticks across chart width
            .tickFormat('') // Hiding tick labels (only show on main axis)
        );
    
        // Create gradient for area fill
        // SVG gradients: https://developer.mozilla.org/en-US/docs/Web/SVG/Element/linearGradient
    const gradient = svg.append('defs')
        .append('linearGradient')
        .attr('id', 'area-gradient')
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '0%')
        .attr('y2', '100%');
    
        // GRADIENT COLOR STOPS (FADE FROM BLUE TO TRANSPARENT)
    gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', '#276EF1')
        .attr('stop-opacity', 0.4);
    
    gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', '#276EF1')
        .attr('stop-opacity', 0);
    
        // AREA GENERATOR!!!!!!!!
    const area = d3.area()
        .x(d => x(new Date(d.date)))
        .y0(height) // Bottom of area (baseline)
        .y1(d => y(d.count)) // Top of area (date point)
        .curve(d3.curveMonotoneX);
    
        // Draw the area with gradient fill and fade-in animation
    svg.append('path')
        .datum(chartData)
        .attr('class', 'area')
        .attr('fill', 'url(#area-gradient)')
        .attr('d', area)
        .style('opacity', 0)
        .transition()
        .duration(1000)
        .style('opacity', 1);
    
        // LINE GENERATOR 
        // d3.line() - creates line path: https://d3js.org/d3-shape#line

    const line = d3.line()
        .x(d => x(new Date(d.date)))
        .y(d => y(d.count))
        .curve(d3.curveMonotoneX);
    
    const path = svg.append('path')
        .datum(chartData)
        .attr('class', 'line')
        .attr('fill', 'none')
        .attr('stroke', '#276EF1')
        .attr('stroke-width', 3)
        .attr('d', line);
    
    // Animate line drawing from left to right using stroke-dasharray technique
    // Referencing: https://jakearchibald.com/2013/animated-line-drawing-svg/
    const totalLength = path.node().getTotalLength();
    path
        .attr('stroke-dasharray', totalLength + ' ' + totalLength)
        .attr('stroke-dashoffset', totalLength)
        .transition()
        .duration(1500)
        .ease(d3.easeLinear)
        .attr('stroke-dashoffset', 0);
    
     // Create data point dots along the line
    const dots = svg.selectAll('.dot')
        .data(chartData)
        .enter()
        .append('circle')
        .attr('class', 'dot')
        .attr('cx', d => x(new Date(d.date)))
        .attr('cy', d => y(d.count))
        .attr('r', 0)
        .attr('fill', '#276EF1')
        .attr('stroke', 'white')
        .attr('stroke-width', 2)
        .style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr('r', 7);
            
                // Show tooltip with date and count
            tooltip
                .style('opacity', 1)
                .html(`<strong>Date: ${d.date}</strong><br/>Bookings: ${d.count.toLocaleString()}`)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px');
        })
        .on('mousemove', function(event) {
            tooltip
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px');
        })
        .on('mouseout', function() {
            d3.select(this)
                .transition()
                .duration(200)
                .attr('r', 4);
            
            tooltip.style('opacity', 0);
        });
    
    // Animate dots appearing after line finishes drawing
    dots.transition()
        .duration(800)
        .delay((d, i) => i * 20 + 1500)
        .attr('r', 4);
    
    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x)
            .ticks(Math.min(10, chartData.length))
            .tickFormat(d3.timeFormat('%m/%d')))
        .selectAll('text')
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end')
        .style('font-size', '11px')
        .style('fill', '#333');
    
    // Y AXIS
    svg.append('g')
        .call(d3.axisLeft(y))
        .selectAll('text')
        .style('font-size', '12px')
        .style('fill', '#333');
    // X AXIS
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', height + margin.bottom - 10)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('font-weight', 'bold')
        .style('fill', '#333')
        .text('Date');
    
        // Y AXIS LABEL :d (no space for x-axis label...)
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

// REVENUE SECTION
// Updates all revenue-related charts based on filtered data
function updateRevenueCharts() {
    updatePaymentMethodsChart(filteredDataRevenue); // Payment Methods Donut Chart
    updatePricePerKmChart(filteredDataRevenue); //Price per KM Bar Chart
    updateRevenueLocationHeatmap(filteredDataRevenue); //Heatmap Showing Revenue by Pickup/Drop Location Pairs
}

// PAYMENT METHODS DONUT CHART
// Creates an interactive donut chart visualizing the distribution of payment methods
// Displays: Cash, UPI, Credit Card, Debit Card, etc.
function updatePaymentMethodsChart(data) {
    // Remove null, 'null', or blank payment methods that equivalate to "INCOMPLETE"
    const validData = data.filter(d => 
        d.paymentMethod &&                 //Must exist
        d.paymentMethod.trim() !== '' &&   //Not empty string
        d.paymentMethod.trim().toLowerCase() !== 'null'   //Not 'null' string
    );

    // Group data by payment method and count occurrences
    // d3.rollup creates a Map: payment method -> count
    const paymentCounts = d3.rollup(validData, v => v.length, d => d.paymentMethod);
    // Calculate total for percentage calculations
    const total = Array.from(paymentCounts.values()).reduce((a, b) => a + b, 0);
    
    // Transform Map into array of objects with method, count, and percentage
    // Sort by count in descending order (most popular payment methods first)
    const chartData = Array.from(paymentCounts, ([method, count]) => ({
        method,
        count,
        percentage: (count / total * 100).toFixed(1)
    })).sort((a, b) => b.count - a.count);


    // Remove any previous chart elements to prevent duplicates
    d3.select('#payment-methods-chart').selectAll('*').remove();


    // Display user-friendly message if no valid payment data exists
    if (chartData.length === 0) {
        d3.select('#payment-methods-chart')
            .append('div')
            .style('text-align', 'center')
            .style('padding', '50px')
            .style('color', '#999')
            .text('No payment data available');
        return;
    }

    // CREATE/REUSE TOOLTIP FOR HOVER INTERACTIONS
    let tooltip = d3.select('body').select('.chart-tooltip');
    if (tooltip.empty()) {
        tooltip = d3.select('body')
            .append('div')
            .attr('class', 'chart-tooltip')
            .style('position', 'absolute')
            .style('opacity', 0)
            .style('background-color', 'rgba(0, 0, 0, 0.9)')
            .style('color', 'white')
            .style('padding', '12px 16px')
            .style('border-radius', '8px')
            .style('font-size', '14px')
            .style('pointer-events', 'none') //prevents tooltip from interfering with mouse events
            .style('z-index', '1000')   //ensures tooltip appears above other elements
            .style('box-shadow', '0 4px 6px rgba(0,0,0,0.3)');
    }


    //chart dimensions
    const width = 300;
    const height = 300;
    const radius = Math.min(width, height) / 2 - 30; // Subtracting margin for better fit


    //Create SVG container
    // Arrange donut chart and legend vertically centered
    const container = d3.select('#payment-methods-chart')
        .append('div')
        .style('display', 'flex')          
        .style('flex-direction', 'column')     //Stack vertically 
        .style('align-items', 'center')        //center vertically
        .style('justify-content', 'flex-start')  //align to top
        .style('gap', '40px')    //space between chart and legend
        .style('height', '100%')
        .style('padding', '20px');


    //Create SVG  element for donut chart
    const svg = container
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .append('g')   //Group element for transforming to center
        .attr('transform', `translate(${width / 2},${height / 2})`); //cneter the chart

    
    // Define color scale for different payment methods
    // Use Uber brand colors for consistency
    const color = d3.scaleOrdinal()
        .domain(chartData.map(d => d.method))
        .range(['#5BC589', '#F26138', '#FFC043', '#9A644C', '#3D7FF5', '#7956BF']);


    // Generate pie slices
    //Referencing: https://d3js.org/d3-shape#pies
    const pie = d3.pie()
        .value(d => d.count)  //use count to determine slice size
        .sort(null); //Don't sort slices, keep original order

    // Define arc generator for donut slices
    // Referencing: https://d3js.org/d3-shape#arc
    const arc = d3.arc()
        .innerRadius(radius * 0.6)  // Inner radius for donut hole
        .outerRadius(radius); // Outer radius for slice size

    // Create slices
    const slices = svg.selectAll('path')
        .data(pie(chartData)) //pie() transforms data into pie slice angles
        .enter()
        .append('path')
        .attr('d', arc) //arc() generates the path data for each slice
        .attr('fill', d => color(d.data.method))
        .attr('stroke', 'white')
        .style('stroke-width', '3px')
        .style('opacity', 0)
        .style('cursor', 'pointer')  //Shows slices are interactive

        // Hover interactions for slices
        .on('mouseover', function(event, d) {
            //Enlarge and highlight slice on hover
            d3.select(this)
                .transition()
                .duration(200)
                .style('opacity', 1)
                .attr('transform', function() {
                    const [x, y] = arc.centroid(d);
                    return `translate(${x * 0.15}, ${y * 0.15})`;
                });
            
            // Show tooltip with payment method details
            tooltip
                .style('opacity', 1)
                .html(`<strong>${d.data.method}</strong><br/>
                       Count: ${d.data.count.toLocaleString()}<br/>
                       Percentage: ${d.data.percentage}%`)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px');
        })
        .on('mousemove', function(event) {
            //Update tooltip position as mouse moves
            tooltip
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px');
        })
        .on('mouseout', function() {
            //Return slice to normal size and opacity when mouse leaves
            d3.select(this)
                .transition()
                .duration(200)
                .style('opacity', 0.9)
                .attr('transform', 'translate(0, 0)'); //Reset position
            
            //Hide tooltip
            tooltip.style('opacity', 0);
        });



    // Animate slices appearing with a growing effect
    // Growing animation from 0 to final angle
    // Referencing: https://d3js.org/d3-transition
    slices.transition()
        .duration(800)
        .delay((d, i) => i * 100)  //Stagger animation for each slice
        .style('opacity', 0.9)
        .attrTween('d', function(d) {
            // Custom tween for smooth growing animation
            // Interpolates from startAngle=0, endAngle=0 to final angles
            // Referencing: https://d3js.org/d3-interpolate
            const interpolate = d3.interpolate({startAngle: 0, endAngle: 0}, d);
            return function(t) {
                return arc(interpolate(t)); // t goes from 0 to 1
            };
        });

    //Center text showing total payments in the donut hole
    svg.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '-0.2em') //Adjust vertical position
        .style('font-size', '24px')
        .style('font-weight', 'bold')
        .style('fill', '#333')
        .text(total.toLocaleString()); //Format with thousands separators
    
    // Center label describing the metric
    svg.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '1.2em')
        .style('font-size', '12px')
        .style('fill', '#666')
        .text('Total Payments');

    //Legand displays payment methods with color boxes and percentages
    const legend = container
        .append('div')
        .style('display', 'flex')
        .style('flex-direction', 'row')  //Horizontal layout
        .style('flex-wrap', 'wrap')         //Wrap to multiple lines if needed
        .style('justify-content', 'left')
        .style('gap', '12px')
        .style('max-width', '400px')
        .style('padding', '10px');


    //Add legend items for each payment method
    chartData.forEach(d => {
        const legendItem = legend.append('div')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('gap', '8px')
            .style('min-width', '120px')
            .style('cursor', 'pointer')

            //legend hover effects to highlight corresponding slice
            .on('mouseover', function() {
                //Highlight corresponding slice on hover
                svg.selectAll('path')
                    .filter(slice => slice.data.method === d.method)
                    .transition()
                    .duration(200)
                    .style('opacity', 1)
                    .attr('transform', function(slice) {
                        const [x, y] = arc.centroid(slice);
                        return `translate(${x * 0.15}, ${y * 0.15})`;
                    });
            })
            .on('mouseout', function() {
                //Return slice to normal state when mouse leaves legend item
                svg.selectAll('path')
                    .filter(slice => slice.data.method === d.method)
                    .transition()
                    .duration(200)
                    .style('opacity', 0.9)
                    .attr('transform', 'translate(0, 0)');
            });
        // Color box for payment method
        legendItem.append('div')
            .style('width', '16px')
            .style('height', '16px')
            .style('background-color', color(d.method))
            .style('border-radius', '3px')
            .style('flex-shrink', '0');

        // Text label with method name and percentage
        legendItem.append('span')
            .style('font-size', '13px')
            .style('color', '#333')
            .text(`${d.method} (${d.percentage}%)`);
    });
}


// PRICE PER KILOMETER HISTOGRAM
// Creates a histogram showing the distribution of price per kilometer
// Helps identify pricing patterns and outliers
// Also displays mean price as a reference line
function updatePricePerKmChart(data) {
    // Filter out records with null or zero ride distance to avoid division errors
    const validData = data.filter(d => 
        d.bookingValue !== null &&   //booking value must exist
        d.rideDistance !== null &&  //ride distance must exist
        d.rideDistance > 0 &&   //ride distance must be greater than 0
        d.bookingValue > 0  //booking value must be greater than 0
    ).map(d => ({
        pricePerKm: d.bookingValue / d.rideDistance // Calculate price per km
    }));

    // Clear any existing chart elements
    d3.select('#price-per-km-chart').selectAll('*').remove();

    // Handle case with no valid data
    if (validData.length === 0) {
        d3.select('#price-per-km-chart')
            .append('div')
            .style('text-align', 'center')
            .style('padding', '50px')
            .style('color', '#999')
            .text('No valid price per km data available');
        return;
    }

    // Extract pricePerKm values for histogram and mean calculation
    const pricePerKmValues = validData.map(d => d.pricePerKm);
    const mean = d3.mean(pricePerKmValues);

    // CREATE/REUSE TOOLTIP FOR HOVER INTERACTIONS
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

    // Chart dimensions
    const container = document.getElementById('price-per-km-chart');
    const margin = { top: 20, right: 100, bottom: 60, left: 70 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = 350 - margin.top - margin.bottom;

    // Create SVG container
    const svg = d3.select('#price-per-km-chart')
        .append('svg')
        .attr('width', container.clientWidth)
        .attr('height', 350)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // ========== X SCALE (PRICE PER KM) ==========
    // Using 95th percentile as max to exclude extreme outliers
    // Referencing: https://d3js.org/d3-array#quantile
    const x = d3.scaleLinear()
        .domain([0, d3.quantile(pricePerKmValues.sort(d3.ascending), 0.95)])
        .range([0, width]);

    // ========== HISTOGRAM GENERATOR ==========
    // Creates bins/buckets for grouping data
    // Referencing: https://d3js.org/d3-array#bin
    const histogram = d3.histogram()
        .domain(x.domain())  // Same domain as x scale
        .thresholds(x.ticks(30)); // Create approximately 30 bins

    const bins = histogram(pricePerKmValues);
    // bins is an array where each element contains:
    // { x0: bin start, x1: bin end, length: count, [...actual values] }


    // ========== Y SCALE (Frequency) ==========
    const y = d3.scaleLinear()
        .domain([0, d3.max(bins, d => d.length)])  //0 to max bin count
        .nice()
        .range([height, 0]);

    // ========== CREATING BARS ==========
    const bars = svg.selectAll('rect')
        .data(bins)
        .enter()
        .append('rect')
        .attr('x', d => x(d.x0) + 1)  // +1 for small gap between bars
        .attr('width', d => Math.max(0, x(d.x1) - x(d.x0) - 1)) // -1 for gap
        .attr('y', height)   // Start at bottom
        .attr('height', 0)     // Start with 0 height for animation
        .attr('fill', '#3D7FF5')   // Blue color
        .attr('stroke', 'white')
        .attr('stroke-width', 1)
        .style('cursor', 'pointer')
        // ========== HOVER INTERACTIONS ==========
        .on('mouseover', function(event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr('fill', '#60a5fa'); // Lighter blue on hover

            // Show tooltip with bin range and frequency
            tooltip
                .style('opacity', 1)
                .html(`<strong>Range: ₹${d.x0.toFixed(2)} - ₹${d.x1.toFixed(2)}</strong><br/>
                       Frequency: ${d.length.toLocaleString()}`)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px');
        })
        .on('mousemove', function(event) {
            tooltip
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px');
        })
        .on('mouseout', function() {
            d3.select(this)
                .transition()
                .duration(200)
                .attr('fill', '#5A95FF');
            
            tooltip.style('opacity', 0);
        });

    // Animate bars growing from bottom to top
    bars.transition()
        .duration(800)
        .delay((d, i) => i * 20)  // Staggered delay for animation
        .attr('y', d => y(d.length))
        .attr('height', d => height - y(d.length));
 
    // Mean Line
    //Vertical dashed line indicating mean price per km
    svg.append('line')
        .attr('x1', x(mean))
        .attr('x2', x(mean))
        .attr('y1', 0)
        .attr('y2', height)
        .attr('stroke', '#F26138')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5,5') // Dashed line
        .style('opacity', 0)  //Start invisible
        .transition()
        .duration(1000)
        .delay(800)    // Fade in
        .style('opacity', 0.8);

    // Mean Label
    svg.append('text')
        .attr('x', x(mean) + 5)
        .attr('y', 15)
        .style('fill', '#F26138')
        .style('font-size', '12px')
        .style('font-weight', 'bold')
        .text(`Mean: ₹${mean.toFixed(2)}/km`)
        .style('opacity', 0)
        .transition()
        .duration(1000)
        .delay(800)
        .style('opacity', 1);
    // X and Y Axes
    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll('text')
        .style('font-size', '11px')
        .style('fill', '#333');

    svg.append('g')
        .call(d3.axisLeft(y))
        .selectAll('text')
        .style('font-size', '11px')
        .style('fill', '#333');
    // Axis Labels
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', height + margin.bottom - 10)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('font-weight', 'bold')
        .style('fill', '#333')
        .text('Price per KM (₹)');

    svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -height / 2)
        .attr('y', -margin.left + 20)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('font-weight', 'bold')
        .style('fill', '#333')
        .text('Frequency');
}


// REVENUE LOCATION HEATMAP
// Creates a heatmap showing revenue for different pickup-dropoff location pairs
// Uses color intensity to represent revenue amounts
// Displays top 10 pickup locations × top 10 drop locations
function updateRevenueLocationHeatmap(data) {
    // ----- Data Validation -----
    // Filter out records with missing pickup/drop locations or invalid booking values
    const validData = data.filter(d => 
        d.pickupLocation &&    // Must have pickup location
        d.dropLocation &&       // Must have drop location
        d.bookingValue !== null &&   // booking value must exist
        d.bookingValue > 0      // booking value must be greater than 0
    );


    // Clear any existing chart elements
    d3.select('#revenue-location-heatmap').selectAll('*').remove();

    //handle case with no valid data
    if (validData.length === 0) {
        d3.select('#revenue-location-heatmap')
            .append('div')
            .style('text-align', 'center')
            .style('padding', '50px')
            .style('color', '#999')
            .text('No revenue location data available');
        return;
    }

    // ========== MULTI-LEVEL DATA AGGREGATION ==========
    // Create nested Map: pickup -> drop -> {revenue, count}
    // d3.rollup with multiple keys creates hierarchical grouping
    // Referencing: https://d3js.org/d3-array#rollup
    const routeRevenue = d3.rollup(
        validData,
        v => ({
            revenue: d3.sum(v, d => d.bookingValue),  // Total revenue for this route
            count: v.length  // Number of trips for this route
        }),
        d => d.pickupLocation, // First level: pickup location
        d => d.dropLocation  // Second level: drop location
    );

    // ========== CALCULATE TOTALS BY LOCATION ==========
    // Sum revenue for each pickup location (across all drop locations)
    const pickupRevenue = new Map();
    const dropRevenue = new Map();

    routeRevenue.forEach((drops, pickup) => {
        let total = 0;
        drops.forEach(data => { total += data.revenue; });
        pickupRevenue.set(pickup, total);
    });
    // Sum revenue for each drop location (across all pickup locations)
    validData.forEach(d => {
        dropRevenue.set(d.dropLocation, (dropRevenue.get(d.dropLocation) || 0) + d.bookingValue);
    });

    // ========== SELECT TOP 10 LOCATIONS ==========
    // Only show top locations to keep heatmap readable
    const top10Pickups = Array.from(pickupRevenue.entries())
        .sort((a, b) => b[1] - a[1]) // Sort by revenue descending
        .slice(0, 10)
        .map(d => d[0]);  // Extract location names


    const top10Drops = Array.from(dropRevenue.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(d => d[0]);

    // ========== PREPARE HEATMAP DATA ==========
    // Create array of all pickup-drop combinations from top 10 lists
    const heatmapData = [];
    top10Pickups.forEach(pickup => {
        top10Drops.forEach(drop => {
            const data = routeRevenue.get(pickup)?.get(drop);
            if (data) {
                heatmapData.push({
                    pickup,
                    drop,
                    revenue: data.revenue,
                    count: data.count
                });
            }
        });
    });

     // ========== CREATE/REUSE TOOLTIP ==========
    let tooltip = d3.select('body').select('.chart-tooltip');
    if (tooltip.empty()) {
        tooltip = d3.select('body')
            .append('div')
            .attr('class', 'chart-tooltip')
            .style('position', 'absolute')
            .style('opacity', 0)
            .style('background-color', 'rgba(0, 0, 0, 0.9)')
            .style('color', 'white')
            .style('padding', '12px 16px')
            .style('border-radius', '8px')
            .style('font-size', '13px')
            .style('pointer-events', 'none')
            .style('z-index', '1000')
            .style('box-shadow', '0 4px 6px rgba(0,0,0,0.3)');
    }

    // ========== CHART DIMENSIONS ==========
    const container = document.getElementById('revenue-location-heatmap');
    const margin = { top: 20, right: 120, bottom: 150, left: 150 }; // Large margins for labels
    const cellSize = 35;
    const width = cellSize * top10Drops.length;
    const height = cellSize * top10Pickups.length;

    // ========== CREATE SVG ==========
    const svg = d3.select('#revenue-location-heatmap')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // ========== COLOR SCALE ==========
    // Sequential color scale: light blue (low revenue) to dark blue (high revenue)
    // Referencing: https://d3js.org/d3-scale-chromatic
    const colorScale = d3.scaleSequential()
        .domain([0, d3.max(heatmapData, d => d.revenue)])
        .interpolator(d3.interpolateBlues);

    // ========== CREATE HEATMAP CELLS ==========
    const cells = svg.selectAll('rect')
        .data(heatmapData)
        .enter()
        .append('rect')
        .attr('x', d => top10Drops.indexOf(d.drop) * cellSize)   // Position based on drop location
        .attr('y', d => top10Pickups.indexOf(d.pickup) * cellSize) // Position based on pickup location
        .attr('width', cellSize)
        .attr('height', cellSize)
        .attr('fill', 'white')   // Start with white for animation
        .attr('stroke', '#ddd') // Light gray border
        .attr('stroke-width', 1)
        .style('cursor', 'pointer')

        // ========== HOVER INTERACTIONS ==========
        .on('mouseover', function(event, d) {
            // Highlight cell border on hover
            d3.select(this)
                .attr('stroke', '#000')
                .attr('stroke-width', 2);
            
            // Show detailed tooltip with route info
            tooltip
                .style('opacity', 1)
                .html(`<strong>${d.pickup} → ${d.drop}</strong><br/>
                       Revenue: ₹${d.revenue.toLocaleString()}<br/>
                       Trips: ${d.count.toLocaleString()}<br/>
                       Avg: ₹${(d.revenue / d.count).toFixed(2)}`)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px');
        })
        .on('mousemove', function(event) {
            tooltip
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px');
        })
        .on('mouseout', function() {
            d3.select(this)
                .attr('stroke', '#ddd')
                .attr('stroke-width', 1);
            
            tooltip.style('opacity', 0);
        });
    // Animate cells filling with color based on revenue
    // Cells transition from white to color scale
    cells.transition()
        .duration(600)
        .delay((d, i) => i * 10)  // Very quick staggered delay
        .attr('fill', d => colorScale(d.revenue));

    // ========== X AXES LABELS (Drop Location) ==========
    svg.selectAll('.x-label')
        .data(top10Drops)
        .enter()
        .append('text')
        .attr('class', 'x-label')
        .attr('x', (d, i) => i * cellSize + cellSize / 2)
        .attr('y', height + 10)
        .attr('text-anchor', 'end')
        .attr('transform', (d, i) => `rotate(-45, ${i * cellSize + cellSize / 2}, ${height + 10})`)
        .style('font-size', '10px')
        .style('fill', '#333')
        .text(d => d.length > 15 ? d.substring(0, 15) + '...' : d);
    // ========== Y AXES LABELS (Pickup Location) ==========
    svg.selectAll('.y-label')
        .data(top10Pickups)
        .enter()
        .append('text')
        .attr('class', 'y-label')
        .attr('x', -5)
        .attr('y', (d, i) => i * cellSize + cellSize / 2 + 4) // +4 for vertical centering
        .attr('text-anchor', 'end') // Align to right
        .style('font-size', '10px')
        .style('fill', '#333')
        .text(d => d.length > 20 ? d.substring(0, 20) + '...' : d); // Truncate long names

    // Axis Titles
    // X Axis Title
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', height + margin.bottom - 10)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('font-weight', 'bold')
        .style('fill', '#333')
        .text('Drop Location');
    // Y Axis Title 
    svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -height / 2)
        .attr('y', -margin.left + 20)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('font-weight', 'bold')
        .style('fill', '#333')
        .text('Pickup Location');

    // ========== COLOR LEGEND ==========
    // Create a vertical legend indicating revenue scale
    const legendWidth = 20;
    const legendHeight = height;
    const legendSteps = 10;

    //Scale for legend
    const legendScale = d3.scaleLinear()
        .domain([0, legendSteps])
        .range([legendHeight, 0]);  // Top to bottom

    // Legend group
    const legend = svg.append('g')
        .attr('transform', `translate(${width + 20}, 0)`);

    // Create colored rectangles for legend
    // Each rectangle represents a step in revenue scale
    for (let i = 0; i <= legendSteps; i++) {
        const value = (i / legendSteps) * d3.max(heatmapData, d => d.revenue);
        legend.append('rect')
            .attr('x', 0)
            .attr('y', legendScale(i))
            .attr('width', legendWidth)
            .attr('height', legendHeight / legendSteps)
            .attr('fill', colorScale(value));
    }
    // Legend axis
    // Maximum and minimum revenue labels
    legend.append('text')
        .attr('x', legendWidth + 5)
        .attr('y', 0)
        .style('font-size', '10px')
        .style('fill', '#333')
        .text(`₹${d3.max(heatmapData, d => d.revenue).toLocaleString()}`);

    legend.append('text')
        .attr('x', legendWidth + 5)
        .attr('y', legendHeight)
        .style('font-size', '10px')
        .style('fill', '#333')
        .text('₹0');
    // Legend title
    legend.append('text')
        .attr('x', legendWidth / 2)
        .attr('y', -10)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px')
        .style('font-weight', 'bold')
        .style('fill', '#333')
        .text('Revenue');
}



// BOOKING STATUS PAGE - MAIN UPDATE FUNCTION
// Coordinates updates for all six booking status visualizations
// This page analyzes ride completion rates, cancellations, and demand patterns

function updateBookingStatusCharts() {
    updateOverallRideDistribution(filteredDataBookingStatus); // Bar chart of all booking statuses
    updateDriverCancellationChart(filteredDataBookingStatus); // Pie chart of driver cancellations
    updateCustomerCancellationChart(filteredDataBookingStatus); // Pie chart of customer cancellations
    updateMonthlySuccessRateChart();      // Line chart of monthly ride success rates
    updateHourlyDemandChart(filteredDataBookingStatus); // Combo chart of rides by hour and day
    //updateIncompleteRideChart(filteredDataBookingStatus); //Bar chart of incomplete rides by reason
}

// OVERALL RIDE DISTRIBUTION BAR CHART
// Shows distribution of all booking statuses: Completed, Cancelled, No Driver Found, etc.
// Uses color coding to distinguish between different statuses
function updateOverallRideDistribution(data) {
    // ========== DATA AGGREGATION ==========
    // Group data by booking status and count occurrences
    const statusCounts = d3.rollup(data, v => v.length, d => d.bookingStatus);

    // Transform Map to array of objects for D3
    const chartData = Array.from(statusCounts, ([status, count]) => ({ status, count }))
        .sort((a, b) => b.count - a.count);

    // Clear existing chart elements
    d3.select('#overall-ride-distribution-chart').selectAll('*').remove();

    // Handle case with no data
    if (chartData.length === 0) {
        d3.select('#overall-ride-distribution-chart')
            .append('div')
            .style('text-align', 'center')
            .style('padding', '50px')
            .style('color', '#999')
            .text('No data available');
        return;
    }

    // ========== CREATE/REUSE TOOLTIP ==========
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

    // ========== CHART DIMENSIONS ==========
    const container = document.getElementById('overall-ride-distribution-chart');
    const containerWidth = container.clientWidth;
    const margin = { top: 20, right: 20, bottom: 80, left: 60 };
    const width = containerWidth - margin.left - margin.right;
    const height = 280 - margin.top - margin.bottom;

    // ========== CREATE SVG ==========
    // X scale: booking statuses
    const svg = d3.select('#overall-ride-distribution-chart')
        .append('svg')
        .attr('width', containerWidth)
        .attr('height', 320)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
        .domain(chartData.map(d => d.status))
        .range([0, width])
        .padding(0.3);

    // Y scale: counts
    const y = d3.scaleLinear()
        .domain([0, d3.max(chartData, d => d.count)])
        .nice()
        .range([height, 0]);

    // Color scale for different statuses
    const color = d3.scaleOrdinal()
        .domain(chartData.map(d => d.status))
        .range(['#5BC589', '#F26138', '#FFC043', '#9A644C', '#3D7FF5', '#7956BF']);
    
        // ========== CREATE BARS ==========
    const bars = svg.selectAll('.bar')
        .data(chartData)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', d => x(d.status))
        .attr('y', height)
        .attr('width', x.bandwidth())
        .attr('height', 0)   // Start at bottom
        .attr('fill', d => color(d.status))   
        .attr('opacity', 0)
        .style('cursor', 'pointer')

        // ========== HOVER INTERACTIONS ==========
        .on('mouseover', function(event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr('opacity', 1);
            
            tooltip
                .style('opacity', 1)
                .html(`<strong>${d.status}</strong><br/>Count: ${d.count.toLocaleString()}`)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px');
        })
        .on('mousemove', function(event) {
            tooltip
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px');
        })
        .on('mouseout', function() {
            d3.select(this)
                .transition()
                .duration(200)
                .attr('opacity', 0.8);
            
            tooltip.style('opacity', 0);
        });

    // Animate bars growing from bottom to top
    bars.transition()
        .duration(800)
        .delay((d, i) => i * 100)
        .ease(d3.easeCubicOut)
        .attr('y', d => y(d.count))
        .attr('height', d => height - y(d.count))
        .attr('opacity', 0.8);

    // X and Y Axes
    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll('text')
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end')
        .style('font-size', '11px')
        .style('fill', '#333');

    svg.append('g')
        .call(d3.axisLeft(y))
        .selectAll('text')
        .style('font-size', '9px')
        .style('fill', '#333');
    
        // Axis Labels
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', height + margin.bottom + 40)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('font-weight', 'bold')
        .style('fill', '#333')
        .text('Booking Status');

    svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -height / 2)
        .attr('y', -margin.left - 20)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('font-weight', 'bold')
        .style('fill', '#333')
        .text('Count');
}


// DRIVER CANCELLATION REASONS PIE CHART
// Displays breakdown of why drivers cancel rides
// Helps identify systemic issues with driver-side cancellations
function updateDriverCancellationChart(data) {
    // ========== DATA FILTERING ==========
    // Filter to only include valid driver cancellation records
    const cancelledData = data.filter(d => 
        d.cancelledByDriver && 
        d.driverCancelReason && 
        d.driverCancelReason.trim() !== '' &&
        d.driverCancelReason.toLowerCase() !== 'null'
    );

   // ========== DATA AGGREGATION ==========
    const reasonCounts = d3.rollup(cancelledData, v => v.length, d => d.driverCancelReason);
    const total = Array.from(reasonCounts.values()).reduce((a, b) => a + b, 0);
     
    // Transform to array with percentages
    const chartData = Array.from(reasonCounts, ([reason, count]) => ({
        reason,
        count,
        percentage: (count / total * 100).toFixed(1)
    })).sort((a, b) => b.count - a.count);

    // Clear existing chart elements
    d3.select('#driver-cancellation-chart').selectAll('*').remove();
    // Handle case with no data
    if (chartData.length === 0) {
        d3.select('#driver-cancellation-chart')
            .append('div')
            .style('text-align', 'center')
            .style('padding', '50px')
            .style('color', '#999')
            .text('No driver cancellation data available');
        return;
    }
    // ========== CREATE/REUSE TOOLTIP ==========
    let tooltip = d3.select('body').select('.pie-tooltip');
    if (tooltip.empty()) {
        tooltip = d3.select('body')
            .append('div')
            .attr('class', 'pie-tooltip')
            .style('position', 'absolute')
            .style('opacity', 0)
            .style('background-color', 'rgba(0, 0, 0, 0.9)')
            .style('color', 'white')
            .style('padding', '12px 16px')
            .style('border-radius', '8px')
            .style('font-size', '14px')
            .style('pointer-events', 'none')
            .style('z-index', '1000')
            .style('box-shadow', '0 4px 6px rgba(0,0,0,0.3)');
    }

    // ========== CHART DIMENSIONS ==========
    const container = document.getElementById('driver-cancellation-chart');
    const containerWidth = container.clientWidth;
    const width = Math.min(containerWidth, 280);
    const height = 200;
    const radius = Math.min(width, height) / 2 - 20;

    // ========== CREATE SVG ==========
    const mainContainer = d3.select('#driver-cancellation-chart')
        .append('div')
        .style('display', 'flex')
        .style('flex-direction', 'column')
        .style('align-items', 'center')
        .style('justify-content', 'flex-start')
        .style('gap', '10px')
        .style('padding-top', '10px');

    // Create SVG for pie chart
    const svg = mainContainer
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${width / 2},${height / 2})`);
    // ========== COLOR SCALE ==========
    const color = d3.scaleOrdinal()
        .domain(chartData.map(d => d.reason))
        .range(['#6366f1', '#8b5cf6', '#a855f7', '#c084fc', '#d8b4fe', '#e9d5ff']);

    // ========== CREATE PIE SLICES ==========
    const pie = d3.pie()
        .value(d => d.count)
        .sort(null);
    //  ========= ARC GENERATOR ==========
    const arc = d3.arc()
        .innerRadius(0)
        .outerRadius(radius);
    // Create pie slices
    const slices = svg.selectAll('path')
        .data(pie(chartData))
        .enter()
        .append('path')
        .attr('d', arc)
        .attr('fill', d => color(d.data.reason))
        .attr('stroke', 'white')
        .style('stroke-width', '2px')
        .style('opacity', 0)
        .style('cursor', 'pointer')
        // ========== HOVER INTERACTIONS ==========
        .on('mouseover', function(event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .style('opacity', 1)
                .attr('transform', function() {
                    const [x, y] = arc.centroid(d);
                    return `translate(${x * 0.1}, ${y * 0.1})`;
                });
            
            tooltip
                .style('opacity', 1)
                .html(`<strong>${d.data.reason}</strong><br/>
                       Count: ${d.data.count.toLocaleString()}<br/>
                       Percentage: ${d.data.percentage}%`)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px');
        })
        .on('mousemove', function(event) {
            tooltip
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px');
        })
        .on('mouseout', function() {
            d3.select(this)
                .transition()
                .duration(200)
                .style('opacity', 0.9)
                .attr('transform', 'translate(0, 0)');
            
            tooltip.style('opacity', 0);
        });
    // Animate pie slices growing from 0 to full size
    slices.transition()
        .duration(800)
        .delay((d, i) => i * 100)
        .style('opacity', 0.9)
        .attrTween('d', function(d) {
            const interpolate = d3.interpolate({startAngle: 0, endAngle: 0}, d);
            return function(t) {
                return arc(interpolate(t));
            };
        });
     // ========== LEGEND CREATION ==========
    const legend = mainContainer
        .append('div')
        .style('display', 'flex')
        .style('flex-direction', 'column')
        .style('gap', '5px')
        .style('max-width', '100%')
        .style('padding', '5px');

    // Create legend items
    chartData.forEach(d => {
        const legendItem = legend.append('div')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('gap', '8px')
            .style('cursor', 'pointer')
            // ========== LEGEND HOVER INTERACTIONS ==========
            .on('mouseover', function() {
                svg.selectAll('path')
                    .filter(slice => slice.data.reason === d.reason)
                    .transition()
                    .duration(200)
                    .style('opacity', 1)
                    .attr('transform', function(slice) {
                        const [x, y] = arc.centroid(slice);
                        return `translate(${x * 0.1}, ${y * 0.1})`;
                    });
            })
            .on('mouseout', function() {
                svg.selectAll('path')
                    .filter(slice => slice.data.reason === d.reason)
                    .transition()
                    .duration(200)
                    .style('opacity', 0.9)
                    .attr('transform', 'translate(0, 0)');
            });
        // Legend color box
        legendItem.append('div')
            .style('width', '12px')
            .style('height', '12px')
            .style('background-color', color(d.reason))
            .style('border-radius', '2px')
            .style('flex-shrink', '0');
        // Legend text
        legendItem.append('span')
            .style('font-size', '10px')
            .style('color', '#333')
            .style('line-height', '1.2')
            .text(`${d.reason} (${d.percentage}%)`);
    });
}


// CUSTOMER CANCELLATION REASONS PIE CHART
// Displays breakdown of why customers cancel rides
// Similar structure to driver cancellation chart but with different color scheme
function updateCustomerCancellationChart(data) {
    // ========== DATA FILTERING ==========
    // Filter to only include valid customer cancellation records
    const cancelledData = data.filter(d => 
        d.cancelledByCustomer && 
        d.customerCancelReason && 
        d.customerCancelReason.trim() !== '' &&
        d.customerCancelReason.toLowerCase() !== 'null'
    );

    // ========== DATA AGGREGATION ==========
    const reasonCounts = d3.rollup(cancelledData, v => v.length, d => d.customerCancelReason);
    const total = Array.from(reasonCounts.values()).reduce((a, b) => a + b, 0);
    
    const chartData = Array.from(reasonCounts, ([reason, count]) => ({
        reason,
        count,
        percentage: (count / total * 100).toFixed(1)
    })).sort((a, b) => b.count - a.count);

    // ========== CLEAR EXISTING CHART ==========
    d3.select('#customer-cancellation-chart').selectAll('*').remove();

    // ========== HANDLE EMPTY DATA CASE ==========
    if (chartData.length === 0) {
        d3.select('#customer-cancellation-chart')
            .append('div')
            .style('text-align', 'center')
            .style('padding', '50px')
            .style('color', '#999')
            .text('No customer cancellation data available');
        return;
    }
    // ========== CREATE/REUSE TOOLTIP ==========
    let tooltip = d3.select('body').select('.pie-tooltip');
    if (tooltip.empty()) {
        tooltip = d3.select('body')
            .append('div')
            .attr('class', 'pie-tooltip')
            .style('position', 'absolute')
            .style('opacity', 0)
            .style('background-color', 'rgba(0, 0, 0, 0.9)')
            .style('color', 'white')
            .style('padding', '12px 16px')
            .style('border-radius', '8px')
            .style('font-size', '14px')
            .style('pointer-events', 'none')
            .style('z-index', '1000')
            .style('box-shadow', '0 4px 6px rgba(0,0,0,0.3)');
    }

    // ========== CHART DIMENSIONS ==========
    const container = document.getElementById('customer-cancellation-chart');
    const containerWidth = container.clientWidth;
    const width = Math.min(containerWidth, 280);
    const height = 200;
    const radius = Math.min(width, height) / 2 - 20;

    // ========== CREATE MAIN CONTAINER ==========
    const mainContainer = d3.select('#customer-cancellation-chart')
        .append('div')
        .style('display', 'flex')
        .style('flex-direction', 'column')
        .style('align-items', 'center')
        .style('justify-content', 'flex-start')
        .style('gap', '10px')
        .style('padding-top', '10px');
    // ========== CREATE SVG ==========
    const svg = mainContainer
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${width / 2},${height / 2})`);

    // ========== COLOR SCALE ==========
    const color = d3.scaleOrdinal()
        .domain(chartData.map(d => d.reason))
        .range(['#ec4899', '#f43f5e', '#fb923c', '#fbbf24', '#a3a3a3', '#9ca3af']);

    // ========== PIE LAYOUT GENERATOR ==========
    const pie = d3.pie()
        .value(d => d.count)
        .sort(null);
    // ========== ARC GENERATOR ==========
    const arc = d3.arc()
        .innerRadius(0)
        .outerRadius(radius);
    // ========== CREATE PIE SLICES ==========
    const slices = svg.selectAll('path')
        .data(pie(chartData))
        .enter()
        .append('path')
        .attr('d', arc)
        .attr('fill', d => color(d.data.reason))
        .attr('stroke', 'white')
        .style('stroke-width', '2px')
        .style('opacity', 0)
        .style('cursor', 'pointer')
        // ========== HOVER INTERACTIONS ==========
        .on('mouseover', function(event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .style('opacity', 1)
                .attr('transform', function() {
                    const [x, y] = arc.centroid(d);
                    return `translate(${x * 0.1}, ${y * 0.1})`;
                });
            // Show detailed
            tooltip
                .style('opacity', 1)
                .html(`<strong>${d.data.reason}</strong><br/>
                       Count: ${d.data.count.toLocaleString()}<br/>
                       Percentage: ${d.data.percentage}%`)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px');
        })
        .on('mousemove', function(event) {
            tooltip
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px');
        })
        .on('mouseout', function() {
            d3.select(this)
                .transition()
                .duration(200)
                .style('opacity', 0.9)
                .attr('transform', 'translate(0, 0)');
            
            tooltip.style('opacity', 0);
        });
    // Animate pie slices growing from 0 to full size
    slices.transition()
        .duration(800)
        .delay((d, i) => i * 100)
        .style('opacity', 0.9)
        .attrTween('d', function(d) {
            const interpolate = d3.interpolate({startAngle: 0, endAngle: 0}, d);
            return function(t) {
                return arc(interpolate(t));
            };
        });
    // ========== LEGEND CREATION ==========
    const legend = mainContainer
        .append('div')
        .style('display', 'flex')
        .style('flex-direction', 'column')
        .style('gap', '5px')
        .style('max-width', '100%')
        .style('padding', '5px');
    // Add legend items
    chartData.forEach(d => {
        const legendItem = legend.append('div')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('gap', '8px')
            .style('cursor', 'pointer')
            // ========== LEGEND HOVER INTERACTIONS ==========
            .on('mouseover', function() {
                svg.selectAll('path')
                    .filter(slice => slice.data.reason === d.reason)
                    .transition()
                    .duration(200)
                    .style('opacity', 1)
                    .attr('transform', function(slice) {
                        const [x, y] = arc.centroid(slice);
                        return `translate(${x * 0.1}, ${y * 0.1})`;
                    });
            })
            .on('mouseout', function() {
                svg.selectAll('path')
                    .filter(slice => slice.data.reason === d.reason)
                    .transition()
                    .duration(200)
                    .style('opacity', 0.9)
                    .attr('transform', 'translate(0, 0)');
            });
        // Legend color box
        legendItem.append('div')
            .style('width', '12px')
            .style('height', '12px')
            .style('background-color', color(d.reason))
            .style('border-radius', '2px')
            .style('flex-shrink', '0');
        // Legend text
        legendItem.append('span')
            .style('font-size', '10px')
            .style('color', '#333')
            .style('line-height', '1.2')
            .text(`${d.reason} (${d.percentage}%)`);
    });
}

// MONTHLY SUCCESS RATE LINE CHART
// Displays ride completion success rate trends over time by month
// Uses the full dashboardData (not filtered) to show complete trend
// Success rate = (completed rides / total bookings) × 100%
function updateMonthlySuccessRateChart() {
    // ========== DATA AGGREGATION ==========
    // Important: Uses complete dashboard data, not filtered data
    // This shows overall platform performance trends regardless of filters
    const data = dashboardData;

    // ========== MONTHLY AGGREGATION ==========
    // Group data by month (YYYY-MM format) and calculate success metrics
    const monthlyData = d3.rollup(
        data,
        v => ({
            total: v.length,  // mongthly total bookings
            completed: v.filter(d => d.bookingStatus === 'Completed').length  // completed bookings
        }),
        d => d.date.substring(0, 7)  // obtain "YYYY-MM" as month key
    );

    // ========== CALCULATE SUCCESS RATE ==========
    // Transform Map to array with success rate calculation
    const chartData = Array.from(monthlyData, ([month, counts]) => ({
        month: month,
        successRate: counts.total > 0 ? (counts.completed / counts.total * 100) : 0,  
        total: counts.total,
        completed: counts.completed
    })).sort((a, b) => a.month.localeCompare(b.month));  
    // ========== CLEAR EXISTING CHART ==========
    d3.select('#monthly-success-rate-chart').selectAll('*').remove();
    // ========== HANDLE EMPTY DATA CASE ==========
    if (chartData.length === 0) {
        d3.select('#monthly-success-rate-chart')
            .append('div')
            .style('text-align', 'center')
            .style('padding', '50px')
            .style('color', '#999')
            .text('No data available for selected date range');
        return;
    }
    // ========== CREATE/REUSE TOOLTIP ==========
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

    // ========== CHART DIMENSIONS ==========
    const container = document.getElementById('monthly-success-rate-chart');
    const margin = { top: 20, right: 20, bottom: 60, left: 70 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;
    
    // ========== CREATE SVG ==========
    const svg = d3.select('#monthly-success-rate-chart')
        .append('svg')
        .attr('width', container.clientWidth)
        .attr('height', 300)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    // ========== SCALES ==========
    const x = d3.scaleTime()
        .domain(d3.extent(chartData, d => new Date(d.month + '-01')))  
        .range([0, width]);

    // Y scale fixed between 61% and 63% for better visualization of small changes
    const y = d3.scaleLinear()
        .domain([61, 63])  
        .nice()
        .range([height, 0]);
    // ========== ADD GRIDLINES ==========
    svg.append('g')
        .attr('class', 'grid')
        .style('stroke', '#e0e0e0')
        .style('stroke-opacity', 0.5)
        .style('shape-rendering', 'crispEdges')
        .call(d3.axisLeft(y)
            .tickSize(-width)
            .tickFormat('')
        );
    // ========== AREA UNDER LINE WITH GRADIENT ==========
    const gradient = svg.append('defs')
        .append('linearGradient')
        .attr('id', 'success-rate-gradient')
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '0%')
        .attr('y2', '100%');
    // Define gradient stops
    gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', '#5BC589')
        .attr('stop-opacity', 0.4);
    //  Fade to transparent
    gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', '#5BC589')
        .attr('stop-opacity', 0);

    // Area generator
    // Create filled area under the success rate line
    const area = d3.area()
        .x(d => x(new Date(d.month + '-01')))
        .y0(height)       //Bottom of area
        .y1(d => y(d.successRate)); // Top of area
        //.curve(d3.curveMonotoneX);  
        // Note: not using .curve() here for straight lines between points
    
    // Draw area with gradient fill
    svg.append('path')
        .datum(chartData)
        .attr('class', 'area')
        .attr('fill', 'url(#success-rate-gradient)')
        .attr('d', area)
        .style('opacity', 0)
        .transition()
        .duration(1000)
        .style('opacity', 1);
    
    // Line Generator
    //Create the line path on top of the area
    const line = d3.line()
        .x(d => x(new Date(d.month + '-01')))
        .y(d => y(d.successRate));
        //.curve(d3.curveMonotoneX);
    // Draw line
    const path = svg.append('path')
        .datum(chartData)
        .attr('class', 'line')
        .attr('fill', 'none')
        .attr('stroke', '#5BC589')
        .attr('stroke-width', 3)
        .attr('d', line);

    // ========== ANIMATE LINE DRAWING ==========
    // Uses stroke-dasharray technique to create drawing animation
    // Referencing: https://jakearchibald.com/2013/animated-line-drawing-svg/
    const totalLength = path.node().getTotalLength();
    path
        .attr('stroke-dasharray', totalLength + ' ' + totalLength)  // Gap same as length
        .attr('stroke-dashoffset', totalLength)    // Start fully offset (invisible)
        .transition()
        .duration(1500)
        .ease(d3.easeLinear)
        .attr('stroke-dashoffset', 0);  // Animate to 0 offset (fully visible)

    // ========== ADD DATA POINT DOTS ==========
     const dots = svg.selectAll('.dot')
        .data(chartData)
        .enter()
        .append('circle')
        .attr('class', 'dot')
        .attr('cx', d => x(new Date(d.month + '-01')))
        .attr('cy', d => y(d.successRate))
        .attr('r', 0)    // Start with radius 0
        .attr('fill', '#5BC589')
        .attr('stroke', 'white')
        .attr('stroke-width', 2)
        .style('cursor', 'pointer')
        // ========== HOVER INTERACTIONS ==========
        .on('mouseover', function(event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr('r', 7);
            
    // Show detailed tooltip
    tooltip
        .style('opacity', 1)
        .html(`<strong>${d.month}</strong><br/>
            Success Rate: ${d.successRate.toFixed(1)}%<br/>
            Completed: ${d.completed.toLocaleString()}<br/>
            Total: ${d.total.toLocaleString()}`)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px');
        })
        .on('mousemove', function(event) {
            tooltip
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px');
        })
        .on('mouseout', function() {
            // Restore dot size
            d3.select(this)
                .transition()
                .duration(200)
                .attr('r', 4);
            
            tooltip.style('opacity', 0);
        });


    // Animate dots appearing
    // Dots appear after line is drawn
    dots.transition()
        .duration(800)
        .delay((d, i) => i * 50 + 1500)  
        .attr('r', 4);
    
    // x-axis
    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x)
            .ticks(chartData.length)  // One tick per data point
            .tickFormat(d3.timeFormat('%Y-%m')))  // format as "YYYY-MM"
        .selectAll('text')
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end')
        .style('font-size', '10px')
        .style('fill', '#333');
    
    // y-axis
    svg.append('g')
        .call(d3.axisLeft(y)
            .ticks(5)
            .tickFormat(d => d + '%'))  // add % sign
        .selectAll('text')
        .style('font-size', '10px')
        .style('fill', '#333');

    // Axis Labels
    // X Label
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', height + margin.bottom - 5)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('font-weight', 'bold')
        .style('fill', '#333')
        .text('Month');
    
    // Y Label
    svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -height / 2)
        .attr('y', -margin.left + 20)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('font-weight', 'bold')
        .style('fill', '#333')
        .text('Success Rate (%)');
    
}   



// HOURLY DEMAND VS SUCCESS RATE CHART
// Dual-axis combination chart showing:
// - Bar chart: hourly booking demand (left Y axis)
// - Line chart: hourly success rate (right Y axis)
// Helps identify peak hours and their corresponding success rates
function updateHourlyDemandChart(data) {
    // ========== Data processing ==========
    // d3 rollup by hour
    const hourlyData = d3.rollup(
        data,
        v => ({
            total: v.length,   // Total bookings in this hour
            completed: v.filter(d => d.bookingStatus === 'Completed').length
        }),
        d => {
            // Extract hour from time string (format: "HH:MM:SS")
            const hour = parseInt(d.time.split(':')[0]);
            return hour;
        }
    );
    
    // calculate success rate from array 
    const chartData = Array.from(hourlyData, ([hour, counts]) => ({
        hour: hour,
        demand: counts.total,
        successRate: counts.total > 0 ? (counts.completed / counts.total * 100) : 0
    })).sort((a, b) => a.hour - b.hour);
    
    // ensure all 24 hours are represented
    // Fill in missing hours with zero values for complete visualization
    const completeData = [];
    for (let h = 0; h < 24; h++) {
        const existing = chartData.find(d => d.hour === h);
        completeData.push(existing || { hour: h, demand: 0, successRate: 0 });
    }
    
    // Logging for debugging
    console.log('Hourly Data:', completeData);
    
    // ========== Clean container ==========
    d3.select('#hourly-demand-chart').selectAll('*').remove();
    
    // Handle case with no data
    if (data.length === 0) {
        d3.select('#hourly-demand-chart')
            .append('div')
            .style('text-align', 'center')
            .style('padding', '50px')
            .style('color', '#999')
            .text('No data available');
        return;
    }
    
    // ========== Create tooltip ==========
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
    
    // ========== Set size and margin ==========
    const container = document.getElementById('hourly-demand-chart');
    const margin = { top: 10, right: 60, bottom: 60, left: 60 };   // Right margin for second Y axis
    const width = container.clientWidth - margin.left - margin.right;
    const height = 280 - margin.top - margin.bottom;
    
    // ========== SVG ==========
    const svg = d3.select('#hourly-demand-chart')
        .append('svg')
        .attr('width', container.clientWidth)
        .attr('height', 280)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // ========== Scalband ==========
    // X axis: hours 0-23
    const x = d3.scaleBand()
        .domain(completeData.map(d => d.hour))
        .range([0, width])
        .padding(0.2);
    
    // left Y axis: demand
    const yLeft = d3.scaleLinear()
        .domain([0, d3.max(completeData, d => d.demand)])
        .nice()
        .range([height, 0]);
    
    // rigth Y axis: success rate
    const yRight = d3.scaleLinear()
        .domain([0, 100])
        .range([height, 0]);
    
    // ========== Grids ==========
    svg.append('g')
        .attr('class', 'grid')
        .style('stroke', '#e0e0e0')
        .style('stroke-opacity', 0.5)
        .style('shape-rendering', 'crispEdges')
        .call(d3.axisLeft(yLeft)
            .tickSize(-width)
            .tickFormat('')
        );
    
    // ========== Bar chart==========
    const bars = svg.selectAll('.bar')
        .data(completeData)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', d => x(d.hour))
        .attr('y', height)                 // Start at bottom
        .attr('width', x.bandwidth())    
        .attr('height', 0)               // Start with height 0                 
        .attr('fill', '#3D7FF5')
        .attr('opacity', 0.7)
        .style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr('opacity', 1);
            // Show tooltip with both demand and success rate
            tooltip
                .style('opacity', 1)
                .html(`<strong>Hour: ${d.hour}:00</strong><br/>
                       Demand: ${d.demand.toLocaleString()}<br/>
                       Success Rate: ${d.successRate.toFixed(1)}%`)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px');
        })
        .on('mousemove', function(event) {
            tooltip
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px');
        })
        .on('mouseout', function() {
            d3.select(this)
                .transition()
                .duration(200)
                .attr('opacity', 0.7);
            
            tooltip.style('opacity', 0);
        });
    
    // Bar animation
    bars.transition()
        .duration(800)
        .delay((d, i) => i * 30)  // Staggered delay for each bar
        .attr('y', d => yLeft(d.demand))
        .attr('height', d => height - yLeft(d.demand));
    
    // ========== Line chart ==========
    const line = d3.line()
        .x(d => x(d.hour) + x.bandwidth() / 2)  // Center of bar
        .y(d => yRight(d.successRate))
        .defined(d => d.demand > 0);   // Only draw line where there is data
    
    const path = svg.append('path')
        .datum(completeData)
        .attr('fill', 'none')
        .attr('stroke', '#5BC589')
        .attr('stroke-width', 3)
        .attr('d', line);
    
    // Line animation
    const totalLength = path.node().getTotalLength();
    path
        .attr('stroke-dasharray', totalLength + ' ' + totalLength)
        .attr('stroke-dashoffset', totalLength)
        .transition()
        .duration(1500)
        .delay(800)  // Start after bars begin
        .ease(d3.easeLinear)
        .attr('stroke-dashoffset', 0);
    
    // ========== Add dots on line ==========
    const dots = svg.selectAll('.dot')
        .data(completeData.filter(d => d.demand > 0))   // Only for hours with data
        .enter()
        .append('circle')
        .attr('class', 'dot')
        .attr('cx', d => x(d.hour) + x.bandwidth() / 2)
        .attr('cy', d => yRight(d.successRate))
        .attr('r', 0)
        .attr('fill', '#5BC589')
        .attr('stroke', 'white')
        .attr('stroke-width', 2)
        .style('cursor', 'pointer')
        // ========== Hover interactions ==========
        .on('mouseover', function(event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr('r', 6);
            
            tooltip
                .style('opacity', 1)
                .html(`<strong>Hour: ${d.hour}:00</strong><br/>
                       Demand: ${d.demand.toLocaleString()}<br/>
                       Success Rate: ${d.successRate.toFixed(1)}%`)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px');
        })
        .on('mousemove', function(event) {
            tooltip
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px');
        })
        .on('mouseout', function() {
            d3.select(this)
                .transition()
                .duration(200)
                .attr('r', 4);
            
            tooltip.style('opacity', 0);
        });
    // Dots animation
    dots.transition()
        .duration(600)
        .delay((d, i) => i * 40 + 2300)  // Appear after line animation
        .attr('r', 4);
    
    // ========== Axis ==========
    // X axis
    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x)
            .tickFormat(d => d + ':00'))  // format as "HH:00"
        .selectAll('text')
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end')
        .style('font-size', '10px')
        .style('fill', '#333');
    
    // Left Y axis 
    svg.append('g')
        .call(d3.axisLeft(yLeft))
        .selectAll('text')
        .style('font-size', '11px')
        .style('fill', '#333');
    
    // Right Y axis 
    svg.append('g')
        .attr('transform', `translate(${width},0)`)
        .call(d3.axisRight(yRight)
            .tickFormat(d => d + '%')) // add % sign
        .selectAll('text')
        .style('font-size', '11px')
        .style('fill', '#333');
    
    // ========== Add label on axis ==========
    // X axis label
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', height + margin.bottom - 10)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('font-weight', 'bold')
        .style('fill', '#333')
        .text('Hour of Day');
    
    // Left Y axis label
    svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -height / 2)
        .attr('y', -margin.left + 15)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('font-weight', 'bold')
        .style('fill', '#3D7FF5') // Blue color for demand
        .text('Demand');
    
    // Right Y axis label
    svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -height / 2)
        .attr('y', width + margin.right - 10)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('font-weight', 'bold')
        .style('fill', '#5BC589')  // Green color for success rate
        .text('Success Rate (%)');
    
    // ========== add legeng ==========
    const legend = svg.append('g')
        .attr('transform', `translate(${width + 10}, -)`);
    
    // For demand (bar)
    legend.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', 15)
        .attr('height', 15)
        .attr('fill', '#3D7FF5')
        .attr('opacity', 0.7);
    
    legend.append('text')
        .attr('x', 20)
        .attr('y', 12)
        .style('font-size', '11px')
        .style('fill', '#333')
        .text('Demand');
    
    // For success rate (line)
    legend.append('line')
        .attr('x1', 0)
        .attr('x2', 15)
        .attr('y1', 30)
        .attr('y2', 30)
        .attr('stroke', '#5BC589')
        .attr('stroke-width', 3);
    
    legend.append('text')
        .attr('x', 20)
        .attr('y', 34)
        .style('font-size', '11px')
        .style('fill', '#333')
        .text('Success Rate');
}

// // INCOMPLETE RIDE REASONS
// function updateIncompleteRideChart(data) {
//     // ==========data processing========
//     const incompleteData = data.filter(d => 
//         d.incompleteRides && 
//         d.incompleteReason && 
//         d.incompleteReason.trim() !== '' &&
//         d.incompleteReason.toLowerCase() !== 'null'
//     );
    
//     // 按原因分组统计
//     const reasonCounts = d3.rollup(incompleteData, v => v.length, d => d.incompleteReason);
//     const total = Array.from(reasonCounts.values()).reduce((a, b) => a + b, 0);
    
//     const chartData = Array.from(reasonCounts, ([reason, count]) => ({
//         reason,
//         count,
//         percentage: total > 0 ? (count / total * 100).toFixed(1) : 0
//     })).sort((a, b) => b.count - a.count);  // 按数量降序排列
    
//     console.log('Incomplete Ride Data:', chartData);
    
//     // ========== Clean container ==========
//     d3.select('#incomplete-ride-chart').selectAll('*').remove();
    
//     if (chartData.length === 0) {
//         d3.select('#incomplete-ride-chart')
//             .append('div')
//             .style('text-align', 'center')
//             .style('padding', '50px')
//             .style('color', '#999')
//             .text('No incomplete ride data available');
//         return;
//     }
    
//     // ========== tooltip ==========
//     let tooltip = d3.select('body').select('.chart-tooltip');
//     if (tooltip.empty()) {
//         tooltip = d3.select('body')
//             .append('div')
//             .attr('class', 'chart-tooltip')
//             .style('position', 'absolute')
//             .style('opacity', 0)
//             .style('background-color', 'rgba(0, 0, 0, 0.8)')
//             .style('color', 'white')
//             .style('padding', '10px 15px')
//             .style('border-radius', '8px')
//             .style('font-size', '14px')
//             .style('pointer-events', 'none')
//             .style('z-index', '1000')
//             .style('box-shadow', '0 4px 6px rgba(0,0,0,0.3)');
//     }
    
//     // ========== margin and size  ==========
//     const container = document.getElementById('incomplete-ride-chart');
//     const margin = { top: 20, right: 30, bottom: 120, left: 60 };  // 底部空间大，因为标签可能很长
//     const width = container.clientWidth - margin.left - margin.right;
//     const height = 250 - margin.top - margin.bottom;
    
//     // ========== create SVG ==========
//     const svg = d3.select('#incomplete-ride-chart')
//         .append('svg')
//         .attr('width', container.clientWidth)
//         .attr('height', 250)
//         .append('g')
//         .attr('transform', `translate(${margin.left},${margin.top})`);
    
//     // ========== create scaleband ==========
//     const x = d3.scaleBand()
//         .domain(chartData.map(d => d.reason))
//         .range([0, width])
//         .padding(0.3);
    
//     const y = d3.scaleLinear()
//         .domain([0, d3.max(chartData, d => d.count)])
//         .nice()
//         .range([height, 0]);
    
//    
//     const color = d3.scaleOrdinal()
//         .domain(chartData.map(d => d.reason))
//         .range(['#F26138', '#FFC043', '#9A644C', '#7956BF', '#3D7FF5', '#5BC589']);
    
//     // ========== Grids ==========
//     svg.append('g')
//         .attr('class', 'grid')
//         .style('stroke', '#e0e0e0')
//         .style('stroke-opacity', 0.5)
//         .style('shape-rendering', 'crispEdges')
//         .call(d3.axisLeft(y)
//             .tickSize(-width)
//             .tickFormat('')
//         );
    
//     // ========== Bar chart ==========
//     const bars = svg.selectAll('.bar')
//         .data(chartData)
//         .enter()
//         .append('rect')
//         .attr('class', 'bar')
//         .attr('x', d => x(d.reason))
//         .attr('y', height)
//         .attr('width', x.bandwidth())
//         .attr('height', 0)
//         .attr('fill', d => color(d.reason))
//         .attr('opacity', 0.8)
//         .style('cursor', 'pointer')
//         .on('mouseover', function(event, d) {
//             d3.select(this)
//                 .transition()
//                 .duration(200)
//                 .attr('opacity', 1);
            
//             tooltip
//                 .style('opacity', 1)
//                 .html(`<strong>${d.reason}</strong><br/>
//                        Count: ${d.count.toLocaleString()}<br/>
//                        Percentage: ${d.percentage}%`)
//                 .style('left', (event.pageX + 10) + 'px')
//                 .style('top', (event.pageY - 10) + 'px');
//         })
//         .on('mousemove', function(event) {
//             tooltip
//                 .style('left', (event.pageX + 10) + 'px')
//                 .style('top', (event.pageY - 10) + 'px');
//         })
//         .on('mouseout', function() {
//             d3.select(this)
//                 .transition()
//                 .duration(200)
//                 .attr('opacity', 0.8);
            
//             tooltip.style('opacity', 0);
//         });
    
//     
//     bars.transition()
//         .duration(800)
//         .delay((d, i) => i * 100)
//         .ease(d3.easeCubicOut)
//         .attr('y', d => y(d.count))
//         .attr('height', d => height - y(d.count));
    
//     // ========== Label ==========
//     svg.selectAll('.label')
//         .data(chartData)
//         .enter()
//         .append('text')
//         .attr('class', 'label')
//         .attr('x', d => x(d.reason) + x.bandwidth() / 2)
//         .attr('y', d => y(d.count) - 5)
//         .attr('text-anchor', 'middle')
//         .style('font-size', '11px')
//         .style('font-weight', 'bold')
//         .style('fill', '#333')
//         .style('opacity', 0)
//         .text(d => d.count)
//         .transition()
//         .duration(800)
//         .delay((d, i) => i * 100 + 800)
//         .style('opacity', 1);
    
//     // ========== axis ==========
//     // X axis
//     svg.append('g')
//         .attr('transform', `translate(0,${height})`)
//         .call(d3.axisBottom(x))
//         .selectAll('text')
//         .attr('transform', 'rotate(-45)')
//         .style('text-anchor', 'end')
//         .style('font-size', '10px')
//         .style('fill', '#333')
//         .text(d => d.length > 25 ? d.substring(0, 25) + '...' : d);  // 截断长文本
    
//     // Y axis
//     svg.append('g')
//         .call(d3.axisLeft(y))
//         .selectAll('text')
//         .style('font-size', '11px')
//         .style('fill', '#333');
    
//     // ========== text on axis ==========
//     // X axis label
//     svg.append('text')
//         .attr('x', width / 2)
//         .attr('y', height + margin.bottom - 10)
//         .attr('text-anchor', 'middle')
//         .style('font-size', '12px')
//         .style('font-weight', 'bold')
//         .style('fill', '#333')
//         .text('Incomplete Reason');
    
//     // Y axis label
//     svg.append('text')
//         .attr('transform', 'rotate(-90)')
//         .attr('x', -height / 2)
//         .attr('y', -margin.left + 15)
//         .attr('text-anchor', 'middle')
//         .style('font-size', '12px')
//         .style('font-weight', 'bold')
//         .style('fill', '#333')
//         .text('Count');
// }

