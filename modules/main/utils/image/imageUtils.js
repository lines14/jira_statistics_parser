/* eslint no-restricted-syntax: ['off', 'ForInStatement'] */
import fs from 'fs';
import path from 'path';
import Chart from 'chart.js/auto';
import JSONLoader from '../data/JSONLoader.js';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import ChartDataLabels from 'chartjs-plugin-datalabels';

Chart.register(ChartDataLabels);

export default class ImageUtils {
  constructor(
    width = JSONLoader.config.diagramConfig.width, 
    height = JSONLoader.config.diagramConfig.height
  ) {
    this.canvas = new ChartJSNodeCanvas({ width, height, backgroundColour: 'white' });
  }

  static createChartConfig(title, labels, datasetLabel, data, color) {
    return {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: datasetLabel,
          data,
          backgroundColor: color,
          borderColor: color.replace('0.5', '1'),
          borderWidth: 1,
        }],
      },
      options: {
        responsive: false,
        animation: false,
        plugins: {
          title: {
            display: true,
            text: title,
          },
          datalabels: {
            anchor: 'end',
            align: 'top',
            formatter: (value) => value,
            display: true,
            color: '#000',
          },
        },
        scales: {
          y: { beginAtZero: true },
        },
      },
      plugins: [ChartDataLabels],
    };
  }

  async generateDiagram(title, yLabel, xLabel, summary, options = {}, color = 'rgba(75, 192, 192, 0.5)') {
    const labels = Object.keys(summary);
    const firstRow = summary[labels[0]];
    const metrics = Object.keys(firstRow);

    for (const metric of metrics) {
      const data = labels.map(label => summary[label][metric] ?? 0);
      const config = ImageUtils.createChartConfig(title, labels, metric, data, color);
      const buffer = await this.canvas.renderToBuffer(config);
      const filepath = path.join('images', `${title}.png`);
      fs.writeFileSync(filepath, buffer);
    }
  }
}

// import fs from 'fs';
// import ChartDataLabels from 'chartjs-plugin-datalabels';
// import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
// import {
//   Chart, BarElement, CategoryScale, LinearScale,
// } from 'chart.js';
// import JSONLoader from '../data/JSONLoader.js';

// Chart.register(BarElement, CategoryScale, LinearScale, ChartDataLabels);

// class ImageUtils {
//   static async generateDiagram(
//     mainTitle,
//     verticalTitle,
//     horizontalTitle,
//     summary,
//     options = { minimumDatalabelValue: 0 },
//   ) {
//     const chartJSNodeCanvas = new ChartJSNodeCanvas(JSONLoader.config.diagramConfig);
//     const colors = JSONLoader.config.diagramColors;

//     const summaryKeys = Object.keys(summary);
//     const metricsSet = new Set();

//     for (const values of Object.values(summary)) {
//       Object.keys(values).forEach((key) => metricsSet.add(key));
//     }

//     const metrics = Array.from(metricsSet);
//     const data = {
//       labels: summaryKeys,
//       datasets: [],
//     };

//     metrics.forEach((metric, index) => {
//       const dataset = {
//         label: metric,
//         data: [],
//         backgroundColor: colors[index % colors.length],
//         borderColor: colors[index % colors.length].replace('0.5', '1'),
//         borderWidth: 2,
//       };

//       for (const label of summaryKeys) {
//         const value = summary[label][metric];
//         dataset.data.push(typeof value === 'number' ? value : 0);
//       }

//       data.datasets.push(dataset);
//     });

//     const configuration = JSONLoader.diagramSchema;
//     configuration.data = data;
//     configuration.plugins = [ChartDataLabels];
//     configuration.options.plugins.title.text = mainTitle;
//     configuration.options.scales.y.title.text = verticalTitle;
//     configuration.options.scales.x.title.text = horizontalTitle;
//     configuration.options.plugins.datalabels.formatter = (value) => (value >= options.minimumDatalabelValue ? `${value}` : null);

//     const image = await chartJSNodeCanvas.renderToBuffer(configuration);
//     fs.writeFileSync(`artifacts/${mainTitle}.png`, image);
//   }
// }

// export default ImageUtils;