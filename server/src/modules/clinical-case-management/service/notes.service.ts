import { AppError } from "../../../middleware/error";
import { assertCaseEditable } from "../../../cases/state-machine";
import { caseRepository } from "../repository/case.repository";
import { commentRepository, fromApiNoteType } from "../repository/comment.repository";
import { historyRepository } from "../repository/history.repository";
import { assertCaseUnlockedForActor } from "../validators/lock.validator";
import { caseLockRepository } from "../repository/lock.repository";

export class NotesService {
  async listNotes(caseId: string, filter?: "clinical" | "doctor" | "internal") {
    const noteType = filter ? fromApiNoteType(filter) : undefined;
    return commentRepository.list(caseId, noteType);
  }

  async addNote(input: {
    actorId: string;
    body: string;
    caseId: string;
    mentions?: string[];
    noteType: "clinical" | "doctor" | "internal";
    parentId?: string;
  }) {
    const ecgCase = await caseRepository.findById(input.caseId);
    if (!ecgCase) throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");
    assertCaseEditable(ecgCase);
    await assertCaseUnlockedForActor(caseLockRepository, { actorId: input.actorId, caseId: input.caseId });

    const prismaNoteType = fromApiNoteType(input.noteType);
    const comment = await commentRepository.create({
      actorId: input.actorId,
      body: input.body,
      caseId: input.caseId,
      mentions: input.mentions,
      noteType: prismaNoteType,
      parentId: input.parentId,
    });

    const eventType =
      prismaNoteType === "CLINICAL"
        ? "CLINICAL_NOTE_ADDED"
        : prismaNoteType === "INTERNAL"
          ? "COMMENT_ADDED"
          : "COMMENT_ADDED";

    await historyRepository.recordHistory({
      actorId: input.actorId,
      caseId: input.caseId,
      eventType,
      payload: { commentId: comment.id, noteType: input.noteType },
      title:
        prismaNoteType === "CLINICAL"
          ? "Clinical note added"
          : prismaNoteType === "INTERNAL"
            ? "Internal note added"
            : "Doctor comment added",
    });
    await historyRepository.recordAudit({
      action: "CLINICAL_CASE_NOTE_ADDED",
      actorId: input.actorId,
      caseId: input.caseId,
      entityId: comment.id,
      message: `${input.noteType} note added to case.`,
      newValue: { body: comment.body, noteType: input.noteType },
    });

    return comment;
  }
}

export const notesService = new NotesService();
