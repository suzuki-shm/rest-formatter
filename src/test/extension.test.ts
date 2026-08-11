import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import * as sinon from 'sinon';

import {
  formatDocumentText,
  formatJsonBody,
  MAX_DOCUMENT_CHARS,
  sanitizeIndent,
} from '../formatter.js';

// Helper function to run a format test
async function runFormatTest(inputContent: string, expectedContent: string) {
    const document = await vscode.workspace.openTextDocument({ content: inputContent, language: 'http' });
    await vscode.window.showTextDocument(document);
    await applyDocumentFormatting(document);
    const formattedText = document.getText();
    assert.strictEqual(formattedText, expectedContent);
}

async function applyDocumentFormatting(document: vscode.TextDocument) {
    const edits = await vscode.commands.executeCommand<vscode.TextEdit[]>(
      'vscode.executeFormatDocumentProvider',
      document.uri,
      { tabSize: 2, insertSpaces: true },
    );
    if (!edits) {
      throw new Error('No formatter provider returned edits.');
    }

    const workspaceEdit = new vscode.WorkspaceEdit();
    for (const edit of edits) {
      workspaceEdit.replace(document.uri, edit.range, edit.newText);
    }
    assert.strictEqual(await vscode.workspace.applyEdit(workspaceEdit), true);
}

// Helper to read fixture files
function readFixture(caseName: string, fileName: 'input.http' | 'expected.http' | 'input.rest' | 'expected.rest'): string {
    const fixturesDir = path.resolve(__dirname, './fixtures');
    const filePath = path.join(fixturesDir, caseName, fileName);
    return fs.readFileSync(filePath, 'utf-8');
}

