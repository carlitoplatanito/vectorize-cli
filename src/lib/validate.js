const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function parseOptionsJson(input) {
  if (typeof input !== "string" || input.trim() === "") {
    throw new Error("--options must be a non-empty JSON string.");
  }

  try {
    return JSON.parse(input);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid --options JSON: ${detail}`);
  }
}

export function validateOptions(options) {
  if (!options || typeof options !== "object" || Array.isArray(options)) {
    throw new Error(
      "Invalid options schema: expected an object with { step, colors }."
    );
  }

  const { step, colors } = options;

  if (!Number.isInteger(step) || step < 1) {
    throw new Error("Invalid options schema: step must be an integer >= 1.");
  }

  if (!Array.isArray(colors) || colors.length === 0) {
    throw new Error(
      "Invalid options schema: colors must be a non-empty array."
    );
  }

  const invalidIndex = colors.findIndex(
    (color) => typeof color !== "string" || !HEX_COLOR_REGEX.test(color)
  );

  if (invalidIndex !== -1) {
    throw new Error(
      `Invalid options schema: colors[${invalidIndex}] must be a hex color (#rgb or #rrggbb).`
    );
  }

  return {
    step,
    colors,
  };
}
