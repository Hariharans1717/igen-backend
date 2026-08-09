const formatDateOnly = (value) => {
  if (!value) return value;

  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }

    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      const year = parsed.getFullYear();
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const day = String(parsed.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }

  return value;
};

const serializeHistoryData = (value, fieldName = '') => {
  if (value instanceof Date) {
    return fieldName && /^(dob|date_of_birth)$/i.test(fieldName) ? formatDateOnly(value) : value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => serializeHistoryData(item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, serializeHistoryData(nestedValue, key)])
    );
  }

  return value;
};

module.exports = {
  serializeHistoryData,
};
