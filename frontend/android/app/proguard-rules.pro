# Flutter specific rules
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.** { *; }
-keep class io.flutter.util.** { *; }
-keep class io.flutter.view.** { *; }
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }

# Play Core split-compat referenced by Flutter deferred-components stub;
# not used in this app — suppress missing class warning from R8
-dontwarn com.google.android.play.core.**
