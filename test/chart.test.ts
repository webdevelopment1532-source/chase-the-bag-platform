import { getChartUrl } from '../src/chart';

describe('getChartUrl', () => {
  test('returns a URL containing quickchart.io', async () => {
    const url = await getChartUrl([1, 2, 3], ['a', 'b', 'c'], 'Test Chart');
    expect(url).toContain('quickchart.io/chart?c=');
  });

  test('uses default title "Game Stats" when not provided', async () => {
    const url = await getChartUrl([10, 20], ['x', 'y']);
    expect(decodeURIComponent(url)).toContain('Game Stats');
  });

  test('encodes chart data labels in URL', async () => {
    const url = await getChartUrl([5], ['Alice']);
    expect(decodeURIComponent(url)).toContain('Alice');
  });

  test('encodes data values in URL', async () => {
    const url = await getChartUrl([42], ['user']);
    expect(decodeURIComponent(url)).toContain('42');
  });

  test('uses bar chart type', async () => {
    const url = await getChartUrl([1], ['u']);
    expect(decodeURIComponent(url)).toContain('"type":"bar"');
  });
});
