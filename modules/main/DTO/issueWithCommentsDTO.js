import { z } from 'zod';
import CommentDTO from './commentDTO.js';
import ChangelogDTO from './changelogDTO.js';

class IssueWithCommentsDTO {
  constructor(issue, comments) {
    const data = z.object({
      id: z.string(),
      key: z.string(),
      fields: z.object({
        summary: z.string(),
        created: z.string(),
        updated: z.string(),
        priority: z.object({ name: z.string() }),
        project: z.object({ key: z.string(), name: z.string() }),
        customfield_10085: z.object({ value: z.string() }).nullable().optional(),
        labels: z.array(z.string()),
        issuetype: z.object({ name: z.string() }),
        status: z.object({ name: z.string() }),
      }),
      changelog: z.object({ histories: z.array(z.any()) }).optional(),
    }).parse(issue);

    this.id = data.id;
    this.key = data.key;
    this.summary = data.fields.summary;
    this.created = data.fields.created;
    this.updated = data.fields.updated;
    this.priority = data.fields.priority.name;
    this.projectKey = data.fields.project.key;
    this.projectName = data.fields.project.name;
    this.devType = data.fields.customfield_10085?.value ?? null;
    this.labels = data.fields.labels;
    this.issuetype = data.fields.issuetype.name;
    this.status = data.fields.status.name;

    this.changelog = data.changelog?.histories?.map((history) => new ChangelogDTO(history)) ?? [];

    this.comments = (comments ?? []).map((comment) => new CommentDTO(comment));
  }
}

export default IssueWithCommentsDTO;
