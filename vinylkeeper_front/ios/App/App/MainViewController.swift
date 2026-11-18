import Capacitor

/**
 * The view controller of the app (Main.storyboard): registers the plugins written in the app itself, which
 * CocoaPods does not find (it only knows those of node_modules).
 */
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(DiscogsAuthSessionPlugin())
        CAPLog.print("⚡️  Vinyl Keeper plugins registered: DiscogsAuthSession")
    }
}
