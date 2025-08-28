# SConfig
A powerful API for plugin config and file management, created for **[SerenityJS](https://github.com/SerenityJS/serenity)**.

## Features
- Create and read YAML configuration files for your plugin.
- Config files automatically update missing keys in existing configs.
- Read and write plugin data to world, player, or server storage.

## How do I use this?
1. **Install the Plugin:** Install the **[latest version](https://github.com/palmmc/sconfig/releases/latest)** to your SerenityJS server's `plugins` directory.
2. **Install the Typings:** Install the NPM package into your plugin project's folder.

    ```bash
    #npm
    npm install serenity-config
  
    #yarn
    yarn add serenity-config
    
    #bun
    bun add serenity-config
    ```
> [!NOTE]
> If you are having trouble with this step, try adding `--prefix <path/to/your/plugin/project>` at the end of the command.
3. **Import into your Plugin:** In your plugin's main file, import the `SConfigPlugin` class.

    ```ts
    import type { SConfigPlugin } from "serenity-config";
    ```
4. **Resolve the Plugin Instance:** Once your plugin is initialized, resolve the `SConfigPlugin` instance that you have installed so you can use its features.
    ```ts
    import { Plugin } from "@serenityjs/plugins";
    
    import type { SConfigPlugin } from "serenity-config";
    
    class ExamplePlugin extends Plugin {  n
      public onInitialize(): void {
        // The resolve method fetches the SConfigPlugin instance from the plugin you installed.
        const { Properties, Storage } = this.resolve<SConfigPlugin>("serenity-config")!; // Notice the use of `!` can be unsafe if the plugin is not loaded correctly.
      }
    }
    ```
## Usage
For full examples, check out the source. SConfig has examples for both types in its `SConfigPlugin` class.
> **Example Usage**
```ts
const properties = new Properties<ExampleProperties>(
  this,
  "properties.yaml",
  EXAMPLE_PROPERTIES_TEMPLATE
);
properties.getValue("debug");

const storage = new Storage<ExampleStorage>(
  StorageType.Player,
  "players.sqlite",
  EXAMPLE_STORAGE_TEMPLATE
);
storage.setValue("example", true)
```
