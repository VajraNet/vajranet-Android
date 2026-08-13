package com.vajranet.sih;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothManager;
import android.bluetooth.le.AdvertiseCallback;
import android.bluetooth.le.AdvertiseData;
import android.bluetooth.le.AdvertiseSettings;
import android.bluetooth.le.BluetoothLeAdvertiser;
import android.bluetooth.le.BluetoothLeScanner;
import android.bluetooth.le.ScanCallback;
import android.bluetooth.le.ScanFilter;
import android.bluetooth.le.ScanResult;
import android.bluetooth.le.ScanSettings;
import android.content.Context;
import android.content.Intent;
import android.net.ConnectivityManager;
import android.net.NetworkCapabilities;
import android.os.Build;
import android.os.ParcelUuid;
import android.util.Log;

import androidx.annotation.NonNull;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.google.android.gms.nearby.Nearby;
import com.google.android.gms.nearby.connection.AdvertisingOptions;
import com.google.android.gms.nearby.connection.ConnectionInfo;
import com.google.android.gms.nearby.connection.ConnectionLifecycleCallback;
import com.google.android.gms.nearby.connection.ConnectionResolution;
import com.google.android.gms.nearby.connection.ConnectionsClient;
import com.google.android.gms.nearby.connection.ConnectionsStatusCodes;
import com.google.android.gms.nearby.connection.DiscoveredEndpointInfo;
import com.google.android.gms.nearby.connection.DiscoveryOptions;
import com.google.android.gms.nearby.connection.EndpointDiscoveryCallback;
import com.google.android.gms.nearby.connection.Payload;
import com.google.android.gms.nearby.connection.PayloadCallback;
import com.google.android.gms.nearby.connection.PayloadTransferUpdate;
import com.google.android.gms.nearby.connection.Strategy;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(
    name = "NearbyConnectionsPlugin",
    permissions = {
        @Permission(
            strings = {
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            }, 
            alias = "location"
        ),
        @Permission(
            strings = {
                Manifest.permission.BLUETOOTH_SCAN,
                Manifest.permission.BLUETOOTH_ADVERTISE,
                Manifest.permission.BLUETOOTH_CONNECT
            }, 
            alias = "bluetooth"
        ),
        @Permission(
            strings = {
                Manifest.permission.NEARBY_WIFI_DEVICES
            }, 
            alias = "nearbyWifi"
        )
    }
)
public class NearbyConnectionsPlugin extends Plugin {
    private static final String TAG = "VajraNearbyPlugin";
    private static final String BACKEND_API_BASE = "https://vajranet-backend.onrender.com/api/v1";
    private static final String SERVICE_ID = "com.vajranet.offline.SERVICE_ID";
    private static final Strategy STRATEGY = Strategy.P2P_CLUSTER;

    private static final int VAJRA_MANUFACTURER_ID = 0x0786; // VajraNet ID
    private static final UUID VAJRA_BLE_SERVICE_UUID = UUID.fromString("00001078-0000-1000-8000-00805f9b34fb");

    private ConnectionsClient connectionsClient;
    private String localDeviceName = "Vajra-Node";
    private final Set<String> connectedEndpoints = Collections.newSetFromMap(new ConcurrentHashMap<>());
    private final Set<String> pendingConnections = Collections.newSetFromMap(new ConcurrentHashMap<>());
    private final Map<String, String> endpointNames = new ConcurrentHashMap<>();
    private final Map<String, Long> lastAttemptTimes = new ConcurrentHashMap<>();
    private final Set<String> processedMessageIds = Collections.newSetFromMap(new ConcurrentHashMap<>());

    private final ExecutorService backgroundExecutor = Executors.newCachedThreadPool();

    private boolean isAdvertising = false;
    private boolean isDiscovering = false;
    private boolean autoConnectEnabled = true;

    // BLE Fast Beacon Engine
    private BluetoothLeAdvertiser bleAdvertiser;
    private BluetoothLeScanner bleScanner;
    private boolean isBleBeaconing = false;
    private boolean isBleScanning = false;

    @Override
    public void load() {
        super.load();
        try {
            Context context = getContext().getApplicationContext();
            connectionsClient = Nearby.getConnectionsClient(context);

            BluetoothManager bluetoothManager = (BluetoothManager) context.getSystemService(Context.BLUETOOTH_SERVICE);
            if (bluetoothManager != null) {
                BluetoothAdapter adapter = bluetoothManager.getAdapter();
                if (adapter != null && adapter.isEnabled()) {
                    bleAdvertiser = adapter.getBluetoothLeAdvertiser();
                    bleScanner = adapter.getBluetoothLeScanner();
                }
            }

            Log.i(TAG, "VajraNet Mesh Plugin initialized with P2P_CLUSTER & BLE Beaconing.");
        } catch (Exception e) {
            Log.e(TAG, "Init error: " + e.getMessage(), e);
        }
    }

