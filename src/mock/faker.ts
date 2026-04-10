import jsf from 'json-schema-faker';

let configured = false;

function configure(seed?: number): void {
  if (configured) return;
  jsf.option({
    optionalsProbability: 0.8,
    useExamplesValue: true,
    useDefaultValue: true,
    minItems: 1,
    maxItems: 5,
  });
  if (seed !== undefined) {
    jsf.option('random', () => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    });
  }
  configured = true;
}

export function generateFakeData(
  schema: Record<string, unknown>,
  seed?: number
): unknown {
  configure(seed);
  try {
    return jsf.generate(schema as Parameters<typeof jsf.generate>[0]);
  } catch {
    return {};
  }
}
