import fs from 'fs';
import JSONLoader from '../data/JSONLoader.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { Chart, BarElement, CategoryScale, LinearScale } from 'chart.js';

Chart.register(BarElement, CategoryScale, LinearScale, ChartDataLabels);

class ImageUtils {
  static async generateDiagram(mainTitle, verticalTitle, horizontalTitle, summary, options = { minimumDatalabelValue: 0 }) {
    const chartJSNodeCanvas = new ChartJSNodeCanvas(JSONLoader.config.diagramConfig);
    const colors = JSONLoader.config.diagramColors;

    const summaryKeys = Object.keys(summary);
    const metricsSet = new Set();

    for (const values of Object.values(summary)) {
      Object.keys(values).forEach((key) => metricsSet.add(key));
    }

    const metrics = Array.from(metricsSet);
    const data = {
      labels: summaryKeys,
      datasets: [],
    };

    metrics.forEach((metric, index) => {
      const dataset = {
        label: metric,
        data: [],
        backgroundColor: colors[index % colors.length],
        borderColor: colors[index % colors.length].replace('0.5', '1'),
        borderWidth: 2,
      };

      for (const label of summaryKeys) {
        const value = summary[label][metric];
        dataset.data.push(typeof value === 'number' ? value : 0);
      }

      data.datasets.push(dataset);
    });

    const configuration = JSONLoader.diagramSchema;
    configuration.data = data;
    configuration.plugins = [ChartDataLabels],
    configuration.options.plugins.title.text = mainTitle;
    configuration.options.scales.y.title.text = verticalTitle;
    configuration.options.scales.x.title.text = horizontalTitle;
    configuration.options.plugins.datalabels.formatter = (value) => value >= options.minimumDatalabelValue ? `${value}` : null;

    const image = await chartJSNodeCanvas.renderToBuffer(configuration);
    fs.writeFileSync(`artifacts/${mainTitle}.png`, image);
  }
}

export default ImageUtils;