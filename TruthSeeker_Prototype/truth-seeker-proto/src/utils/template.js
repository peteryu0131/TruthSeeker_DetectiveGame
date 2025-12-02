const BRACE_PATTERN = /{{\s*([\w.]+)\s*}}/g;
const DOLLAR_PATTERN = /\$\{\s*([\w.]+)\s*\}/g;

export function renderTemplate(template, context) {
  if (!template) return '';
  let output = template;
  output = output.replace(BRACE_PATTERN, (_, path) => getValue(context, path));
  output = output.replace(DOLLAR_PATTERN, (_, path) => getValue(context, path));
  return output;
}

export function renderWithObfuscation(template, context, hiddenKeys = []) {
  const obfuscatedContext = { ...context };
  for (const key of hiddenKeys) {
    if (key in obfuscatedContext) {
      obfuscatedContext[key] = '***';
    }
  }
  return renderTemplate(template, obfuscatedContext);
}

function getValue(context, path) {
  const value = path.split('.').reduce((acc, key) => (acc ? acc[key] : undefined), context);
  return value ?? '';
}
