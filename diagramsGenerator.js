/* eslint no-restricted-syntax: ['off', 'ForInStatement'] */
import DataUtils from './modules/main/utils/data/dataUtils.js';
import JSONLoader from './modules/main/utils/data/JSONLoader.js';
import imageUtils from './modules/main/utils/image/imageUtils.js';

const generateDiagrams = async () => {
  const cyrillicSummary = DataUtils.setCyrillicNames(
    JSONLoader.summary,
    JSONLoader.config.cyrillicNames,
  );

  const colors = JSONLoader.config.diagramColors;
  const diagramsData = [
    {
      title: 'Общее количество протестированных задач и багов',
      yLabel: 'Количество',
      data: DataUtils.extractPropertyByName(
        cyrillicSummary,
        'Количество протестированных задач',
        'Количество протестированных задач с багами',
        'Общее количество багов',
        'Количество задач',
        'Количество всех не назначенных на разработчиков задач',
        'Количество всех не назначенных на QA задач',
      ),
    },
    {
      title: 'Общее соотношение количества багов к количеству протестированных задач',
      yLabel: 'Процент',
      data: DataUtils.extractPropertyByName(
        cyrillicSummary,
        'Соотношение количества багов к количеству протестированных задач',
        'Соотношение количества багов к количеству протестированных задач с багами',
        'Соотношение количества всех не назначенных на разработчиков задач к количеству всех задач',
        'Соотношение количества всех не назначенных на QA задач к количеству всех задач',
      ),
    },
    {
      title: 'Количество протестированных задач и багов по приоритетам',
      yLabel: 'Количество',
      xLabel: 'Приоритеты',
      data: DataUtils.extractPropertyByName(
        cyrillicSummary.priorities,
        'Количество протестированных задач',
        'Количество протестированных задач с багами',
        'Количество багов',
        'Количество задач',
      ),
      outputSubFolder: 'priorities',
    },
    {
      title: 'Соотношение количества багов к количеству протестированных задач по приоритетам',
      yLabel: 'Процент',
      xLabel: 'Приоритеты',
      data: DataUtils.extractPropertyByName(
        cyrillicSummary.priorities,
        'Соотношение количества протестированных задач к количеству всех задач',
        'Соотношение количества багов к количеству протестированных задач',
        'Соотношение количества багов к количеству протестированных задач с багами',
      ),
      outputSubFolder: 'priorities',
    },
    {
      title: 'Процент количества багов от общего числа багов по приоритетам',
      yLabel: 'Процент',
      xLabel: 'Приоритеты',
      data: DataUtils.extractPropertyByName(
        cyrillicSummary.priorities,
        'Процент количества багов от общего числа багов',
      ),
      outputSubFolder: 'priorities',
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
        'Количество задач',
      ),
      outputSubFolder: 'devTypes',
    },
    {
      title: 'Соотношение количества багов к количеству протестированных задач по типам разработки',
      yLabel: 'Процент',
      xLabel: 'Типы разработки',
      data: DataUtils.extractPropertyByName(
        cyrillicSummary.devTypes,
        'Соотношение количества протестированных задач к количеству всех задач',
        'Соотношение количества багов к количеству протестированных задач',
        'Соотношение количества багов к количеству протестированных задач с багами',
      ),
      outputSubFolder: 'devTypes',
    },
    {
      title: 'Процент количества багов от общего числа багов по типам разработки',
      yLabel: 'Процент',
      xLabel: 'Типы разработки',
      data: DataUtils.extractPropertyByName(
        cyrillicSummary.devTypes,
        'Процент количества багов от общего числа багов',
      ),
      outputSubFolder: 'devTypes',
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
        'Количество задач',
      ),
      outputSubFolder: 'issueTypes',
    },
    {
      title: 'Соотношение количества багов к количеству протестированных задач по типам задач',
      yLabel: 'Процент',
      xLabel: 'Типы задач',
      data: DataUtils.extractPropertyByName(
        cyrillicSummary.issueTypes,
        'Соотношение количества протестированных задач к количеству всех задач',
        'Соотношение количества багов к количеству протестированных задач',
        'Соотношение количества багов к количеству протестированных задач с багами',
      ),
      outputSubFolder: 'issueTypes',
    },
    {
      title: 'Процент количества багов от общего числа багов по типам задач',
      yLabel: 'Процент',
      xLabel: 'Типы задач',
      data: DataUtils.extractPropertyByName(
        cyrillicSummary.issueTypes,
        'Процент количества багов от общего числа багов',
      ),
      outputSubFolder: 'issueTypes',
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
        'Количество задач',
      ),
      outputSubFolder: 'projects',
    },
    {
      title: 'Соотношение количества багов к количеству протестированных задач по проектам',
      yLabel: 'Процент',
      xLabel: 'Проекты',
      data: DataUtils.extractPropertyByName(
        cyrillicSummary.projects,
        'Соотношение количества протестированных задач к количеству всех задач',
        'Соотношение количества багов к количеству протестированных задач',
        'Соотношение количества багов к количеству протестированных задач с багами',
      ),
      outputSubFolder: 'projects',
    },
    {
      title: 'Процент количества багов от общего числа багов по проектам',
      yLabel: 'Процент',
      xLabel: 'Проекты',
      data: DataUtils.extractPropertyByName(
        cyrillicSummary.projects,
        'Процент количества багов от общего числа багов',
      ),
      outputSubFolder: 'projects',
    },
    {
      title: 'Количество всех протестированных задач и багов сотрудников (QA)',
      yLabel: 'Количество',
      xLabel: 'QA',
      data: DataUtils.extractPropertyByName(
        cyrillicSummary.reporters,
        'Количество всех протестированных задач сотрудника',
        'Количество всех протестированных задач сотрудника с багами',
        'Количество всех багов сотрудника',
      ),
      outputSubFolder: 'QA',
    },
    {
      title: 'Соотношение количества всех багов сотрудников к количеству протестированных задач сотрудников (QA)',
      yLabel: 'Процент',
      xLabel: 'QA',
      data: DataUtils.extractPropertyByName(
        cyrillicSummary.reporters,
        'Соотношение количества всех багов сотрудника к количеству всех протестированных задач сотрудника',
        'Соотношение количества всех багов сотрудника к количеству всех протестированных задач сотрудника с багами',
      ),
      outputSubFolder: 'QA',
    },
    {
      title: 'Процент количества всех багов сотрудников от общего числа багов (QA)',
      yLabel: 'Процент',
      xLabel: 'QA',
      data: DataUtils.extractPropertyByName(
        cyrillicSummary.reporters,
        'Процент количества всех багов сотрудника от общего числа багов',
      ),
      outputSubFolder: 'QA',
    },
    {
      title: 'Среднее соотношение количества багов к количеству протестированных задач по проектам (QA)',
      yLabel: 'Процент',
      xLabel: 'QA',
      data: DataUtils.extractPropertyByName(
        cyrillicSummary.reporters,
        'Среднее соотношение количества багов к количеству протестированных задач по проектам',
        'Среднее соотношение количества багов к количеству протестированных задач с багами по проектам',
      ),
      outputSubFolder: 'QA',
    },
    {
      title: 'Количество всех задач и багов сотрудников (developers)',
      yLabel: 'Количество',
      xLabel: 'developers',
      data: DataUtils.extractPropertyByName(
        cyrillicSummary.developers,
        'Количество всех протестированных задач сотрудника',
        'Количество всех протестированных задач сотрудника с багами',
        'Количество всех багов сотрудника',
        'Количество всех задач сотрудника',
      ),
      outputSubFolder: 'developers',
    },
    {
      title: 'Соотношения количества всех багов и всех задач сотрудников (developers)',
      yLabel: 'Процент',
      xLabel: 'developers',
      data: DataUtils.extractPropertyByName(
        cyrillicSummary.developers,
        'Соотношение количества всех протестированных задач сотрудника к количеству всех задач сотрудника',
        'Соотношение количества всех багов сотрудника к количеству всех протестированных задач сотрудника',
        'Соотношение количества всех багов сотрудника к количеству всех протестированных задач сотрудника с багами',
      ),
      outputSubFolder: 'developers',
    },
    {
      title: 'Процент количества всех багов сотрудников от общего числа багов (developers)',
      yLabel: 'Процент',
      xLabel: 'developers',
      data: DataUtils.extractPropertyByName(
        cyrillicSummary.developers,
        'Процент количества всех багов сотрудника от общего числа багов',
      ),
      outputSubFolder: 'developers',
    },
    {
      title: 'Среднее соотношение количества багов к количеству протестированных задач по проектам (developers)',
      yLabel: 'Процент',
      xLabel: 'developers',
      data: DataUtils.extractPropertyByName(
        cyrillicSummary.developers,
        'Среднее соотношение количества багов к количеству протестированных задач по проектам',
        'Среднее соотношение количества багов к количеству протестированных задач с багами по проектам',
      ),
      outputSubFolder: 'developers',
    },
  ];

  for (const [key, value] of Object.entries(cyrillicSummary.reporters)) {
    const reporterDiagramsData = [
      {
        title: `Количество протестированных задач и багов (${key})`,
        yLabel: 'Количество',
        xLabel: 'Проекты',
        data: DataUtils.extractPropertyByName(
          value.projects,
          'Количество протестированных задач',
          'Количество протестированных задач с багами',
          'Количество багов',
          'Количество задач',
        ),
        outputSubFolder: 'QA/count',
      },
      {
        title: `Соотношение количества багов к количеству протестированных задач (${key})`,
        yLabel: 'Процент',
        xLabel: 'Проекты',
        data: DataUtils.extractPropertyByName(
          value.projects,
          'Соотношение количества протестированных задач к количеству всех задач',
          'Соотношение количества багов к количеству протестированных задач',
          'Соотношение количества багов к количеству протестированных задач с багами',
        ),
        outputSubFolder: 'QA/ratio',
      },
      {
        title: `Процент количества багов от общего числа багов (${key})`,
        yLabel: 'Процент',
        xLabel: 'Проекты',
        data: DataUtils.extractPropertyByName(
          value.projects,
          'Процент количества багов от общего числа багов',
        ),
        outputSubFolder: 'QA/percent',
      },
    ];

    diagramsData.push(...reporterDiagramsData);
  }

  for (const [key, value] of Object.entries(cyrillicSummary.developers)) {
    const developerDiagramsData = [
      {
        title: `Количество протестированных задач и багов (${key})`,
        yLabel: 'Количество',
        xLabel: 'Проекты',
        data: DataUtils.extractPropertyByName(
          value.projects,
          'Количество протестированных задач',
          'Количество протестированных задач с багами',
          'Количество багов',
          'Количество задач',
        ),
        outputSubFolder: 'developers/count',
      },
      {
        title: `Соотношение количества багов к количеству протестированных задач (${key})`,
        yLabel: 'Процент',
        xLabel: 'Проекты',
        data: DataUtils.extractPropertyByName(
          value.projects,
          'Соотношение количества протестированных задач к количеству всех задач',
          'Соотношение количества багов к количеству протестированных задач',
          'Соотношение количества багов к количеству протестированных задач с багами',
        ),
        outputSubFolder: 'developers/ratio',
      },
      {
        title: `Процент количества багов от общего числа багов (${key})`,
        yLabel: 'Процент',
        xLabel: 'Проекты',
        data: DataUtils.extractPropertyByName(
          value.projects,
          'Процент количества багов от общего числа багов',
        ),
        outputSubFolder: 'developers/percent',
      },
    ];

    diagramsData.push(...developerDiagramsData);
  }

  for (const [key, value] of Object.entries(cyrillicSummary.projectReporters)) {
    const reporterDiagramsData = [
      {
        title: `Количество протестированных задач и багов (reporters in ${key})`,
        yLabel: 'Количество',
        xLabel: 'QA',
        data: DataUtils.extractPropertyByName(
          value.assignees,
          'Количество протестированных задач',
          'Количество протестированных задач с багами',
          'Количество багов',
          'Количество задач',
        ),
        outputSubFolder: 'projects/count',
      },
      {
        title: `Соотношение количества багов к количеству протестированных задач (reporters in ${key})`,
        yLabel: 'Процент',
        xLabel: 'QA',
        data: DataUtils.extractPropertyByName(
          value.assignees,
          'Соотношение количества протестированных задач к количеству всех задач',
          'Соотношение количества багов к количеству протестированных задач',
          'Соотношение количества багов к количеству протестированных задач с багами',
        ),
        outputSubFolder: 'projects/ratio',
      },
      {
        title: `Процент количества багов от общего числа багов (reporters in ${key})`,
        yLabel: 'Процент',
        xLabel: 'QA',
        data: DataUtils.extractPropertyByName(
          value.assignees,
          'Процент количества багов от общего числа багов',
        ),
        outputSubFolder: 'projects/percent',
      },
    ];

    diagramsData.push(...reporterDiagramsData);
  }

  for (const [key, value] of Object.entries(cyrillicSummary.projectDevelopers)) {
    const developerDiagramsData = [
      {
        title: `Количество протестированных задач и багов (developers in ${key})`,
        yLabel: 'Количество',
        xLabel: 'developers',
        data: DataUtils.extractPropertyByName(
          value.assignees,
          'Количество протестированных задач',
          'Количество протестированных задач с багами',
          'Количество багов',
          'Количество задач',
        ),
        outputSubFolder: 'projects/count',
      },
      {
        title: `Соотношение количества багов к количеству протестированных задач (developers in ${key})`,
        yLabel: 'Процент',
        xLabel: 'developers',
        data: DataUtils.extractPropertyByName(
          value.assignees,
          'Соотношение количества протестированных задач к количеству всех задач',
          'Соотношение количества багов к количеству протестированных задач',
          'Соотношение количества багов к количеству протестированных задач с багами',
        ),
        outputSubFolder: 'projects/ratio',
      },
      {
        title: `Процент количества багов от общего числа багов (developers in ${key})`,
        yLabel: 'Процент',
        xLabel: 'developers',
        data: DataUtils.extractPropertyByName(
          value.assignees,
          'Процент количества багов от общего числа багов',
        ),
        outputSubFolder: 'projects/percent',
      },
    ];

    diagramsData.push(...developerDiagramsData);
  }

  for (const diagram of diagramsData) {
    await imageUtils.generateDiagram( // eslint-disable-line no-await-in-loop
      `${diagram.title} c ${cyrillicSummary.issuesCreatedFrom} по ${cyrillicSummary.issuesCreatedTo}`,
      diagram.yLabel,
      diagram.xLabel,
      diagram.data,
      colors,
      diagram.outputSubFolder,
    );
  }
};

generateDiagrams();
