import fs from 'fs';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import JSONLoader from '../data/JSONLoader.js';

class ImageUtils {
  static async generateDiagram(data) {
    const width = 800;
    const height = 600;
    const configuration = JSONLoader.diagramSchema;
    const keys = Object.keys(data);
    const values = Object.values(data);
    configuration.data.labels = keys;
    configuration.data.datasets[0].data = values;
    const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });
    const image = await chartJSNodeCanvas.renderToBuffer(configuration);
    fs.writeFileSync('artifacts/diagram.png', image);
  }
}

export default ImageUtils;
