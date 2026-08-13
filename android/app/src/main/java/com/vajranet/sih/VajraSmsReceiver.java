package com.vajranet.sih;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.telephony.SmsMessage;
import android.util.Log;

import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class VajraSmsReceiver extends BroadcastReceiver {

    private static final String TAG = "VajraSmsReceiver";
    private static final String BACKEND_RELAY_URL = "https://vajranet-backend.onrender.com/api/v1/devices/trusted/relay-sos";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (!"android.provider.Telephony.SMS_RECEIVED".equals(intent.getAction())) {
            return;
        }

        Bundle bundle = intent.getExtras();
        if (bundle == null) return;

        try {
            Object[] pdus = (Object[]) bundle.get("pdus");
            if (pdus == null) return;

            String format = bundle.getString("format");

            for (Object pdu : pdus) {
                SmsMessage sms;
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                    sms = SmsMessage.createFromPdu((byte[]) pdu, format);
                } else {
                    sms = SmsMessage.createFromPdu((byte[]) pdu);
                }

                String senderPhone = sms.getOriginatingAddress();
                String body = sms.getMessageBody();

                if (body != null && body.contains("VAJRANET EMERGENCY SOS")) {
                    Log.i(TAG, "🚨 VajraNet Emergency SMS Detected from: " + senderPhone);
                    processEmergencySms(senderPhone, body);
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error parsing incoming SMS", e);
        }
    }

    private void processEmergencySms(final String senderPhone, final String body) {
        new Thread(() -> {
            try {
                // Parse coordinates
                double lat = 12.9716;
                double lon = 77.5946;

                Pattern pattern = Pattern.compile("(?:GPS:|q=)(-?\\d+\\.\\d+),\\s*(-?\\d+\\.\\d+)");
                Matcher matcher = pattern.matcher(body);
                if (matcher.find()) {
                    lat = Double.parseDouble(matcher.group(1));
                    lon = Double.parseDouble(matcher.group(2));
                }

                // Construct JSON payload matching SOSRelayRequest
                JSONObject payload = new JSONObject();
                payload.put("raw_sms_content", body);
                payload.put("sender_phone", senderPhone != null ? senderPhone : "SMS-UNKNOWN");
                payload.put("latitude", lat);
                payload.put("longitude", lon);
                payload.put("severity", "CRITICAL");
                payload.put("user_name", "Citizen via SMS (" + senderPhone + ")");
                payload.put("relayed_by_phone", "AUTOMATED-BACKGROUND-SMS-RECEIVER");

                // Post to FastAPI backend
                URL url = new URL(BACKEND_RELAY_URL);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json; utf-8");
                conn.setDoOutput(true);
                conn.setConnectTimeout(8000);
                conn.setReadTimeout(8000);

                try (OutputStream os = conn.getOutputStream()) {
                    byte[] input = payload.toString().getBytes(StandardCharsets.UTF_8);
                    os.write(input, 0, input.length);
                }

                int responseCode = conn.getResponseCode();
                Log.i(TAG, "✅ SMS Emergency SOS Relayed to Cloud! Response Code: " + responseCode);
                conn.disconnect();
            } catch (Exception e) {
                Log.e(TAG, "Failed to relay SMS to VajraNet cloud", e);
            }
        }).start();
    }
}
