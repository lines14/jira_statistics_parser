import { z } from 'zod';

class CommentDTO {
  constructor(comment) {
    const data = z.object({
      id: z.string(),
      author: z.object({ displayName: z.string() }),
      body: z.any(),
      created: z.string(),
      updated: z.string(),
    }).parse(comment);

    this.id = data.id;
    this.author = data.author;
    this.body = data.body;
    this.created = data.created;
    this.updated = data.updated;
  }
}

export default CommentDTO;
