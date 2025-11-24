#!/usr/bin/env node

import yargs from "yargs/yargs";
import { hideBin } from 'yargs/helpers'
import os from "os";
import path from "path";
import { promises as fs } from "fs";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  CallToolResult,
  TextContent,
  ImageContent,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import playwright, { Browser, Page, BrowserContext, chromium } from "playwright";

enum ToolName {
  BrowserNavigate = "browser_navigate",
  BrowserScreenshot = "browser_screenshot",
  BrowserClick = "browser_click",
  BrowserClickText = "browser_click_text",
  BrowserFill = "browser_fill",
  BrowserSelect = "browser_select",
  BrowserSelectText = "browser_select_text",
  BrowserHover = "browser_hover",
  BrowserHoverText = "browser_hover_text",
  BrowserEvaluate = "browser_evaluate"
}

// Define the tools once to avoid repetition
const TOOLS: Tool[] = [
  {
    name: ToolName.BrowserNavigate,
    description: "Navigate to a URL",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string" },
      },
      required: ["url"],
    },
  },
  {
    name: ToolName.BrowserScreenshot,
    description: "Take a screenshot of the current page or a specific element",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name for the screenshot" },
        selector: { type: "string", description: "CSS selector for element to screenshot" },
        fullPage: { type: "boolean", description: "Take a full page screenshot (default: false)", default: false },
      },
      required: ["name"],
    },
  },
  {
    name: ToolName.BrowserClick,
    description: "Click an element on the page using CSS selector",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector for element to click" },
      },
      required: ["selector"],
    },
  },
  {
    name: ToolName.BrowserClickText,
    description: "Click an element on the page by its text content",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Text content of the element to click" },
      },
      required: ["text"],
    },
  },
  {
    name: ToolName.BrowserFill,
    description: "Fill out an input field",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector for input field" },
        value: { type: "string", description: "Value to fill" },
      },
      required: ["selector", "value"],
    },
  },
  {
    name: ToolName.BrowserSelect,
    description: "Select an element on the page with Select tag using CSS selector",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector for element to select" },
        value: { type: "string", description: "Value to select" },
      },
      required: ["selector", "value"],
    },
  },
  {
    name: ToolName.BrowserSelectText,
    description: "Select an element on the page with Select tag by its text content",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Text content of the element to select" },
        value: { type: "string", description: "Value to select" },
      },
      required: ["text", "value"],
    },
  },
  {
    name: ToolName.BrowserHover,
    description: "Hover an element on the page using CSS selector",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector for element to hover" },
      },
      required: ["selector"],
    },
  },
  {
    name: ToolName.BrowserHoverText,
    description: "Hover an element on the page by its text content",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Text content of the element to hover" },
      },
      required: ["text"],
    },
  },
  {
    name: ToolName.BrowserEvaluate,
    description: "Execute JavaScript in the browser console",
    inputSchema: {
      type: "object",
      properties: {
        script: { type: "string", description: "JavaScript code to execute" },
      },
      required: ["script"],
    },
  },
];

// Global state
let browser: Browser | undefined;
let context: BrowserContext | undefined;
let page: Page | undefined;
const consoleLogs: string[] = [];
const screenshots = new Map<string, string>();

async function ensureBrowser() {
  if (!browser) {
    if (process.env.CDP_ENDPOINT) {
      // CASE A: Connect to existing browser via CDP
      console.error(`🔌 Connecting to existing browser at ${process.env.CDP_ENDPOINT}...`);
      browser = await chromium.connectOverCDP(process.env.CDP_ENDPOINT);

      // Use the existing default context (user's profile)
      const contexts = browser.contexts();
      context = contexts.length > 0 ? contexts[0] : await browser.newContext();
    } else {
      // CASE B: Default behavior (Launch new browser)
      console.error("🚀 Launching new browser instance...");
      browser = await playwright.firefox.launch({
        headless: process.env.HEADLESS === 'true'
      });
      context = await browser.newContext();
    }
  }

  if (!page) {
    page = await context!.newPage();

    page.on("console", (msg) => {
      const logEntry = `[${msg.type()}] ${msg.text()}`;
      consoleLogs.push(logEntry);
      server.notification({
        method: "notifications/resources/updated",
        params: { uri: "console://logs" },
      });
    });
  }

  return page!;
}

