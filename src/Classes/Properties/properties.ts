import { relative, resolve } from "node:path";
import {
  writeFileSync,
  readFileSync,
  rmSync,
  existsSync,
  mkdirSync,
} from "node:fs";

import { Logger, LoggerColors } from "@serenityjs/logger";
import { parse } from "yaml";
import { Plugin } from "@serenityjs/plugins";
import { SConfigPlugin } from "../../index";

let debugEnabled = false;

function setPropertiesDebug(plugin: SConfigPlugin) {
  debugEnabled = plugin.properties?.getValue("debug") ?? false;
}

class Properties<T> {
  public static readonly logger = new Logger("Properties", LoggerColors.Yellow);

  public readonly path: string;

  public readonly template: string;

  // Only used for logging purposes.
  public readonly relative: string;

  protected raw = "";

  public values: T;

  public constructor(plugin: Plugin, path: string, template: string) {
    this.path = resolve(
      plugin.path.replace("\\plugins\\", "\\config\\"),
      "..",
      plugin.identifier,
      path
    );

    this.template = template;

    this.relative = relative(process.cwd(), this.path);

    // If parses as invalid, reset to defaults.
    try {
      this.values = this.read();
    } catch (e) {
      //@ts-ignore
      this.values = null;
    }

    // Re-generate if config is invalid.
    if (this.values === null) {
      rmSync(this.path);
      this.values = this.read();
      if (debugEnabled)
        Properties.logger.warn(
          `Invalid properties file at "${this.relative}", regenerating...`
        );
    }

    // Check for missing properties.
    const defaultProperties = parse(this.template) as T;

    for (const key in defaultProperties) {
      if (!Object.keys(this.values as Record<string, unknown>).includes(key)) {
        // Get the comment for the property.
        const fetch = this.template.split(`\n${key}:`)[1];
        const comment = fetch
          ? fetch.split("\n")[1]?.startsWith("#")
            ? fetch.split("\n")[1]
            : ""
          : "";

        // Add the missing property to the configuration file.
        this.addValue(key, defaultProperties[key as keyof T], comment);
      }
    }

    if (debugEnabled)
      Properties.logger.success(
        `Parsed properties file at "${this.relative}".`
      );
  }

  /**
   * Read configuration properties.
   * @returns Properties file.
   */
  protected read(): T {
    // Check if config folder exists.
    const folderPath = resolve(this.path, "..");
    if (!existsSync(folderPath)) {
      // Create the config folder.
      mkdirSync(folderPath, { recursive: true });
    }

    // Check if properties file exists.
    if (!existsSync(this.path)) {
      // Create the properties file.
      mkdirSync(resolve(this.path, ".."), { recursive: true });
      writeFileSync(this.path, this.template);

      if (debugEnabled)
        Properties.logger.success(
          `Created properties file at "${this.relative}"`
        );
    }

    // Read the properties file.
    const properties = readFileSync(this.path, "utf8");

    // Assign the raw property.
    this.raw = properties;

    // Parse the properties file, and assign it to the values property.
    return parse(properties) as T;
  }

  /**
   * Write the properties file.
   */
  protected write(): void {
    writeFileSync(this.path, this.raw);

    // Update the values property.
    this.values = this.read();
  }

  /**
   * Get the value of the key.
   * @param key The key to get the value of.
   * @returns The value of the key.
   */
  public getValue<K extends keyof T>(key: K): T[K] {
    return this.values[key];
  }

  /**
   * Set the value of the key.
   * @param key The key to set the value of.
   * @param value The value to set.
   */
  public setValue<K extends keyof T>(key: K, value: T[K]): void {
    // Check if the key exists.
    // If not, we will add the key to the properties file.
    if (
      !Object.keys(this.values as Record<string, unknown>).includes(
        key as string
      )
    ) {
      return this.addValue(key as string, value);
    }

    // Update the value of the key.
    this.values[key] = value;

    // Update the raw property.
    this.raw = this.raw.replaceAll(
      new RegExp(`^${key as string}:.*$`, "gm"),
      `${key as string}: ${value}`
    );

    // Re-write the properties file.
    return this.write();
  }

  /**
   * Add a value to the properties file.
   * @param key The key to add the value to.
   * @param value The value to add.
   */
  public addValue(key: string, value: unknown, message?: string): void {
    // Check if that key already exists.
    if (Object.keys(this.values as Record<string, unknown>).includes(key)) {
      return this.setValue(key as keyof T, value as never);
    }

    // Add the value to the values property.
    this.values[key as keyof T] = value as never;

    // Add the value to the raw property.
    this.raw += `\n${key}: ${value}\n`;

    if (message) this.raw += `# ${message}\n`;

    // Re-write the properties file.
    return this.write();
  }
}

export { Properties, setPropertiesDebug };
