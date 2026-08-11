# Contributing

## Release

1. Update the version in `package.json` and `package-lock.json`, and add the release notes to `CHANGELOG.md`.
2. Install dependencies and verify the extension:

   ```sh
   npm ci
   npm test
   ```

3. Build the Marketplace distribution file:

   ```sh
   npm run package:vsix
   ```

   This creates `rest-formatter-<version>.vsix` in the repository root. The version is read from `package.json`.

4. Open the Visual Studio Marketplace publisher management page, select the extension, and drag and drop the generated VSIX to upload the new version.
5. Push a matching version tag such as `v0.1.1`.

The `Build` workflow verifies the tag version, builds the VSIX with the same command, and attaches it to the GitHub release. Marketplace publishing is intentionally manual, so CI requires no Marketplace credentials.
