import mongoose from "mongoose";
import Contact from "../models/contact.js";
import ActivityLog from "../models/activityLog.js";
import User from "../models/user.js";
import ResponseHandler from "../utils/responseHandler.js";
import { CONTACT_STATUSES, normalizeContactInput } from "../utils/contactValidation.js";

const trackedFields = ["name", "email", "phone", "company", "status", "notes"];

const fieldLabels = {
  name: "Name",
  email: "Email",
  phone: "Phone",
  company: "Company",
  status: "Status",
  notes: "Notes",
};

const cleanValue = (value) => {
  if (value === undefined || value === null || value === "") {
    return "Empty";
  }

  return String(value);
};

const buildCreatedDetails = (contact) =>
  trackedFields.map((field) => ({
    field: fieldLabels[field],
    before: "",
    after: cleanValue(contact[field]),
  }));

const buildDeletedDetails = (contact) =>
  trackedFields.map((field) => ({
    field: fieldLabels[field],
    before: cleanValue(contact[field]),
    after: "",
  }));

const buildUpdatedDetails = (before, after) =>
  trackedFields
    .filter((field) => cleanValue(before[field]) !== cleanValue(after[field]))
    .map((field) => ({
      field: fieldLabels[field],
      before: cleanValue(before[field]),
      after: cleanValue(after[field]),
    }));

const writeActivity = async ({ userId, contact, action, changeDetails = [] }) => {
  const user = await User.findById(userId).select("name email");

  const verbs = {
    created: "added",
    updated: "edited",
    deleted: "deleted",
  };

  await ActivityLog.create({
    userId,
    userName: user?.name || "Unknown user",
    userEmail: user?.email || "unknown@example.com",
    contactId: contact._id,
    contactName: contact.name,
    action,
    message: `${contact.name} was ${verbs[action]} by ${user?.name || "Unknown user"}`,
    changeDetails,
  });
};

class ContactController {
  static async createContact(req, res) {
    try {
      const { data, errors } = normalizeContactInput(req.body);

      if (errors.length) {
        return ResponseHandler.sendErrorResponse(res, errors.join(", "), 400);
      }

      const existingContact = await Contact.findOne({
        userId: req.user.id,
        email: data.email,
      });

      if (existingContact) {
        return ResponseHandler.sendErrorResponse(
          res,
          "A contact with this email already exists",
          409,
        );
      }

      const contact = await Contact.create({
        ...data,
        userId: req.user.id,
      });

      await writeActivity({
        userId: req.user.id,
        contact,
        action: "created",
        changeDetails: buildCreatedDetails(contact),
      });

      return ResponseHandler.sendSuccessResponse(
        res,
        contact,
        "Contact created successfully",
        201,
      );
    } catch (error) {
      return ResponseHandler.sendErrorResponse(res, error.message, 500);
    }
  }

  static async getContacts(req, res) {
    try {
      const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
      const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
      const skip = (page - 1) * limit;
      const search = (req.query.search || "").trim();
      const status = (req.query.status || "all").trim();

      const filter = { userId: req.user.id };

      if (status !== "all") {
        if (!CONTACT_STATUSES.includes(status)) {
          return ResponseHandler.sendErrorResponse(res, "Invalid contact status", 400);
        }

        filter.status = status;
      }

      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ];
      }

      const [contacts, total, statusCounts] = await Promise.all([
        Contact.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit),
        Contact.countDocuments(filter),
        Contact.aggregate([
          { $match: { userId: new mongoose.Types.ObjectId(req.user.id) } },
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),
      ]);

      const counts = CONTACT_STATUSES.reduce(
        (acc, item) => ({ ...acc, [item]: 0 }),
        {},
      );

      statusCounts.forEach((item) => {
        counts[item._id] = item.count;
      });

