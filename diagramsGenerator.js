/* eslint no-restricted-syntax: ['off', 'ForInStatement'] */
import DataUtils from './modules/main/utils/data/dataUtils.js';
import JSONLoader from './modules/main/utils/data/JSONLoader.js';
import imageUtils from './modules/main/utils/image/imageUtils.js';

const generateDiagrams = async () => { // translate summary to cyrillic
  let trimmedSummary = DataUtils.trimEmptyNestedObj(JSONLoader.summary);

  let cyrillicSummary = DataUtils.setCyrillicNames(
    trimmedSummary,
    JSONLoader.config.cyrillicNames,
  );

  const diagramsData = [
    // define diagrams structure with overall info
    DataUtils.defineDiagramStructure({
      title: 'Общее количество задач, реопенов и багов',
      yLabel: 'Количество',
      source: cyrillicSummary,
      fields: [
        'Количество протестированных задач',
        'Количество протестированных задач с багами',
        'Общее количество багов',
        'Количество задач',
        'Количество задач с реопенами',
        'Общее количество реопенов',
        'Количество задеплоенных или завершенных задач с участием разработчиков без in progress',
        'Количество всех не назначенных на разработчиков задач',
        'Количество всех не назначенных на QA задач',
      ],
    }),
    DataUtils.defineDiagramStructure({
      title: 'Общее соотношение количества багов, реопенов и задач',
      yLabel: 'Процент',
      source: cyrillicSummary,
      fields: [
        'Соотношение количества багов к количеству протестированных задач',
        'Соотношение количества багов к количеству протестированных задач с багами',
        'Соотношение количества протестированных задач с багами к количеству протестированных задач',
        'Соотношение количества протестированных задач к количеству всех задач',
        'Соотношение количества всех реопенов к количеству всех задач с реопенами',
        'Соотношение количества задач с реопенами к количеству всех задач',
        'Соотношение количества задач с реопенами к количеству протестированных задач',
        'Соотношение количества задач с реопенами к количеству протестированных задач с багами',
        'Соотношение количества всех не назначенных на разработчиков задач к количеству всех задач',
        'Соотношение количества всех не назначенных на QA задач к количеству всех задач',
      ],
    }),

    // define diagrams structure with info by priorities
    DataUtils.defineDiagramStructure({
      title: 'Количество багов и задач по приоритетам',
      yLabel: 'Количество',
      xLabel: 'Приоритеты',
      outputSubFolder: 'priorities',
      source: cyrillicSummary.priorities,
      fields: [
        'Количество протестированных задач',
        'Количество протестированных задач с багами',
        'Количество багов',
        'Количество задач',
        'Количество задач с реопенами',
        'Количество реопенов',
      ],
    }),
    DataUtils.defineDiagramStructure({
      title: 'Соотношения количества багов и задач по приоритетам',
      yLabel: 'Процент',
      xLabel: 'Приоритеты',
      outputSubFolder: 'priorities',
      source: cyrillicSummary.priorities,
      fields: [
        'Соотношение количества багов к количеству протестированных задач',
        'Соотношение количества багов к количеству протестированных задач с багами',
        'Соотношение количества протестированных задач с багами к количеству протестированных задач',
        'Соотношение количества протестированных задач к количеству всех задач',
      ],
    }),
    DataUtils.defineDiagramStructure({
      title: 'Соотношения количества багов и реопенов по приоритетам',
      yLabel: 'Процент',
      xLabel: 'Приоритеты',
      outputSubFolder: 'priorities',
      source: cyrillicSummary.priorities,
      fields: [
        'Процент количества багов от общего числа багов',
        'Процент количества реопенов от общего числа реопенов',
        'Соотношение количества всех реопенов к количеству всех задач с реопенами',
        'Соотношение количества задач с реопенами к количеству всех задач',
        'Соотношение количества задач с реопенами к количеству протестированных задач',
        'Соотношение количества задач с реопенами к количеству протестированных задач с багами',
      ],
    }),

    // define diagrams structure with info by dev types
    DataUtils.defineDiagramStructure({
      title: 'Количество багов и задач по типам разработки',
      yLabel: 'Количество',
      xLabel: 'Типы разработки',
      outputSubFolder: 'devTypes',
      source: cyrillicSummary.devTypes,
      fields: [
        'Количество протестированных задач',
        'Количество протестированных задач с багами',
        'Количество багов',
        'Количество задач',
        'Количество задач с реопенами',
        'Количество реопенов',
      ],
    }),
    DataUtils.defineDiagramStructure({
      title: 'Соотношения количества багов и задач по типам разработки',
      yLabel: 'Процент',
      xLabel: 'Типы разработки',
      outputSubFolder: 'devTypes',
      source: cyrillicSummary.devTypes,
      fields: [
        'Соотношение количества багов к количеству протестированных задач',
        'Соотношение количества багов к количеству протестированных задач с багами',
        'Соотношение количества протестированных задач с багами к количеству протестированных задач',
        'Соотношение количества протестированных задач к количеству всех задач',
      ],
    }),
    DataUtils.defineDiagramStructure({
      title: 'Соотношения количества багов и реопенов по типам разработки',
      yLabel: 'Процент',
      xLabel: 'Типы разработки',
      outputSubFolder: 'devTypes',
      source: cyrillicSummary.devTypes,
      fields: [
        'Процент количества багов от общего числа багов',
        'Процент количества реопенов от общего числа реопенов',
        'Соотношение количества всех реопенов к количеству всех задач с реопенами',
        'Соотношение количества задач с реопенами к количеству всех задач',
        'Соотношение количества задач с реопенами к количеству протестированных задач',
        'Соотношение количества задач с реопенами к количеству протестированных задач с багами',
      ],
    }),

    // define diagrams structure with info by issue types
    DataUtils.defineDiagramStructure({
      title: 'Количество багов и задач по типам задач',
      yLabel: 'Количество',
      xLabel: 'Типы задач',
      outputSubFolder: 'issueTypes',
      source: cyrillicSummary.issueTypes,
      fields: [
        'Количество протестированных задач',
        'Количество протестированных задач с багами',
        'Количество багов',
        'Количество задач',
        'Количество задач с реопенами',
        'Количество реопенов',
      ],
    }),
    DataUtils.defineDiagramStructure({
      title: 'Соотношения количества багов и задач по типам задач',
      yLabel: 'Процент',
      xLabel: 'Типы задач',
      outputSubFolder: 'issueTypes',
      source: cyrillicSummary.issueTypes,
      fields: [
        'Соотношение количества багов к количеству протестированных задач',
        'Соотношение количества багов к количеству протестированных задач с багами',
        'Соотношение количества протестированных задач с багами к количеству протестированных задач',
        'Соотношение количества протестированных задач к количеству всех задач',
      ],
    }),
    DataUtils.defineDiagramStructure({
      title: 'Соотношения количества багов и реопенов по типам задач',
      yLabel: 'Процент',
      xLabel: 'Типы задач',
      outputSubFolder: 'issueTypes',
      source: cyrillicSummary.issueTypes,
      fields: [
        'Процент количества багов от общего числа багов',
        'Процент количества реопенов от общего числа реопенов',
        'Соотношение количества всех реопенов к количеству всех задач с реопенами',
        'Соотношение количества задач с реопенами к количеству всех задач',
        'Соотношение количества задач с реопенами к количеству протестированных задач',
        'Соотношение количества задач с реопенами к количеству протестированных задач с багами',
      ],
    }),
    // define diagrams structure with info by projects
    DataUtils.defineDiagramStructure({
      title: 'Количество багов и задач по проектам',
      yLabel: 'Количество',
      xLabel: 'Проекты',
      outputSubFolder: 'projects',
      source: cyrillicSummary.projects,
      fields: [
        'Количество протестированных задач',
        'Количество протестированных задач с багами',
        'Количество багов',
        'Количество задач',
        'Количество задач с реопенами',
        'Количество реопенов',
        'Количество всех не назначенных на разработчиков задач',
        'Количество всех не назначенных на QA задач',
      ],
    }),
    DataUtils.defineDiagramStructure({
      title: 'Соотношения количества багов и задач по проектам',
      yLabel: 'Процент',
      xLabel: 'Проекты',
      outputSubFolder: 'projects',
      source: cyrillicSummary.projects,
      fields: [
        'Соотношение количества багов к количеству протестированных задач',
        'Соотношение количества багов к количеству протестированных задач с багами',
        'Соотношение количества протестированных задач с багами к количеству протестированных задач',
        'Соотношение количества протестированных задач к количеству всех задач',
        'Соотношение количества всех не назначенных на разработчиков задач к количеству всех задач',
        'Соотношение количества всех не назначенных на QA задач к количеству всех задач',
      ],
    }),
    DataUtils.defineDiagramStructure({
      title: 'Соотношения количества багов и реопенов по проектам',
      yLabel: 'Процент',
      xLabel: 'Проекты',
      outputSubFolder: 'projects',
      source: cyrillicSummary.projects,
      fields: [
        'Процент количества багов от общего числа багов',
        'Процент количества реопенов от общего числа реопенов',
        'Соотношение количества всех реопенов к количеству всех задач с реопенами',
        'Соотношение количества задач с реопенами к количеству всех задач',
        'Соотношение количества задач с реопенами к количеству протестированных задач',
        'Соотношение количества задач с реопенами к количеству протестированных задач с багами',
      ],
    }),

    // define diagrams structure with overall QA info
    DataUtils.defineDiagramStructure({
      title: 'Количество багов и задач сотрудников (QA)',
      yLabel: 'Количество',
      xLabel: 'QA',
      outputSubFolder: 'QA',
      source: cyrillicSummary.reporters,
      fields: [
        'Количество всех протестированных задач сотрудника',
        'Количество всех протестированных задач сотрудника с багами',
        'Количество всех багов',
      ],
    }),
    DataUtils.defineDiagramStructure({
      title: 'Соотношение количества багов и задач сотрудников (QA)',
      yLabel: 'Процент',
      xLabel: 'QA',
      outputSubFolder: 'QA',
      source: cyrillicSummary.reporters,
      fields: [
        'Соотношение количества всех багов сотрудника к количеству всех протестированных задач сотрудника',
        'Соотношение количества всех багов сотрудника к количеству всех протестированных задач сотрудника с багами',
      ],
    }),
    DataUtils.defineDiagramStructure({
      title: 'Процент количества багов сотрудников от общего числа багов (QA)',
      yLabel: 'Процент',
      xLabel: 'QA',
      outputSubFolder: 'QA',
      source: cyrillicSummary.reporters,
      fields: [
        'Процент количества всех багов от общего числа багов',
      ],
    }),
    DataUtils.defineDiagramStructure({
      title: 'Среднее соотношение количества багов и протестированных задач по проектам (QA)',
      yLabel: 'Процент',
      xLabel: 'QA',
      outputSubFolder: 'QA',
      source: cyrillicSummary.reporters,
      fields: [
        'Среднее соотношение количества багов к количеству протестированных задач по проектам',
        'Среднее соотношение количества багов к количеству протестированных задач с багами по проектам',
      ],
    }),

    // define diagrams structure with overall developers info
    DataUtils.defineDiagramStructure({
      title: 'Количество багов и задач сотрудников (developers)',
      yLabel: 'Количество',
      xLabel: 'developers',
      outputSubFolder: 'developers',
      source: cyrillicSummary.developers,
      fields: [
        'Количество всех протестированных задач сотрудника',
        'Количество всех протестированных задач сотрудника с багами',
        'Количество всех багов',
        'Количество всех багов с которыми аффилирован сотрудник',
        'Количество всех задач сотрудника',
      ],
    }),
    DataUtils.defineDiagramStructure({
      title: 'Соотношение количества багов и задач сотрудников (developers)',
      yLabel: 'Процент',
      xLabel: 'developers',
      outputSubFolder: 'developers',
      source: cyrillicSummary.developers,
      fields: [
        'Соотношение количества всех багов сотрудника к количеству всех протестированных задач сотрудника',
        'Соотношение количества всех багов сотрудника к количеству всех протестированных задач сотрудника с багами',
        'Соотношение количества всех багов с которыми аффилирован сотрудник к количеству всех протестированных задач сотрудника',
        'Соотношение количества всех багов с которыми аффилирован сотрудник к количеству всех протестированных задач сотрудника с багами',
        'Соотношение количества всех протестированных задач сотрудника к количеству всех задач сотрудника',
      ],
    }),
    DataUtils.defineDiagramStructure({
      title: 'Процент количества багов сотрудников от общего числа багов (developers)',
      yLabel: 'Процент',
      xLabel: 'developers',
      outputSubFolder: 'developers',
      source: cyrillicSummary.developers,
      fields: [
        'Процент количества всех багов от общего числа багов',
        'Процент количества всех багов с которыми аффилирован сотрудник от общего числа багов',
      ],
    }),
    DataUtils.defineDiagramStructure({
      title: 'Среднее соотношение количества багов и протестированных задач по проектам (developers)',
      yLabel: 'Процент',
      xLabel: 'developers',
      outputSubFolder: 'developers',
      source: cyrillicSummary.developers,
      fields: [
        'Среднее соотношение количества багов к количеству протестированных задач по проектам',
        'Среднее соотношение количества багов к количеству протестированных задач с багами по проектам',
        'Среднее соотношение количества багов с которыми аффилирован сотрудник к количеству протестированных задач по проектам',
        'Среднее соотношение количества багов с которыми аффилирован сотрудник к количеству протестированных задач с багами по проектам',
      ],
    }),
  ];

  // define diagrams structure with personified QA info
  for (const [key, value] of Object.entries(cyrillicSummary.reporters)) {
    const reporterDiagramsData = [
      DataUtils.defineDiagramStructure({
        title: `Количество багов и задач (${key})`,
        yLabel: 'Количество',
        xLabel: 'Проекты',
        outputSubFolder: 'QA/count',
        source: value.projects,
        fields: [
          'Количество протестированных задач',
          'Количество протестированных задач с багами',
          'Количество багов',
        ],
      }),
      DataUtils.defineDiagramStructure({
        title: `Соотношение количества багов и задач (${key})`,
        yLabel: 'Процент',
        xLabel: 'Проекты',
        outputSubFolder: 'QA/ratio',
        source: value.projects,
        fields: [
          'Соотношение количества багов к количеству протестированных задач',
          'Соотношение количества багов к количеству протестированных задач с багами',
        ],
      }),
      DataUtils.defineDiagramStructure({
        title: `Процент количества багов от общего числа багов (${key})`,
        yLabel: 'Процент',
        xLabel: 'Проекты',
        outputSubFolder: 'QA/percent',
        source: value.projects,
        fields: [
          'Процент количества багов от общего числа багов',
        ],
      }),
    ];

    diagramsData.push(...reporterDiagramsData);
  }

  // define diagrams structure with personified developers info
  for (const [key, value] of Object.entries(cyrillicSummary.developers)) {
    const developerDiagramsData = [
      DataUtils.defineDiagramStructure({
        title: `Количество багов и задач (${key})`,
        yLabel: 'Количество',
        xLabel: 'Проекты',
        outputSubFolder: 'developers/count',
        source: value.projects,
        fields: [
          'Количество протестированных задач',
          'Количество протестированных задач с багами',
          'Количество багов',
          'Количество багов с которыми аффилирован сотрудник',
          'Количество задач',
        ],
      }),
      DataUtils.defineDiagramStructure({
        title: `Соотношение количества багов и задач (${key})`,
        yLabel: 'Процент',
        xLabel: 'Проекты',
        outputSubFolder: 'developers/ratio',
        source: value.projects,
        fields: [
          'Соотношение количества багов к количеству протестированных задач',
          'Соотношение количества багов к количеству протестированных задач с багами',
          'Соотношение количества багов с которыми аффилирован сотрудник к количеству протестированных задач',
          'Соотношение количества багов с которыми аффилирован сотрудник к количеству протестированных задач с багами',
          'Соотношение количества протестированных задач с багами к количеству протестированных задач',
          'Соотношение количества протестированных задач к количеству всех задач',
        ],
      }),
      DataUtils.defineDiagramStructure({
        title: `Процент количества багов от общего числа багов (${key})`,
        yLabel: 'Процент',
        xLabel: 'Проекты',
        outputSubFolder: 'developers/percent',
        source: value.projects,
        fields: [
          'Процент количества багов от общего числа багов',
          'Процент количества багов с которыми аффилирован сотрудник от общего числа багов',
        ],
      }),
    ];

    diagramsData.push(...developerDiagramsData);
  }

  // define diagrams structure with personified QA info in projects scope
  for (const [key, value] of Object.entries(cyrillicSummary.projectReporters)) {
    const reporterDiagramsData = [
      DataUtils.defineDiagramStructure({
        title: `Количество багов и задач (reporters in ${key})`,
        yLabel: 'Количество',
        xLabel: 'QA',
        outputSubFolder: 'projects/count/QA',
        source: value.assignees,
        fields: [
          'Количество протестированных задач',
          'Количество протестированных задач с багами',
          'Количество багов',
        ],
      }),
      DataUtils.defineDiagramStructure({
        title: `Соотношение количества багов и задач (reporters in ${key})`,
        yLabel: 'Процент',
        xLabel: 'QA',
        outputSubFolder: 'projects/ratio/QA',
        source: value.assignees,
        fields: [
          'Соотношение количества багов к количеству протестированных задач',
          'Соотношение количества багов к количеству протестированных задач с багами',
        ],
      }),
      DataUtils.defineDiagramStructure({
        title: `Процент количества багов от общего числа багов (reporters in ${key})`,
        yLabel: 'Процент',
        xLabel: 'QA',
        outputSubFolder: 'projects/percent/QA',
        source: value.assignees,
        fields: [
          'Процент количества багов от общего числа багов',
        ],
      }),
    ];

    diagramsData.push(...reporterDiagramsData);
  }

  // define diagrams structure with personified developers info in projects scope
  for (const [key, value] of Object.entries(cyrillicSummary.projectDevelopers)) {
    const developerDiagramsData = [
      DataUtils.defineDiagramStructure({
        title: `Количество багов и задач (developers in ${key})`,
        yLabel: 'Количество',
        xLabel: 'developers',
        outputSubFolder: 'projects/count/developers',
        source: value.assignees,
        fields: [
          'Количество протестированных задач',
          'Количество протестированных задач с багами',
          'Количество багов',
          'Количество багов с которыми аффилирован сотрудник',
          'Количество задач',
        ],
      }),
      DataUtils.defineDiagramStructure({
        title: `Соотношение количества багов и задач (developers in ${key})`,
        yLabel: 'Процент',
        xLabel: 'developers',
        outputSubFolder: 'projects/ratio/developers',
        source: value.assignees,
        fields: [
          'Соотношение количества багов к количеству протестированных задач',
          'Соотношение количества багов к количеству протестированных задач с багами',
          'Соотношение количества багов с которыми аффилирован сотрудник к количеству протестированных задач',
          'Соотношение количества багов с которыми аффилирован сотрудник к количеству протестированных задач с багами',
          'Соотношение количества протестированных задач с багами к количеству протестированных задач',
          'Соотношение количества протестированных задач к количеству всех задач',
        ],
      }),
      DataUtils.defineDiagramStructure({
        title: `Процент количества багов от общего числа багов (developers in ${key})`,
        yLabel: 'Процент',
        xLabel: 'developers',
        outputSubFolder: 'projects/percent/developers',
        source: value.assignees,
        fields: [
          'Процент количества багов от общего числа багов',
          'Процент количества багов с которыми аффилирован сотрудник от общего числа багов',
        ],
      }),
    ];

    diagramsData.push(...developerDiagramsData);
  }

  // define diagrams structure with info by issue types in projects scope
  for (const [key, value] of Object.entries(cyrillicSummary.projects)) {
    const projectIssueTypesDiagramsData = [
      DataUtils.defineDiagramStructure({
        title: `Количество багов и задач по типам задач (${key})`,
        yLabel: 'Количество',
        xLabel: 'Типы задач',
        outputSubFolder: 'issueTypes/count',
        source: value.issuetype,
        fields: [
          'Количество протестированных задач',
          'Количество протестированных задач с багами',
          'Количество багов',
          'Количество задач',
          'Количество задач с реопенами',
          'Количество реопенов',
        ],
      }),
      DataUtils.defineDiagramStructure({
        title: `Соотношение количества багов и задач по типам задач (${key})`,
        yLabel: 'Процент',
        xLabel: 'Типы задач',
        outputSubFolder: 'issueTypes/issuesRatio',
        source: value.issuetype,
        fields: [
          'Соотношение количества багов к количеству протестированных задач',
          'Соотношение количества багов к количеству протестированных задач с багами',
          'Соотношение количества протестированных задач с багами к количеству протестированных задач',
          'Соотношение количества протестированных задач к количеству всех задач',
        ],
      }),
      DataUtils.defineDiagramStructure({
        title: `Соотношения количества багов и реопенов по типам задач (${key})`,
        yLabel: 'Процент',
        xLabel: 'Типы задач',
        outputSubFolder: 'issueTypes/reopensRatio',
        source: value.issuetype,
        fields: [
          'Процент количества багов от общего числа багов',
          'Процент количества реопенов от общего числа реопенов',
          'Соотношение количества всех реопенов к количеству всех задач с реопенами',
          'Соотношение количества задач с реопенами к количеству всех задач',
          'Соотношение количества задач с реопенами к количеству протестированных задач',
          'Соотношение количества задач с реопенами к количеству протестированных задач с багами',
        ],
      }),
    ];

    diagramsData.push(...projectIssueTypesDiagramsData);
  }

  // trim summary according to diagrams content to save it
  trimmedSummary = DataUtils.trimEmptyNestedObj(DataUtils.trimZeroAndNullValues(trimmedSummary));
  cyrillicSummary = DataUtils.trimEmptyNestedObj(DataUtils.trimZeroAndNullValues(cyrillicSummary));

  DataUtils.saveToJSON({ trimmedSummary }, { folder: 'resources' });
  DataUtils.saveToJSON({ cyrillicSummary }, { folder: 'resources' });

  // generate diagrams
  const colors = JSONLoader.config.diagramColors;
  for (const diagram of diagramsData) {
    if (Object.keys(diagram.data.result).length !== 0) {
      await imageUtils.generateDiagram( // eslint-disable-line no-await-in-loop
        diagram.title,
        cyrillicSummary.issuesCreatedFrom,
        cyrillicSummary.issuesCreatedTo,
        diagram.yLabel,
        diagram.xLabel,
        diagram.data,
        colors,
        diagram.outputSubFolder,
      );
    }
  }
};

generateDiagrams();
