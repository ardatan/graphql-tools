/* eslint-disable import/no-nodejs-modules */

import { concat } from 'apollo-link';
import { createUploadLink, formDataAppendFile, isExtractableFile } from 'apollo-upload-client';
import FormData, { AppendOptions } from 'form-data';
import fetch from 'node-fetch';

import { AwaitVariablesLink } from './AwaitVariablesLink';

const hasOwn = Object.prototype.hasOwnProperty;

class FormDataWithStreamSupport extends FormData {
  private hasUnknowableLength: boolean;

  constructor(options?: any) {
    super(options);
    this.hasUnknowableLength = false;
  }

  public append(
    key: string,
    value: any,
    optionsOrFilename: AppendOptions | string = {},
  ): void {
    // allow filename as single option
    const options: AppendOptions =
      typeof optionsOrFilename === 'string'
        ? { filename: optionsOrFilename }
        : optionsOrFilename;

    // empty or either doesn't have path or not an http response
    if (
      !options.knownLength &&
      !Buffer.isBuffer(value) &&
      typeof value !== 'string' &&
      !value.path &&
      !(value.readable && hasOwn.call(value, 'httpVersion'))
    ) {
      this.hasUnknowableLength = true;
    }

    super.append(key, value, options);
  }

  public getLength(
    callback: (err: Error | null, length: number) => void,
  ): void {
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

export const createServerHttpLink = (options: any) =>
  concat(
    new AwaitVariablesLink(),
    createUploadLink({
      ...options,
      fetch,
      FormData: FormDataWithStreamSupport,
      isExtractableFile: (value: any) =>
        isExtractableFile(value) || value?.createReadStream,
      formDataAppendFile: (form: FormData, index: string, file: any) => {
        if (file.createReadStream != null) {
          form.append(index, file.createReadStream(), {
            filename: file.filename,
            contentType: file.mimetype,
          });
        } else {
          formDataAppendFile(form, index, file);
        }
      },
    }),
  );
