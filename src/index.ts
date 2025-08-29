/* Imports */
import { Plugin, PluginEvents, PluginPriority } from "@serenityjs/plugins";
import {
  Properties,
  setPropertiesDebug,
  setStorageDebug,
  Storage,
  StorageType,
} from "./Classes/classes";
import { ExampleProperties, ExampleStorage } from "./Example/Types/example";
import {
  EXAMPLE_PROPERTIES_TEMPLATE,
  EXAMPLE_STORAGE_TEMPLATE,
} from "./Example/Templates/example";

/**
 * @Plugin
 */

class SConfigPlugin extends Plugin implements PluginEvents {
  public readonly priority: PluginPriority = PluginPriority.High;
  public properties?: Properties<ExampleProperties>;

  public readonly Properties = Properties;
  public readonly Storage = Storage;
  public readonly StorageType = StorageType;

  public constructor() {
    super("serenity-config", "0.1.3");
  }

  public onInitialize(): void {
    this.initializeProperties();
    //this.initializeStorage();
  }

  /**
   * @Example
   */
  private initializeProperties() {
    const properties = new Properties<ExampleProperties>(
      this,
      "properties.yaml",
      EXAMPLE_PROPERTIES_TEMPLATE
    );
    this.properties = properties;
    setPropertiesDebug(this);
    setStorageDebug(this);
  }

  private initializeStorage() {
    const storage = new Storage<ExampleStorage>(
      StorageType.Player,
      "players.sqlite",
      EXAMPLE_STORAGE_TEMPLATE
    );
    storage.setValue("example", true);
  }

  public onStartUp(): void {
    this.logger.info(
      "Loaded §fSConfig§r §8by §5palm1 §7- §8v" + this.version + "§r"
    );
  }
}

export default new SConfigPlugin();

export { SConfigPlugin, Properties, Storage, StorageType };
