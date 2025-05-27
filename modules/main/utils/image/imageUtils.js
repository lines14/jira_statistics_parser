import fs from 'fs';
import JSONLoader from '../data/JSONLoader.js';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';

class ImageUtils {
    static async generateDiagram(data) {
        console.log(data)
        const width = 800;
        const height = 600;
        const configuration = JSONLoader.diagramSchema;
        const keys = Object.keys(data);
        const values = Object.values(data);
        configuration.data.labels = keys;
        configuration.data.datasets[0].data = values;
        const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });
        const image = await ChartJSNodeCanvas.renderToBuffer(configuration);
        fs.writeFileSync('artifacts/diagram.png', image);
    }
}

export default ImageUtils;