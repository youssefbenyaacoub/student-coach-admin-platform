export const isEmail = (value) => {
  if (!value) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim())
}

export const required = (value) => String(value ?? '').trim().length > 0

export const validate = (schema, values) => {
  const errors = {}
  for (const key of Object.keys(schema)) {
    const rules = schema[key]
    for (const rule of rules) {
      const res = rule(values[key], values)
      if (res !== true) {
        errors[key] = res
        break
      }
    }
  }
  return errors
}

export const rules = {
  required: (label) => (value) => (required(value) ? true : `${label} is required`),
  email: (label) => (value) => (isEmail(value) ? true : `${label} must be a valid email`),
  min: (label, n) => (value) =>
    String(value ?? '').trim().length >= n ? true : `${label} must be at least ${n} characters`,
}
