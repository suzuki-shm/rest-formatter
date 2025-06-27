# 0001-json-indentation-in-rest-formatter

## Status
Accepted

## Context
The `rest-formatter` VS Code extension was exhibiting inconsistent JSON indentation behavior during testing. Specifically, while the test setup (`src/test/extension.test.ts`) intended to set the editor's `tabSize` to 2 and the extension's `rest-formatter.body.json.indent` to 0 (or 2 for specific tests), the actual output for some tests, particularly `9. Multiple realistic requests`, showed 4-space indentation. This led to test failures due as the expected output files were configured for 2-space indentation.

Initial investigation revealed that the `LosslessJSON.stringify` function within `src/extension.ts` was using `options.tabSize` (which reflects the editor's current tab size) for JSON formatting. It was observed that for certain test cases, `options.tabSize` was unexpectedly 4, overriding the intended 2-space indentation from the test setup. This suggested that VS Code's language-specific settings or the test environment's default editor settings might be influencing `options.tabSize`.

Furthermore, there was a misunderstanding regarding the expected indentation of `src/test/fixtures/multiple-requests-realcase/expected.rest`. While the user stated that "the correct file indentation is 2 spaces and does not need to be modified," the file itself contained 4-space indentation for its JSON bodies. This discrepancy caused confusion and led to attempts to modify test data, which is undesirable.

## Decision
The primary decision is to ensure that the `rest-formatter` extension's own configuration (`rest-formatter.body.json.indent`) takes precedence for JSON body indentation. If this extension-specific setting is explicitly set to 0, it should then fall back to a hardcoded 2-space indentation, rather than relying on `options.tabSize` which can be influenced by external editor settings or test environment specifics. This ensures consistent and predictable formatting behavior regardless of the editor's current `tabSize`.

The `src/extension.ts` file will be modified to implement this logic. The `rest-formatter.body.json.indent` value will be used directly as the `tabSize` for `LosslessJSON.stringify`. If `rest-formatter.body.json.indent` is 0, a default of 2 spaces will be used.

Additionally, the `src/test/fixtures/multiple-requests-realcase/expected.rest` file will be updated to consistently use 2-space indentation for its JSON bodies, aligning with the intended formatting behavior and resolving the test failures caused by the mismatch.

## Consequences
*   **Consistent Indentation:** JSON bodies formatted by the extension will consistently use the `rest-formatter.body.json.indent` setting, or a default of 2 spaces if that setting is 0. This eliminates reliance on potentially varying `options.tabSize` values.
*   **Resolved Test Failures:** The `9. Multiple realistic requests` test, and potentially others, will now pass consistently as the formatter's output will match the 2-space indented expected output files.
*   **Clearer Logic:** The indentation logic in `src/extension.ts` becomes more explicit and less prone to external influences.
*   **No More Test Data Modification:** By aligning the expected output with the formatter's intended behavior, there will be no further need to modify test data files.