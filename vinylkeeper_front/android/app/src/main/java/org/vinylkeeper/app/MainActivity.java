package org.vinylkeeper.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Plugins of the app itself are registered before the bridge starts
        registerPlugin(StreamingLauncherPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
