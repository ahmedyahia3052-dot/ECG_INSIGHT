import { Router } from "express";
import { z } from "zod";

import { prisma } from "../../config/prisma";
import { validateBody } from "../../middleware/validate";
import { createNotification } from "../../utils/notifications";

const createSupportTicketSchema = z.object({
  email: z.string().trim().email(),
  message: z.string().trim().min(10).max(5000),
  name: z.string().trim().min(2).max(120),
  subject: z.string().trim().min(3).max(180),
});

export const supportRouter = Router();

supportRouter.post("/tickets", validateBody(createSupportTicketSchema), async (req, res, next) => {
  try {
    const ticket = await prisma.supportTicket.create({
      data: {
        email: req.body.email.toLowerCase(),
        message: req.body.message,
        name: req.body.name,
        subject: req.body.subject,
      },
      select: {
        createdAt: true,
        email: true,
        id: true,
        name: true,
        status: true,
        subject: true,
      },
    });
    await createNotification({
      actionUrl: "/support",
      entityId: ticket.id,
      entityType: "SupportTicket",
      message: `${ticket.name} submitted a support ticket: ${ticket.subject}.`,
      targetRole: "ADMIN",
      title: "New support ticket",
      type: "INFO",
    });
    res.status(201).json({ ticket });
  } catch (error) {
    next(error);
  }
});
