package org.vinylkeeper.app;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Arrays;
import java.util.List;

/**
 * "Listen on Spotify / Deezer / YouTube Music": opens the link in the music app when it is installed,
 * in the browser when it is not. A WebView cannot do it by itself (it does not read intent:// links, and
 * a plain https link goes to the browser), so the intent is built here, aimed at the package of the app.
 *
 * Only these three apps, and only their links, can be opened: the page in the WebView must not be able to
 * launch anything else.
 */
@CapacitorPlugin(name = "StreamingLauncher")
public class StreamingLauncherPlugin extends Plugin {
    private static final List<String> PACKAGES = Arrays.asList(
        "com.spotify.music",
        "deezer.android.app",
        "com.google.android.apps.youtube.music"
    );
    private static final List<String> APP_SCHEMES = Arrays.asList("https", "spotify", "deezer");
    private static final List<String> WEB_SCHEMES = Arrays.asList("https");

    @PluginMethod
    public void open(PluginCall call) {
        String url = call.getString("url");
        String packageName = call.getString("packageName");
        String fallbackUrl = call.getString("fallbackUrl");
        if (url == null || packageName == null || fallbackUrl == null
                || !PACKAGES.contains(packageName)
                || !hasScheme(url, APP_SCHEMES)
                || !hasScheme(fallbackUrl, WEB_SCHEMES)) {
            call.reject("Not a streaming link of Vinyl Keeper");
            return;
        }

        JSObject result = new JSObject();
        try {
            Intent app = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            app.setPackage(packageName);
            app.addCategory(Intent.CATEGORY_BROWSABLE);
            app.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(app);
            result.put("opened", "app");
        } catch (ActivityNotFoundException appNotInstalled) {
            try {
                Intent web = new Intent(Intent.ACTION_VIEW, Uri.parse(fallbackUrl));
                web.addCategory(Intent.CATEGORY_BROWSABLE);
                web.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(web);
                result.put("opened", "browser");
            } catch (ActivityNotFoundException noBrowser) {
                call.reject("No app can open this link");
                return;
            }
        }
        call.resolve(result);
    }

    private static boolean hasScheme(String url, List<String> allowed) {
        String scheme = Uri.parse(url).getScheme();
        return scheme != null && allowed.contains(scheme.toLowerCase());
    }
}
