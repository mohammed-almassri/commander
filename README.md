# Commander - VSCode Extension

Commander is a Visual Studio Code extension that allows users to execute predefined commands easily through the UI. This extension enhances productivity by providing quick access to frequently used commands.

## Features

- **Run Commands From UI:** Run the commands you always write out in the terminal with a single click.
- **Split Terminals:** Option to run commands in split terminals for parallel execution.
- **Security:** Restrict certain command patterns from being executed.

## Usage

1. **Configure your commands:**
   - Open the settings (`Ctrl+,` or `Cmd+,`).
   - Search for `commander.commands` or add the configuration below.
2. **Execute Commands:**
   - from the Activity Bar, click on the Commander icon.
   - Click on the big buttons in the Commander panel to run the predefined commands.

## Configuration

To configure your commands, add them to the global settings (`settings.json`). Each command should have the following properties:

- `label`: The label of the command (displayed on the button).
- `command`: The command to execute. This can be a string or an array of strings.
- `split`: A boolean indicating whether to run the command in a split terminal.
- `reuseTerminal`: A boolean indicating whether to reuse an existing terminal.
- `overrideSecurity`: A boolean indicating whether to override security restrictions for this command.

### Example Configuration

```json
{
  "commander.restrictedPatterns": [
    "^rm",
    "^shutdown",
    "^reboot"
  ],
  "commander.commands": [
    {
      "label": "List Files",
      "command": "ls",
    },
    {
      "label": "Show Current Directory",
      "command": "pwd",
      "reuseTerminal": true,
    },
    {
      "label": "Run Multiple Commands",
      "command": ["echo First Command", "echo Second Command"],
      "reuseTerminal": true,
    },
    {
      "label": "Run Commands in Split Terminals",
      "command": ["echo Command 1", "echo Command 2"],
      "split": true,
    },
    {
      "label": "Run Risky Command",
      "command": "shutdown -h now",  
      "overrideSecurity": true,
    }
  ]
}
```

## Security
Since Commander allows users to execute arbitrary commands, it is important to consider security implications. Here are some security features of Commander:

* Restricted Command Patterns: To mitigate the risk of executing harmful commands, Commander validates each command against a list of restricted patterns. These patterns can be customized in the settings.


* Override Security: For commands that need to bypass security restrictions, you can set overrideSecurity to `true`. Use this feature with caution especially if you know your workspace `settings.json` can be edited by a third party (eg. in a git repository).
