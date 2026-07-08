import type { CaseCommentNoteType } from "@prisma/client";
import { prisma } from "../../../config/prisma";
import { serializeClinicalNote } from "../domain/types";

function noteTypeToFields(noteType: CaseCommentNoteType) {
  return {
    isClinical: noteType === "CLINICAL",
    noteType,
  };
}

export function fromApiNoteType(noteType: "clinical" | "doctor" | "internal"): CaseCommentNoteType {
  const map = { clinical: "CLINICAL", doctor: "DOCTOR", internal: "INTERNAL" } as const;
  return map[noteType];
}

export class CommentRepository {
  async list(caseId: string, noteType?: CaseCommentNoteType) {
    const comments = await prisma.caseComment.findMany({
      orderBy: { createdAt: "asc" },
      where: { caseId, ...(noteType ? { noteType } : {}) },
    });
    return comments.map(serializeClinicalNote);
  }

  async create(input: {
    actorId: string;
    body: string;
    caseId: string;
    mentions?: string[];
    noteType: CaseCommentNoteType;
    parentId?: string;
  }) {
    const comment = await prisma.caseComment.create({
      data: {
        authorId: input.actorId,
        body: input.body,
        caseId: input.caseId,
        mentions: input.mentions ?? [],
        parentId: input.parentId,
        ...noteTypeToFields(input.noteType),
      },
    });
    return serializeClinicalNote(comment);
  }
}

export const commentRepository = new CommentRepository();
