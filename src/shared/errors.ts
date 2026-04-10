export class ApixError extends Error {
  constructor(message: string, public readonly suggestion?: string) {
    super(message);
    this.name = 'ApixError';
  }
}

export class SpecNotFoundError extends ApixError {
  constructor(source: string) {
    super(
      `Could not find OpenAPI spec at: ${source}`,
      'Check the URL or file path and try again. Use `apix discover <domain>` to auto-detect.'
    );
    this.name = 'SpecNotFoundError';
  }
}

export class SpecParseError extends ApixError {
  constructor(source: string, reason: string) {
    super(
      `Failed to parse OpenAPI spec from ${source}: ${reason}`,
      'Ensure the file is a valid OpenAPI 3.0 or 3.1 document.'
    );
    this.name = 'SpecParseError';
  }
}

export class CodegenError extends ApixError {
  constructor(message: string) {
    super(message, 'Check the OpenAPI spec for missing or malformed schemas.');
    this.name = 'CodegenError';
  }
}

export class DiscoveryError extends ApixError {
  constructor(domain: string) {
    super(
      `Could not auto-discover an OpenAPI spec on ${domain}`,
      'Try providing the direct URL to the spec: `apix init <spec-url>`'
    );
    this.name = 'DiscoveryError';
  }
}
