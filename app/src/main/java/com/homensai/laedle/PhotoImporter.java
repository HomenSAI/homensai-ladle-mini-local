package com.homensai.laedle;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Matrix;
import android.media.ExifInterface;
import android.util.Base64;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.IOException;
import java.util.Arrays;

/** Bounded image import; output is a small JPEG without source metadata. */
public final class PhotoImporter {
    private PhotoImporter() {}
    public static String read(InputStream input) throws IOException {
        ByteArrayOutputStream bytes=new ByteArrayOutputStream();byte[] buffer=new byte[8192];int count,total=0;
        while((count=input.read(buffer))!=-1){total+=count;if(total>10*1024*1024)throw new IOException("image too large");bytes.write(buffer,0,count);}
        byte[] data=bytes.toByteArray();BitmapFactory.Options options=new BitmapFactory.Options();options.inJustDecodeBounds=true;
        BitmapFactory.decodeByteArray(data,0,data.length,options);
        if(options.outWidth<1||options.outHeight<1||(long)options.outWidth*options.outHeight>80000000L||!Arrays.asList("image/jpeg","image/png","image/webp").contains(options.outMimeType))throw new IOException("invalid image");
        options.inJustDecodeBounds=false;options.inSampleSize=1;while(Math.max(options.outWidth,options.outHeight)/options.inSampleSize>1024)options.inSampleSize*=2;
        Bitmap decoded=BitmapFactory.decodeByteArray(data,0,data.length,options);if(decoded==null)throw new IOException("decode failed");
        Bitmap oriented=decoded,scaled=null;
        try{
            int orientation=1;try{ExifInterface exif=new ExifInterface(new ByteArrayInputStream(data));orientation=exif.getAttributeInt(ExifInterface.TAG_ORIENTATION,1);}catch(IOException ignored){}
            Matrix m=new Matrix();switch(orientation){case 2:m.setScale(-1,1);break;case 3:m.setRotate(180);break;case 4:m.setScale(1,-1);break;case 5:m.setRotate(90);m.postScale(-1,1);break;case 6:m.setRotate(90);break;case 7:m.setRotate(-90);m.postScale(-1,1);break;case 8:m.setRotate(-90);break;default:break;}
            oriented=Bitmap.createBitmap(decoded,0,0,decoded.getWidth(),decoded.getHeight(),m,true);
            float scale=Math.min(1f,512f/Math.max(oriented.getWidth(),oriented.getHeight()));
            scaled=Bitmap.createScaledBitmap(oriented,Math.max(1,Math.round(oriented.getWidth()*scale)),Math.max(1,Math.round(oriented.getHeight()*scale)),true);
            ByteArrayOutputStream out=new ByteArrayOutputStream();if(!scaled.compress(Bitmap.CompressFormat.JPEG,72,out))throw new IOException("encode failed");
            String result="data:image/jpeg;base64,"+Base64.encodeToString(out.toByteArray(),Base64.NO_WRAP);if(result.length()>180000)throw new IOException("thumbnail too large");return result;
        }finally{if(scaled!=null&&scaled!=oriented&&scaled!=decoded)scaled.recycle();if(oriented!=decoded)oriented.recycle();decoded.recycle();}
    }
}
