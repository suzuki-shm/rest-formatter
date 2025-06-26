import * as vscode from 'vscode';

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
            const json = JSON.parse(body);
            const tabSize = typeof options.tabSize === 'number' ? options.tabSize : parseInt(options.tabSize, 10) || 2;
            const jsonString = JSON.stringify(json, null, tabSize);
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
            const requests = text.split(/^###\s*$/m);

            const formattedText = requests
                .map(req => formatRequest(req, options))
                .filter(Boolean)
                .join('\n\n###\n');

            const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(text.length));
            return [vscode.TextEdit.replace(fullRange, formattedText)];
        }
    };

    context.subscriptions.push(
        vscode.languages.registerDocumentFormattingEditProvider('http', provider)
    );
}

export function deactivate() {}