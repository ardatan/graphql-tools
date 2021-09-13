import { __assign } from "tslib";
import { concat } from '@apollo/client/link/core';
import { createUploadLink, formDataAppendFile, isExtractableFile } from 'apollo-upload-client';
import FormData from 'form-data';
import { fetch } from 'cross-fetch';
import { AwaitVariablesLink } from './AwaitVariablesLink';
export var createServerHttpLink = function (options) {
    return concat(new AwaitVariablesLink(), createUploadLink(__assign(__assign({}, options), { fetch: fetch, FormData: FormData, isExtractableFile: function (value) { return isExtractableFile(value) || (value === null || value === void 0 ? void 0 : value.createReadStream); }, formDataAppendFile: function (form, index, file) {
            if (file.createReadStream != null) {
                form.append(index, file.createReadStream(), {
                    filename: file.filename,
                    contentType: file.mimetype,
                });
            }
            else {
                formDataAppendFile(form, index, file);
            }
        } })));
};
