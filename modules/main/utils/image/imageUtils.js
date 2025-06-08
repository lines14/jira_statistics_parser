import fs from 'fs';
import path from 'path';
import Chart from 'chart.js/auto';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import JSONLoader from '../data/JSONLoader.js';

Chart.register(ChartDataLabels);

export default class ImageUtils {
  constructor(
    width = JSONLoader.config.diagramConfig.width,
    height = JSONLoader.config.diagramConfig.height
  ) {
    this.canvas = new ChartJSNodeCanvas({
      width,
      height,
      backgroundColour: 'white', // white background
    });
  }

  static createChartConfig(title, labels, datasets, options = {}) {
    return {
      type: 'bar',
      data: {
        labels,
        datasets,
      },
      options: {
        responsive: false,
        animation: false,
        plugins: {
          title: {
            display: true,
            text: title,
            color: '#000',
          },
          datalabels: {
            anchor: 'end',
            align: 'top',
            formatter: (value) => value,
            display: true,
            color: '#000',
          },
          legend: {
            display: true,
            position: 'bottom', // ⬅️ Move legend to bottom
            labels: {
              color: '#000', // optional: label text color
            },
          },
        },
        scales: {
          x: {
            title: {
              display: !!options.xLabel,
              text: options.xLabel,
              color: '#000',
            },
            ticks: {
              color: '#000',
            },
          },
          y: {
            beginAtZero: true,
            title: {
              display: !!options.yLabel,
              text: options.yLabel,
              color: '#000',
            },
            ticks: {
              color: '#000',
            },
          },
        },
      },
      plugins: [ChartDataLabels],
    };
  }

  async generateDiagram(
    title,
    yLabel,
    xLabel,
    summary,
    options = {},
    colors
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

    const config = ImageUtils.createChartConfig(title, summaryKeys, datasets, {
      xLabel,
      yLabel,
    });

    const buffer = await this.canvas.renderToBuffer(config);
    const filepath = path.join('images', `${title}.png`);
    fs.writeFileSync(filepath, buffer);
  }
}