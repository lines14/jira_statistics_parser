import DataUtils from './modules/main/utils/data/dataUtils.js';
import JSONLoader from './modules/main/utils/data/JSONLoader.js';
import ImageUtils from './modules/main/utils/image/imageUtils.js';

const generateDiagrams = async () => {
  const cyrillicSummary = DataUtils.setCyrillicNames(JSONLoader.summary, JSONLoader.config.cyrillicNames);
  const generator = new ImageUtils();

  const colors = [
      "rgba(75, 192, 192, 0.5)",
      "rgba(255, 206, 86, 0.5)",
      "rgba(255, 99, 132, 0.5)",
      "rgba(54, 162, 235, 0.5)",
      "rgba(153, 102, 255, 0.5)",
      "rgba(255, 159, 64, 0.5)",
      "rgba(199, 199, 199, 0.5)",
      "rgba(83, 102, 255, 0.5)",
      "rgba(153, 203, 255, 0.5)",
      "rgba(255, 102, 255, 0.5)"
    ];

  let diagramCount = 0;

  const diagramsData = [
    {
      title: 'Количество протестированных задач и багов по приоритетам',
      yLabel: 'Количество',
      xLabel: 'Приоритеты',
      data: DataUtils.extractPropertyByName(
        cyrillicSummary.priorities,
        'Количество протестированных задач',
        'Количество протестированных задач с багами',
        'Количество багов',
      ),
      options: { minimumDatalabelValue: 1 },
    },
    {
      title: 'Соотношение количества багов к количеству протестированных задач по приоритетам',
      yLabel: 'Процент',
      xLabel: 'Приоритеты',
      data: DataUtils.extractPropertyByName(
        cyrillicSummary.priorities,
        'Соотношение количества багов к количеству протестированных задач',
        'Соотношение количества багов к количеству протестированных задач с багами',
      ),
    },
    {
      title: 'Процент количества багов от общего числа багов по приоритетам',
      yLabel: 'Процент',
      xLabel: 'Приоритеты',
      data: DataUtils.extractPropertyByName(
        cyrillicSummary.priorities,
        'Процент количества багов от общего числа багов',
      ),
    },
    {
      title: 'Количество протестированных задач и багов по типам разработки',
      yLabel: 'Количество',
      xLabel: 'Типы разработки',
      data: DataUtils.extractPropertyByName(
        cyrillicSummary.devTypes,
        'Количество протестированных задач',
        'Количество протестированных задач с багами',
        'Количество багов',
      ),
      options: { minimumDatalabelValue: 1 },
    },
    {
      title: 'Соотношение количества багов к количеству протестированных задач по типам разработки',
      yLabel: 'Процент',
      xLabel: 'Типы разработки',
      data: DataUtils.extractPropertyByName(
        cyrillicSummary.devTypes,
        'Соотношение количества багов к количеству протестированных задач',
        'Соотношение количества багов к количеству протестированных задач с багами',
      ),
    },
    {
      title: 'Процент количества багов от общего числа багов по типам разработки',
      yLabel: 'Процент',
      xLabel: 'Типы разработки',
      data: DataUtils.extractPropertyByName(
        cyrillicSummary.devTypes,
        'Процент количества багов от общего числа багов',
      ),
    },

    {
      title: 'Количество протестированных задач и багов по типам задач',
      yLabel: 'Количество',
      xLabel: 'Типы задач',
      data: DataUtils.extractPropertyByName(
        cyrillicSummary.issueTypes,
        'Количество протестированных задач',
        'Количество протестированных задач с багами',
        'Количество багов',
      ),
      options: { minimumDatalabelValue: 1 },
    },
    {
      title: 'Соотношение количества багов к количеству протестированных задач по типам задач',
      yLabel: 'Процент',
      xLabel: 'Типы задач',
      data: DataUtils.extractPropertyByName(
        cyrillicSummary.issueTypes,
        'Соотношение количества багов к количеству протестированных задач',
        'Соотношение количества багов к количеству протестированных задач с багами',
      ),
    },
    {
      title: 'Процент количества багов от общего числа багов по типам задач',
      yLabel: 'Процент',
      xLabel: 'Типы задач',
      data: DataUtils.extractPropertyByName(
        cyrillicSummary.issueTypes,
        'Процент количества багов от общего числа багов',
      ),
    },


    {
      title: 'Количество протестированных задач и багов по проектам',
      yLabel: 'Количество',
      xLabel: 'Проекты',
      data: DataUtils.extractPropertyByName(
        cyrillicSummary.projects,
        'Количество протестированных задач',
        'Количество протестированных задач с багами',
        'Количество багов',
      ),
      options: { minimumDatalabelValue: 1 },
    },
    {
      title: 'Соотношение количества багов к количеству протестированных задач по проектам',
      yLabel: 'Процент',
      xLabel: 'Проекты',
      data: DataUtils.extractPropertyByName(
        cyrillicSummary.projects,
        'Соотношение количества багов к количеству протестированных задач',
        'Соотношение количества багов к количеству протестированных задач с багами',
      ),
    },
    {
      title: 'Процент количества багов от общего числа багов по проектам',
      yLabel: 'Процент',
      xLabel: 'Проекты',
      data: DataUtils.extractPropertyByName(
        cyrillicSummary.projects,
        'Процент количества багов от общего числа багов',
      ),
    },
  ];

  for (const diagram of diagramsData) {
    await generator.generateDiagram(
      diagram.title,
      diagram.yLabel,
      diagram.xLabel,
      diagram.data,
      diagram.options,
      colors,
    );
    diagramCount++;
  }
};

generateDiagrams();