import { type InferSchemaType, model, type Model, models, Schema } from "mongoose";

export const EMAIL_STATUSES = ["queued", "sent", "skipped", "failed"] as const;

const emailJobSchema = new Schema(
  {
    to: { type: String, required: true },
    subject: { type: String, required: true },
    template: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, default: {} },
    status: { type: String, enum: EMAIL_STATUSES, default: "queued", index: true },
    attempts: { type: Number, default: 0 },
    error: String,
    sentAt: Date,
  },
  { timestamps: true }
);

export type EmailJobDoc = InferSchemaType<typeof emailJobSchema>;

export const EmailJob: Model<EmailJobDoc> =
  (models.EmailJob as Model<EmailJobDoc> | undefined) ??
  model<EmailJobDoc>("EmailJob", emailJobSchema);
