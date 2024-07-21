import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  const commanderProvider = new CommanderProvider();
  vscode.window.registerTreeDataProvider("commanderView", commanderProvider);

  vscode.commands.registerCommand("commander.refresh", () =>
    commanderProvider.refresh()
  );
  vscode.commands.registerCommand(
    "commander.runCommand",
    (node: CommandNode) => {
      if (node.split) {
        runCommandsInSplitTerminals(node.command.arguments![1] as string[]);
      } else {
        const terminal = vscode.window.createTerminal("Commander");
        terminal.show();
        if (Array.isArray(node.command)) {
          for (const cmd of node.command) {
            terminal.sendText(cmd);
          }
        } else {
          if (validateCommand(node.command.arguments![1])) {
            terminal.sendText(node.command.arguments![1] as string);
          } else {
            vscode.window.showErrorMessage(
              "Command not allowed for security reasons."
            );
          }
        }
      }
    }
  );
  vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration("commander.commands")) {
      commanderProvider.refresh();
    }
  });
}

async function runCommandsInSplitTerminals(commands: string | string[]) {
  if (typeof commands === "string") {
    commands = [commands];
  }

  let parentTerminal: vscode.Terminal | undefined;

  for (const command of commands) {
    const terminalOptions: vscode.TerminalOptions = {
      name: `Commander: ${command}`,
    };

    if (parentTerminal) {
      terminalOptions.location = { parentTerminal: parentTerminal };
    }

    const terminal = vscode.window.createTerminal(terminalOptions);
    terminal.show();
    if (validateCommand(command)) {
      terminal.sendText(command);
    } else {
      vscode.window.showErrorMessage(
        "Command not allowed for security reasons."
      );
    }

    if (!parentTerminal) {
      parentTerminal = terminal;
    }
  }
}

function validateCommand(command: string): boolean {
  const restrictedPatterns = [
    /rm\s+-rf\s+\//,
    /shutdown\s+/,
    /reboot\s+/,
    /dd\s+if=\/dev\/.*/,
    /mkfs\s+/,
    /mkswap\s+/,
    /init\s+/,
    /poweroff\s+/,
    /halt\s+/,
    /swapoff\s+/,
    /swapon\s+/,
    /umount\s+/,
    /fsck\s+/,
  ];

  return !restrictedPatterns.some((pattern) => pattern.test(command));
}


class CommanderProvider implements vscode.TreeDataProvider<CommandNode> {
  private _onDidChangeTreeData: vscode.EventEmitter<CommandNode | undefined> =
    new vscode.EventEmitter<CommandNode | undefined>();
  readonly onDidChangeTreeData: vscode.Event<CommandNode | undefined> =
    this._onDidChangeTreeData.event;

  private commands: CommandNode[];

  constructor() {
    this.commands = this.getCommandsFromConfig();
  }

  private getCommandsFromConfig(): CommandNode[] {
    const config = vscode.workspace.getConfiguration("commander");
    const userCommands = config.get<
      { label: string; command: string; split: boolean }[]
    >("commands", []);
    return userCommands.map(
      (cmd) =>
        new CommandNode(
          cmd.label,
          {
            title: cmd.label,
            command: cmd.command,
          },
          cmd.split
        )
    );
  }

  refresh(): void {
    this.commands = this.getCommandsFromConfig();
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: CommandNode): vscode.TreeItem {
    return element;
  }

  getChildren(element?: CommandNode): Thenable<CommandNode[]> {
    if (element) {
      return Promise.resolve([]);
    } else {
      return Promise.resolve(this.commands);
    }
  }
}

class CommandNode extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly command: vscode.Command,
    public readonly split: boolean
  ) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.tooltip = `${this.label}`;
    this.command = {
      command: "commander.runCommand",
      title: "",
      arguments: [this, command.command],
    };
    this.iconPath = new vscode.ThemeIcon("terminal");
  }
}