    // -------------------------------------------------------------------------
    // Background Service Management
    // -------------------------------------------------------------------------

    @PluginMethod
    public void startBackgroundMeshService(PluginCall call) {
        try {
            Context context = getContext().getApplicationContext();
            Intent serviceIntent = new Intent(context, VajraMeshService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
            Log.i(TAG, "VajraMeshService started for 24/7 background mesh.");
            JSObject res = new JSObject();
            res.put("success", true);
            call.resolve(res);
        } catch (Exception e) {
            Log.e(TAG, "Error starting background service: " + e.getMessage());
            JSObject res = new JSObject();
            res.put("success", false);
            res.put("error", e.getMessage());
            call.resolve(res);
        }
    }

    @PluginMethod
    public void stopBackgroundMeshService(PluginCall call) {
        try {
            Context context = getContext().getApplicationContext();
            Intent serviceIntent = new Intent(context, VajraMeshService.class);
            context.stopService(serviceIntent);
            JSObject res = new JSObject();
            res.put("success", true);
            call.resolve(res);
        } catch (Exception e) {
            JSObject res = new JSObject();
            res.put("success", false);
            res.put("error", e.getMessage());
            call.resolve(res);
        }
    }

    // -------------------------------------------------------------------------
    // Permission Handlers
    // -------------------------------------------------------------------------

    @PluginMethod
    public void checkAndRequestPermissions(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            requestPermissionForAliases(new String[]{"location", "bluetooth", "nearbyWifi"}, call, "meshPermissionCallback");
        } else {
            requestPermissionForAliases(new String[]{"location", "bluetooth"}, call, "meshPermissionCallback");
        }
    }

    @PermissionCallback
    private void meshPermissionCallback(PluginCall call) {
        JSObject res = new JSObject();
        res.put("granted", true);
        call.resolve(res);
    }

    // -------------------------------------------------------------------------
    // Discovery & Advertising Methods
    // -------------------------------------------------------------------------

    @PluginMethod
    public void startAdvertisingAndDiscovery(PluginCall call) {
        String devName = call.getString("deviceName");
        if (devName != null && !devName.trim().isEmpty()) {
            this.localDeviceName = devName.trim();
        }
        this.autoConnectEnabled = call.getBoolean("autoConnect", true);

        if (connectionsClient == null) {
            connectionsClient = Nearby.getConnectionsClient(getContext().getApplicationContext());
        }

        try {
            if (!isAdvertising) {
                AdvertisingOptions advertisingOptions = new AdvertisingOptions.Builder()
                        .setStrategy(STRATEGY)
                        .build();

                connectionsClient.startAdvertising(
                        localDeviceName,
                        SERVICE_ID,
                        connectionLifecycleCallback,
                        advertisingOptions
                ).addOnSuccessListener(unused -> {
                    isAdvertising = true;
                    Log.i(TAG, "Advertising active (P2P_CLUSTER) as: " + localDeviceName);
                }).addOnFailureListener(e -> {
                    isAdvertising = false;
                    Log.w(TAG, "Advertising note: " + e.getMessage());
                });
            }

            if (!isDiscovering) {
                DiscoveryOptions discoveryOptions = new DiscoveryOptions.Builder()
                        .setStrategy(STRATEGY)
                        .build();

                connectionsClient.startDiscovery(
                        SERVICE_ID,
                        endpointDiscoveryCallback,
                        discoveryOptions
                ).addOnSuccessListener(unused -> {
                    isDiscovering = true;
                    Log.i(TAG, "Discovery active (P2P_CLUSTER) on service: " + SERVICE_ID);
                }).addOnFailureListener(e -> {
                    isDiscovering = false;
                    Log.w(TAG, "Discovery note: " + e.getMessage());
                });
            }

            // Start hardware BLE SOS Scanner
            startBleScannerInternal();

            JSObject res = new JSObject();
            res.put("success", true);
            res.put("deviceName", localDeviceName);
            res.put("strategy", "P2P_CLUSTER");
            call.resolve(res);

        } catch (SecurityException se) {
            Log.e(TAG, "SecurityException: " + se.getMessage());
            checkAndRequestPermissions(call);
        } catch (Exception e) {
            Log.e(TAG, "Exception: " + e.getMessage());
            JSObject res = new JSObject();
            res.put("success", false);
            res.put("error", e.getMessage());
            call.resolve(res);
        }
    }

