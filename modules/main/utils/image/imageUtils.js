/* eslint no-restricted-syntax: ['off', 'ForInStatement'] */
import fs from 'fs';
import path from 'path';
import Chart from 'chart.js/auto';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import JSONLoader from '../data/JSONLoader.js';

Chart.register(ChartDataLabels);

class ImageUtils {
  constructor() {
    this.canvas = new ChartJSNodeCanvas(JSONLoader.config.canvas);
  }

  static createChartConfig(title, labels, datasets, axisLabels = {}) {
    const config = JSONLoader.diagramSchema;
    config.data.labels = labels;
    config.data.datasets = datasets;
    config.plugins = [ChartDataLabels];
    config.options.plugins.title.text = title;
    config.options.scales.x.title.text = axisLabels.xLabel;
    config.options.scales.y.title.text = axisLabels.yLabel;
    config.options.scales.x.title.display = !!axisLabels.xLabel;
    config.options.scales.y.title.display = !!axisLabels.yLabel;
    config.options.plugins.datalabels.formatter = (value) => value;
    return config;
  }

  async generateDiagram(
    title,
    yLabel,
    xLabel,
    summary,
    colors,
    outputSubFolder,
  ) {
    const summaryKeys = Object.keys(summary);
    const metricsSet = new Set();

    for (const values of Object.values(summary)) {
      Object.keys(values).forEach((key) => metricsSet.add(key));
    }

    const metrics = Array.from(metricsSet);
    const datasets = [];

    metrics.forEach((metric, index) => {
      const dataset = {
        label: metric,
        data: [],
        backgroundColor: colors[index % colors.length],
        borderColor: colors[index % colors.length].replace(/[\d.]+\)$/g, '1)'),
        borderWidth: 2,
      };

      for (const label of summaryKeys) {
        const value = summary[label]?.[metric];
        dataset.data.push(typeof value === 'number' ? value : 0);
      }

      datasets.push(dataset);
    });

    const config = ImageUtils.createChartConfig(title, summaryKeys, datasets, { xLabel, yLabel });
    const buffer = await this.canvas.renderToBuffer(config);
    const folderPath = path.join('images', outputSubFolder ?? '');
    fs.mkdirSync(folderPath, { recursive: true });
    const filepath = path.join(folderPath, `${title}.png`);
    fs.writeFileSync(filepath, buffer);
  }
}

export default new ImageUtils();
