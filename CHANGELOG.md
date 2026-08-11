# Change Log

All notable changes to the "rest-formatter" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [0.1.2]

### Fixed
- Adopted TypeScript 7 while retaining the TypeScript 6 API compatibility required by the existing toolchain.

### Changed
- Updated development dependencies, including ESLint, Sinon, and Node.js type definitions.
- Updated the GitHub Actions used for testing, packaging, and publishing releases.

## [0.1.1]

### Security
- Replaced object-based JSON reserialization with token-preserving formatting so valid JSON keys and number representations are retained.
- Added bounds and runtime validation for indentation settings.
- Added document-size, cancellation, and aggregated-error handling to protect the extension host.
- Updated CI and release dependencies, pinned GitHub Actions, and restricted workflow token permissions.

## [0.1.0]

### Changed
- **Language Association:** Changed the primary language ID from `rest` to `http` in `package.json` and `src/extension.ts` for broader compatibility and adherence to standard HTTP language definitions. Updated associated aliases and formatter registrations.
- **JSON Parsing Library:** Switched from native `JSON.parse`/`JSON.stringify` to `lossless-json` in `src/extension.ts` for more robust JSON handling, especially with numbers.

### Fixed
- **JSON Indentation Logic:** Refactored the JSON body indentation logic in `src/extension.ts` to prioritize the `rest-formatter.body.json.indent` setting. If this setting is `0`, it now explicitly falls back to a hardcoded 2-space indentation, ensuring consistent formatting regardless of the editor's `options.tabSize`.
- **Request Splitting Logic:** Improved the logic for splitting multiple requests in `src/extension.ts` to better handle comments and blank lines between requests.
- Resolved the issue where JSON body indentation was inconsistently 4 spaces instead of the expected 2 spaces in some test environments, by ensuring the formatter's configuration takes precedence.

## [0.0.2]

- Fix category as `Formatters`

## [0.0.1]

-   Initial release of REST Formatter.
-   Added support for formatting headers and JSON bodies.
-   Added configurable indentation for headers and JSON bodies.