async function handleToolCall(name: ToolName, args: any): Promise<CallToolResult> {
  const page = await ensureBrowser();

  switch (name) {
    case ToolName.BrowserNavigate:
      await page.goto(args.url);
      return {
        content: [{
          type: "text",
            text: `Navigated to ${args.url}`,
          }],
        isError: false,
      };

    case ToolName.BrowserScreenshot: {
      const fullPage = (args.fullPage === 'true');

      const screenshot = await (args.selector ?
        page.locator(args.selector).screenshot() :
        page.screenshot({ fullPage }));
      const base64Screenshot = screenshot.toString('base64');

      if (!base64Screenshot) {
        return {
          content: [{
            type: "text",
            text: args.selector ? `Element not found: ${args.selector}` : "Screenshot failed",
          }],
          isError: true,
        };
      }

      screenshots.set(args.name, base64Screenshot);
      server.notification({
        method: "notifications/resources/list_changed",
      });

      return {
        content: [
          {
            type: "text",
            text: `Screenshot '${args.name}' taken`,
          } as TextContent,
          {
            type: "image",
              data: base64Screenshot,
              mimeType: "image/png",
            } as ImageContent,
          ],
        isError: false,
      };
    }

    case ToolName.BrowserClick:
      try {
        await page.locator(args.selector).click();
        return {
          content: [{
            type: "text",
            text: `Clicked: ${args.selector}`,
          }],
          isError: false,
        };
      } catch (error) {
        if((error as Error).message.includes("strict mode violation")) {
            console.log("Strict mode violation, retrying on first element...");
            try {
                await page.locator(args.selector).first().click();
                return {
                    content: [{
                        type: "text",
                        text: `Clicked: ${args.selector}`,
                    }],
                    isError: false,
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Failed (twice) to click ${args.selector}: ${(error as Error).message}`,
                    }],
                    isError: true,
                };
            }
        }
        
        return {
          content: [{
            type: "text",
            text: `Failed to click ${args.selector}: ${(error as Error).message}`,
          }],
          isError: true,
        };
      }

    case ToolName.BrowserClickText:
      try {
        await page.getByText(args.text).click();
        return {
          content: [{
            type: "text",
            text: `Clicked element with text: ${args.text}`,
          }],
          isError: false,
        };
      } catch (error) {
        if((error as Error).message.includes("strict mode violation")) {
            console.log("Strict mode violation, retrying on first element...");
            try {
                await page.getByText(args.text).first().click();
                return {
                    content: [{
                        type: "text",
                        text: `Clicked element with text: ${args.text}`,
                    }],
                    isError: false,
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Failed (twice) to click element with text ${args.text}: ${(error as Error).message}`,
                    }],
                    isError: true,
                };
            }
        }
        return {
          content: [{
            type: "text",
            text: `Failed to click element with text ${args.text}: ${(error as Error).message}`,
          }],
          isError: true,
        };
      }

    case ToolName.BrowserFill:
      try {
        await page.locator(args.selector).pressSequentially(args.value, { delay: 100 });
        return {
          content: [{
            type: "text",
              text: `Filled ${args.selector} with: ${args.value}`,
            }],
          isError: false,
        };
      } catch (error) {
        if((error as Error).message.includes("strict mode violation")) {
            console.log("Strict mode violation, retrying on first element...");
            try {
                await page.locator(args.selector).first().pressSequentially(args.value, { delay: 100 });
                return {
                    content: [{
                        type: "text",
                        text: `Filled ${args.selector} with: ${args.value}`,
                    }],
                    isError: false,
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Failed (twice) to fill ${args.selector}: ${(error as Error).message}`,
                    }],
                    isError: true,
                };
            }
        }
        return {
          content: [{
            type: "text",
              text: `Failed to fill ${args.selector}: ${(error as Error).message}`,
            }],
          isError: true,
        };
      }

    case ToolName.BrowserSelect:
      try {
        await page.locator(args.selector).selectOption(args.value);
        return {
          content: [{
            type: "text",
              text: `Selected ${args.selector} with: ${args.value}`,
            }],
          isError: false,
        };
      } catch (error) {
        if((error as Error).message.includes("strict mode violation")) {
            console.log("Strict mode violation, retrying on first element...");
            try {
                await page.locator(args.selector).first().selectOption(args.value);
                return {
                    content: [{
                        type: "text",
                        text: `Selected ${args.selector} with: ${args.value}`,
                    }],
                    isError: false,
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Failed (twice) to select ${args.selector}: ${(error as Error).message}`,
                    }],
                    isError: true,
                };
            }
        }
        return {
          content: [{
            type: "text",
              text: `Failed to select ${args.selector}: ${(error as Error).message}`,
            }],
          isError: true,
        };
      }

    case ToolName.BrowserSelectText:
      try {
        await page.getByText(args.text).selectOption(args.value);
        return {
          content: [{
            type: "text",
            text: `Selected element with text ${args.text} with value: ${args.value}`,
          }],
          isError: false,
        };
      } catch (error) {
        if((error as Error).message.includes("strict mode violation")) {
            console.log("Strict mode violation, retrying on first element...");
            try {
                await page.getByText(args.text).first().selectOption(args.value);
                return {
                    content: [{
                        type: "text",
                        text: `Selected element with text ${args.text} with value: ${args.value}`,
                    }],
                    isError: false,
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Failed (twice) to select element with text ${args.text}: ${(error as Error).message}`,
                    }],
                    isError: true,
                };
            }
        }
        return {
          content: [{
            type: "text",
            text: `Failed to select element with text ${args.text}: ${(error as Error).message}`,
          }],
          isError: true,
        };
      }

    case ToolName.BrowserHover:
      try {
        await page.locator(args.selector).hover();
        return {
          content: [{
            type: "text",
              text: `Hovered ${args.selector}`,
            }],
          isError: false,
        };
      } catch (error) {
        if((error as Error).message.includes("strict mode violation")) {
            console.log("Strict mode violation, retrying on first element...");
            try {
                await page.locator(args.selector).first().hover();
                return {
                    content: [{
                        type: "text",
                        text: `Hovered ${args.selector}`,
                    }],
                    isError: false,
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Failed to hover ${args.selector}: ${(error as Error).message}`,
                    }],
                    isError: true,
                };
            }
        }
        return {
          content: [{
            type: "text",
              text: `Failed to hover ${args.selector}: ${(error as Error).message}`,
            }],
          isError: true,
        };
      }

    case ToolName.BrowserHoverText:
      try {
        await page.getByText(args.text).hover();
        return {
          content: [{
            type: "text",
            text: `Hovered element with text: ${args.text}`,
          }],
          isError: false,
        };
      } catch (error) {
        if((error as Error).message.includes("strict mode violation")) {
            console.log("Strict mode violation, retrying on first element...");
            try {
                await page.getByText(args.text).first().hover();
                return {
                    content: [{
                        type: "text",
                        text: `Hovered element with text: ${args.text}`,
                    }],
                    isError: false,
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Failed (twice) to hover element with text ${args.text}: ${(error as Error).message}`,
                    }],
                    isError: true,
                };
            }
        }
        return {
          content: [{
            type: "text",
            text: `Failed to hover element with text ${args.text}: ${(error as Error).message}`,
          }],
          isError: true,
        };
      }

    case ToolName.BrowserEvaluate:
      try {
        const result = await page.evaluate((script) => {
          const logs: string[] = [];
          const originalConsole = { ...console };

          ['log', 'info', 'warn', 'error'].forEach(method => {
            (console as any)[method] = (...args: any[]) => {
              logs.push(`[${method}] ${args.join(' ')}`);
              (originalConsole as any)[method](...args);
            };
          });

          try {
            const result = eval(script);
            Object.assign(console, originalConsole);
            return { result, logs };
          } catch (error) {
            Object.assign(console, originalConsole);
            throw error;
          }
        }, args.script);

        return {
          content: [
            {
                type: "text",
                text: `Execution result:\n${JSON.stringify(result.result, null, 2)}\n\nConsole output:\n${result.logs.join('\n')}`,
              },
            ],
          isError: false,
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
              text: `Script execution failed: ${(error as Error).message}`,
            }],
          isError: true,
        };
      }

    default:
      return {
        content: [{
          type: "text",
            text: `Unknown tool: ${name}`,
          }],
        isError: true,
      };
  }
}

const server = new Server(
  {
    name: "automatalabs/playwright",
    version: "0.1.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  },
);


// Setup request handlers
server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      uri: "console://logs",
      mimeType: "text/plain",
      name: "Browser console logs",
    },
    ...Array.from(screenshots.keys()).map(name => ({
      uri: `screenshot://${name}`,
      mimeType: "image/png",
      name: `Screenshot: ${name}`,
    })),
  ],
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri.toString();

  if (uri === "console://logs") {
    return {
      contents: [{
        uri,
        mimeType: "text/plain",
        text: consoleLogs.join("\n"),
      }],
    };
  }

  if (uri.startsWith("screenshot://")) {
    const name = uri.split("://")[1];
    const screenshot = screenshots.get(name);
    if (screenshot) {
      return {
        contents: [{
          uri,
          mimeType: "image/png",
          blob: screenshot,
        }],
      };
    }
  }

  throw new Error(`Resource not found: ${uri}`);
});



