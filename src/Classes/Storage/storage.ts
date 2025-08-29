import { resolve, extname, dirname, relative } from "node:path";
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import Database, { Statement } from "bun:sqlite";
import { SConfigPlugin } from "../../index";
import { Logger, LoggerColors } from "@serenityjs/logger";
import { StorageType } from "../../Enums/storageType";

let debugEnabled = false;

function setStorageDebug(plugin: SConfigPlugin) {
  debugEnabled = plugin.properties?.getValue("debug") ?? false;
}

/**
 * Versatile class for managing storage of plugin data.
 * Will read/write from the JSON or SQLite formats.
 */
class Storage<T extends object> {
  public static readonly logger = new Logger("Storage", LoggerColors.Blue);

  public readonly path: string;

  private readonly relative: string;

  private readonly type: "json" | "sqlite";

  private db?: Database;

  private statements?: {
    getValue: Statement;
    setValue: Statement;
    getAll: Statement;
  };

  // Temporary storage
  public values: T;

  /**
   * Creates a new world storage instance.
   * @param type Storage type.
   * @param path Relative path to file within world plugindata directory.
   * @param world The name of the world to store the data in.
   * @param values Default values to use to initialize storage file.
   */
  public constructor(
    type: StorageType.World,
    path: string,
    world: string,
    values: T
  );
  /**
   * Creates a new data storage instance.
   * @param type Storage type.
   * @param path Relative path to file within playerdata or plugindata directory.
   * @param values Default values to use to initialize storage file.
   */
  public constructor(
    type: StorageType.Player | StorageType.Server,
    path: string,
    values: T
  );
  public constructor(
    type: StorageType,
    path: string,
    worldOrValues: string | T,
    defaultValues?: T
  ) {
    let world: string | undefined;
    let values: T;

    if (type === StorageType.World) {
      world = worldOrValues as string;
      values = defaultValues!;
    } else {
      world = undefined;
      values = worldOrValues as T;
    }

    // Resolve path based on type.
    this.path = this.resolvePath(type, path, world);
    this.relative = relative(process.cwd(), this.path);

    // Determine the storage type from the file extension.
    const extension = extname(this.path);
    if (extension === ".json") {
      this.type = "json";
    } else if (extension === ".sqlite") {
      this.type = "sqlite";
    } else {
      throw new Error(`Storage accepts ".json" or ".sqlite".`);
    }

    // Check for valid directory.
    const dir = dirname(this.path);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    this.values = values;
    this.initialize();
  }

  /**
   * Resolves storage path for types.
   */
  private resolvePath(type: StorageType, path: string, world?: string) {
    let dir = process.cwd();

    switch (type) {
      case StorageType.World:
        if (!world) {
          throw new Error("Invalid world name: " + world + ".");
        }
        dir = resolve(dir, "worlds", world, "plugindata");
        break;
      case StorageType.Player:
        dir = resolve(dir, "playerdata");
        break;
      case StorageType.Server:
        dir = resolve(dir, "plugindata");
        break;
      default:
        throw new Error("Invalid storage type.");
    }

    return resolve(dir, path);
  }

  /**
   * Initialize JSON or SQL Database.
   */
  private initialize() {
    if (this.type === "json") {
      // Check json file exists.
      if (!existsSync(this.path)) {
        this.writeJson();
      } else {
        // Otherwise, read the existing data.
        this.readJson();
      }
    } else if (this.type === "sqlite") {
      // Initialize database
      this.db = new Database(this.path);

      // Create key value table if needed.
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS key_value (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )
      `);

      // Statement commands for SQLite
      this.statements = {
        getValue: this.db.prepare("SELECT value FROM key_value WHERE key = ?"),
        setValue: this.db.prepare(
          "INSERT INTO key_value (key, value) VALUES (@key, @value) ON CONFLICT(key) DO UPDATE SET value = @value"
        ),
        getAll: this.db.prepare("SELECT * FROM key_value"),
      };

      // Load all data from the database into values.
      this.readSqlite();
    }
    if (debugEnabled)
      Storage.logger.success(`Parsed storage file at "${this.relative}".`);
  }

  /**
   * Reads a value from storage.
   * @param key Key to fetch.
   */
  public getValue<K extends keyof T>(key: K) {
    return this.values[key];
  }

  /**
   * Writes a value to storage.
   * @param key Key to set.
   * @param value Value to set.
   */
  public setValue<K extends keyof T>(key: K, value: T[K]) {
    // Update values.
    this.values[key] = value;

    if (this.type === "json") {
      this.writeJson();
    } else if (this.type === "sqlite") {
      this.writeSqlite(key, value);
    }
  }

  /**
   * Read and parse JSON.
   */
  private readJson() {
    try {
      const rawData = readFileSync(this.path, "utf-8");
      const jsonData = JSON.parse(rawData) as T;
      // Merge with defaults to ensure all keys are present
      this.values = { ...this.values, ...jsonData };
    } catch (error) {
      // If parses as invalid, return null.
      if (debugEnabled)
        Storage.logger.warn(`§cFailed to read data at §r"${this.relative}"§c.`);
      return null;
    }
  }

  /**
   * Write values to JSON.
   */
  private writeJson() {
    const jsonString = JSON.stringify(this.values, null, 2);
    writeFileSync(this.path, jsonString, "utf-8");
  }

  /**
   * Read entries from SQLite database to populate values.
   */
  private readSqlite() {
    try {
      const rows = this.statements!.getAll.all() as {
        key: string;
        value: string;
      }[];

      const dbValues: Partial<T> = {};
      for (const row of rows) {
        dbValues[row.key as keyof T] = JSON.parse(row.value);
      }
      this.values = { ...this.values, ...dbValues };

      // Make sure default values are included in db.
      if (rows.length === 0) {
        for (const key in this.values) {
          this.writeSqlite(key, this.values[key]);
        }
      }
    } catch (error) {
      Storage.logger.warn(
        `§cFailed to read data from SQLite database at §r"${this.relative}"§c.`
      );
      return null;
    }
  }

  /**
   * Write entry to SQLite database.
   * @param key Key to set.
   * @param value Value to set.
   */
  private writeSqlite<K extends keyof T>(key: K, value: T[K]) {
    try {
      this.statements!.setValue.run({
        key: key,
        value: JSON.stringify(value),
      });
    } catch (error) {
      Storage.logger.error(
        `Error writing to SQLite database at "${this.relative}".`
      );
    }
  }
}

export { Storage, StorageType, setStorageDebug };
