let dashboardData = [];
let filteredDataOverall = [];
let filteredDataVehicleType = [];
let filteredDataRevenue = [];
let filteredDataBookingStatus = [];
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
            
            // Load charts when navigating to specific sections
            if (sectionId === 'vehicle-type-page') {
                updateVehicleTypeMetricChart();
            }
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

        // Initialize all filtered data arrays independently
        filteredDataOverall = [...dashboardData];
        filteredDataVehicleType = [...dashboardData];
        filteredDataRevenue = [...dashboardData];
        filteredDataBookingStatus = [...dashboardData];
        
        allDates = [...new Set(dashboardData.map(d => d.date).filter(d => d))].sort();
        
        populateDateDropdowns();
        updateDashboardOverall();
        
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

function updateDashboardOverall() {
    updateKPIs(filteredDataOverall);
    updateVehicleTypeChart('vehicle-type-chart-overall', filteredDataOverall);
    updateBookingStatusPieChart(filteredDataOverall);
}

function updateKPIs(data) {
    const totalBookings = data.length;
    const completedRides = data.filter(d => d.bookingStatus === 'Completed').length;
    const avgDistance = d3.mean(data.filter(d => d.rideDistance !== null), d => d.rideDistance) || 0;
    const avgRating = d3.mean(data.filter(d => d.driverRating !== null), d => d.driverRating) || 0;
    const validRevenueData = data.filter(d => d.bookingValue !== null && !isNaN(d.bookingValue));
    const totalRevenue = d3.sum(validRevenueData, d => d.bookingValue) || 0;

    document.getElementById('total-bookings').textContent = totalBookings.toLocaleString();
    document.getElementById('completed-rides').textContent = completedRides.toLocaleString();
    document.getElementById('avg-distance').textContent = avgDistance.toFixed(1) + ' km';
    document.getElementById('avg-rating').textContent = avgRating.toFixed(1);
    document.getElementById('total-revenue').textContent = '$' + totalRevenue.toLocaleString();
}

function updateBookingStatusPieChart(data) {
    const statusCounts = d3.rollup(data, v => v.length, d => d.bookingStatus);
    const total = data.length;
    
    const chartData = Array.from(statusCounts, ([status, count]) => ({
        status,
        count,
        percentage: (count / total * 100).toFixed(1)
    })).filter(d => d.count > 0).sort((a, b) => b.count - a.count);

    d3.select('#booking-status-pie-chart').selectAll('*').remove();

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

    const width = 240;
    const height = 240;
    const radius = Math.min(width, height) / 2 - 35;

    const container = d3.select('#booking-status-pie-chart')
        .append('div')
        .style('display', 'flex')
        .style('flex-direction', 'row')
        .style('align-items', 'center')
        .style('justify-content', 'center')
        .style('gap', '30px')
        .style('height', '100%');

    const svg = container
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${width / 2},${height / 2})`);

    const color = d3.scaleOrdinal()
        .domain(chartData.map(d => d.status))
        .range(['#5BC589', '#F26138', '#FFC043', '#9A644C', '#3D7FF5', '#7956BF']);

    const pie = d3.pie()
        .value(d => d.count)
        .sort(null);

    const arc = d3.arc()
        .innerRadius(0)
        .outerRadius(radius);

    const outerArc = d3.arc()
        .innerRadius(radius * 1.05)
        .outerRadius(radius * 1.05);

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
                .html(`<strong>${d.data.status}</strong><br/>
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
        .on('mouseout', function(event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .style('opacity', 0.9)
                .attr('transform', 'translate(0, 0)');
            
            tooltip.style('opacity', 0);
        });

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

    const polylines = svg.selectAll('polyline')
        .data(pie(chartData))
        .enter()
        .append('polyline')
        .attr('points', function(d) {
            const pos = outerArc.centroid(d);
            pos[0] = radius * 1.08 * (midAngle(d) < Math.PI ? 1 : -1);
            return [arc.centroid(d), outerArc.centroid(d), pos];
        })
        .style('fill', 'none')
        .style('stroke', '#333')
        .style('stroke-width', '1.5px')
        .style('opacity', 0);

    polylines.transition()
        .duration(800)
        .delay((d, i) => i * 100 + 800)
        .style('opacity', 0.7);

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
            return midAngle(d) < Math.PI ? 'start' : 'end';
        })
        .style('font-size', '10px')
        .style('font-weight', 'bold')
        .style('fill', '#333')
        .style('opacity', 0)
        .text(d => `${d.data.percentage}%`);

    labels.transition()
        .duration(800)
        .delay((d, i) => i * 100 + 800)
        .style('opacity', 1);

    const legend = container
        .append('div')
        .style('display', 'flex')
        .style('flex-direction', 'column')
        .style('gap', '8px')
        .style('padding', '10px');

    chartData.forEach(d => {
        const legendItem = legend.append('div')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('gap', '8px')
            .style('cursor', 'pointer')
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

        legendItem.append('div')
            .style('width', '14px')
            .style('height', '14px')
            .style('background-color', color(d.status))
            .style('border-radius', '2px')
            .style('flex-shrink', '0');

        legendItem.append('span')
            .style('font-size', '8px')
            .style('color', '#333')
            .style('white-space', 'nowrap')
            .text(`${d.status} (${d.percentage}%)`);
    });

    function midAngle(d) {
        return d.startAngle + (d.endAngle - d.startAngle) / 2;
    }
}

