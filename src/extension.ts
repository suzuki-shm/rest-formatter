import * as vscode from 'vscode';
import LosslessJSON from 'lossless-json';

function formatRequest(request: string, options: vscode.FormattingOptions): string {
    const config = vscode.workspace.getConfiguration('rest-formatter');
    const headerIndent = ' '.repeat(config.get<number>('header.indent', 0));
    const bodyIndent = ' '.repeat(config.get<number>('body.json.indent', 0));

    const trimmedRequest = request.trim();
    if (!trimmedRequest) { return ''; }

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
        return headerIndent + trimmedLine;
    }).join('\n');

    let formattedBody = body;
    if (isJson && body) {
        try {
            const json = LosslessJSON.parse(body);
            const tabSize = typeof options.tabSize === 'number' ? options.tabSize : parseInt(options.tabSize, 10) || 2;
            const jsonString = LosslessJSON.stringify(json, null, tabSize) as string;
            formattedBody = jsonString.split('\n').map(l => bodyIndent + l).join('\n');
        } catch (e) {
            vscode.window.showInformationMessage('Failed to format JSON body. Please check for syntax errors.');
        }
    }

    let result = firstLine;
    if (formattedHeaders) { result += '\n' + formattedHeaders; }
    if (formattedBody) { result += '\n\n' + formattedBody; }

    return result;
}

export function activate(context: vscode.ExtensionContext) {
    const provider: vscode.DocumentFormattingEditProvider = {
        provideDocumentFormattingEdits(
            document: vscode.TextDocument,
            options: vscode.FormattingOptions,
            token: vscode.CancellationToken
        ): vscode.ProviderResult<vscode.TextEdit[]> {
            const text = document.getText();
            const requests = text.split(/(?=^###)/m);

            const formattedRequests = requests
                .map(req => {
                    if (req.trim() === '') {
                        return '';
                    }

                    const lines = req.split(/\r?\n/);
                    const firstLine = lines[0];

                    if (firstLine.startsWith('###')) {
                        const comment = firstLine;
                        const restOfRequest = lines.slice(1).join('\n');
                        const formattedRest = formatRequest(restOfRequest, options);

                        if (formattedRest) {
                            return comment + '\n' + formattedRest;
                        } else {
                            return comment;
                        }
                    } else {
                        return formatRequest(req, options);
                    }
                })
                .filter(Boolean);

            const formattedText = formattedRequests.join('\n\n\n');

            const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(text.length));
            return [vscode.TextEdit.replace(fullRange, formattedText)];
        }
    };

    context.subscriptions.push(
        vscode.languages.registerDocumentFormattingEditProvider('http', provider)
    );
}

export function deactivate() {}