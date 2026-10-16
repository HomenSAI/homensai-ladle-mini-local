package com.homensai.laedle;

import java.net.URI;
import java.util.Set;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Collections;

/** Exact allow-list. No encoded path traversal, ports, userinfo or foreign origins. */
public final class AssetPolicy {
    public static final String ORIGIN = "https://appassets.androidplatform.net";
    public static final String HOME = ORIGIN + "/assets/www/index.html";
    private static final Set<String> FILES = Collections.unmodifiableSet(new HashSet<>(Arrays.asList("catalog-data.js", "index.html", "styles.css", "core.js", "storage.js", "i18n.js", "ui.js")));
    private AssetPolicy() {}
    public static String assetName(String url) {
        try {
            if(url==null) return null;
            URI uri = URI.create(url);
            if (!"https".equals(uri.getScheme()) || !"appassets.androidplatform.net".equals(uri.getHost())
                    || uri.getRawUserInfo() != null || uri.getPort() != -1 || uri.getRawQuery() != null) return null;
            String path = uri.getRawPath();
            if (path == null || !path.startsWith("/assets/www/")) return null;
            String file = path.substring("/assets/www/".length());
            return FILES.contains(file) ? "www/" + file : null;
        } catch (IllegalArgumentException ex) { return null; }
    }
    public static boolean canNavigate(String url) {
        return "www/index.html".equals(assetName(url));
    }
}
