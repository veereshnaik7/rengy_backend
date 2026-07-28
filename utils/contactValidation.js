export const CONTACT_STATUSES = ["Lead", "Prospect", "Customer"];

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const phoneRegex = /^[0-9+\-()\s]{7,20}$/;

const cleanString = (value) =>
  typeof value === "string" ? value.trim() : value;

export function normalizeContactInput(body, partial = false) {
  const fields = ["name", "email", "phone", "company", "status", "notes"];
  const data = {};

  fields.forEach((field) => {
    if (body[field] !== undefined) {
      data[field] = cleanString(body[field]);
    }
  });

  const errors = [];

  if (!partial || data.name !== undefined) {
    if (!data.name || data.name.length < 2 || data.name.length > 80) {
      errors.push("Name must be between 2 and 80 characters");
    }
  }

  if (!partial || data.email !== undefined) {
    if (!data.email || !emailRegex.test(data.email)) {
      errors.push("Enter a valid email address");
    } else {
      data.email = data.email.toLowerCase();
    }
  }

  if (!partial || data.phone !== undefined) {
    if (!data.phone || !phoneRegex.test(data.phone)) {
      errors.push("Phone must be 7-20 characters and contain only phone characters");
    }
  }

  if (!partial || data.company !== undefined) {
    if (!data.company || data.company.length < 2 || data.company.length > 100) {
      errors.push("Company must be between 2 and 100 characters");
    }
  }

  if (!partial || data.status !== undefined) {
    if (!CONTACT_STATUSES.includes(data.status)) {
      errors.push("Status must be Lead, Prospect or Customer");
    }
  }

  if (data.notes !== undefined && data.notes.length > 1000) {
    errors.push("Notes must be 1000 characters or less");
  }

  return { data, errors };
}
