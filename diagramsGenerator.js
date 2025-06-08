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
    // {
    //   title: 'Общее количество протестированных задач и багов',
    //   yLabel: 'Количество',
    //   data: DataUtils.extractPropertyByName(
    //     cyrillicSummary,
    //     'Количество протестированных задач',
    //     'Количество протестированных задач с багами',
    //     'Общее количество багов',
    //     'Количество задач',
    //   ),
    // },
    // {
    //   title: 'Общее соотношение количества багов к количеству протестированных задач',
    //   yLabel: 'Процент',
    //   data: DataUtils.extractPropertyByName(
    //     cyrillicSummary,
    //     'Соотношение количества багов к количеству протестированных задач',
    //     'Соотношение количества багов к количеству протестированных задач с багами',
    //   ),
    // },
    // {
    //   title: 'Количество протестированных задач и багов по приоритетам',
    //   yLabel: 'Количество',
    //   xLabel: 'Приоритеты',
    //   data: DataUtils.extractPropertyByName(
    //     cyrillicSummary.priorities,
    //     'Количество протестированных задач',
    //     'Количество протестированных задач с багами',
    //     'Количество багов',
    //   ),
    // },
    // {
    //   title: 'Соотношение количества багов к количеству протестированных задач по приоритетам',
    //   yLabel: 'Процент',
    //   xLabel: 'Приоритеты',
    //   data: DataUtils.extractPropertyByName(
    //     cyrillicSummary.priorities,
    //     'Соотношение количества багов к количеству протестированных задач',
    //     'Соотношение количества багов к количеству протестированных задач с багами',
    //   ),
    // },
    // {
    //   title: 'Процент количества багов от общего числа багов по приоритетам',
    //   yLabel: 'Процент',
    //   xLabel: 'Приоритеты',
    //   data: DataUtils.extractPropertyByName(
    //     cyrillicSummary.priorities,
    //     'Процент количества багов от общего числа багов',
    //   ),
    // },
    // {
    //   title: 'Количество протестированных задач и багов по типам разработки',
    //   yLabel: 'Количество',
    //   xLabel: 'Типы разработки',
    //   data: DataUtils.extractPropertyByName(
    //     cyrillicSummary.devTypes,
    //     'Количество протестированных задач',
    //     'Количество протестированных задач с багами',
    //     'Количество багов',
    //   ),
    // },
    // {
    //   title: 'Соотношение количества багов к количеству протестированных задач по типам разработки',
    //   yLabel: 'Процент',
    //   xLabel: 'Типы разработки',
    //   data: DataUtils.extractPropertyByName(
    //     cyrillicSummary.devTypes,
    //     'Соотношение количества багов к количеству протестированных задач',
    //     'Соотношение количества багов к количеству протестированных задач с багами',
    //   ),
    // },
    // {
    //   title: 'Процент количества багов от общего числа багов по типам разработки',
    //   yLabel: 'Процент',
    //   xLabel: 'Типы разработки',
    //   data: DataUtils.extractPropertyByName(
    //     cyrillicSummary.devTypes,
    //     'Процент количества багов от общего числа багов',
    //   ),
    // },
    // {
    //   title: 'Количество протестированных задач и багов по типам задач',
    //   yLabel: 'Количество',
    //   xLabel: 'Типы задач',
    //   data: DataUtils.extractPropertyByName(
    //     cyrillicSummary.issueTypes,
    //     'Количество протестированных задач',
    //     'Количество протестированных задач с багами',
    //     'Количество багов',
    //   ),
    // },
    // {
    //   title: 'Соотношение количества багов к количеству протестированных задач по типам задач',
    //   yLabel: 'Процент',
    //   xLabel: 'Типы задач',
    //   data: DataUtils.extractPropertyByName(
    //     cyrillicSummary.issueTypes,
    //     'Соотношение количества багов к количеству протестированных задач',
    //     'Соотношение количества багов к количеству протестированных задач с багами',
    //   ),
    // },
    // {
    //   title: 'Процент количества багов от общего числа багов по типам задач',
    //   yLabel: 'Процент',
    //   xLabel: 'Типы задач',
    //   data: DataUtils.extractPropertyByName(
    //     cyrillicSummary.issueTypes,
    //     'Процент количества багов от общего числа багов',
    //   ),
    // },
    // {
    //   title: 'Количество протестированных задач и багов по проектам',
    //   yLabel: 'Количество',
    //   xLabel: 'Проекты',
    //   data: DataUtils.extractPropertyByName(
    //     cyrillicSummary.projects,
    //     'Количество протестированных задач',
    //     'Количество протестированных задач с багами',
    //     'Количество багов',
    //   ),
    // },
    // {
    //   title: 'Соотношение количества багов к количеству протестированных задач по проектам',
    //   yLabel: 'Процент',
    //   xLabel: 'Проекты',
    //   data: DataUtils.extractPropertyByName(
    //     cyrillicSummary.projects,
    //     'Соотношение количества багов к количеству протестированных задач',
    //     'Соотношение количества багов к количеству протестированных задач с багами',
    //   ),
    // },
    // {
    //   title: 'Процент количества багов от общего числа багов по проектам',
    //   yLabel: 'Процент',
    //   xLabel: 'Проекты',
    //   data: DataUtils.extractPropertyByName(
    //     cyrillicSummary.projects,
    //     'Процент количества багов от общего числа багов',
    //   ),
    // },
    {
      title: 'Количество всех протестированных задач и багов сотрудника (QA)',
      yLabel: 'Количество',
      xLabel: 'QA',
      data: DataUtils.extractPropertyByName(
        cyrillicSummary.reporters,
        'Количество всех протестированных задач сотрудника',
        'Количество всех протестированных задач сотрудника с багами',
        'Количество всех багов сотрудника'
      ),
    },
    {
      title: 'Соотношение количества всех багов сотрудника к количеству протестированных задач сотрудника (QA)',
      yLabel: 'Процент',
      xLabel: 'QA',
      data: DataUtils.extractPropertyByName(
        cyrillicSummary.reporters,
        'Соотношение количества всех багов сотрудника к количеству всех протестированных задач сотрудника',
        'Соотношение количества всех багов сотрудника к количеству всех протестированных задач сотрудника с багами'
      ),
    },
    {
      title: 'Процент количества всех багов сотрудника от общего числа багов (QA)',
      yLabel: 'Процент',
      xLabel: 'QA',
      data: DataUtils.extractPropertyByName(
        cyrillicSummary.reporters,
        'Процент количества всех багов сотрудника от общего числа багов'
      ),
    },
    {
      title: 'Среднее соотношение количества багов к количеству протестированных задач по проектам (QA)',
      yLabel: 'Процент',
      xLabel: 'QA',
      data: DataUtils.extractPropertyByName(
        cyrillicSummary.reporters,
        'Среднее соотношение количества багов к количеству протестированных задач по проектам',
        'Среднее соотношение количества багов к количеству протестированных задач с багами по проектам'
      ),
    },
  ];

  for (const diagram of diagramsData) {
    await imageUtils.generateDiagram( // eslint-disable-line no-await-in-loop
      `${diagram.title} c ${cyrillicSummary.issuesCreatedFrom} по ${cyrillicSummary.issuesCreatedTo}`,
      diagram.yLabel,
      diagram.xLabel,
      diagram.data,
      colors,
    );
  }
};

generateDiagrams();