      return ResponseHandler.sendSuccessResponse(
        res,
        {
          contacts,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.max(Math.ceil(total / limit), 1),
          },
          counts: {
            total: counts.Lead + counts.Prospect + counts.Customer,
            ...counts,
          },
        },
        "Contacts fetched successfully",
        200,
      );
    } catch (error) {
      return ResponseHandler.sendErrorResponse(res, error.message, 500);
    }
  }

  static async updateContact(req, res) {
    try {
      const { data, errors } = normalizeContactInput(req.body, true);

      if (errors.length) {
        return ResponseHandler.sendErrorResponse(res, errors.join(", "), 400);
      }

      if (data.email) {
        const existingContact = await Contact.findOne({
          userId: req.user.id,
          email: data.email,
          _id: { $ne: req.params.id },
        });

        if (existingContact) {
          return ResponseHandler.sendErrorResponse(
            res,
            "A contact with this email already exists",
            409,
          );
        }
      }

      const contact = await Contact.findOne({
        _id: req.params.id,
        userId: req.user.id,
      });

      if (!contact) {
        return ResponseHandler.sendErrorResponse(res, "Contact not found", 404);
      }

      const before = contact.toObject();
      const preview = {
        ...before,
        ...data,
      };
      const changeDetails = buildUpdatedDetails(before, preview);

      if (changeDetails.length === 0) {
        return ResponseHandler.sendSuccessResponse(
          res,
          contact,
          "No content changed",
          200,
        );
      }

      Object.entries(data).forEach(([field, value]) => {
        contact[field] = value;
      });

      await contact.save();

      await writeActivity({
        userId: req.user.id,
        contact,
        action: "updated",
        changeDetails,
      });

      return ResponseHandler.sendSuccessResponse(
        res,
        contact,
        "Contact updated successfully",
        200,
      );
    } catch (error) {
      return ResponseHandler.sendErrorResponse(res, error.message, 500);
    }
  }

  static async deleteContact(req, res) {
    try {
      const contact = await Contact.findOneAndDelete({
        _id: req.params.id,
        userId: req.user.id,
      });

      if (!contact) {
        return ResponseHandler.sendErrorResponse(res, "Contact not found", 404);
      }

      await writeActivity({
        userId: req.user.id,
        contact,
        action: "deleted",
        changeDetails: buildDeletedDetails(contact),
      });

      return ResponseHandler.sendSuccessResponse(
        res,
        null,
        "Contact deleted successfully",
        200,
      );
    } catch (error) {
      return ResponseHandler.sendErrorResponse(res, error.message, 500);
    }
  }

  static async getActivityLogs(req, res) {
    try {
      const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
      const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 5, 1), 5);
      const skip = (page - 1) * limit;
      const filter = { userId: req.user.id };

      const [logs, total] = await Promise.all([
        ActivityLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        ActivityLog.countDocuments(filter),
      ]);

      return ResponseHandler.sendSuccessResponse(
        res,
        {
          logs,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.max(Math.ceil(total / limit), 1),
          },
        },
        "Activity logs fetched successfully",
        200,
      );
    } catch (error) {
      return ResponseHandler.sendErrorResponse(res, error.message, 500);
    }
  }

  static async getContactActivityLogs(req, res) {
    try {
      const contact = await Contact.findOne({
        _id: req.params.contactId,
        userId: req.user.id,
      });

      if (!contact) {
        return ResponseHandler.sendErrorResponse(res, "Contact not found", 404);
      }

      const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
      const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 5, 1), 5);
      const skip = (page - 1) * limit;
      const filter = {
        userId: req.user.id,
        contactId: req.params.contactId,
      };

      const [logs, total] = await Promise.all([
        ActivityLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        ActivityLog.countDocuments(filter),
      ]);

      return ResponseHandler.sendSuccessResponse(
        res,
        {
          logs,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.max(Math.ceil(total / limit), 1),
          },
        },
        "Contact activity logs fetched successfully",
        200,
      );
    } catch (error) {
      return ResponseHandler.sendErrorResponse(res, error.message, 500);
    }
  }
}

export default ContactController;