async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS,
  }));
  
  server.setRequestHandler(CallToolRequestSchema, async (request) =>
    handleToolCall(request.params.name as ToolName, request.params.arguments ?? {})
  );
}

async function checkPlatformAndInstall() {
  const platform = os.platform();
  if (platform === "win32") {
    console.log("Installing MCP Playwright Server for Windows...");
    try {
      const configFilePath = path.join(os.homedir(), 'AppData', 'Roaming', 'Claude', 'claude_desktop_config.json');
      
      let config: any;
      try {
        // Try to read existing config file
        const fileContent = await fs.readFile(configFilePath, 'utf-8');
        config = JSON.parse(fileContent);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          // Create new config file with mcpServers object
          config = { mcpServers: {} };
          await fs.writeFile(configFilePath, JSON.stringify(config, null, 2), 'utf-8');
          console.log("Created new Claude config file");
        } else {
          console.error("Error reading Claude config file:", error);
          process.exit(1);
        }
      }

      // Ensure mcpServers exists
      if (!config.mcpServers) {
        config.mcpServers = {};
      }

      // Update the playwright configuration
      config.mcpServers.playwright = {
        command: "npx",
        args: ["-y", "@automatalabs/mcp-server-playwright"]
      };

      // Write the updated config back to file
      await fs.writeFile(configFilePath, JSON.stringify(config, null, 2), 'utf-8');
      console.log("✓ Successfully updated Claude configuration");
      
    } catch (error) {
      console.error("Error during installation:", error);
      process.exit(1);
    }
  } else if (platform === "darwin") {
    console.log("Installing MCP Playwright Server for macOS...");
    try {
      const configFilePath = path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
      
      let config: any;
      try {
        // Try to read existing config file
        const fileContent = await fs.readFile(configFilePath, 'utf-8');
        config = JSON.parse(fileContent);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          // Create new config file with mcpServers object
          config = { mcpServers: {} };
          await fs.writeFile(configFilePath, JSON.stringify(config, null, 2), 'utf-8');
          console.log("Created new Claude config file");
        } else {
          console.error("Error reading Claude config file:", error);
          process.exit(1);
        }
      }

      // Ensure mcpServers exists
      if (!config.mcpServers) {
        config.mcpServers = {};
      }

      // Update the playwright configuration
      config.mcpServers.playwright = {
        command: "npx",
        args: ["-y", "@automatalabs/mcp-server-playwright"]
      };

      // Write the updated config back to file
      await fs.writeFile(configFilePath, JSON.stringify(config, null, 2), 'utf-8');
      console.log("✓ Successfully updated Claude configuration");
      
    } catch (error) {
      console.error("Error during installation:", error);
      process.exit(1);
    }
  } else {
    console.error("Unsupported platform:", platform);
    process.exit(1);
  }
}

(async () => {
  try {
    // Parse args but continue with server if no command specified
    await yargs(hideBin(process.argv))
      .command('install', 'Install MCP-Server-Playwright dependencies', () => {}, async () => {
        await checkPlatformAndInstall();
        // Exit after successful installation
        process.exit(0);
      })
      .strict()
      .help()
      .parse();

    // If we get here, no command was specified, so run the server
    await runServer().catch(console.error);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
