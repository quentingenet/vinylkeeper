import AuthenticationServices
import Capacitor

/**
 * "Connect with Discogs" in the iOS app: the Discogs authorization page opens in the sign-in sheet of iOS
 * (ASWebAuthenticationSession). Discogs sends the user back to vinylkeeper.org/discogs/callback?app=ios,
 * which relays to org.vinylkeeper.app://discogs/callback: the session catches that address, closes, and
 * hands it to the app, which finishes the connection with its own session. Only that session receives the
 * address, and only the Discogs authorization page can be opened.
 */
@objc(DiscogsAuthSessionPlugin)
public class DiscogsAuthSessionPlugin: CAPPlugin, CAPBridgedPlugin, ASWebAuthenticationPresentationContextProviding {
    public let identifier = "DiscogsAuthSessionPlugin"
    public let jsName = "DiscogsAuthSession"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise)
    ]

    private static let callbackScheme = "org.vinylkeeper.app"
    private static let authorizeHost = "www.discogs.com"
    private static let authorizePath = "/oauth/authorize"

    // Kept while the sheet is open: a released session closes at once
    private var session: ASWebAuthenticationSession?

    @objc func start(_ call: CAPPluginCall) {
        guard let raw = call.getString("url"),
              let url = URL(string: raw),
              url.scheme == "https",
              url.host == Self.authorizeHost,
              url.path == Self.authorizePath else {
            call.reject("Not the Discogs authorization page")
            return
        }
        DispatchQueue.main.async {
            let session = ASWebAuthenticationSession(url: url, callbackURLScheme: Self.callbackScheme) { [weak self] callbackURL, error in
                self?.session = nil
                if let callbackURL = callbackURL {
                    call.resolve(["url": callbackURL.absoluteString])
                } else if let authError = error as? ASWebAuthenticationSessionError, authError.code == .canceledLogin {
                    call.reject("The connection to Discogs was cancelled", "CANCELLED")
                } else {
                    call.reject(error?.localizedDescription ?? "The connection to Discogs failed")
                }
            }
            session.presentationContextProvider = self
            // The Discogs login of Safari is kept: the member does not type it again
            session.prefersEphemeralWebBrowserSession = false
            self.session = session
            if !session.start() {
                self.session = nil
                call.reject("The connection to Discogs could not start")
            }
        }
    }

    public func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        return bridge?.webView?.window ?? ASPresentationAnchor()
    }
}
