package com.homensai.laedle;

import android.app.Activity;
import android.app.Instrumentation;
import android.content.Intent;
import android.database.Cursor;
import android.os.Bundle;
import android.os.SystemClock;
import org.json.JSONObject;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

/** Device-only native integration tests. Run on an emulator or an expendable test device.
 * The database tests use a separate database. The UI test only opens the debug app; image tests use synthetic pixels.
 * No customer data is inserted into or cleared from the app's production database.
 */
public final class DeviceTests extends Instrumentation {
    private int passed,failed,current;
    @Override public void onCreate(Bundle arguments){super.onCreate(arguments);start();}
    private interface Check { void run() throws Exception; }
    private void test(String name,Check check) {
        Bundle status=new Bundle(); status.putString("class",getClass().getName());status.putString("test",name);
        status.putInt("numtests",25);status.putInt("current",++current);sendStatus(1,status);
        try{check.run();passed++;status.putString("stream","PASS "+name+"\n");sendStatus(0,status);}
        catch(Throwable ex){failed++;status.putString("stack",ex.toString());status.putString("stream","FAIL "+name+": "+ex+"\n");sendStatus(-2,status);}
    }
    private static void require(boolean condition){if(!condition)throw new AssertionError("Assertion failed");}
    private static JSONObject json(String text) throws Exception{return new JSONObject(text);}
    private static String state() {
        return "{\"schemaVersion\":1,\"shop\":{\"name\":\"Instrumented test shop\",\"owner\":\"\",\"street\":\"\",\"zip\":\"\",\"city\":\"\",\"phone\":\"\",\"email\":\"\",\"hours\":\"\",\"currency\":\"EUR\",\"language\":\"de\",\"skin\":\"light\"},\"events\":[],\"customers\":[],\"orders\":[]}";
    }
    private static String catalogState() throws Exception {
        JSONObject root=json(state());root.put("schemaVersion",2);
        root.put("catalog",new org.json.JSONArray("[{\"id\":\"tpl-beef-1\",\"category\":\"beef\",\"names\":{\"de\":\"Rind\",\"en\":\"Beef\",\"ru\":\"Говядина\"},\"imageKey\":\"steak\",\"defaultPrice\":null,\"active\":true,\"archived\":false}]"));
        return root.toString();
    }
    private String fixture() throws Exception {
        try(java.io.InputStream input=getContext().getAssets().open("mini-fixture.json")){
            java.io.ByteArrayOutputStream out=new java.io.ByteArrayOutputStream();byte[] b=new byte[4096];int n;
            while((n=input.read(b))!=-1)out.write(b,0,n);
            return new String(out.toByteArray(),java.nio.charset.StandardCharsets.UTF_8);
        }
    }
    private static void rejected(String payload) throws Exception {
        boolean rejected=false;
        try { SnapshotValidator.validate(payload); } catch (IllegalArgumentException | org.json.JSONException ex) { rejected=true; }
        require(rejected);
    }
    @Override public void onStart() {
        super.onStart();
        String name="instrumentation-only-"+System.currentTimeMillis()+".db";
        AppDatabase db=new AppDatabase(getTargetContext(),name);
        test("fresh SQLite database",()->{JSONObject x=json(db.load());require(x.getBoolean("ok")&&x.getInt("revision")==0&&x.isNull("state"));});
        test("atomic native save and read",()->{require(json(db.save(0,state())).getInt("revision")==1);require(json(db.load()).getJSONObject("state").getJSONObject("shop").getString("name").equals("Instrumented test shop"));});
        test("stale revision is rejected",()->{require(json(db.save(0,state())).getString("error").equals("conflict"));require(json(db.load()).getInt("revision")==1);});
        test("bad snapshot cannot overwrite",()->{require(!json(db.save(1,"{bad")).getBoolean("ok"));require(json(db.load()).getInt("revision")==1);});
        test("native history is bounded",()->{for(int n=1;n<=7;n++)require(json(db.save(n,state())).getBoolean("ok"));try(Cursor c=db.getReadableDatabase().rawQuery("SELECT COUNT(*) FROM history",null)){require(c.moveToFirst()&&c.getInt(0)==5);}});
        test("reopen persists committed snapshot",()->{db.close();try(AppDatabase reopened=new AppDatabase(getTargetContext(),name)){require(json(reopened.load()).getInt("revision")==8);}});
        try { db.close(); getTargetContext().deleteDatabase(name); } catch(Exception ignored) { }
        test("legacy schema remains accepted",()->{require(SnapshotValidator.validate(state()).getInt("schemaVersion")==1);});
        test("schema two catalog validates in Android org.json",()->{require(SnapshotValidator.validate(catalogState()).getJSONArray("catalog").length()==1);});
        test("catalog schema persists in actual SQLite",()->{
            String catalogDbName="instrumentation-catalog-only-"+System.currentTimeMillis()+".db";
            try(AppDatabase catalogDb=new AppDatabase(getTargetContext(),catalogDbName)) {
                require(json(catalogDb.save(0,catalogState())).getBoolean("ok"));
                require(json(catalogDb.load()).getJSONObject("state").getInt("schemaVersion")==2);
            } finally { getTargetContext().deleteDatabase(catalogDbName); }
        });
        test("untrusted image key rejected by native validator",()->{JSONObject root=json(catalogState());root.getJSONArray("catalog").getJSONObject(0).put("imageKey","<svg onload=alert(1)>");rejected(root.toString());});
        test("catalog price key required even when nullable",()->{JSONObject root=json(catalogState());root.getJSONArray("catalog").getJSONObject(0).remove("defaultPrice");rejected(root.toString());});
        test("active archived catalog state rejected",()->{JSONObject root=json(catalogState());root.getJSONArray("catalog").getJSONObject(0).put("archived",true);rejected(root.toString());});
        test("schema three units, partial sale, extra item and payment validate",()->{
            JSONObject x=SnapshotValidator.validate(fixture());require(x.getInt("schemaVersion")==3);
            require(x.getJSONArray("orders").getJSONObject(0).getJSONObject("sale").getJSONArray("lines").length()==3);
        });
        test("native rejects fractional pieces",()->{
            JSONObject x=json(fixture());x.getJSONArray("orders").getJSONObject(0).getJSONArray("lines").getJSONObject(1).put("grams",500);rejected(x.toString());
        });
        test("native rejects mismatched order unit",()->{
            JSONObject x=json(fixture());x.getJSONArray("orders").getJSONObject(0).getJSONArray("lines").getJSONObject(1).put("unit","kg");rejected(x.toString());
        });
        test("native rejects closing a partial collection",()->{
            JSONObject x=json(fixture());x.getJSONArray("events").getJSONObject(0).put("closed",true);rejected(x.toString());
        });
        test("native rejects payment above actual sale",()->{
            JSONObject x=json(fixture());x.getJSONArray("orders").getJSONObject(0).getJSONObject("payment").put("amount",999999);rejected(x.toString());
        });
        test("native rejects remote catalog image URI",()->{
            JSONObject x=json(fixture());x.getJSONArray("catalog").getJSONObject(0).put("photo","https://example.com/photo.jpg");rejected(x.toString());
        });
        test("draft persists across actual SQLite reopen without confirming an order",()->{
            String n="instrumentation-draft-"+System.nanoTime()+".db";
            try{
                try(AppDatabase d=new AppDatabase(getTargetContext(),n)){
                    require(json(d.save(0,fixture())).getBoolean("ok"));
                    require(json(d.saveDraft("{\"version\":1,\"revision\":1,\"ui\":{\"screen\":\"orderForm\"}}")).getBoolean("ok"));
                }
                try(AppDatabase d=new AppDatabase(getTargetContext(),n)){
                    require(!json(d.readDraft()).getString("text").isEmpty());require(json(d.load()).getInt("revision")==1);
                    require(json(d.saveDraft("")).getBoolean("ok"));require(json(d.readDraft()).getString("text").isEmpty());
                }
            }finally{getTargetContext().deleteDatabase(n);}
        });
        test("database v1 migration preserves state and creates draft table",()->{
            String n="instrumentation-migration-"+System.nanoTime()+".db";
            try{
                try(android.database.sqlite.SQLiteDatabase legacy=getTargetContext().openOrCreateDatabase(n,0,null)){
                    legacy.execSQL("CREATE TABLE state (id INTEGER PRIMARY KEY, revision INTEGER, payload TEXT, updated_at INTEGER)");
                    legacy.execSQL("CREATE TABLE history (revision INTEGER PRIMARY KEY, payload TEXT, updated_at INTEGER)");
                    legacy.execSQL("INSERT INTO state VALUES(1,7,?,1)",new Object[]{state()});legacy.setVersion(1);
                }
                try(AppDatabase d=new AppDatabase(getTargetContext(),n)){
                    require(json(d.load()).getInt("revision")==7);require(json(d.readDraft()).getString("text").isEmpty());
                    require(d.getReadableDatabase().getVersion()==2);
                }
            }finally{getTargetContext().deleteDatabase(n);}
        });
        test("corrupted head can recover valid history with revision guard",()->{
            String n="instrumentation-recovery-"+System.nanoTime()+".db";
            try(AppDatabase d=new AppDatabase(getTargetContext(),n)){
                require(json(d.save(0,state())).getBoolean("ok"));require(json(d.save(1,fixture())).getBoolean("ok"));
                d.getWritableDatabase().execSQL("UPDATE state SET payload='broken' WHERE id=1");
                require(!json(d.load()).getBoolean("ok"));require(json(d.recoveryList()).getJSONArray("history").getJSONObject(0).getBoolean("valid"));
                require(json(d.restoreHistory(1,1)).getString("error").equals("conflict"));
                require(json(d.restoreHistory(2,1)).getInt("revision")==3);require(json(d.load()).getBoolean("ok"));
            }finally{getTargetContext().deleteDatabase(n);}
        });
        test("native photo importer creates bounded JPEG",()->{
            android.graphics.Bitmap bitmap=android.graphics.Bitmap.createBitmap(1600,1200,android.graphics.Bitmap.Config.ARGB_8888);
            java.io.ByteArrayOutputStream out=new java.io.ByteArrayOutputStream();
            try{bitmap.eraseColor(0xff808080);require(bitmap.compress(android.graphics.Bitmap.CompressFormat.PNG,100,out));}finally{bitmap.recycle();}
            String photo=PhotoImporter.read(new java.io.ByteArrayInputStream(out.toByteArray()));
            require(photo.startsWith("data:image/jpeg;base64,")&&photo.length()<=180000);
            byte[] bytes=android.util.Base64.decode(photo.substring(photo.indexOf(',')+1),android.util.Base64.DEFAULT);
            android.graphics.BitmapFactory.Options options=new android.graphics.BitmapFactory.Options();options.inJustDecodeBounds=true;
            android.graphics.BitmapFactory.decodeByteArray(bytes,0,bytes.length,options);require(options.outWidth==512&&options.outHeight==384&&"image/jpeg".equals(options.outMimeType));
            android.media.ExifInterface exif=new android.media.ExifInterface(new java.io.ByteArrayInputStream(bytes));
            require(exif.getAttribute(android.media.ExifInterface.TAG_GPS_LATITUDE)==null);
        });
        test("native image importer rejects malformed bytes",()->{
            boolean rejected=false;try{PhotoImporter.read(new java.io.ByteArrayInputStream(new byte[]{1,2,3}));}catch(java.io.IOException ex){rejected=true;}require(rejected);
        });
        test("native importer bounds large input stream",()->{
            boolean rejected=false;try{PhotoImporter.read(new java.io.ByteArrayInputStream(new byte[10*1024*1024+1]));}catch(java.io.IOException ex){rejected=true;}require(rejected);
        });
        test("packaged WebView boot and restricted bridge",()->{
            Intent intent=new Intent(getTargetContext(),MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            MainActivity activity=(MainActivity)startActivitySync(intent);
            try{
                boolean ready=false;
                for(int n=0;n<80&&!ready;n++){
                    CountDownLatch done=new CountDownLatch(1);AtomicReference<String> result=new AtomicReference<>();
                    runOnMainSync(()->{if(activity.getWebViewForTesting()==null){done.countDown();return;}activity.getWebViewForTesting().evaluateJavascript("Boolean(window.LadleAppReady && window.LadleNative && document.querySelector('h1'))",value->{result.set(value);done.countDown();});});
                    require(done.await(5,TimeUnit.SECONDS));ready="true".equals(result.get());if(!ready)SystemClock.sleep(100);
                }
                require(ready);require(!AssetPolicy.canNavigate("https://example.com"));
            }finally{runOnMainSync(activity::finish);}
        });
        Bundle result=new Bundle();result.putString("RESULTS_OK",failed==0?"true":"false");
        result.putString("stream","\nNative device tests: "+passed+" passed, "+failed+" failed\n");
        finish(Activity.RESULT_OK,result);
    }
}
