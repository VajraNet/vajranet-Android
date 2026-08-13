package com.vajranet.sih;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.webkit.WebStorage;
import android.webkit.WebView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final int SMS_PERMISSION_REQUEST_CODE = 1001;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NearbyConnectionsPlugin.class);
        super.onCreate(savedInstanceState);

        // 1. Automatically clear WebView cache, WebStorage, and local state on every launch/reinstall
        try {
            WebStorage.getInstance().deleteAllData();
            if (getBridge() != null && getBridge().getWebView() != null) {
                WebView webView = getBridge().getWebView();
                webView.clearCache(true);
                webView.clearHistory();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        // 2. Request SMS permissions at runtime for Google Play Protect compliance
        requestSmsPermissions();
    }

    private void requestSmsPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            boolean sendSmsGranted = ContextCompat.checkSelfPermission(this, Manifest.permission.SEND_SMS) == PackageManager.PERMISSION_GRANTED;
            boolean receiveSmsGranted = ContextCompat.checkSelfPermission(this, Manifest.permission.RECEIVE_SMS) == PackageManager.PERMISSION_GRANTED;

            if (!sendSmsGranted || !receiveSmsGranted) {
                ActivityCompat.requestPermissions(
                    this,
                    new String[]{
                        Manifest.permission.SEND_SMS,
                        Manifest.permission.RECEIVE_SMS,
                        Manifest.permission.READ_SMS
                    },
                    SMS_PERMISSION_REQUEST_CODE
                );
            }
        }
    }
}
