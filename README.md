[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/automata-labs-team-mcp-server-playwright-badge.png)](https://mseep.ai/app/automata-labs-team-mcp-server-playwright)

<h1 align="center">MCP Server Playwright</h1>
<p align="center">
  <a href="https://www.automatalabs.io"><img alt="MCP Playwright" src="https://automatalabs.io/icon.svg" height="250"/></a>
</p>
<p align="center">
  <b>A Model Context Protocol server that provides browser automation capabilities using Playwright</b></br>
  <sub>Enable LLMs to interact with web pages, take screenshots, and execute JavaScript in a real browser environment</sub>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@automatalabs/mcp-server-playwright"><img alt="NPM Version" src="https://img.shields.io/npm/v/@automatalabs/mcp-server-playwright.svg" height="20"/></a>
  <a href="https://npmcharts.com/compare/@automatalabs/mcp-server-playwright?minimal=true"><img alt="Downloads per month" src="https://img.shields.io/npm/dm/@automatalabs/mcp-server-playwright.svg" height="20"/></a>
  <a href="https://github.com/Automata-Labs-team/MCP-Server-Playwright/blob/main/LICENSE"><img alt="License" src="https://img.shields.io/github/license/Automata-Labs-team/MCP-Server-Playwright.svg" height="20"/></a>
  <a href="https://smithery.ai/server/@automatalabs/mcp-server-playwright"><img alt="Smithery Installs" src="https://smithery.ai/badge/@automatalabs/mcp-server-playwright" height="20"/></a>
</p>

<a href="https://glama.ai/mcp/servers/9q4zck8po5"><img width="380" height="200" src="https://glama.ai/mcp/servers/9q4zck8po5/badge" alt="MCP-Server-Playwright MCP server" /></a>

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Configuration](#configuration)
- [Components](#components)
  - [Tools](#tools)
  - [Resources](#resources)
- [License](#license)

## Features

- 🌐 Full browser automation capabilities
- 📸 Screenshot capture of entire pages or specific elements
- 🖱️ Comprehensive web interaction (navigation, clicking, form filling)
- 📊 Console log monitoring
- 🔧 JavaScript execution in browser context

## Installation

### Installing via Smithery

To install MCP Server Playwright for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@automatalabs/mcp-server-playwright):

```bash
npx -y @smithery/cli install @automatalabs/mcp-server-playwright --client claude
```

You can install the package using either npx or mcp-get:

Using npx:
```bash
npx @automatalabs/mcp-server-playwright install
```
This command will:
1. Check your operating system compatibility (Windows/macOS)
2. Create or update the Claude configuration file
3. Configure the Playwright server integration

The configuration file will be automatically created/updated at:
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`

Using mcp-get:
```bash
npx @michaellatman/mcp-get@latest install @automatalabs/mcp-server-playwright
```

## Configuration

The installation process will automatically add the following configuration to your Claude config file:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@automatalabs/mcp-server-playwright"]
    }
  }
}
```
## Using with Cursor

You can also use MCP Server Playwright with [Cursor](https://www.cursor.so/), an AI-powered code editor. To enable browser automation in Cursor via MCP:

1. **Install Playwright browsers** (if not already):
    ```bash
    npx playwright install
    ```

2. **Install MCP Server Playwright for Cursor** using Smithery:
    ```bash
    npx -y @smithery/cli install @automatalabs/mcp-server-playwright --client cursor
    ```

3. **Configuration file setup**:  
   If you do not use Claude, the configuration file (`claude_desktop_config.json`) may not be created automatically.  
   - On Windows, create a folder named `Claude` in `%APPDATA%` (usually `C:\Users\<YourName>\AppData\Roaming\Claude`).
   - Inside that folder, create a file named `claude_desktop_config.json` with the following content:
   
    ```json
    {
      "serverPort": 3456
    }
    ```

4. **Follow the remaining steps in the [Installation](#installation) section above** to complete the setup.

Now, you can use all the browser automation tools provided by MCP Server Playwright directly from Cursor’s AI features, such as web navigation, screenshot capture, and JavaScript execution.

> **Note:** Make sure you have Node.js installed and `npx` available in your system PATH.

## Components

### Tools

#### `browser_navigate`
Navigate to any URL in the browser
```javascript
{
  "url": "https://stealthbrowser.cloud"
}
```

#### `browser_screenshot`
Capture screenshots of the entire page or specific elements
```javascript
{
  "name": "screenshot-name",     // required
  "selector": "#element-id",     // optional
  "fullPage": true              // optional, default: false
}
```

#### `browser_click`
Click elements on the page using CSS selector
```javascript
{
  "selector": "#button-id"
}
```

#### `browser_click_text`
Click elements on the page by their text content
```javascript
{
  "text": "Click me"
}
```

#### `browser_hover`
Hover over elements on the page using CSS selector
```javascript
{
  "selector": "#menu-item"
}
```

#### `browser_hover_text`
Hover over elements on the page by their text content
```javascript
{
  "text": "Hover me"
}
```

#### `browser_fill`
Fill out input fields
```javascript
{
  "selector": "#input-field",
  "value": "Hello World"
}
```

#### `browser_select`
Select an option in a SELECT element using CSS selector
```javascript
{
  "selector": "#dropdown",
  "value": "option-value"
}
```

#### `browser_select_text`
Select an option in a SELECT element by its text content
```javascript
{
  "text": "Choose me",
  "value": "option-value"
}
```

#### `browser_evaluate`
Execute JavaScript in the browser console
```javascript
{
  "script": "document.title"
}
```

### Resources

1. **Console Logs** (`console://logs`)
   - Access browser console output in text format
   - Includes all console messages from the browser

2. **Screenshots** (`screenshot://<n>`)
   - Access PNG images of captured screenshots
   - Referenced by the name specified during capture

## License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/Automata-Labs-team/MCP-Server-Playwright/blob/main/LICENSE) file for details.
