import com.homensai.laedle.AssetPolicy;
import java.util.Objects;

/** This runs on a desktop JDK: it is not an Android runtime test. */
public final class AssetPolicyTest {
    private static int passed;
    private static void equal(Object actual,Object expected,String label) {
        if(!Objects.equals(actual,expected))throw new AssertionError(label+": "+actual+" != "+expected);
        passed++;
    }
    public static void main(String[] args) {
        for(String file:new String[]{"catalog-data.js","index.html","styles.css","core.js","storage.js","i18n.js","ui.js"}) {
            String url=AssetPolicy.ORIGIN+"/assets/www/"+file;
            equal(AssetPolicy.assetName(url),"www/"+file,file);
            equal(AssetPolicy.canNavigate(url),file.equals("index.html"),"navigation "+file);
        }
        String[] rejected={null,"","http://appassets.androidplatform.net/assets/www/index.html",
            "https://evil.example/assets/www/index.html","https://appassets.androidplatform.net.evil.example/assets/www/index.html",
            "https://user@appassets.androidplatform.net/assets/www/index.html",
            "https://appassets.androidplatform.net:443/assets/www/index.html",
            "https://appassets.androidplatform.net/assets/www/index.html?x=1",
            "file:///android_asset/www/index.html","content://app/index.html","javascript:alert(1)",
            "data:text/html,<script>x</script>","https://appassets.androidplatform.net/assets/www/../../store.sql",
            "https://appassets.androidplatform.net/assets/www/%2e%2e/store.sql",
            "https://appassets.androidplatform.net/assets/www/%69ndex.html",
            "https://appassets.androidplatform.net/assets/www/index.html/extra",
            "https://appassets.androidplatform.net/assets/www\\index.html",
            "https://appassets.androidplatform.net/assets/www/private.json",
            "https://appassets.androidplatform.net/assets/store.sql",
            "https://appassets.androidplatform.net//assets/www/index.html","not a URI"};
        for(String value:rejected)equal(AssetPolicy.assetName(value),null,"reject "+value);
        equal(AssetPolicy.canNavigate(AssetPolicy.HOME+"#main"),true,"safe fragment");
        System.out.println("PASS "+passed+" exact-origin/path assertions (JVM, no Android SDK)");
    }
}
