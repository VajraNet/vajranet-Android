package com.vajranet.sih;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

/**
 * VajraMeshService
 * Persistent Android Foreground Service for 24/7 background disaster mesh relay.
 * Prevents Android Doze mode from putting the BLE/Wi-Fi radio to sleep when the
 * screen is locked or the app is in the background.
 */
public class VajraMeshService extends Service {
    private static final String TAG = "VajraMeshService";
    private static final String CHANNEL_ID = "vajranet_disaster_mesh_channel";
    private static final int NOTIFICATION_ID = 1078; // 1078 NDRF emergency code

    private PowerManager.WakeLock wakeLock;
    private WifiManager.WifiLock wifiLock;

    @Override
    public void onCreate() {
        super.onCreate();
        Log.i(TAG, "VajraMeshService created. Initializing background mesh relay...");
        createNotificationChannel();
        acquireLocks();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.i(TAG, "VajraMeshService started with flags: " + flags + " startId: " + startId);
        
        Notification notification = buildForegroundNotification();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            int serviceType = 0;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                serviceType = ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE;
            }
            try {
                startForeground(NOTIFICATION_ID, notification, serviceType);
            } catch (Exception e) {
                Log.w(TAG, "Fallback startForeground without serviceType: " + e.getMessage());
                startForeground(NOTIFICATION_ID, notification);
            }
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }

        return START_STICKY;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "VajraNet Emergency Mesh Relay",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Maintains background Bluetooth & Wi-Fi Direct mesh relays during emergencies");
            channel.setShowBadge(false);
            channel.enableLights(false);
            channel.enableVibration(false);

            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private Notification buildForegroundNotification() {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        notificationIntent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        
        PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, notificationIntent, flags);

        int iconRes = getResources().getIdentifier("ic_launcher", "mipmap", getPackageName());
        if (iconRes == 0) {
            iconRes = android.R.drawable.stat_sys_data_bluetooth;
        }

        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("⚡ VajraNet Emergency Mesh Active")
                .setContentText("Monitoring nearby P2P disaster beacons & relaying SOS signals")
                .setSmallIcon(iconRes)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setCategory(NotificationCompat.CATEGORY_SERVICE)
                .build();
    }

    private void acquireLocks() {
        try {
            PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (powerManager != null && wakeLock == null) {
                wakeLock = powerManager.newWakeLock(
                        PowerManager.PARTIAL_WAKE_LOCK,
                        "VajraNet:MeshBackgroundWakeLock"
                );
                wakeLock.setReferenceCounted(false);
                wakeLock.acquire(12 * 60 * 60 * 1000L); // 12 hours safety timeout
                Log.d(TAG, "Partial WakeLock acquired for background mesh");
            }

            WifiManager wifiManager = (WifiManager) getApplicationContext().getSystemService(Context.WIFI_SERVICE);
            if (wifiManager != null && wifiLock == null) {
                int wifiMode = WifiManager.WIFI_MODE_FULL_HIGH_PERF;
                wifiLock = wifiManager.createWifiLock(wifiMode, "VajraNet:MeshWifiLock");
                wifiLock.setReferenceCounted(false);
                wifiLock.acquire();
                Log.d(TAG, "Wi-Fi High Perf Lock acquired for P2P mesh relay");
            }
        } catch (Exception e) {
            Log.w(TAG, "Error acquiring system wake/wifi locks: " + e.getMessage());
        }
    }

    private void releaseLocks() {
        try {
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
                wakeLock = null;
                Log.d(TAG, "WakeLock released");
            }
            if (wifiLock != null && wifiLock.isHeld()) {
                wifiLock.release();
                wifiLock = null;
                Log.d(TAG, "WifiLock released");
            }
        } catch (Exception e) {
            Log.w(TAG, "Error releasing system locks: " + e.getMessage());
        }
    }

    @Override
    public void onDestroy() {
        Log.i(TAG, "VajraMeshService destroyed. Releasing locks...");
        releaseLocks();
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
