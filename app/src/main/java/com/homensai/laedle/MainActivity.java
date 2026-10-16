package com.homensai.laedle;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.graphics.Color;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.webkit.ConsoleMessage;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import org.json.JSONObject;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Small native Android host. Only the packaged origin can access the local-data bridge. */
public final class MainActivity extends Activity {
    private static final int EXPORT_FILE=31, IMPORT_FILE=32, PHOTO_FILE=33, MAX_FILE_BYTES=12*1024*1024;
    private WebView web;
    private FrameLayout root;
    private AppDatabase database;
    private final ExecutorService fileIo=Executors.newSingleThreadExecutor();
    private String pendingId, pendingExport;
    private boolean destroyed=false;

    @Override @SuppressLint("SetJavaScriptEnabled")
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        PackageInfo provider=WebView.getCurrentWebViewPackage();
        if(provider==null || webViewMajor(provider.versionName)<111) {
            new AlertDialog.Builder(this).setTitle("Lädle")
                .setMessage("Bitte Android System WebView aktualisieren.\nОбновите Android System WebView.\nPlease update Android System WebView (111+).")
                .setPositiveButton(android.R.string.ok,(dialog,which)->finish()).setOnCancelListener(dialog->finish()).show();
            return;
        }
        root=new FrameLayout(this);root.setBackgroundColor(Color.rgb(237,241,244));
        web=new WebView(this);web.setId(View.generateViewId());
        web.setContentDescription("Lädle Mini Local Bestellbuch");
        root.addView(web,new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT,FrameLayout.LayoutParams.MATCH_PARENT));
        setContentView(root);
        if(Build.VERSION.SDK_INT>=30) {
            getWindow().setDecorFitsSystemWindows(false);
            root.setOnApplyWindowInsetsListener((view,insets)->{
                Insets bars=insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                Insets keyboard=insets.getInsets(WindowInsets.Type.ime());
                view.setPadding(bars.left,bars.top,bars.right,Math.max(bars.bottom,keyboard.bottom));
                return WindowInsets.CONSUMED;
            });
        } else root.setFitsSystemWindows(true);
        database=new AppDatabase(this);
        WebSettings settings=web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setTextZoom(Math.round(100 * getResources().getConfiguration().fontScale));
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setBlockNetworkLoads(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setGeolocationEnabled(false);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        settings.setMediaPlaybackRequiresUserGesture(true);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        web.setWebChromeClient(new WebChromeClient(){
            @Override public boolean onConsoleMessage(ConsoleMessage message){return true;}
        });
        web.setWebViewClient(new WebViewClient(){
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){return !AssetPolicy.canNavigate(request.getUrl().toString());}
            @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){
                String asset=AssetPolicy.assetName(request.getUrl().toString());
                if(asset==null)return blocked();
                String mime=asset.endsWith(".html")?"text/html":asset.endsWith(".css")?"text/css":"application/javascript";
                try {
                    Map<String,String> headers=new HashMap<>();
                    headers.put("X-Content-Type-Options","nosniff");headers.put("Cache-Control","no-store");
                    return new WebResourceResponse(mime,"UTF-8",200,"OK",headers,getAssets().open(asset));
                }catch(Exception ex){return blocked();}
            }
        });
        web.addJavascriptInterface(new Bridge(),"LadleNative");
        if(Build.VERSION.SDK_INT>=33) getOnBackInvokedDispatcher().registerOnBackInvokedCallback(0,this::handleBack);
        web.loadUrl(AssetPolicy.HOME);
    }
    private static int webViewMajor(String version) {
        try {return Integer.parseInt(version.split("\\.")[0]);}catch(Exception ex){return 0;}
    }
    private static WebResourceResponse blocked(){return new WebResourceResponse("text/plain","UTF-8",403,"Blocked",new HashMap<>(),new ByteArrayInputStream(new byte[0]));}
    public WebView getWebViewForTesting(){return web;}
    private void appearance(String skin) {
        boolean dark="dark".equals(skin);
        int background=dark?Color.rgb(15,23,32):"paper".equals(skin)?Color.rgb(243,238,227):Color.rgb(237,241,244);
        root.setBackgroundColor(background);web.setBackgroundColor(background);
        if(Build.VERSION.SDK_INT>=30) {
            WindowInsetsController c=getWindow().getInsetsController();
            if(c!=null)c.setSystemBarsAppearance(dark?0:WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS|WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS,WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS|WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS);
        } else getWindow().getDecorView().setSystemUiVisibility(dark?0:View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR|View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
        if(Build.VERSION.SDK_INT<35){getWindow().setStatusBarColor(background);getWindow().setNavigationBarColor(background);}
    }
    private void handleBack() {
        if(web==null){finish();return;}
        web.evaluateJavascript("window.LadleBack ? window.LadleBack() : false",value->{if("false".equals(value)||"null".equals(value))finish();});
    }
    @Override @SuppressWarnings("deprecation") public void onBackPressed(){handleBack();}
    @Override protected void onPause(){if(web!=null){web.evaluateJavascript("window.LadleFlushDraft && window.LadleFlushDraft()",null);web.onPause();}super.onPause();}
    @Override protected void onResume(){super.onResume();if(web!=null)web.onResume();}
    @Override public void onConfigurationChanged(android.content.res.Configuration config){
        super.onConfigurationChanged(config);
        if(root!=null)root.requestApplyInsets();
        if(web!=null)web.getSettings().setTextZoom(Math.round(100 * config.fontScale));
        // The WebView is retained so a draft survives rotation and keyboard changes.
    }
    @Override protected void onDestroy(){
        destroyed=true;
        if(web!=null){web.removeJavascriptInterface("LadleNative");web.destroy();}
        if(database!=null)database.close();fileIo.shutdown();super.onDestroy();
    }
    public final class Bridge {
        @JavascriptInterface public String readDraft(){return database.readDraft();}
        @JavascriptInterface public String saveDraft(String payload){return database.saveDraft(payload);}
        @JavascriptInterface public String recoveryList(){return database.recoveryList();}
        @JavascriptInterface public String restoreHistory(long expected,long revision){return database.restoreHistory(expected,revision);}
        @JavascriptInterface public void choosePhoto(String requestId){
            runOnUiThread(()->{
                if(destroyed)return;if(pendingId!=null||!validRequestId(requestId)){callback(requestId,AppDatabase.failure("file"));return;}
                pendingId=requestId;Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("image/*");
                intent.putExtra(Intent.EXTRA_MIME_TYPES,new String[]{"image/jpeg","image/png","image/webp"});intent.putExtra(Intent.EXTRA_LOCAL_ONLY,true);
                try{startActivityForResult(intent,PHOTO_FILE);}catch(Exception ex){clearPending();callback(requestId,AppDatabase.failure("file"));}
            });
        }
        @JavascriptInterface public String load(){return database.load();}
        @JavascriptInterface public String save(long expectedRevision,String payload){return database.save(expectedRevision,payload);}
        @JavascriptInterface public void appearance(String skin){
            if(!"light".equals(skin)&&!"dark".equals(skin)&&!"paper".equals(skin)&&!"compact".equals(skin))return;
            runOnUiThread(()->{if(!destroyed)MainActivity.this.appearance(skin);});
        }
        @JavascriptInterface public void exportFile(String requestId,String encrypted){
            runOnUiThread(()->{
                if(destroyed)return;
                if(pendingId!=null || !validRequestId(requestId) || !validBackupEnvelope(encrypted)){callback(requestId,AppDatabase.failure("file"));return;}
                pendingId=requestId;pendingExport=encrypted;
                Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("application/json");
                intent.putExtra(Intent.EXTRA_TITLE,"Laedle-"+java.time.LocalDate.now()+".ladle");
                try{startActivityForResult(intent,EXPORT_FILE);}catch(Exception ex){clearPending();callback(requestId,AppDatabase.failure("file"));}
            });
        }
        @JavascriptInterface public void importFile(String requestId){
            runOnUiThread(()->{
                if(destroyed)return;
                if(pendingId!=null||!validRequestId(requestId)){callback(requestId,AppDatabase.failure("file"));return;}
                pendingId=requestId;
                Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*");
                try{startActivityForResult(intent,IMPORT_FILE);}catch(Exception ex){clearPending();callback(requestId,AppDatabase.failure("file"));}
            });
        }
    }
    private static boolean validRequestId(String id){return id!=null&&id.matches("[a-zA-Z0-9_-]{1,80}");}
    private static boolean validBackupEnvelope(String text){
        if(text==null||text.length()>MAX_FILE_BYTES)return false;
        try{JSONObject o=new JSONObject(text);return "HomenS.AI-Laedle-AES256GCM".equals(o.getString("format"))&&o.getInt("version")==1&&o.has("data")&&o.has("iv")&&o.has("salt");}catch(Exception ex){return false;}
    }
    private void clearPending(){pendingId=null;pendingExport=null;}
    private void callback(String id,String result){
        if(!validRequestId(id))return;
        runOnUiThread(()->{if(!destroyed&&web!=null)web.evaluateJavascript("window.LadleNativeResult && window.LadleNativeResult("+JSONObject.quote(id)+","+JSONObject.quote(result)+")",null);});
    }
    @Override @SuppressWarnings("deprecation") protected void onActivityResult(int requestCode,int resultCode,Intent intent){
        super.onActivityResult(requestCode,resultCode,intent);
        if(requestCode!=EXPORT_FILE&&requestCode!=IMPORT_FILE&&requestCode!=PHOTO_FILE)return;
        String id=pendingId,encrypted=pendingExport;clearPending();if(id==null)return;
        if(resultCode!=RESULT_OK||intent==null||intent.getData()==null){callback(id,"{\"ok\":true,\"cancelled\":true}");return;}
        Uri uri=intent.getData();
        fileIo.execute(()->{
            try{
                if(requestCode==PHOTO_FILE){
                    try(InputStream input=getContentResolver().openInputStream(uri)){if(input==null)throw new IllegalStateException("No image stream");callback(id,new JSONObject().put("ok",true).put("photo",PhotoImporter.read(input)).toString());}
                }else if(requestCode==EXPORT_FILE){
                    if(encrypted==null)throw new IllegalStateException("No export data");
                    try(OutputStream out=getContentResolver().openOutputStream(uri,"wt")){if(out==null)throw new IllegalStateException("No file stream");out.write(encrypted.getBytes(StandardCharsets.UTF_8));out.flush();}
                    callback(id,"{\"ok\":true}");
                }else{
                    String text;
                    try(InputStream input=getContentResolver().openInputStream(uri);ByteArrayOutputStream output=new ByteArrayOutputStream()){
                        if(input==null)throw new IllegalStateException("No file stream");
                        byte[] buffer=new byte[8192];int count,total=0;
                        while((count=input.read(buffer))!=-1){total+=count;if(total>MAX_FILE_BYTES)throw new IllegalArgumentException("Oversize");output.write(buffer,0,count);}
                        text=new String(output.toByteArray(),StandardCharsets.UTF_8);
                    }
                    callback(id,new JSONObject().put("ok",true).put("text",text).toString());
                }
            }catch(Exception ex){callback(id,AppDatabase.failure(requestCode==PHOTO_FILE?"photo":"file"));}
        });
    }
}
