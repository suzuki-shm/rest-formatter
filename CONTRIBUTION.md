# Contributing

## Release

1. Update the version in `package.json` and `package-lock.json`, and add the release notes to `CHANGELOG.md`.
2. Make sure the repository has a `VSCE_PAT` Actions secret with permission to publish the `ShinyaSuzuki` extension.
3. Push a matching version tag such as `v0.1.1`.

The `Build` workflow packages one VSIX, publishes that artifact to the Visual Studio Marketplace, and attaches the same artifact to the GitHub release.
