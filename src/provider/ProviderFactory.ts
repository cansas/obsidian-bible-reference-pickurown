import { App } from 'obsidian'
import { IBibleVersion } from '../interfaces/IBibleVersion'
import { BibleAPIDotComProvider } from './BibleAPIDotComProvider'
import { BaseBibleAPIProvider } from './BaseBibleAPIProvider'
import { BibleAPISourceCollection } from '../data/BibleApiSourceCollection'
import { BollyLifeProvider } from './BollyLifeProvider'
import { BibleSuperSearchProvider } from './BibleSuperSearchProvider'
import { VaultLocalProvider } from './VaultLocalProvider'

/**
 * A factory for Bible API providers.
 * To create provider instance and decide which provider to use.
 */
export class ProviderFactory {
  private static _instance: ProviderFactory
  private _app: App | null = null

  private constructor() {
    if (ProviderFactory._instance) {
      throw new Error(
        'Error: Instantiation failed: Use BibleAPIFactory.Instance instead of new.'
      )
    }
    ProviderFactory._instance = this
  }

  public static get Instance(): ProviderFactory {
    if (!ProviderFactory._instance) {
      ProviderFactory._instance = new ProviderFactory()
    }
    return ProviderFactory._instance
  }

  /**
   * Call once from the plugin's onload() to give vault-local providers
   * access to the Obsidian App (needed to read vault files).
   */
  public static setApp(app: App): void {
    ProviderFactory.Instance._app = app
  }

  /**
   * Get the bible api provider from bible version selected
   * @param bibleVersion
   */
  public BuildBibleVersionAPIAdapterFromIBibleVersion(
    bibleVersion: IBibleVersion
  ): BaseBibleAPIProvider {
    switch (bibleVersion.apiSource) {
      case BibleAPISourceCollection.bibleApi: {
        return new BibleAPIDotComProvider(bibleVersion)
      }
      case BibleAPISourceCollection.bollsLife: {
        return new BollyLifeProvider(bibleVersion)
      }
      case BibleAPISourceCollection.bibleSuperSearch: {
        return new BibleSuperSearchProvider(bibleVersion)
      }
      case BibleAPISourceCollection.vaultLocal: {
        if (!this._app) {
          console.error(
            'ProviderFactory: vaultLocal provider requested but app is not set. Call ProviderFactory.setApp() in plugin onload().'
          )
          throw new Error('App not set for vaultLocal provider')
        }
        return new VaultLocalProvider(bibleVersion, this._app)
      }
      default: {
        return new BibleAPIDotComProvider(bibleVersion)
      }
    }
  }
}
