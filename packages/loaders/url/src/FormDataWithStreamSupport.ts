import { AppendOptions } from 'isomorphic-form-data';

export class FormDataWithStreamSupport extends FormData {
  private hasUnknowableLength: boolean;

  constructor(options?: any) {
    super(options);
    this.hasUnknowableLength = false;
  }

  public append(key: string, value: any, optionsOrFilename: AppendOptions | string = {}): void {
    // allow filename as single option
    const options: AppendOptions =
      typeof optionsOrFilename === 'string' ? { filename: optionsOrFilename } : optionsOrFilename;

    // empty or either doesn't have path or not an http response
    if (
      !options.knownLength &&
      !Buffer.isBuffer(value) &&
      typeof value !== 'string' &&
      !value.path &&
      !(value.readable && 'httpVersion' in value)
    ) {
      this.hasUnknowableLength = true;
    }

    super.append(key, value, options);
  }

  public getLength(callback: (err: Error | null, length: number) => void): void {
    if (this.hasUnknowableLength) {
      return null;
    }

    return super.getLength(callback);
  }

  public getLengthSync(): number {
    if (this.hasUnknowableLength) {
      return null;
    }

    // eslint-disable-next-line no-sync
    return super.getLengthSync();
  }
}
