import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import * as sinon from 'sinon';

// Helper function to run a format test
async function runFormatTest(inputContent: string, expectedContent: string) {
    const document = await vscode.workspace.openTextDocument({ content: inputContent, language: 'http' });
    await vscode.window.showTextDocument(document);
    await vscode.commands.executeCommand('editor.action.formatDocument');
    const formattedText = document.getText();
    assert.strictEqual(formattedText, expectedContent);
}

// Helper to read fixture files
function readFixture(caseName: string, fileName: 'input.http' | 'expected.http' | 'input.rest' | 'expected.rest'): string {
    const fixturesDir = path.resolve(__dirname, './fixtures');
    const filePath = path.join(fixturesDir, caseName, fileName);
    return fs.readFileSync(filePath, 'utf-8');
}

suite('REST Formatter Test Suite', () => {

  suiteSetup(async () => {
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
});
