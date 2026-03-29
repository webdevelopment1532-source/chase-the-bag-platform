"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getChartUrl = getChartUrl;
async function getChartUrl(data, labels, title = 'Game Stats') {
    const chartConfig = {
        type: 'bar',
        data: {
            labels,
            datasets: [{ label: title, data }]
        }
    };
    const url = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}`;
    return url;
}
