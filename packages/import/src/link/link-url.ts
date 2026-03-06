const VERSION_MATCH = /v(\d{1,3})\.(\d{1,4})/i;

function parseVersion(version: string | null): [number, number] {
  const versionParts = version?.match(VERSION_MATCH);
  if (versionParts?.length) {
    const [_full, major, minor] = versionParts;
    return [Number(major), Number(minor)];
  }
  return [-1, -1];
}

/**
 * A wrapper around the `@link` url -- this parses all necessary data to identify the link
 * and determine which version is most appropriate to use.
 */
export class FederatedLinkUrl {
  // -1 if no version is set
  private readonly major: number;
  private readonly minor: number;

  constructor(
    public readonly identity: string,
    public readonly name: string | null,
    public readonly version: string | null,
  ) {
    const [major, minor] = parseVersion(version);
    this.major = major;
    this.minor = minor;
  }

  public toString(): string {
    return `${this.identity}${this.version ? `/${this.version}` : ''}`;
  }

  static fromUrl = (urlSource: string): FederatedLinkUrl => {
    const url = new URL(urlSource);
    const parts = url.pathname.split('/').filter(Boolean);
    const versionOrName = parts[parts.length - 1];
    if (versionOrName) {
      if (VERSION_MATCH.test(versionOrName)) {
        const maybeName = parts[parts.length - 2];
        return new FederatedLinkUrl(
          url.origin + (maybeName ? `/${parts.slice(0, parts.length - 1).join('/')}` : ''),
          maybeName ?? null,
          versionOrName,
        );
      }
      return new FederatedLinkUrl(`${url.origin}/${parts.join('/')}`, versionOrName, null);
    }
    return new FederatedLinkUrl(url.origin, null, null);
  };

  /** Check if this version supports another version */
  supports(version: string): boolean;
  supports(major: number, minor: number): boolean;
  supports(version: FederatedLinkUrl): boolean;
  supports(version: null): boolean;
  supports(...args: [string] | [number, number] | [FederatedLinkUrl] | [null]): boolean {
    const majorOrVersion = args[0];
    let major: number, minor: number;
    if (typeof majorOrVersion === 'string') {
      [major, minor] = parseVersion(majorOrVersion);
    } else if (typeof majorOrVersion === 'number') {
      [major, minor] = args as [number, number];
    } else if (majorOrVersion instanceof FederatedLinkUrl) {
      // check that it is the same spec
      if (majorOrVersion.identity !== this.identity) {
        return false;
      }
      major = majorOrVersion.major;
      minor = majorOrVersion.minor;
    } else if (majorOrVersion === null) {
      // handles null case
      return majorOrVersion === this.version;
    } else {
      throw new Error(`Unsupported version argument: ${JSON.stringify(args)} [${typeof args}].`);
    }
    return this.isCompatibleVersion(major, minor);
  }

  private isCompatibleVersion(major: number, minor: number): boolean {
    if (this.major === major) {
      if (this.major === 0) {
        return this.minor === minor;
      }
      return this.minor >= minor;
    }
    return false;
  }
}
