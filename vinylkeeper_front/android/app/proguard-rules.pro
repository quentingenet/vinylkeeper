# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# --- Vinyl Keeper -----------------------------------------------------------------------------------
# Plugins are found by Capacitor through their annotations (the keep rules of Capacitor cover them);
# this app's own plugin and activity are kept by name as well, so that a rename can never break them.
-keep class org.vinylkeeper.app.** { *; }

# Annotations and generic signatures are read at run time by the plugins
-keepattributes *Annotation*, Signature, InnerClasses, EnclosingMethod

# Readable stack traces in Google Play's crash reports (with the mapping file sent with the bundle)
-keepattributes SourceFile, LineNumberTable
-renamesourcefileattribute SourceFile
