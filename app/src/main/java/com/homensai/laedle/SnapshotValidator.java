package com.homensai.laedle;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.time.Instant;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.Arrays;

/** Defense in depth at the Java/JS boundary. Does not trust an imported snapshot. */
public final class SnapshotValidator {
    public static final int MAX_BYTES = 8 * 1024 * 1024;
    private SnapshotValidator() {}
    private static final String[] CATEGORIES={"young_beef","beef","veal","pork","lamb","goat","chicken","turkey","duck","goose","rabbit","venison","boar","fish","prepared","other"};
    private static final String[] IMAGES={"steak","chop","roast","ribs","shank","mince","cubes","wholebird","breast","drumstick","wing","offal","bone","sausage","fish","other"};
    private static void names(JSONObject o) throws JSONException {text(o,"de",100,true);text(o,"en",100,false);text(o,"ru",100,false);}
    private static void require(boolean ok) { if (!ok) throw new IllegalArgumentException("data"); }
    private static String text(JSONObject object, String key, int max, boolean required) throws JSONException {
        Object raw = object.get(key);
        require(raw instanceof String);
        String value = (String) raw;
        require(value.length() <= max && (!required || !value.trim().isEmpty()));
        require(!value.matches("(?s).*[\\x00-\\x08\\x0b\\x0c\\x0e-\\x1f].*"));
        return value;
    }
    private static String id(JSONObject object, String key) throws JSONException {
        String value = text(object, key, 80, true);
        require(value.matches("[a-zA-Z0-9_-]{1,80}"));
        return value;
    }
    private static long number(JSONObject object, String key, long min, long max) throws JSONException {
        Object raw = object.get(key);
        require(raw instanceof Number);
        Number n = (Number) raw;
        long value = n.longValue();
        require(Double.isFinite(n.doubleValue()) && n.doubleValue() == (double) value && value >= min && value <= max);
        return value;
    }
    private static boolean bool(JSONObject object, String key) throws JSONException {
        Object raw = object.get(key); require(raw instanceof Boolean); return (Boolean) raw;
    }
    private static String normalized(String s) { return Normalizer.normalize(s.trim(), Normalizer.Form.NFKC).toLowerCase(Locale.GERMAN).replaceAll("\\s+", " "); }
    private static void stamp(JSONObject object, String key) throws JSONException {
        try { Instant.parse(text(object, key, 40, true)); }
        catch (RuntimeException e) { throw new IllegalArgumentException("data"); }
    }
    private static String unit(JSONObject o) throws JSONException {
        if(!o.has("unit"))return "kg";
        String value=text(o,"unit",10,true);require(Arrays.asList("kg","piece","pack","litre").contains(value));return value;
    }
    private static long quantity(JSONObject o,long min,String expected) throws JSONException {
        String u=unit(o);require(u.equals(expected));long q=number(o,"grams",min,10000000);
        require((!u.equals("piece")&&!u.equals("pack"))||q%1000==0);return q;
    }
    public static JSONObject validate(String payload) throws JSONException {
        require(payload != null && payload.getBytes(StandardCharsets.UTF_8).length <= MAX_BYTES);
        JSONObject root = new JSONObject(payload);
        long schema=number(root,"schemaVersion",1,100000);
        if(schema!=1 && schema!=2 && schema!=3) throw new IllegalArgumentException("version");
        Set<String> catalogIds=new HashSet<>();
        if(schema>=2){
            JSONArray catalog=root.getJSONArray("catalog");require(catalog.length()<=2000);
            if(root.isNull("shop"))require(catalog.length()==0);
            for(int i=0;i<catalog.length();i++){
                JSONObject product=catalog.getJSONObject(i);require(catalogIds.add(id(product,"id")));
                names(product.getJSONObject("names"));unit(product);
                if(product.has("photo")&&!product.isNull("photo")){
                    String photo=text(product,"photo",180000,true);require(photo.matches("data:image/jpeg;base64,[A-Za-z0-9+/]+={0,2}"));
                }
                require(Arrays.asList(CATEGORIES).contains(product.getString("category")));
                require(Arrays.asList(IMAGES).contains(product.getString("imageKey")));
                require(product.has("defaultPrice"));
                if(!product.isNull("defaultPrice"))number(product,"defaultPrice",0,10000000);
                boolean active=bool(product,"active"),archived=bool(product,"archived");require(!(active&&archived));
            }
        }
        JSONArray events = root.getJSONArray("events"), customers = root.getJSONArray("customers"), orders = root.getJSONArray("orders");
        require(events.length() <= 1000 && customers.length() <= 20000 && orders.length() <= 20000 && root.has("shop"));
        if (root.isNull("shop")) require(events.length() == 0 && customers.length() == 0 && orders.length() == 0);
        else {
            JSONObject shop = root.getJSONObject("shop"); text(shop,"name",100,true);
            for (String key : new String[]{"owner","street","zip","city","phone","email","hours"}) text(shop,key,key.equals("hours")?500:200,false);
            String email = shop.getString("email"); require(email.isEmpty() || email.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+"));
            require("EUR".equals(shop.getString("currency")));
            require(Arrays.asList("de","ru","en").contains(shop.getString("language")));
            require(Arrays.asList("light","dark","paper","compact").contains(shop.getString("skin")));
        }
        Set<String> customerIds = new HashSet<>(), customerKeys = new HashSet<>(), orderIds = new HashSet<>(), pairs = new HashSet<>();
        Map<String,Boolean> closed = new HashMap<>(); Map<String,String> itemEvent = new HashMap<>(),itemUnit=new HashMap<>();
        for (int i=0;i<customers.length();i++) {
            JSONObject customer = customers.getJSONObject(i);
            require(customerIds.add(id(customer,"id")));
            String first=text(customer,"firstName",100,false), last=text(customer,"lastName",100,true), phone=text(customer,"phone",80,false);
            text(customer,"note",500,false);
            require(customerKeys.add(normalized(first)+"|"+normalized(last)+"|"+phone.replaceAll("[^0-9+]","")));
        }
        for (int i=0;i<events.length();i++) {
            JSONObject event = events.getJSONObject(i); String eventId=id(event,"id");
            require(!closed.containsKey(eventId)); closed.put(eventId,bool(event,"closed"));
            String date=text(event,"date",10,true); require(date.matches("\\d{4}-\\d{2}-\\d{2}"));
            LocalDate parsed=LocalDate.parse(date); require(parsed.getYear()>=2000 && parsed.getYear()<=2199);
            String time=text(event,"time",5,false); require(time.isEmpty() || time.matches("([01]\\d|2[0-3]):[0-5]\\d"));
            text(event,"title",100,true); text(event,"note",500,false);
            JSONArray items=event.getJSONArray("items"); require(items.length()<=300); Set<String> names=new HashSet<>();
            for (int j=0;j<items.length();j++) {
                JSONObject item=items.getJSONObject(j);String itemId=id(item,"id");itemUnit.put(itemId,unit(item));
                if(item.has("active"))bool(item,"active");
                if(item.has("names"))names(item.getJSONObject("names"));
                if(item.has("imageKey"))require(Arrays.asList(IMAGES).contains(item.getString("imageKey")));
                if(item.has("catalogId"))require(catalogIds.contains(id(item,"catalogId")));
                require(!itemEvent.containsKey(itemId)); itemEvent.put(itemId,eventId);
                require(names.add(normalized(text(item,"name",100,true)))); number(item,"price",0,10000000);
            }
        }
        for(int i=0;i<orders.length();i++) {
            JSONObject order=orders.getJSONObject(i);require(orderIds.add(id(order,"id")));
            String eventId=id(order,"eventId"), customerId=id(order,"customerId");
            require(closed.containsKey(eventId) && customerIds.contains(customerId) && pairs.add(eventId+"|"+customerId));
            boolean cancelled=bool(order,"cancelled"); text(order,"note",500,false);stamp(order,"createdAt");stamp(order,"updatedAt");
            JSONArray lines=order.getJSONArray("lines"); require(lines.length()>0 && lines.length()<=300); Set<String> products=new HashSet<>();
            for(int j=0;j<lines.length();j++) {
                JSONObject line=lines.getJSONObject(j);String product=id(line,"itemId");
                require(eventId.equals(itemEvent.get(product)) && products.add(product));text(line,"name",100,true);if(line.has("names"))names(line.getJSONObject("names"));
                quantity(line,1,itemUnit.get(product));number(line,"price",0,10000000);
            }
            require(order.has("sale"));
            boolean sold=!order.isNull("sale");require(!closed.get(eventId) || cancelled || (sold&&(!order.getJSONObject("sale").has("complete")||bool(order.getJSONObject("sale"),"complete"))));
            long saleTotal=0;
            if(sold) {
                require(!cancelled); JSONObject sale=order.getJSONObject("sale");stamp(sale,"recordedAt");if(sale.has("complete"))bool(sale,"complete");
                JSONArray actual=sale.getJSONArray("lines");require(actual.length()>=products.size()&&actual.length()<=300);Set<String> used=new HashSet<>();
                for(int j=0;j<actual.length();j++) {
                    JSONObject line=actual.getJSONObject(j);String product=id(line,"itemId");require(eventId.equals(itemEvent.get(product))&&used.add(product));
                    long q=quantity(line,0,itemUnit.get(product)),price=number(line,"price",0,10000000);saleTotal+=(q*price+500)/1000;
                    if(line.has("name"))text(line,"name",100,true);if(line.has("names"))names(line.getJSONObject("names"));
                }
                require(used.containsAll(products));
            }
            if(order.has("payment")){
                JSONObject payment=order.getJSONObject("payment");long amount=number(payment,"amount",0,9007199254740991L);
                require(amount<=saleTotal&&((sold&&!cancelled)||amount==0));stamp(payment,"at");require(Arrays.asList("cash","card","other").contains(payment.getString("method")));
            }
        }
        if(root.has("audit")){
            JSONArray audit=root.getJSONArray("audit");require(audit.length()<=10000);Set<String> auditIds=new HashSet<>();
            for(int i=0;i<audit.length();i++){JSONObject entry=audit.getJSONObject(i);require(auditIds.add(id(entry,"id")));stamp(entry,"at");text(entry,"action",60,true);text(entry,"actor",200,false);text(entry,"detail",1200,false);}
        }
        return root;
    }
}
