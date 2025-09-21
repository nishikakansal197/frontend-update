import 'dotenv/config';

export default {
    expo: {
        name: "जनConnect",
        slug: "जनConnect",
        version: "1.0.0",
        orientation: "portrait",
        icon: "./assets/images/favicon.png",
        scheme: "myapp",
        userInterfaceStyle: "automatic",
        newArchEnabled: true,
        ios: { supportsTablet: true, bundleIdentifier: "com.जनConnect.expo" },
        android: { package: "com.जनConnect.expo", versionCode: 1 },
        web: { bundler: "metro", output: "single", favicon: "./assets/images/favicon.png" },
        plugins: ["expo-router", "expo-font", "expo-web-browser", "expo-localization"],
        experiments: { typedRoutes: true },
        extra: {
            SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
            SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
        },
    },
};
