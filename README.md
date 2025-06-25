# REST Formatter

A simple and lightweight formatter for `.http` and `.rest` files in Visual Studio Code. This extension helps you keep your REST API request files clean and readable by formatting headers and JSON bodies.

## Features

- **Format `.http` and `.rest` files**: Automatically formats your request files when you save them or trigger the format command.
- **Indent Headers**: Indents request headers for better readability.
- **Format JSON Bodies**: Pretty-prints JSON bodies in your requests.
- **Multiple Requests**: Supports formatting files with multiple requests separated by `###`.
- **Configurable Indentation**: Customize the indentation for headers and JSON bodies through VS Code settings.

## Usage

1.  Install the extension from the Visual Studio Code Marketplace.
2.  Open a `.http` or `.rest` file.
3.  Run the "Format Document" command (`Shift+Option+F` on macOS, `Shift+Alt+F` on Windows).

## Extension Settings

This extension contributes the following settings:

-   `rest-formatter.header.indent`: Number of spaces to indent headers.
    -   **Default**: `0`
-   `rest-formatter.body.json.indent`: Number of spaces to indent the root of the JSON body.
    -   **Default**: `0`

You can configure these settings in your `settings.json` file or through the VS Code settings UI.

**Example `settings.json`:**

```json
{
    "rest-formatter.header.indent": 4,
    "rest-formatter.body.json.indent": 2
}
```

## Known Issues

-   There are no known issues at this time. Please report any issues you find on the [GitHub repository](https://github.com/your-repo-url).



---

**Enjoy!**