import { apiRequest } from "./api";

export interface SupportTicketPayload {
  email: string;
  message: string;
  name: string;
  subject: string;
}

export interface SupportTicketResponse {
  ticket: {
    createdAt: string;
    email: string;
    id: string;
    status: string;
    subject: string;
  };
}

export function createSupportTicket(payload: SupportTicketPayload) {
  return apiRequest<SupportTicketResponse>("/support/tickets", {
    body: JSON.stringify(payload),
    method: "POST",
  });
}