suite('REST Formatter Test Suite', () => {

  suiteSetup(async () => {
    const extension = vscode.extensions.all.find(candidate => candidate.packageJSON.name === 'rest-formatter');
    await extension?.activate();
    // Open and close a dummy file to ensure the extension is activated
    const doc = await vscode.workspace.openTextDocument({ content: '', language: 'http' });
    await vscode.window.showTextDocument(doc);
    await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
  });

  // Reset config before each test
  setup(async () => {
    const config = vscode.workspace.getConfiguration('rest-formatter');
    await config.update('header.indent', 0, vscode.ConfigurationTarget.Global);
    await config.update('body.json.indent', 0, vscode.ConfigurationTarget.Global);

    // Set editor settings for consistent tests
    const editorConfig = vscode.workspace.getConfiguration('editor');
    await editorConfig.update('tabSize', 2, vscode.ConfigurationTarget.Global);
    await editorConfig.update('insertSpaces', true, vscode.ConfigurationTarget.Global);
  });

  test('1. Default format', async () => {
    const input = readFixture('default-format', 'input.http');
    const expected = readFixture('default-format', 'expected.http');
    await runFormatTest(input, expected);
  });

  test('2. Multiple requests', async () => {
    const input = readFixture('multiple-requests', 'input.http');
    const expected = readFixture('multiple-requests', 'expected.http');
    await runFormatTest(input, expected);
  });

  test('3. Header indent', async () => {
    const config = vscode.workspace.getConfiguration('rest-formatter');
    await config.update('header.indent', 4, vscode.ConfigurationTarget.Global);
    const input = readFixture('header-indent', 'input.http');
    const expected = readFixture('header-indent', 'expected.http');
    await runFormatTest(input, expected);
  });

  test('4. Body indent', async () => {
    const config = vscode.workspace.getConfiguration('rest-formatter');
    await config.update('body.json.indent', 2, vscode.ConfigurationTarget.Global);
    const input = readFixture('body-indent', 'input.http');
    const expected = readFixture('body-indent', 'expected.http');
    await runFormatTest(input, expected);
  });

  test('5. No JSON body', async () => {
    const input = readFixture('no-json-body', 'input.http');
    const expected = readFixture('no-json-body', 'expected.http');
    await runFormatTest(input, expected);
  });

  test('6. Invalid JSON', async () => {
    const showInformationMessage = sinon.spy(vscode.window, 'showInformationMessage');
    const input = readFixture('invalid-json', 'input.http');
    const expected = readFixture('invalid-json', 'expected.http');
    await runFormatTest(input, expected);
    assert.ok(showInformationMessage.calledWith('Failed to format JSON body. Please check for syntax errors.'));
    showInformationMessage.restore();
  });

  test('7. Multiple requests with comments', async () => {
    const input = readFixture('multiple-requests-with-comments', 'input.http');
    const expected = readFixture('multiple-requests-with-comments', 'expected.http');
    await runFormatTest(input, expected);
  });


  test('8. Multiple requests with many blanks', async () => {
    const input = readFixture('multiple-requests-many-blanks', 'input.http');
    const expected = readFixture('multiple-requests-many-blanks', 'expected.http');
    await runFormatTest(input, expected);
  });

  test('9. Multiple realistic requests', async () => {
    const input = readFixture('multiple-requests-realcase', 'input.rest');
    const expected = readFixture('multiple-requests-realcase', 'expected.rest');
    await runFormatTest(input, expected);
  });

  test('10. With traling zero', async () => {
    const input = readFixture('body-with-trailing-zero', 'input.http');
    const expected = readFixture('body-with-trailing-zero', 'expected.http');
    await runFormatTest(input, expected);
  });

  test('11. Preserve JSON keys and number representations', () => {
    const input = '{"isLosslessNumber":true,"amount":3.60,"__proto__":{"polluted":"yes"}}';
    const result = formatJsonBody(input, 0);

    assert.strictEqual(result.failed, false);
    assert.strictEqual(result.formattedBody, [
      '{',
      '  "isLosslessNumber": true,',
      '  "amount": 3.60,',
      '  "__proto__": {',
      '    "polluted": "yes"',
      '  }',
      '}',
    ].join('\n'));
  });

  test('12. Leave invalid and duplicate JSON unchanged', () => {
    const invalid = '{"name":"John Doe",}';
    const duplicate = '{"name":"John Doe","name":"Jane Doe"}';

    assert.deepStrictEqual(formatJsonBody(invalid, 0), {
      formattedBody: invalid,
      failed: true,
    });
    assert.deepStrictEqual(formatJsonBody(duplicate, 0), {
      formattedBody: duplicate,
      failed: true,
    });
  });

  test('13. Handle deep JSON without escaping the formatter', () => {
    const input = '['.repeat(5000) + '0' + ']'.repeat(5000);

    assert.doesNotThrow(() => {
      const result = formatJsonBody(input, 0);
      assert.strictEqual(result.failed, true);
      assert.strictEqual(result.formattedBody, input);
    });
  });

  test('14. Sanitize indentation and cap document size', () => {
    assert.strictEqual(sanitizeIndent(-1, 32), 0);
    assert.strictEqual(sanitizeIndent(1.5, 32), 0);
    assert.strictEqual(sanitizeIndent(33, 32), 0);
    assert.strictEqual(sanitizeIndent(32, 32), 32);

    const validDocument = [
      'POST https://example.com',
      'Content-Type: application/json',
      '',
      '{"a":1}',
    ].join('\n');
    for (const settings of [
      { headerIndent: -1, bodyIndent: -1 },
      { headerIndent: 1.5, bodyIndent: 2.5 },
      { headerIndent: 33, bodyIndent: 11 },
      { headerIndent: 1_000_000_000, bodyIndent: 1_000_000_000 },
    ]) {
      assert.doesNotThrow(() => formatDocumentText(validDocument, settings));
    }

    const result = formatDocumentText('x'.repeat(MAX_DOCUMENT_CHARS + 1), {
      headerIndent: 1_000_000_000,
      bodyIndent: -1,
    });
    assert.strictEqual(result.tooLarge, true);
    assert.strictEqual(result.formattedText.length, MAX_DOCUMENT_CHARS + 1);
  });

  test('15. Aggregate invalid JSON failures and honor cancellation', () => {
    const input = [
      'POST https://example.com/one',
      'Content-Type: application/json',
      '',
      '{"a":1,}',
      '',
      '### second',
      'POST https://example.com/two',
      'Content-Type: application/json',
      '',
      '{"b":2}',
      '',
      '### third',
      'POST https://example.com/three',
      'Content-Type: application/json',
      '',
      '{"c":3,}',
    ].join('\n');
    const formatted = formatDocumentText(input, { headerIndent: 0, bodyIndent: 0 });

    assert.strictEqual(formatted.invalidJsonCount, 2);
    assert.strictEqual(formatted.formattedText.includes('{"a":1,}'), true);
    assert.strictEqual(formatted.formattedText.includes('{\n  "b": 2\n}'), true);
    assert.strictEqual(formatted.formattedText.includes('{"c":3,}'), true);

    let cancellationChecks = 0;
    const canceled = formatDocumentText(
      input,
      { headerIndent: 0, bodyIndent: 0 },
      () => ++cancellationChecks > 1,
    );
    assert.strictEqual(canceled.canceled, true);
    assert.strictEqual(canceled.formattedText, input);
  });

  test('16. Notify once while formatting valid requests in the same document', async () => {
    const showInformationMessage = sinon.spy(vscode.window, 'showInformationMessage');
    const input = [
      'POST https://example.com/invalid-one',
      'Content-Type: application/json',
      '',
      '{"a":1,}',
      '',
      '### valid',
      'POST https://example.com/valid',
      'Content-Type: application/json',
      '',
      '{"b":2}',
      '',
      '### invalid-two',
      'POST https://example.com/invalid-two',
      'Content-Type: application/json',
      '',
      '{"c":3,}',
    ].join('\n');

    try {
      const document = await vscode.workspace.openTextDocument({ content: input, language: 'http' });
      await vscode.window.showTextDocument(document);
      await applyDocumentFormatting(document);

      assert.strictEqual(showInformationMessage.calledOnce, true);
      assert.strictEqual(document.getText().includes('{\n  "b": 2\n}'), true);
      assert.strictEqual(document.getText().includes('{"a":1,}'), true);
      assert.strictEqual(document.getText().includes('{"c":3,}'), true);
    } finally {
      showInformationMessage.restore();
    }
  });
});