function updateVehicleTypeChart(containerId, data) {
    const vehicleTypeCounts = d3.rollup(data, v => v.length, d => d.vehicleType);
    const chartData = Array.from(vehicleTypeCounts, ([vehicleType, count]) => ({ vehicleType, count }))
        .sort((a, b) => b.count - a.count);

    d3.select(`#${containerId}`).selectAll('*').remove();

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

    const container = document.getElementById(containerId);
    const margin = { top: 20, right: 30, bottom: 100, left: 90 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const svg = d3.select(`#${containerId}`)
        .append('svg')
        .attr('width', container.clientWidth)
        .attr('height', 300)
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
        .range(['#5BC589', '#F26138', '#FFC043', '#9A644C', '#3D7FF5', '#7956BF']);

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

    bars.transition()
        .duration(800)
        .delay((d, i) => i * 100)
        .ease(d3.easeCubicOut)
        .attr('y', d => y(d.count))
        .attr('height', d => height - y(d.count))
        .attr('opacity', 0.8);

    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll('text')
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end')
        .style('font-size', '12px')
        .style('fill', '#333');

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
        .text('Number of Bookings');
}

function populateDateDropdowns() {
    const sections = ['overall', 'vehicle-type-page', 'revenue', 'booking-status'];
    
    sections.forEach(section => {
        const startSelect = document.getElementById(`start-date-${section}`);
        const endSelect = document.getElementById(`end-date-${section}`);
        
        if (startSelect && endSelect) {
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
        }
    });
}

function applyDateFilter(section) {
    const startDate = document.getElementById(`start-date-${section}`).value;
    const endDate = document.getElementById(`end-date-${section}`).value;
    
    let filteredData;
    if (!startDate && !endDate) {
        filteredData = [...dashboardData];
    } else if (startDate && !endDate) {
        filteredData = dashboardData.filter(d => d.date >= startDate);
    } else if (!startDate && endDate) {
        filteredData = dashboardData.filter(d => d.date <= endDate);
    } else {
        filteredData = dashboardData.filter(d => d.date >= startDate && d.date <= endDate);
    }
    
    // Update the appropriate section's filtered data
    if (section === 'overall') {
        filteredDataOverall = filteredData;
        updateDashboardOverall();
    } else if (section === 'vehicle-type-page') {
    filteredDataVehicleType = filteredData;
    updateVehicleTypeMetricChart();
        // Update vehicle type page charts when they exist
    } else if (section === 'revenue') {
        filteredDataRevenue = filteredData;
        // Update revenue page charts when they exist
    } else if (section === 'booking-status') {
        filteredDataBookingStatus = filteredData;
        // Update booking status page charts when they exist
    }
    
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

function resetDateFilter(section) {
    const startSelect = document.getElementById(`start-date-${section}`);
    const endSelect = document.getElementById(`end-date-${section}`);
    const filterInfo = document.getElementById(`filter-info-${section}`);
    
    if (startSelect) startSelect.value = '';
    if (endSelect) endSelect.value = '';
    
    // Reset the appropriate section's filtered data
    if (section === 'overall') {
        filteredDataOverall = [...dashboardData];
        updateDashboardOverall();
    } else if (section === 'vehicle-type-page') {
        filteredDataVehicleType = [...dashboardData];
        updateVehicleTypeMetricChart();
        // Update vehicle type page charts when they exist
    } else if (section === 'revenue') {
        filteredDataRevenue = [...dashboardData];
        // Update revenue page charts when they exist
    } else if (section === 'booking-status') {
        filteredDataBookingStatus = [...dashboardData];
        // Update booking status page charts when they exist
    }
    
    if (filterInfo) {
        filterInfo.textContent = 'Showing all data';
    }
}
function updateVehicleTypeMetricChart() {
    const metric = document.getElementById('vehicle-metric-select').value;
    const data = filteredDataVehicleType;
    
    // Calculate metrics by vehicle type
    const vehicleTypes = [...new Set(data.map(d => d.vehicleType))];
    const chartData = [];
    
    vehicleTypes.forEach(vehicleType => {
        const vehicleData = data.filter(d => d.vehicleType === vehicleType);
        let value = 0;
        let label = '';
        
        switch(metric) {
            case 'totalBookingValue':
                value = d3.sum(vehicleData.filter(d => d.bookingValue !== null), d => d.bookingValue);
                label = 'Total Booking Value ($)';
                break;
            case 'successBookingValue':
                const successData = vehicleData.filter(d => d.bookingStatus === 'Completed' && d.bookingValue !== null);
                value = d3.sum(successData, d => d.bookingValue);
                label = 'Success Booking Value ($)';
                break;
            case 'avgDistance':
                value = d3.mean(vehicleData.filter(d => d.rideDistance !== null), d => d.rideDistance) || 0;
                label = 'Avg Distance Travelled (km)';
                break;
            case 'totalDistance':
                value = d3.sum(vehicleData.filter(d => d.rideDistance !== null), d => d.rideDistance);
                label = 'Total Distance Travelled (km)';
                break;
            case 'avgDriverRating':
                value = d3.mean(vehicleData.filter(d => d.driverRating !== null), d => d.driverRating) || 0;
                label = 'Avg Driver Rating';
                break;
            case 'avgCustomerRating':
                value = d3.mean(vehicleData.filter(d => d.customerRating !== null), d => d.customerRating) || 0;
                label = 'Avg Customer Rating';
                break;
        }
        
        chartData.push({ vehicleType, value, label });
    });
    
    chartData.sort((a, b) => b.value - a.value);
    
    // Render chart
    d3.select('#vehicle-type-metric-chart').selectAll('*').remove();
    
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
    
    const container = document.getElementById('vehicle-type-metric-chart');
    const margin = { top: 20, right: 30, bottom: 100, left: 90 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
    
    const svg = d3.select('#vehicle-type-metric-chart')
        .append('svg')
        .attr('width', container.clientWidth)
        .attr('height', 400)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    const x = d3.scaleBand()
        .domain(chartData.map(d => d.vehicleType))
        .range([0, width])
        .padding(0.3);
    
    const y = d3.scaleLinear()
        .domain([0, d3.max(chartData, d => d.value)])
        .nice()
        .range([height, 0]);
    
    const color = d3.scaleOrdinal()
        .domain(chartData.map(d => d.vehicleType))
        .range(['#5BC589', '#F26138', '#FFC043', '#9A644C', '#3D7FF5', '#7956BF']);
    
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
            
            const displayValue = metric.includes('Rating') ? d.value.toFixed(2) : 
                                 metric.includes('avg') && metric.includes('Distance') ? d.value.toFixed(2) + ' km' :
                                 metric.includes('Distance') ? d.value.toFixed(2) + ' km' :
                                 '$' + d.value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
            
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
            d3.select(this)
                .transition()
                .duration(200)
                .attr('opacity', 0.8);
            
            tooltip.style('opacity', 0);
        });
    
    bars.transition()
        .duration(800)
        .delay((d, i) => i * 100)
        .ease(d3.easeCubicOut)
        .attr('y', d => y(d.value))
        .attr('height', d => height - y(d.value))
        .attr('opacity', 0.8);
    
    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll('text')
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end')
        .style('font-size', '12px')
        .style('fill', '#333');
    
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