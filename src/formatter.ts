import { applyEdits, format, visit } from 'jsonc-parser';

export const MAX_DOCUMENT_CHARS = 5 * 1024 * 1024;

const MAX_HEADER_INDENT = 32;
const MAX_BODY_INDENT = 10;

export interface FormatterSettings {
    headerIndent: number;
    bodyIndent: number;
}

export interface FormatJsonResult {
    formattedBody: string;
    failed: boolean;
}

export interface FormatDocumentResult {
    formattedText: string;
    invalidJsonCount: number;
    canceled: boolean;
    tooLarge: boolean;
}

export function sanitizeIndent(value: unknown, maximum: number): number {
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || value > maximum) {
        return 0;
    }

    return value;
}

export function normalizeFormatterSettings(settings: FormatterSettings): FormatterSettings {
    return {
        headerIndent: sanitizeIndent(settings.headerIndent, MAX_HEADER_INDENT),
        bodyIndent: sanitizeIndent(settings.bodyIndent, MAX_BODY_INDENT),
    };
}

export function formatJsonBody(body: string, bodyIndent: number): FormatJsonResult {
    const normalizedBodyIndent = sanitizeIndent(bodyIndent, MAX_BODY_INDENT);
    let hasParseError = false;
    let hasDuplicateKey = false;
    const objectKeys: Set<string>[] = [];

    try {
        visit(body, {
            onObjectBegin: () => {
                objectKeys.push(new Set<string>());
            },
            onObjectProperty: (property: string) => {
                const keys = objectKeys[objectKeys.length - 1];
                if (keys?.has(property)) {
                    hasDuplicateKey = true;
                }
                keys?.add(property);
            },
            onObjectEnd: () => {
                objectKeys.pop();
            },
            onError: () => {
                hasParseError = true;
            },
        }, {
            allowTrailingComma: false,
            disallowComments: true,
        });
    } catch {
        hasParseError = true;
    }

    if (hasParseError || hasDuplicateKey) {
        return { formattedBody: body, failed: true };
    }

    try {
        const edits = format(body, undefined, {
            eol: '\n',
            insertFinalNewline: false,
            insertSpaces: true,
            keepLines: false,
            tabSize: normalizedBodyIndent === 0 ? 2 : normalizedBodyIndent,
        });

        return {
            formattedBody: applyEdits(body, edits),
            failed: false,
        };
    } catch {
        return { formattedBody: body, failed: true };
    }
}

interface FormatRequestResult {
    text: string;
    invalidJsonCount: number;
}

function formatRequest(request: string, settings: FormatterSettings): FormatRequestResult {
    const trimmedRequest = request.trim();
    if (!trimmedRequest) {
        return { text: '', invalidJsonCount: 0 };
    }

    const parts = trimmedRequest.split(/\r?\n\r?\n/);
    const headerAndFirstLine = parts[0];
    const body = parts.slice(1).join('\n\n');

    const headerLines = headerAndFirstLine.split(/\r?\n/);
    const firstLine = headerLines.shift() || '';

    let isJson = false;
    const formattedHeaders = headerLines.map(line => {
        const trimmedLine = line.trim();
        if (trimmedLine.toLowerCase().startsWith('content-type: application/json')) {
            isJson = true;
        }
        return ' '.repeat(settings.headerIndent) + trimmedLine;
    }).join('\n');

    let formattedBody = body;
    let invalidJsonCount = 0;
    if (isJson && body) {
        const jsonResult = formatJsonBody(body, settings.bodyIndent);
        if (!jsonResult.failed) {
            formattedBody = jsonResult.formattedBody
                .split('\n')
                .map(line => ' '.repeat(settings.bodyIndent) + line)
                .join('\n');
        }
        if (jsonResult.failed) {
            invalidJsonCount = 1;
        }
    }

    let result = firstLine;
    if (formattedHeaders) { result += '\n' + formattedHeaders; }
    if (formattedBody) { result += '\n\n' + formattedBody; }

    return { text: result, invalidJsonCount };
}

export function formatDocumentText(
    text: string,
    settings: FormatterSettings,
    isCancellationRequested: () => boolean = () => false,
): FormatDocumentResult {
    if (text.length > MAX_DOCUMENT_CHARS) {
        return {
            formattedText: text,
            invalidJsonCount: 0,
            canceled: false,
            tooLarge: true,
        };
    }

    const normalizedSettings = normalizeFormatterSettings(settings);
    const requests = text.split(/(?=^###)/m);
    const formattedRequests: string[] = [];
    let invalidJsonCount = 0;

    for (const request of requests) {
        if (isCancellationRequested()) {
            return {
                formattedText: text,
                invalidJsonCount,
                canceled: true,
                tooLarge: false,
            };
        }

        if (request.trim() === '') {
            continue;
        }

        const lines = request.split(/\r?\n/);
        const firstLine = lines[0];
        let formattedRequest: FormatRequestResult;

        if (firstLine.startsWith('###')) {
            const comment = firstLine;
            const restOfRequest = lines.slice(1).join('\n');
            const formattedRest = formatRequest(restOfRequest, normalizedSettings);
            formattedRequest = {
                text: formattedRest.text ? comment + '\n' + formattedRest.text : comment,
                invalidJsonCount: formattedRest.invalidJsonCount,
            };
        } else {
            formattedRequest = formatRequest(request, normalizedSettings);
        }

        invalidJsonCount += formattedRequest.invalidJsonCount;
        if (formattedRequest.text) {
            formattedRequests.push(formattedRequest.text);
        }
    }

    if (isCancellationRequested()) {
        return {
            formattedText: text,
            invalidJsonCount,
            canceled: true,
            tooLarge: false,
        };
    }

    return {
        formattedText: formattedRequests.join('\n\n\n'),
        invalidJsonCount,
        canceled: false,
        tooLarge: false,
    };
}
