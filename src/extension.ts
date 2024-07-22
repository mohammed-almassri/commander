import * as vscode from "vscode";
import defaultRestrictedPatterns from "./restrictedPatterns";

interface CommanderCommand {
  command: string | string[];
  label: string;
  split: boolean;
  reuseTerminal: boolean;
  overrideSecurity: boolean;
}

export function activate(context: vscode.ExtensionContext) {
 
  const config = vscode.workspace.getConfiguration("commander");
  const commanderProvider = new CommanderProvider();
  vscode.window.registerTreeDataProvider("commanderView", commanderProvider);

  vscode.commands.registerCommand("commander.refresh", () => {
    commanderProvider.refresh();
  });
  vscode.commands.registerCommand(
    "commander.runCommand",
    (node: CommandNode) => {
      const c = node.commanderCommand;
      callCommand(c);
    }
  );
  vscode.workspace.onDidChangeConfiguration((event) => {
    if (
      event.affectsConfiguration("commander.commands") ||
      event.affectsConfiguration("commander.restrictedPatterns")
    ) {
      commanderProvider.refresh();
    }
  });
}

function callCommand(c: CommanderCommand) {
  if (c.split) {
    runCommandsInSplitTerminals(c.command as string[], c.overrideSecurity);
  } else {
    if (Array.isArray(c.command)) {
      for (const cmd of c.command) {
        runCommandInTerminal(cmd, { name: c.label }, true, c.overrideSecurity);
      }
    } else {
      runCommandInTerminal(
        c.command as string,
        { name: c.label },
        c.reuseTerminal,
        c.overrideSecurity
      );
    }
  }
}

async function runCommandsInSplitTerminals(
  commands: string | string[],
  overrideSecurity: boolean
) {
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
    const terminal = runCommandInTerminal(
      command,
      terminalOptions,
      false,
      overrideSecurity
    );
    if (!parentTerminal) {
      parentTerminal = terminal;
    }
  }
}

function runCommandInTerminal(
  commandString: string,
  terminalOptions: vscode.TerminalOptions = { name: "Commander" },
  reuseTerminal = true,
  overrideSecurity = false
): vscode.Terminal | undefined {
  let terminal: vscode.Terminal;
  if (reuseTerminal) {
    terminal =
      vscode.window.activeTerminal ||
      vscode.window.createTerminal(terminalOptions);
  } else {
    terminal = vscode.window.createTerminal(terminalOptions);
  }
  terminal.show();
  const validationResult = validateCommand(commandString);
  if (overrideSecurity || validationResult === true) {
    terminal.sendText(commandString);
    return terminal;
  } else {
    vscode.window.showErrorMessage(
      `Command not allowed since it contains restricted pattern: ${validationResult}`
    );
  }
}

function validateCommand(commandString: string): string | true {
  const config = vscode.workspace.getConfiguration("commander");
  const restrictedPatterns = config.get<RegExp[]>("restrictedPatterns", []);
  restrictedPatterns.push(...defaultRestrictedPatterns);
  for (const pattern of restrictedPatterns) {
    const cmds = commandString.split(/[|&]/).map((c) => c.trim());
    for (const cmd of cmds) {
      if (new RegExp(pattern).test(cmd)) {
        return `${pattern}`;
      }
    }
  }
  return true;
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
    const userCommands = config.get<CommanderCommand[]>("commands", []);
    return userCommands.map(
      (cmd) =>
        new CommandNode(
          {
            title: cmd.label,
            command: cmd.command as string,
          },
          cmd
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
    public readonly command: vscode.Command,
    public readonly commanderCommand: CommanderCommand
  ) {
    super(commanderCommand.label, vscode.TreeItemCollapsibleState.None);
    this.tooltip = `${this.label}`;
    this.command = {
      command: "commander.runCommand",
      title: "",
      arguments: [this],
    };
    this.iconPath = new vscode.ThemeIcon("terminal");
  }
}
