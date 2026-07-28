import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    userName: {
      type: String,
      required: true,
      trim: true,
    },
    userEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    contactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contact",
      required: true,
      index: true,
    },
    contactName: {
      type: String,
      required: true,
      trim: true,
    },
    action: {
      type: String,
      enum: ["created", "updated", "deleted"],
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    changeDetails: [
      {
        field: {
          type: String,
          required: true,
          trim: true,
        },
        before: {
          type: String,
          default: "",
        },
        after: {
          type: String,
          default: "",
        },
      },
    ],
  },
  { timestamps: true },
);

activityLogSchema.index({ userId: 1, contactId: 1, createdAt: -1 });

export default mongoose.models.ActivityLog ||
  mongoose.model("ActivityLog", activityLogSchema);