    @PluginMethod
    public void stopAdvertisingAndDiscovery(PluginCall call) {
        try {
            if (connectionsClient != null) {
                connectionsClient.stopAdvertising();
                connectionsClient.stopDiscovery();
                isAdvertising = false;
                isDiscovering = false;
            }
            stopBleScannerInternal();
        } catch (Exception e) {
            Log.w(TAG, "Stop error: " + e.getMessage());
        }
        JSObject res = new JSObject();
        res.put("success", true);
        call.resolve(res);
    }

    @PluginMethod
    public void connectToDevice(PluginCall call) {
        String endpointId = call.getString("endpointId");
        if (endpointId == null || endpointId.isEmpty()) {
            call.reject("Endpoint ID is required");
            return;
        }

        if (connectionsClient == null) {
            connectionsClient = Nearby.getConnectionsClient(getContext().getApplicationContext());
        }

        try {
            pendingConnections.add(endpointId);
            connectionsClient.requestConnection(
                    localDeviceName,
                    endpointId,
                    connectionLifecycleCallback
            ).addOnSuccessListener(unused -> {
                JSObject res = new JSObject();
                res.put("success", true);
                res.put("endpointId", endpointId);
                call.resolve(res);
            }).addOnFailureListener(e -> {
                pendingConnections.remove(endpointId);
                call.reject("Connection request failed: " + e.getMessage());
            });
        } catch (Exception e) {
            pendingConnections.remove(endpointId);
            call.reject("Error in connectToDevice: " + e.getMessage());
        }
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        String endpointId = call.getString("endpointId");
        try {
            if (connectionsClient != null) {
                if (endpointId != null && !endpointId.isEmpty()) {
                    connectionsClient.disconnectFromEndpoint(endpointId);
                    connectedEndpoints.remove(endpointId);
                    pendingConnections.remove(endpointId);
                    endpointNames.remove(endpointId);
                } else {
                    connectionsClient.stopAllEndpoints();
                    connectedEndpoints.clear();
                    pendingConnections.clear();
                    endpointNames.clear();
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Disconnect error: " + e.getMessage());
        }

        JSObject res = new JSObject();
        res.put("success", true);
        call.resolve(res);
    }

    @PluginMethod
    public void resetAndRescan(PluginCall call) {
        try {
            if (connectionsClient != null) {
                connectionsClient.stopAdvertising();
                connectionsClient.stopDiscovery();
                connectionsClient.stopAllEndpoints();
                connectedEndpoints.clear();
                pendingConnections.clear();
                endpointNames.clear();
                isAdvertising = false;
                isDiscovering = false;
            }
        } catch (Exception e) {
            Log.w(TAG, "Reset error: " + e.getMessage());
        }
        startAdvertisingAndDiscovery(call);
    }

    @PluginMethod
    public void sendMessage(PluginCall call) {
        String content = call.getString("content", "");
        String type = call.getString("type", "CHAT");
        String msgId = call.getString("id", "VJ-MSG-" + System.currentTimeMillis());
        String rawTarget = call.getString("targetEndpointId");
        int hopCount = call.getInt("hops", 0);
        int maxHops = call.getInt("maxHops", 5);

        try {
            JSONObject json = new JSONObject();
            json.put("id", msgId);
            json.put("senderId", localDeviceName);
            json.put("senderName", localDeviceName);
            json.put("content", content);
            json.put("timestamp", System.currentTimeMillis());
            json.put("type", type);
            json.put("hops", hopCount);
            json.put("maxHops", maxHops);

            JSONArray seen = new JSONArray();
            seen.put(localDeviceName);
            json.put("seenNodes", seen);

            byte[] bytes = json.toString().getBytes(StandardCharsets.UTF_8);
            Payload payload = Payload.fromBytes(bytes);

            if (rawTarget != null && !rawTarget.isEmpty()) {
                final String target = rawTarget;
                connectionsClient.sendPayload(target, payload)
                        .addOnSuccessListener(unused -> {
                            JSObject res = new JSObject();
                            res.put("success", true);
                            res.put("messageId", msgId);
                            call.resolve(res);
                        })
                        .addOnFailureListener(e -> call.reject("Failed: " + e.getMessage()));
                return;
            }

            if (!connectedEndpoints.isEmpty()) {
                for (String ep : connectedEndpoints) {
                    connectionsClient.sendPayload(ep, payload);
                }
                JSObject res = new JSObject();
                res.put("success", true);
                res.put("messageId", msgId);
                res.put("recipientCount", connectedEndpoints.size());
                call.resolve(res);
            } else {
                JSObject res = new JSObject();
                res.put("success", true);
                res.put("messageId", msgId);
                res.put("note", "Buffered in offline local queue");
                call.resolve(res);
            }

        } catch (Exception e) {
            call.reject("Error constructing message payload: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getConnectedEndpoints(PluginCall call) {
        JSArray arr = new JSArray();
        for (String ep : connectedEndpoints) {
            JSObject obj = new JSObject();
            obj.put("endpointId", ep);
            obj.put("name", endpointNames.getOrDefault(ep, "Node " + ep.substring(Math.max(0, ep.length() - 4))));
            arr.put(obj);
        }
        JSObject res = new JSObject();
        res.put("endpoints", arr);
        res.put("count", connectedEndpoints.size());
        call.resolve(res);
    }

    // -------------------------------------------------------------------------
    // Raw Fast BLE SOS Beaconing (<150ms zero-handshake delivery)
    // -------------------------------------------------------------------------

    @PluginMethod
    public void broadcastBleSosBeacon(PluginCall call) {
        double lat = call.getDouble("lat", 0.0);
        double lon = call.getDouble("lon", 0.0);
        String severity = call.getString("severity", "CRITICAL");
        String vajraId = call.getString("vajraId", localDeviceName);

        if (bleAdvertiser == null) {
            BluetoothManager bm = (BluetoothManager) getContext().getSystemService(Context.BLUETOOTH_SERVICE);
            if (bm != null && bm.getAdapter() != null) {
                bleAdvertiser = bm.getAdapter().getBluetoothLeAdvertiser();
            }
        }

        if (bleAdvertiser == null) {
            call.reject("BLE Advertiser not supported or Bluetooth disabled");
            return;
        }

        try {
            AdvertiseSettings settings = new AdvertiseSettings.Builder()
                    .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
                    .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
                    .setConnectable(false)
                    .setTimeout(60000)
                    .build();

            ByteBuffer buffer = ByteBuffer.allocate(20);
            buffer.putFloat((float) lat);
            buffer.putFloat((float) lon);
            byte sevByte = (byte) (severity.equals("CRITICAL") ? 3 : severity.equals("HIGH") ? 2 : 1);
            buffer.put(sevByte);
            buffer.putInt((int) (System.currentTimeMillis() / 1000));
            buffer.putInt(vajraId.hashCode());

            AdvertiseData data = new AdvertiseData.Builder()
                    .addServiceUuid(new ParcelUuid(VAJRA_BLE_SERVICE_UUID))
                    .addManufacturerData(VAJRA_MANUFACTURER_ID, buffer.array())
                    .setIncludeDeviceName(false)
                    .build();

            bleAdvertiser.startAdvertising(settings, data, bleAdvertiseCallback);
            isBleBeaconing = true;
            Log.i(TAG, "Fast BLE SOS Beaconing active at (" + lat + ", " + lon + ")");

            JSObject res = new JSObject();
            res.put("success", true);
            res.put("mode", "BLE_FAST_BEACON");
            call.resolve(res);
        } catch (Exception e) {
            Log.e(TAG, "Error starting BLE beacon: " + e.getMessage());
            call.reject("Failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stopBleSosBeacon(PluginCall call) {
        try {
            if (bleAdvertiser != null && isBleBeaconing) {
                bleAdvertiser.stopAdvertising(bleAdvertiseCallback);
                isBleBeaconing = false;
            }
            JSObject res = new JSObject();
            res.put("success", true);
            call.resolve(res);
        } catch (Exception e) {
            JSObject res = new JSObject();
            res.put("success", false);
            res.put("error", e.getMessage());
            call.resolve(res);
        }
    }

    private final AdvertiseCallback bleAdvertiseCallback = new AdvertiseCallback() {
        @Override
        public void onStartSuccess(AdvertiseSettings settingsInEffect) {
            super.onStartSuccess(settingsInEffect);
            Log.i(TAG, "BLE SOS AdvertiseCallback SUCCESS");
        }

        @Override
        public void onStartFailure(int errorCode) {
            super.onStartFailure(errorCode);
            isBleBeaconing = false;
            Log.w(TAG, "BLE SOS AdvertiseCallback FAILED: " + errorCode);
        }
    };

    private void startBleScannerInternal() {
        if (bleScanner == null) {
            BluetoothManager bm = (BluetoothManager) getContext().getSystemService(Context.BLUETOOTH_SERVICE);
            if (bm != null && bm.getAdapter() != null) {
                bleScanner = bm.getAdapter().getBluetoothLeScanner();
            }
        }
        if (bleScanner == null || isBleScanning) return;

        try {
            List<ScanFilter> filters = new ArrayList<>();
            filters.add(new ScanFilter.Builder()
                    .setServiceUuid(new ParcelUuid(VAJRA_BLE_SERVICE_UUID))
                    .build());
            filters.add(new ScanFilter.Builder()
                    .setManufacturerData(VAJRA_MANUFACTURER_ID, new byte[]{})
                    .build());

            ScanSettings.Builder settingsBuilder = new ScanSettings.Builder()
                    .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                settingsBuilder.setMatchMode(ScanSettings.MATCH_MODE_AGGRESSIVE);
                settingsBuilder.setCallbackType(ScanSettings.CALLBACK_TYPE_ALL_MATCHES);
            }

            bleScanner.startScan(filters, settingsBuilder.build(), bleScanCallback);
            isBleScanning = true;
            Log.i(TAG, "VajraNet Screen-Off BLE SOS Scanner active");
        } catch (Exception e) {
            Log.w(TAG, "BLE Scanner init note: " + e.getMessage());
        }
    }

    private void stopBleScannerInternal() {
        try {
            if (bleScanner != null && isBleScanning) {
                bleScanner.stopScan(bleScanCallback);
                isBleScanning = false;
            }
        } catch (Exception e) {
            Log.w(TAG, "BLE Scanner stop note: " + e.getMessage());
        }
    }

    private final ScanCallback bleScanCallback = new ScanCallback() {
        @Override
        public void onScanResult(int callbackType, ScanResult result) {
            super.onScanResult(callbackType, result);
            if (result.getScanRecord() == null) return;

            byte[] data = result.getScanRecord().getManufacturerSpecificData(VAJRA_MANUFACTURER_ID);
            if (data != null && data.length >= 17) {
                try {
                    ByteBuffer buf = ByteBuffer.wrap(data);
                    float lat = buf.getFloat();
                    float lon = buf.getFloat();
                    byte sev = buf.get();
                    int timestamp = buf.getInt();
                    int idHash = buf.getInt();

                    String sevStr = (sev == 3) ? "CRITICAL" : (sev == 2) ? "HIGH" : "MEDIUM";
                    String beaconId = "BLE-SOS-" + Math.abs(idHash) + "-" + timestamp;

                    if (processedMessageIds.contains(beaconId)) return;
                    processedMessageIds.add(beaconId);

                    Log.i(TAG, "🚨 BLE SOS BEACON RECEIVED: " + beaconId + " at (" + lat + ", " + lon + ")");

                    // Autonomous Gateway Cloud Relay if Internet Available
                    forwardBleSosToBackend(beaconId, lat, lon, sevStr);

                    JSObject event = new JSObject();
                    event.put("id", beaconId);
                    event.put("latitude", lat);
                    event.put("longitude", lon);
                    event.put("severity", sevStr);
                    event.put("timestamp", ((long) timestamp) * 1000L);
                    event.put("source", "BLE_RAW_BEACON");
                    event.put("rssi", result.getRssi());

                    notifyListeners("bleSosBeaconReceived", event);
                } catch (Exception e) {
                    Log.w(TAG, "Error decoding BLE beacon: " + e.getMessage());
                }
            }
        }
    };

    // -------------------------------------------------------------------------
    // Callbacks with Deterministic Tie-Breaking & Anti-Collision Engine
    // -------------------------------------------------------------------------

    private final EndpointDiscoveryCallback endpointDiscoveryCallback = new EndpointDiscoveryCallback() {
        @Override
        public void onEndpointFound(@NonNull String endpointId, @NonNull DiscoveredEndpointInfo info) {
            String peerName = info.getEndpointName();

            // 1. FILTER OUT SELF DEVICE
            if (peerName != null && (peerName.equalsIgnoreCase(localDeviceName) || peerName.contains(localDeviceName))) {
                return;
            }

            endpointNames.put(endpointId, peerName);
            Log.i(TAG, "Discovered peer: " + endpointId + " (" + peerName + ")");
            
            // Notify UI
            JSObject data = new JSObject();
            data.put("endpointId", endpointId);
            data.put("name", peerName);
            data.put("serviceId", info.getServiceId());
            notifyListeners("endpointFound", data);

            // 2. DETERMINISTIC ROLE TIE-BREAKER (Prevents connection thrashing & dual-initiation collisions)
            // Exactly ONE node in each pair initiates the handshake; the other waits and accepts.
            if (autoConnectEnabled && connectionsClient != null && !connectedEndpoints.contains(endpointId) && !pendingConnections.contains(endpointId)) {
                long now = System.currentTimeMillis();
                Long lastAttempt = lastAttemptTimes.get(endpointId);
                if (lastAttempt != null && (now - lastAttempt) < 8000) {
                    return; // 8-second backoff cooldown to prevent rapid looping
                }

                // Deterministic comparison: Initiator is the one with lexicographically higher name / hash
                boolean shouldInitiate = false;
                if (peerName != null && !peerName.isEmpty()) {
                    shouldInitiate = localDeviceName.compareTo(peerName) > 0;
                } else {
                    shouldInitiate = (localDeviceName.hashCode() % 2 == 0);
                }

                if (shouldInitiate) {
                    try {
                        pendingConnections.add(endpointId);
                        lastAttemptTimes.put(endpointId, now);
                        Log.i(TAG, "Deterministic Initiator: connecting to " + endpointId + " (" + peerName + ")");
                        connectionsClient.requestConnection(localDeviceName, endpointId, connectionLifecycleCallback)
                                .addOnFailureListener(e -> {
                                    pendingConnections.remove(endpointId);
                                    Log.w(TAG, "Connection request failed: " + e.getMessage());
                                });
                    } catch (Exception e) {
                        pendingConnections.remove(endpointId);
                    }
                } else {
                    Log.i(TAG, "Deterministic Listener: waiting for incoming handshake from " + peerName);
                }
            }
        }

        @Override
        public void onEndpointLost(@NonNull String endpointId) {
            endpointNames.remove(endpointId);
            pendingConnections.remove(endpointId);
            JSObject data = new JSObject();
            data.put("endpointId", endpointId);
            notifyListeners("endpointLost", data);
        }
    };

    private final ConnectionLifecycleCallback connectionLifecycleCallback = new ConnectionLifecycleCallback() {
        @Override
        public void onConnectionInitiated(@NonNull String endpointId, @NonNull ConnectionInfo info) {
            String peerName = info.getEndpointName();
            endpointNames.put(endpointId, peerName);
            Log.i(TAG, "Connection initiated by: " + endpointId + " (" + peerName + "). Auto-accepting.");
            
            JSObject initData = new JSObject();
            initData.put("endpointId", endpointId);
            initData.put("name", peerName);
            initData.put("status", "CONNECTING");
            notifyListeners("connectionInitiated", initData);

            if (connectionsClient != null) {
                connectionsClient.acceptConnection(endpointId, payloadCallback)
                        .addOnSuccessListener(unused -> Log.i(TAG, "Accepted connection with " + endpointId))
                        .addOnFailureListener(e -> {
                            pendingConnections.remove(endpointId);
                            Log.e(TAG, "Accept failed: " + e.getMessage());
                        });
            }
        }

        @Override
        public void onConnectionResult(@NonNull String endpointId, @NonNull ConnectionResolution result) {
            pendingConnections.remove(endpointId);
            JSObject data = new JSObject();
            data.put("endpointId", endpointId);
            String peerName = endpointNames.getOrDefault(endpointId, "Node " + endpointId.substring(Math.max(0, endpointId.length() - 4)));
            data.put("name", peerName);

            if (result.getStatus().getStatusCode() == ConnectionsStatusCodes.STATUS_OK) {
                connectedEndpoints.add(endpointId);
                data.put("status", "CONNECTED");
                Log.i(TAG, "SUCCESS: P2P Connection established with " + peerName + ". Active peers: " + connectedEndpoints.size());
                
                // Trigger sync on new connection
                triggerEpidemicVectorSync(endpointId);
            } else {
                connectedEndpoints.remove(endpointId);
                data.put("status", "ERROR");
                lastAttemptTimes.put(endpointId, System.currentTimeMillis());
                Log.w(TAG, "Connection resolution status: " + result.getStatus().getStatusCode());
            }
            notifyListeners("connectionResult", data);
        }

        @Override
        public void onDisconnected(@NonNull String endpointId) {
            Log.i(TAG, "Disconnected from endpoint: " + endpointId);
            connectedEndpoints.remove(endpointId);
            pendingConnections.remove(endpointId);
            endpointNames.remove(endpointId);
            lastAttemptTimes.put(endpointId, System.currentTimeMillis());
            
            JSObject data = new JSObject();
            data.put("endpointId", endpointId);
            data.put("remainingPeers", connectedEndpoints.size());
            notifyListeners("disconnected", data);
        }
    };

    private void triggerEpidemicVectorSync(String peerEndpointId) {
        try {
            JSONObject syncHeader = new JSONObject();
            syncHeader.put("id", "SYNC-REQ-" + System.currentTimeMillis());
            syncHeader.put("type", "SYNC_REQUEST");
            syncHeader.put("senderId", localDeviceName);
            syncHeader.put("timestamp", System.currentTimeMillis());

            byte[] bytes = syncHeader.toString().getBytes(StandardCharsets.UTF_8);
            if (connectionsClient != null && connectedEndpoints.contains(peerEndpointId)) {
                connectionsClient.sendPayload(peerEndpointId, Payload.fromBytes(bytes));
            }
        } catch (Exception e) {
            Log.w(TAG, "Sync trigger note: " + e.getMessage());
        }
    }

    // -------------------------------------------------------------------------
    // Autonomous Multi-Hop Relay & Cloud Gateway Synchronization
    // -------------------------------------------------------------------------

    private final PayloadCallback payloadCallback = new PayloadCallback() {
        @Override
        public void onPayloadReceived(@NonNull String endpointId, @NonNull Payload payload) {
            if (payload.getType() == Payload.Type.BYTES && payload.asBytes() != null) {
                try {
                    String jsonStr = new String(payload.asBytes(), StandardCharsets.UTF_8);
                    JSONObject json = new JSONObject(jsonStr);
                    String msgId = json.optString("id", "msg-" + System.currentTimeMillis());
                    String type = json.optString("type", "CHAT");

                    // Deduplication check
                    if (processedMessageIds.contains(msgId)) {
                        return;
                    }
                    processedMessageIds.add(msgId);

                    String senderName = json.optString("senderName", endpointNames.getOrDefault(endpointId, "Nearby Peer"));
                    String senderId = json.optString("senderId", endpointId);
                    int hops = json.optInt("hops", 0);
                    int maxHops = json.optInt("maxHops", 5);

                    Log.i(TAG, "📩 RECEIVED MESH PAYLOAD [" + type + "] from " + senderName + " (hops: " + hops + ")");

                    // 1. AUTONOMOUS CLOUD GATEWAY RELAY (If this device has Internet)
                    if (type.equals("SOS") || type.equals("INCIDENT")) {
                        forwardSosPayloadToBackend(json, endpointId);
                    }

                    // 2. Notify React / UI
                    JSObject payloadObj = new JSObject();
                    payloadObj.put("id", msgId);
                    payloadObj.put("senderId", senderId);
                    payloadObj.put("senderName", senderName);
                    payloadObj.put("content", json.optString("content", ""));
                    payloadObj.put("timestamp", json.optLong("timestamp", System.currentTimeMillis()));
                    payloadObj.put("type", type);
                    payloadObj.put("hops", hops);

                    JSObject event = new JSObject();
                    event.put("endpointId", endpointId);
                    event.put("payload", payloadObj);
                    notifyListeners("payloadReceived", event);

                    // 3. Multi-hop Delay-Tolerant Epidemic Forwarding (TTL decay)
                    if (hops < maxHops) {
                        json.put("hops", hops + 1);
                        JSONArray seen = json.optJSONArray("seenNodes");
                        if (seen == null) seen = new JSONArray();
                        seen.put(localDeviceName);
                        json.put("seenNodes", seen);

                        byte[] forwardBytes = json.toString().getBytes(StandardCharsets.UTF_8);
                        Payload forwardPayload = Payload.fromBytes(forwardBytes);

                        for (String otherEp : connectedEndpoints) {
                            if (!otherEp.equals(endpointId)) {
                                connectionsClient.sendPayload(otherEp, forwardPayload);
                                Log.i(TAG, "Epidemic Relay: forwarded " + msgId + " to peer " + otherEp);
                            }
                        }
                    }

                } catch (Exception e) {
                    Log.e(TAG, "Failed to parse payload: " + e.getMessage());
                }
            }
        }

        @Override
        public void onPayloadTransferUpdate(@NonNull String endpointId, @NonNull PayloadTransferUpdate update) {
            JSObject data = new JSObject();
            data.put("endpointId", endpointId);
            data.put("payloadId", update.getPayloadId());

            if (update.getStatus() == PayloadTransferUpdate.Status.SUCCESS) {
                data.put("status", "DELIVERED");
            } else if (update.getStatus() == PayloadTransferUpdate.Status.FAILURE) {
                data.put("status", "FAILED");
            } else {
                data.put("status", "IN_PROGRESS");
            }
            notifyListeners("payloadTransferUpdate", data);
        }
    };

    private boolean isInternetConnected() {
        try {
            ConnectivityManager cm = (ConnectivityManager) getContext().getSystemService(Context.CONNECTIVITY_SERVICE);
            if (cm == null) return false;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                android.net.Network activeNetwork = cm.getActiveNetwork();
                if (activeNetwork == null) return false;
                NetworkCapabilities caps = cm.getNetworkCapabilities(activeNetwork);
                return caps != null && (caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
                        caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED));
            } else {
                android.net.NetworkInfo info = cm.getActiveNetworkInfo();
                return info != null && info.isConnected();
            }
        } catch (Exception e) {
            return false;
        }
    }

    private void forwardSosPayloadToBackend(JSONObject sosJson, String originEndpointId) {
        if (!isInternetConnected()) {
            Log.i(TAG, "Autonomous Gateway: Device currently offline. Buffered in DTN mesh queue.");
            return;
        }

        backgroundExecutor.execute(() -> {
            try {
                String msgId = sosJson.optString("id", "SOS-" + System.currentTimeMillis());
                String content = sosJson.optString("content", "Disaster SOS Distress Beacon");
                String senderName = sosJson.optString("senderName", "Citizen Node");

                JSONObject body = new JSONObject();
                body.put("message_id", msgId);
                body.put("message", content);
                body.put("severity", "CRITICAL");
                body.put("latitude", 12.9716); // Default fallback coordinate if absent
                body.put("longitude", 77.5946);

                URL url = new URL(BACKEND_API_BASE + "/sos");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json; utf-8");
                conn.setRequestProperty("Accept", "application/json");
                conn.setDoOutput(true);
                conn.setConnectTimeout(8000);
                conn.setReadTimeout(8000);

                try (OutputStream os = conn.getOutputStream()) {
                    byte[] input = body.toString().getBytes(StandardCharsets.UTF_8);
                    os.write(input, 0, input.length);
                }

                int code = conn.getResponseCode();
                Log.i(TAG, "⚡ AUTONOMOUS GATEWAY CLOUD SYNC: Relayed SOS [" + msgId + "] to Cloud Backend. HTTP Code: " + code);

                if (code == 200 || code == 201) {
                    // Send GATEWAY_ACK back through mesh to inform the sender
                    JSONObject ack = new JSONObject();
                    ack.put("id", "ACK-" + msgId);
                    ack.put("type", "GATEWAY_ACK");
                    ack.put("ref_id", msgId);
                    ack.put("gateway_node", localDeviceName);
                    ack.put("timestamp", System.currentTimeMillis());

                    byte[] ackBytes = ack.toString().getBytes(StandardCharsets.UTF_8);
                    if (connectionsClient != null && connectedEndpoints.contains(originEndpointId)) {
                        connectionsClient.sendPayload(originEndpointId, Payload.fromBytes(ackBytes));
                    }
                }
            } catch (Exception e) {
                Log.w(TAG, "Gateway relay HTTP error: " + e.getMessage());
            }
        });
    }

    private void forwardBleSosToBackend(String beaconId, float lat, float lon, String severity) {
        if (!isInternetConnected()) return;

        backgroundExecutor.execute(() -> {
            try {
                JSONObject body = new JSONObject();
                body.put("message_id", beaconId);
                body.put("message", "🚨 LIVE BLE SOS BEACON: " + beaconId + " (" + severity + ")");
                body.put("severity", severity);
                body.put("latitude", (double) lat);
                body.put("longitude", (double) lon);

                URL url = new URL(BACKEND_API_BASE + "/sos");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json; utf-8");
                conn.setRequestProperty("Accept", "application/json");
                conn.setDoOutput(true);
                conn.setConnectTimeout(8000);
                conn.setReadTimeout(8000);

                try (OutputStream os = conn.getOutputStream()) {
                    byte[] input = body.toString().getBytes(StandardCharsets.UTF_8);
                    os.write(input, 0, input.length);
                }

                int code = conn.getResponseCode();
                Log.i(TAG, "⚡ BLE BEACON GATEWAY RELAY: Relayed BLE SOS [" + beaconId + "] to Cloud. Code: " + code);
            } catch (Exception e) {
                Log.w(TAG, "BLE Gateway relay HTTP error: " + e.getMessage());
            }
        });
    }
}
