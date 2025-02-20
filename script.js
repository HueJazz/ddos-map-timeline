document.addEventListener("DOMContentLoaded", async function () {
    let response = await fetch('requests_map.json');
    let rawData = await response.json();

    let responseSpheres = await fetch('sorted.json');
    let rawDataSpheres = await responseSpheres.json();

    let startDate = new Date('2024-10-01');
    let endDate = new Date('2025-02-15');
    let intervalDays = 3;
    let timePeriods = [];
    let accumulatedCounts = {};

    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
        let periodStart = new Date(currentDate);
        let periodEnd = new Date(currentDate);
        periodEnd.setDate(periodEnd.getDate() + intervalDays - 1);
        if (periodEnd > endDate) periodEnd = new Date(endDate);

        timePeriods.push({
            label: `${periodStart.toISOString().split('T')[0]} - ${periodEnd.toISOString().split('T')[0]}`,
            start: periodStart,
            end: periodEnd
        });

        currentDate.setDate(currentDate.getDate() + intervalDays);
    }

    const europeanCountries = [
        "Albania", "Andorra", "Armenia", "Austria", "Azerbaijan", "Belarus", "Belgium", "Bosnia and Herzegovina", "Bulgaria", "Croatia",
        "Cyprus", "Czech Rep.", "Denmark", "Estonia", "Bosnia and Herz.", "Macedonia", "Finland", "France", "Georgia", "Germany", "Greece", "Hungary",
        "Iceland", "Ireland", "Italy", "Kosovo", "Latvia", "Liechtenstein", "Lithuania", "Luxembourg", "Malta",
        "Moldova", "Monaco", "Montenegro", "Netherlands", "North Macedonia", "Norway", "Poland", "Portugal", "Romania",
        "San Marino", "Serbia", "Slovakia", "Slovenia", "Spain", "Sweden", "Switzerland", "Ukraine", "United Kingdom"
    ];

    const sphereIcons = {
        "gov": "gov_icon.png",
        "logistics": "logistics_icon.png",
        "commercial": "commercial_icon.png",
        "provider": "provider_icon.png",
        "bank": "bank_icon.png"
    };

    function getSpheresForCountry(country, currentEndDate) {
        let sphereCounts = {};

        for (let date in rawDataSpheres) {
            let currentDate = new Date(date);
            if (currentDate <= currentEndDate) {
                let regions = rawDataSpheres[date].regions;
                if (regions[country]) {
                    regions[country].forEach(sphere => {
                        sphereCounts[sphere] = (sphereCounts[sphere] || 0) + 1;
                    });
                }
            }
        }

        return Object.entries(sphereCounts).map(([sphere, count]) => ({ icon: sphereIcons[sphere], count }));
    }

    function getDataForPeriod(start, end) {
        let periodCounts = {};

        for (let date in rawData) {
            let currentDate = new Date(date);
            if (currentDate >= start && currentDate <= end) {
                rawData[date].regions.forEach(country => {
                    if (europeanCountries.includes(country)) {
                        periodCounts[country] = (periodCounts[country] || 0) + 1;
                    }
                });
            }
        }

        europeanCountries.forEach(country => {
            if (!periodCounts[country]) {
                periodCounts[country] = 0;
            }
        });

        Object.keys(periodCounts).forEach(country => {
            accumulatedCounts[country] = (accumulatedCounts[country] || 0) + periodCounts[country];
        });

        console.log(`Period: ${start.toISOString().split('T')[0]} - ${end.toISOString().split('T')[0]}`, accumulatedCounts);

        return Object.entries(accumulatedCounts).map(([name, value]) => {
            let sphereImages = getSpheresForCountry(name, end);
            return {
                name,
                value,
                label: {
                    show: value > 0,
                    formatter: params => {
                        let imagesMarkup = sphereImages.map(({ icon, count }, index) => `{img${index}|}`).join(' ');
                        return `${params.name}\n${imagesMarkup}`;
                    },
                    fontSize: value > 350 ? 13 : 12,
                    fontFamily: 'Arial, sans-serif',
                    color: '#333',
                    rich: sphereImages.reduce((acc, { icon, count }, index) => {
                        acc[`img${index}`] = {
                            backgroundColor: {
                                image: icon
                            },
                            height: 14 + count * 0.41,
                            width: 14 + count * 0.41,
                            align: 'center'
                        };
                        return acc;
                    }, {})
                }
            };
        });
    }

    let options = timePeriods.map((period, index) => ({
        series: [{
            type: 'map',
            map: 'world',
            roam: true,
            zoom: 5,
            center: [10, 52],
            label: { show: false },
            data: getDataForPeriod(period.start, period.end),
            itemStyle: {
                areaColor: '#cccccc',
                borderColor: '#999999'
            },
            emphasis: {
                itemStyle: {
                    areaColor: '#ffcc00'
                }
            },
        }],
    }));

    let maxVal = Math.max(...options.flatMap(o => o.series[0].data.map(d => d.value)), 1);

    var chart = echarts.init(document.getElementById('main'));

    var option = {
        baseOption: {
            timeline: {
                axisType: 'category',
                data: timePeriods.map(p => p.label),
                autoPlay: true,
                playInterval: 500,
                controlPosition: 'left',
                label: {
                    fontSize: 12,
                    fontFamily: 'Helvetica, sans-serif'
                }
            },
            tooltip: {
                trigger: 'item',
                formatter: '{b}: {c}',
                textStyle: {
                    fontFamily: 'Helvetica, sans-serif',
                    fontSize: 12
                }
            },
            visualMap: {
                min: 0,
                max: maxVal,
                left: 'left',
                top: 'bottom',
                text: ['High', 'Low'],
                calculable: true,
                inRange: {
                    color: ['#FFEE82', '#E90B0B', "#8B0000"]
                }
            },
            series: []
        },
        options: options
    };

    chart.setOption(option);
});
