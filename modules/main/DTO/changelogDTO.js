import { z } from 'zod';

class ChangelogDTO {
  constructor(changelog) {
    const data = z.object({
      id: z.string(),
      author: z.record(z.string(), z.any()),
      created: z.string(),
      items: z.array(z.any()),
    }).parse(changelog);

    this.id = data.id;
    this.author = data.author;
    this.created = data.created;
    this.items = data.items;
  }
}

export default ChangelogDTO;
