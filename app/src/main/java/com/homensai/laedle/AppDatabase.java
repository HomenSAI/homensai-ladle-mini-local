package com.homensai.laedle;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import org.json.JSONException;
import org.json.JSONObject;
import org.json.JSONArray;
import java.io.IOException;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

/** One atomic, versioned aggregate. All confirmed UI data lives here, never in WebView localStorage. */
public final class AppDatabase extends SQLiteOpenHelper {
    private final Context context;
    public AppDatabase(Context context) { this(context,"laedle.db"); }
    public AppDatabase(Context context,String name) { super(context.getApplicationContext(),name,null,2);this.context=context.getApplicationContext(); }
    @Override public void onConfigure(SQLiteDatabase db) {
        super.onConfigure(db);
        db.setForeignKeyConstraintsEnabled(true);
        // Rollback journal + FULL sync: the small snapshot is all-or-nothing on interruption.
        db.execSQL("PRAGMA synchronous=FULL");
    }
    @Override public void onCreate(SQLiteDatabase db) {
        try(InputStream input=context.getAssets().open("store.sql")) {
            ByteArrayOutputStream bytes=new ByteArrayOutputStream();
            byte[] buffer=new byte[4096];int count;while((count=input.read(buffer))!=-1)bytes.write(buffer,0,count);
            String sql=new String(bytes.toByteArray(),StandardCharsets.UTF_8).replaceAll("(?m)^--.*$","");
            for(String statement:sql.split(";")) if(!statement.trim().isEmpty()) db.execSQL(statement.trim());
        } catch(IOException ex) { throw new IllegalStateException("Missing database schema",ex); }
    }
    @Override public void onUpgrade(SQLiteDatabase db,int oldVersion,int newVersion) {
        if(oldVersion==1&&newVersion==2){db.execSQL("CREATE TABLE draft (id INTEGER PRIMARY KEY CHECK(id=1),payload TEXT NOT NULL)");return;}
        throw new IllegalStateException("Explicit database migration required");
    }
    public static String failure(String code) {
        try { return new JSONObject().put("ok",false).put("error",code).toString(); }
        catch(JSONException ignored) { return "{\"ok\":false,\"error\":\"storage\"}"; }
    }
    public synchronized String load() {
        try(Cursor cursor=getReadableDatabase().rawQuery("SELECT revision,payload FROM state WHERE id=1",null)) {
            if(!cursor.moveToFirst()) return new JSONObject().put("ok",true).put("revision",0).put("state",JSONObject.NULL).toString();
            JSONObject data=SnapshotValidator.validate(cursor.getString(1));
            return new JSONObject().put("ok",true).put("revision",cursor.getLong(0)).put("state",data).toString();
        }catch(Exception ex){return failure("storage");}
    }
    public synchronized String save(long expectedRevision,String payload) {
        try { SnapshotValidator.validate(payload); }
        catch(IllegalArgumentException ex){return failure("version".equals(ex.getMessage())?"version":"data");}
        catch(Exception ex){return failure("data");}
        if(expectedRevision<0 || expectedRevision>=9007199254740990L)return failure("data");
        SQLiteDatabase db;
        try { db=getWritableDatabase();db.beginTransaction(); }
        catch(Exception ex){return failure("storage");}
        String result;
        try {
            long revision=0;String previous=null;long previousTime=0;
            try(Cursor cursor=db.rawQuery("SELECT revision,payload,updated_at FROM state WHERE id=1",null)){
                if(cursor.moveToFirst()){revision=cursor.getLong(0);previous=cursor.getString(1);previousTime=cursor.getLong(2);}
            }
            if(revision!=expectedRevision) {
                result=failure("conflict");
            } else {
            if(previous!=null){ContentValues history=new ContentValues();history.put("revision",revision);history.put("payload",previous);history.put("updated_at",previousTime);db.insertOrThrow("history",null,history);}
            ContentValues values=new ContentValues();values.put("id",1);values.put("revision",revision+1);values.put("payload",payload);values.put("updated_at",System.currentTimeMillis());
            if(db.insertWithOnConflict("state",null,values,SQLiteDatabase.CONFLICT_REPLACE)==-1) throw new IllegalStateException("Write failed");
            db.execSQL("DELETE FROM history WHERE revision NOT IN (SELECT revision FROM history ORDER BY revision DESC LIMIT 5)");
            db.setTransactionSuccessful();
            result=new JSONObject().put("ok",true).put("revision",revision+1).toString();
            }
        }catch(Exception ex){result=failure("storage");}
        // Acknowledge only after the transaction has actually committed.
        try { db.endTransaction(); }
        catch(Exception ex) { return failure("storage"); }
        return result;
    }
    public synchronized String readDraft(){
        try(Cursor c=getReadableDatabase().rawQuery("SELECT payload FROM draft WHERE id=1",null)){
            return new JSONObject().put("ok",true).put("text",c.moveToFirst()?c.getString(0):"").toString();
        }catch(Exception ex){return failure("storage");}
    }
    public synchronized String saveDraft(String payload){
        try{
            if(payload==null||payload.length()>750000)return failure("data");
            if(payload.isEmpty())getWritableDatabase().delete("draft","id=1",null);
            else{
                JSONObject d=new JSONObject(payload);if(d.getInt("version")!=1||d.getLong("revision")<0)return failure("data");
                ContentValues values=new ContentValues();values.put("id",1);values.put("payload",payload);
                if(getWritableDatabase().insertWithOnConflict("draft",null,values,SQLiteDatabase.CONFLICT_REPLACE)==-1)return failure("storage");
            }
            return new JSONObject().put("ok",true).toString();
        }catch(Exception ex){return failure("storage");}
    }
    public synchronized String recoveryList(){
        try{
            long revision=0;try(Cursor c=getReadableDatabase().rawQuery("SELECT revision FROM state WHERE id=1",null)){if(c.moveToFirst())revision=c.getLong(0);}
            JSONArray rows=new JSONArray();try(Cursor c=getReadableDatabase().rawQuery("SELECT revision,updated_at,payload FROM history ORDER BY revision DESC",null)){
                while(c.moveToNext()){boolean valid=true;try{SnapshotValidator.validate(c.getString(2));}catch(Exception ex){valid=false;}
                    rows.put(new JSONObject().put("revision",c.getLong(0)).put("at",c.getLong(1)).put("valid",valid));}
            }return new JSONObject().put("ok",true).put("revision",revision).put("history",rows).toString();
        }catch(Exception ex){return failure("storage");}
    }
    public synchronized String restoreHistory(long expectedRevision,long sourceRevision){
        String payload;
        try(Cursor c=getReadableDatabase().rawQuery("SELECT payload FROM history WHERE revision=?",new String[]{String.valueOf(sourceRevision)})){
            if(!c.moveToFirst())return failure("missing");payload=c.getString(0);SnapshotValidator.validate(payload);
        }catch(Exception ex){return failure("storage");}
        // Close the read cursor before starting the write transaction.
        return save(expectedRevision,payload);
    }

}
