import * as vscode from 'vscode';

import {
    formatDocumentText,
    sanitizeIndent,
    type FormatterSettings,
} from './formatter.js';

function getFormatterSettings(document: vscode.TextDocument): FormatterSettings {
    const config = vscode.workspace.getConfiguration('rest-formatter', document);

    return {
        headerIndent: sanitizeIndent(config.get<unknown>('header.indent', 0), 32),
        bodyIndent: sanitizeIndent(config.get<unknown>('body.json.indent', 0), 10),
        JSONContentTypes: config.get<string[]>('header.contenttypes.json', [ 'application/json' ]),
    };
}

function isStringArray(JSONContentTypes: unknown): boolean {
    return (
        Array.isArray(JSONContentTypes) &&
        JSONContentTypes.reduce((acc, curr) => acc && typeof curr === "string", true)
    );
}

export function activate(context: vscode.ExtensionContext) {
    const provider: vscode.DocumentFormattingEditProvider = {
        provideDocumentFormattingEdits(
            document: vscode.TextDocument,
            _options: vscode.FormattingOptions,
            token: vscode.CancellationToken,
        ): vscode.ProviderResult<vscode.TextEdit[]> {
            const text = document.getText();
            const settings = getFormatterSettings(document);
            if (!isStringArray(settings.JSONContentTypes)) {
                vscode.window.showWarningMessage("Invalid setting: header.contenttypes.json must be an array of strings.");
                return [];
            }

            const result = formatDocumentText(
                text,
                settings,
                () => token.isCancellationRequested,
            );

            if (result.tooLarge) {
                vscode.window.showWarningMessage(
                    'The document is too large to format safely (maximum 5 MiB).',
                );
                return [];
            }

            if (result.canceled) {
                return [];
            }

            if (result.invalidJsonCount > 0) {
                vscode.window.showInformationMessage(
                    'Failed to format JSON body. Please check for syntax errors.',
                );
            }

            const fullRange = new vscode.Range(
                document.positionAt(0),
                document.positionAt(text.length),
            );
            return [vscode.TextEdit.replace(fullRange, result.formattedText)];
        },
    };

    context.subscriptions.push(
        vscode.languages.registerDocumentFormattingEditProvider('http', provider),
    );
}

export function deactivate() {}
