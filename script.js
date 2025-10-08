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
    updateBookingsOverTimeChart(filteredDataOverall);
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
    document.getElementById('total-revenue').textContent = '₹' + totalRevenue.toLocaleString();
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
    
    const minDate = allDates[0];
    const maxDate = allDates[allDates.length - 1];
    
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
    const startInput = document.getElementById(`start-date-${section}`);
    const endInput = document.getElementById(`end-date-${section}`);
    const filterInfo = document.getElementById(`filter-info-${section}`);
    
    if (startInput) startInput.value = '';
    if (endInput) endInput.value = '';
    
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
    
    if (filterInfo) {
        filterInfo.textContent = 'Showing all data';
    }
}

function updateVehicleTypeMetricChart() {
    const metric = document.getElementById('vehicle-metric-select').value;
    const data = filteredDataVehicleType;
    
    const normalizedData = data.map(d => ({
        ...d,
        vehicleType: (d.vehicleType === 'eBike' || d.vehicleType === 'Bike') ? 'eBike/Bike' : d.vehicleType
    }));
    
    const vehicleTypes = [...new Set(normalizedData.map(d => d.vehicleType))];
    const chartData = [];
    
    vehicleTypes.forEach(vehicleType => {
        const vehicleData = normalizedData.filter(d => d.vehicleType === vehicleType);
        let value = 0;
        let label = '';
        
        switch(metric) {
            case 'totalBookingValue':
                value = d3.sum(vehicleData.filter(d => d.bookingValue !== null), d => d.bookingValue);
                label = 'Total Booking Value in Rupees (₹)';
                break;
            case 'successBookingValue':
                const successData = vehicleData.filter(d => d.bookingStatus === 'Completed' && d.bookingValue !== null);
                value = d3.sum(successData, d => d.bookingValue);
                label = 'Success Booking Value in Rupees (₹)';
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
                label = 'Avg Driver Rating (Stars)';
                break;
            case 'avgCustomerRating':
                value = d3.mean(vehicleData.filter(d => d.customerRating !== null), d => d.customerRating) || 0;
                label = 'Avg Customer Rating (Stars)';
                break;
        }
        
        chartData.push({ vehicleType, value, label });
    });
    
    const sortOrder = ['Go Mini', 'Go Sedan', 'Auto', 'eBike/Bike', 'UberXL', 'Premier Sedan'];
    
    chartData.sort((a, b) => {
        const indexA = sortOrder.indexOf(a.vehicleType);
        const indexB = sortOrder.indexOf(b.vehicleType);
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });
    
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
                                 '₹' + d.value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
            
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

function updateBookingsOverTimeChart(data) {
    const bookingsByDate = d3.rollup(data, v => v.length, d => d.date);
    const chartData = Array.from(bookingsByDate, ([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));
    
    d3.select('#bookings-over-time-chart').selectAll('*').remove();
    
    if (chartData.length === 0) {
        d3.select('#bookings-over-time-chart')
            .append('div')
            .style('text-align', 'center')
            .style('padding', '50px')
            .style('color', '#999')
            .text('No data available for selected date range');
        return;
    }
    
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
    
    const container = document.getElementById('bookings-over-time-chart');
    const margin = { top: 20, right: 30, bottom: 80, left: 70 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
    
    const svg = d3.select('#bookings-over-time-chart')
        .append('svg')
        .attr('width', container.clientWidth)
        .attr('height', 400)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    const x = d3.scaleTime()
        .domain(d3.extent(chartData, d => new Date(d.date)))
        .range([0, width]);
    
    const y = d3.scaleLinear()
        .domain([0, d3.max(chartData, d => d.count)])
        .nice()
        .range([height, 0]);
    
    svg.append('g')
        .attr('class', 'grid')
        .style('stroke', '#e0e0e0')
        .style('stroke-opacity', 0.5)
        .style('shape-rendering', 'crispEdges')
        .call(d3.axisLeft(y)
            .tickSize(-width)
            .tickFormat('')
        );
    
    const gradient = svg.append('defs')
        .append('linearGradient')
        .attr('id', 'area-gradient')
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '0%')
        .attr('y2', '100%');
    
    gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', '#276EF1')
        .attr('stop-opacity', 0.4);
    
    gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', '#276EF1')
        .attr('stop-opacity', 0);
    
    const area = d3.area()
        .x(d => x(new Date(d.date)))
        .y0(height)
        .y1(d => y(d.count))
        .curve(d3.curveMonotoneX);
    
    svg.append('path')
        .datum(chartData)
        .attr('class', 'area')
        .attr('fill', 'url(#area-gradient)')
        .attr('d', area)
        .style('opacity', 0)
        .transition()
        .duration(1000)
        .style('opacity', 1);
    
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
    
    const totalLength = path.node().getTotalLength();
    path
        .attr('stroke-dasharray', totalLength + ' ' + totalLength)
        .attr('stroke-dashoffset', totalLength)
        .transition()
        .duration(1500)
        .ease(d3.easeLinear)
        .attr('stroke-dashoffset', 0);
    
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
        .text('Date');
    
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

// REVENUE PAGE
function updateRevenueCharts() {
    updatePaymentMethodsChart(filteredDataRevenue);
    updatePricePerKmChart(filteredDataRevenue);
    updateRevenueLocationHeatmap(filteredDataRevenue);
}

function updatePaymentMethodsChart(data) {
    // Remove null, 'null', or blank payment methods that equivalate to "INCOMPLETE"
    const validData = data.filter(d => 
        d.paymentMethod &&
        d.paymentMethod.trim() !== '' &&
        d.paymentMethod.trim().toLowerCase() !== 'null'
    );

    const paymentCounts = d3.rollup(validData, v => v.length, d => d.paymentMethod);
    const total = Array.from(paymentCounts.values()).reduce((a, b) => a + b, 0);
    
    const chartData = Array.from(paymentCounts, ([method, count]) => ({
        method,
        count,
        percentage: (count / total * 100).toFixed(1)
    })).sort((a, b) => b.count - a.count);

    d3.select('#payment-methods-chart').selectAll('*').remove();

    if (chartData.length === 0) {
        d3.select('#payment-methods-chart')
            .append('div')
            .style('text-align', 'center')
            .style('padding', '50px')
            .style('color', '#999')
            .text('No payment data available');
        return;
    }

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
            .style('pointer-events', 'none')
            .style('z-index', '1000')
            .style('box-shadow', '0 4px 6px rgba(0,0,0,0.3)');
    }

    const width = 280;
    const height = 280;
    const radius = Math.min(width, height) / 2 - 40;

    const container = d3.select('#payment-methods-chart')
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
        .domain(chartData.map(d => d.method))
        .range(['#5BC589', '#F26138', '#FFC043', '#9A644C', '#3D7FF5', '#7956BF']);

    const pie = d3.pie()
        .value(d => d.count)
        .sort(null);

    const arc = d3.arc()
        .innerRadius(radius * 0.6)
        .outerRadius(radius);

    const slices = svg.selectAll('path')
        .data(pie(chartData))
        .enter()
        .append('path')
        .attr('d', arc)
        .attr('fill', d => color(d.data.method))
        .attr('stroke', 'white')
        .style('stroke-width', '3px')
        .style('opacity', 0)
        .style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .style('opacity', 1)
                .attr('transform', function() {
                    const [x, y] = arc.centroid(d);
                    return `translate(${x * 0.15}, ${y * 0.15})`;
                });
            
            tooltip
                .style('opacity', 1)
                .html(`<strong>${d.data.method}</strong><br/>
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

    svg.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '-0.2em')
        .style('font-size', '24px')
        .style('font-weight', 'bold')
        .style('fill', '#333')
        .text(total.toLocaleString());
    
    svg.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '1.2em')
        .style('font-size', '12px')
        .style('fill', '#666')
        .text('Total Payments');

    const legend = container
        .append('div')
        .style('display', 'flex')
        .style('flex-direction', 'column')
        .style('gap', '10px');

    chartData.forEach(d => {
        const legendItem = legend.append('div')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('gap', '10px')
            .style('cursor', 'pointer')
            .on('mouseover', function() {
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
                svg.selectAll('path')
                    .filter(slice => slice.data.method === d.method)
                    .transition()
                    .duration(200)
                    .style('opacity', 0.9)
                    .attr('transform', 'translate(0, 0)');
            });

        legendItem.append('div')
            .style('width', '16px')
            .style('height', '16px')
            .style('background-color', color(d.method))
            .style('border-radius', '3px')
            .style('flex-shrink', '0');

        legendItem.append('span')
            .style('font-size', '13px')
            .style('color', '#333')
            .text(`${d.method} (${d.percentage}%)`);
    });
}


function updatePricePerKmChart(data) {
    const validData = data.filter(d => 
        d.bookingValue !== null && 
        d.rideDistance !== null && 
        d.rideDistance > 0 &&
        d.bookingValue > 0
    ).map(d => ({
        pricePerKm: d.bookingValue / d.rideDistance
    }));

    d3.select('#price-per-km-chart').selectAll('*').remove();

    if (validData.length === 0) {
        d3.select('#price-per-km-chart')
            .append('div')
            .style('text-align', 'center')
            .style('padding', '50px')
            .style('color', '#999')
            .text('No valid price per km data available');
        return;
    }

    const pricePerKmValues = validData.map(d => d.pricePerKm);
    const mean = d3.mean(pricePerKmValues);

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

    const container = document.getElementById('price-per-km-chart');
    const margin = { top: 20, right: 100, bottom: 60, left: 70 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = 350 - margin.top - margin.bottom;

    const svg = d3.select('#price-per-km-chart')
        .append('svg')
        .attr('width', container.clientWidth)
        .attr('height', 350)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear()
        .domain([0, d3.quantile(pricePerKmValues.sort(d3.ascending), 0.95)])
        .range([0, width]);

    const histogram = d3.histogram()
        .domain(x.domain())
        .thresholds(x.ticks(30));

    const bins = histogram(pricePerKmValues);

    const y = d3.scaleLinear()
        .domain([0, d3.max(bins, d => d.length)])
        .nice()
        .range([height, 0]);

    const bars = svg.selectAll('rect')
        .data(bins)
        .enter()
        .append('rect')
        .attr('x', d => x(d.x0) + 1)
        .attr('width', d => Math.max(0, x(d.x1) - x(d.x0) - 1))
        .attr('y', height)
        .attr('height', 0)
        .attr('fill', '#FFC043')
        .attr('stroke', '#000')
        .attr('stroke-width', 1)
        .style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr('fill', '#FFD700');
            
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
                .attr('fill', '#FFC043');
            
            tooltip.style('opacity', 0);
        });

    bars.transition()
        .duration(800)
        .delay((d, i) => i * 20)
        .attr('y', d => y(d.length))
        .attr('height', d => height - y(d.length));

    svg.append('line')
        .attr('x1', x(mean))
        .attr('x2', x(mean))
        .attr('y1', 0)
        .attr('y2', height)
        .attr('stroke', 'red')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5,5')
        .style('opacity', 0)
        .transition()
        .duration(1000)
        .delay(800)
        .style('opacity', 0.8);

    svg.append('text')
        .attr('x', x(mean) + 5)
        .attr('y', 15)
        .style('fill', 'red')
        .style('font-size', '12px')
        .style('font-weight', 'bold')
        .text(`Mean: ₹${mean.toFixed(2)}/km`)
        .style('opacity', 0)
        .transition()
        .duration(1000)
        .delay(800)
        .style('opacity', 1);

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

function updateRevenueLocationHeatmap(data) {
    const validData = data.filter(d => 
        d.pickupLocation && 
        d.dropLocation && 
        d.bookingValue !== null && 
        d.bookingValue > 0
    );

    d3.select('#revenue-location-heatmap').selectAll('*').remove();

    if (validData.length === 0) {
        d3.select('#revenue-location-heatmap')
            .append('div')
            .style('text-align', 'center')
            .style('padding', '50px')
            .style('color', '#999')
            .text('No revenue location data available');
        return;
    }

    const routeRevenue = d3.rollup(
        validData,
        v => ({
            revenue: d3.sum(v, d => d.bookingValue),
            count: v.length
        }),
        d => d.pickupLocation,
        d => d.dropLocation
    );

    const pickupRevenue = new Map();
    const dropRevenue = new Map();

    routeRevenue.forEach((drops, pickup) => {
        let total = 0;
        drops.forEach(data => { total += data.revenue; });
        pickupRevenue.set(pickup, total);
    });

    validData.forEach(d => {
        dropRevenue.set(d.dropLocation, (dropRevenue.get(d.dropLocation) || 0) + d.bookingValue);
    });

    const top10Pickups = Array.from(pickupRevenue.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(d => d[0]);

    const top10Drops = Array.from(dropRevenue.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(d => d[0]);

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

    const container = document.getElementById('revenue-location-heatmap');
    const margin = { top: 20, right: 120, bottom: 150, left: 150 };
    const cellSize = 35;
    const width = cellSize * top10Drops.length;
    const height = cellSize * top10Pickups.length;

    const svg = d3.select('#revenue-location-heatmap')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const colorScale = d3.scaleSequential()
        .domain([0, d3.max(heatmapData, d => d.revenue)])
        .interpolator(d3.interpolateYlOrRd);

    const cells = svg.selectAll('rect')
        .data(heatmapData)
        .enter()
        .append('rect')
        .attr('x', d => top10Drops.indexOf(d.drop) * cellSize)
        .attr('y', d => top10Pickups.indexOf(d.pickup) * cellSize)
        .attr('width', cellSize)
        .attr('height', cellSize)
        .attr('fill', 'white')
        .attr('stroke', '#ddd')
        .attr('stroke-width', 1)
        .style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
            d3.select(this)
                .attr('stroke', '#000')
                .attr('stroke-width', 2);
            
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

    cells.transition()
        .duration(600)
        .delay((d, i) => i * 10)
        .attr('fill', d => colorScale(d.revenue));

    svg.selectAll('.x-label')
        .data(top10Drops)
        .enter()
        .append('text')
        .attr('class', 'x-label')
        .attr('x', (d, i) => i * cellSize + cellSize / 2)
        .attr('y', height + 10)
        .attr('text-anchor', 'start')
        .attr('transform', (d, i) => `rotate(-45, ${i * cellSize + cellSize / 2}, ${height + 10})`)
        .style('font-size', '10px')
        .style('fill', '#333')
        .text(d => d.length > 15 ? d.substring(0, 15) + '...' : d);

    svg.selectAll('.y-label')
        .data(top10Pickups)
        .enter()
        .append('text')
        .attr('class', 'y-label')
        .attr('x', -5)
        .attr('y', (d, i) => i * cellSize + cellSize / 2 + 4)
        .attr('text-anchor', 'end')
        .style('font-size', '10px')
        .style('fill', '#333')
        .text(d => d.length > 20 ? d.substring(0, 20) + '...' : d);

    svg.append('text')
        .attr('x', width / 2)
        .attr('y', height + margin.bottom - 10)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('font-weight', 'bold')
        .style('fill', '#333')
        .text('Drop Location');

    svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -height / 2)
        .attr('y', -margin.left + 20)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('font-weight', 'bold')
        .style('fill', '#333')
        .text('Pickup Location');

    const legendWidth = 20;
    const legendHeight = height;
    const legendSteps = 10;

    const legendScale = d3.scaleLinear()
        .domain([0, legendSteps])
        .range([legendHeight, 0]);

    const legend = svg.append('g')
        .attr('transform', `translate(${width + 20}, 0)`);

    for (let i = 0; i <= legendSteps; i++) {
        const value = (i / legendSteps) * d3.max(heatmapData, d => d.revenue);
        legend.append('rect')
            .attr('x', 0)
            .attr('y', legendScale(i))
            .attr('width', legendWidth)
            .attr('height', legendHeight / legendSteps)
            .attr('fill', colorScale(value));
    }

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

    legend.append('text')
        .attr('x', legendWidth / 2)
        .attr('y', -10)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px')
        .style('font-weight', 'bold')
        .style('fill', '#333')
        .text('Revenue');
}


// BOOKING STATUS PAGE

function updateBookingStatusCharts() {
    updateOverallRideDistribution(filteredDataBookingStatus);
    updateDriverCancellationChart(filteredDataBookingStatus);
    updateCustomerCancellationChart(filteredDataBookingStatus);
}

function updateOverallRideDistribution(data) {
    const statusCounts = d3.rollup(data, v => v.length, d => d.bookingStatus);
    const chartData = Array.from(statusCounts, ([status, count]) => ({ status, count }))
        .sort((a, b) => b.count - a.count);

    d3.select('#overall-ride-distribution-chart').selectAll('*').remove();

    if (chartData.length === 0) {
        d3.select('#overall-ride-distribution-chart')
            .append('div')
            .style('text-align', 'center')
            .style('padding', '50px')
            .style('color', '#999')
            .text('No data available');
        return;
    }

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

    const container = document.getElementById('overall-ride-distribution-chart');
    const containerWidth = container.clientWidth;
    const margin = { top: 20, right: 20, bottom: 80, left: 60 };
    const width = containerWidth - margin.left - margin.right;
    const height = 280 - margin.top - margin.bottom;

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

    const y = d3.scaleLinear()
        .domain([0, d3.max(chartData, d => d.count)])
        .nice()
        .range([height, 0]);

    const color = d3.scaleOrdinal()
        .domain(chartData.map(d => d.status))
        .range(['#5BC589', '#F26138', '#FFC043', '#9A644C', '#3D7FF5', '#7956BF']);

    const bars = svg.selectAll('.bar')
        .data(chartData)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', d => x(d.status))
        .attr('y', height)
        .attr('width', x.bandwidth())
        .attr('height', 0)
        .attr('fill', d => color(d.status))
        .attr('opacity', 0)
        .style('cursor', 'pointer')
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
        .style('font-size', '11px')
        .style('fill', '#333');

    svg.append('g')
        .call(d3.axisLeft(y))
        .selectAll('text')
        .style('font-size', '9px')
        .style('fill', '#333');

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

function updateDriverCancellationChart(data) {
    const cancelledData = data.filter(d => 
        d.cancelledByDriver && 
        d.driverCancelReason && 
        d.driverCancelReason.trim() !== '' &&
        d.driverCancelReason.toLowerCase() !== 'null'
    );

    const reasonCounts = d3.rollup(cancelledData, v => v.length, d => d.driverCancelReason);
    const total = Array.from(reasonCounts.values()).reduce((a, b) => a + b, 0);
    
    const chartData = Array.from(reasonCounts, ([reason, count]) => ({
        reason,
        count,
        percentage: (count / total * 100).toFixed(1)
    })).sort((a, b) => b.count - a.count);

    d3.select('#driver-cancellation-chart').selectAll('*').remove();

    if (chartData.length === 0) {
        d3.select('#driver-cancellation-chart')
            .append('div')
            .style('text-align', 'center')
            .style('padding', '50px')
            .style('color', '#999')
            .text('No driver cancellation data available');
        return;
    }

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

    const container = document.getElementById('driver-cancellation-chart');
    const containerWidth = container.clientWidth;
    const width = Math.min(containerWidth, 280);
    const height = 200;
    const radius = Math.min(width, height) / 2 - 20;

    const mainContainer = d3.select('#driver-cancellation-chart')
        .append('div')
        .style('display', 'flex')
        .style('flex-direction', 'column')
        .style('align-items', 'center')
        .style('justify-content', 'flex-start')
        .style('gap', '10px')
        .style('padding-top', '10px');

    const svg = mainContainer
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${width / 2},${height / 2})`);

    const color = d3.scaleOrdinal()
        .domain(chartData.map(d => d.reason))
        .range(['#6366f1', '#8b5cf6', '#a855f7', '#c084fc', '#d8b4fe', '#e9d5ff']);

    const pie = d3.pie()
        .value(d => d.count)
        .sort(null);

    const arc = d3.arc()
        .innerRadius(0)
        .outerRadius(radius);

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

    const legend = mainContainer
        .append('div')
        .style('display', 'flex')
        .style('flex-direction', 'column')
        .style('gap', '5px')
        .style('max-width', '100%')
        .style('padding', '5px');

    chartData.forEach(d => {
        const legendItem = legend.append('div')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('gap', '8px')
            .style('cursor', 'pointer')
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

        legendItem.append('div')
            .style('width', '12px')
            .style('height', '12px')
            .style('background-color', color(d.reason))
            .style('border-radius', '2px')
            .style('flex-shrink', '0');

        legendItem.append('span')
            .style('font-size', '10px')
            .style('color', '#333')
            .style('line-height', '1.2')
            .text(`${d.reason} (${d.percentage}%)`);
    });
}

function updateCustomerCancellationChart(data) {
    const cancelledData = data.filter(d => 
        d.cancelledByCustomer && 
        d.customerCancelReason && 
        d.customerCancelReason.trim() !== '' &&
        d.customerCancelReason.toLowerCase() !== 'null'
    );

    const reasonCounts = d3.rollup(cancelledData, v => v.length, d => d.customerCancelReason);
    const total = Array.from(reasonCounts.values()).reduce((a, b) => a + b, 0);
    
    const chartData = Array.from(reasonCounts, ([reason, count]) => ({
        reason,
        count,
        percentage: (count / total * 100).toFixed(1)
    })).sort((a, b) => b.count - a.count);

    d3.select('#customer-cancellation-chart').selectAll('*').remove();

    if (chartData.length === 0) {
        d3.select('#customer-cancellation-chart')
            .append('div')
            .style('text-align', 'center')
            .style('padding', '50px')
            .style('color', '#999')
            .text('No customer cancellation data available');
        return;
    }

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

    const container = document.getElementById('customer-cancellation-chart');
    const containerWidth = container.clientWidth;
    const width = Math.min(containerWidth, 280);
    const height = 200;
    const radius = Math.min(width, height) / 2 - 20;

    const mainContainer = d3.select('#customer-cancellation-chart')
        .append('div')
        .style('display', 'flex')
        .style('flex-direction', 'column')
        .style('align-items', 'center')
        .style('justify-content', 'flex-start')
        .style('gap', '10px')
        .style('padding-top', '10px');

    const svg = mainContainer
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${width / 2},${height / 2})`);

    const color = d3.scaleOrdinal()
        .domain(chartData.map(d => d.reason))
        .range(['#ec4899', '#f43f5e', '#fb923c', '#fbbf24', '#a3a3a3', '#9ca3af']);

    const pie = d3.pie()
        .value(d => d.count)
        .sort(null);

    const arc = d3.arc()
        .innerRadius(0)
        .outerRadius(radius);

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

    const legend = mainContainer
        .append('div')
        .style('display', 'flex')
        .style('flex-direction', 'column')
        .style('gap', '5px')
        .style('max-width', '100%')
        .style('padding', '5px');

    chartData.forEach(d => {
        const legendItem = legend.append('div')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('gap', '8px')
            .style('cursor', 'pointer')
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

        legendItem.append('div')
            .style('width', '12px')
            .style('height', '12px')
            .style('background-color', color(d.reason))
            .style('border-radius', '2px')
            .style('flex-shrink', '0');

        legendItem.append('span')
            .style('font-size', '10px')
            .style('color', '#333')
            .style('line-height', '1.2')
            .text(`${d.reason} (${d.percentage}%)`);
    });
}