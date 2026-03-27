// Chart generation using QuickChart API
import fetch from 'node-fetch';

export async function getChartUrl(data: number[], labels: string[], title = 'Game Stats'): Promise<string> {
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
