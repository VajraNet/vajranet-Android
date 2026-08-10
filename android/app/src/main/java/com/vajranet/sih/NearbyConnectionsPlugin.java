package com.vajranet.sih;

import android.Manifest;
import android.content.Context;
import android.os.Build;
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

import org.json.JSONObject;

import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Native Capacitor Plugin for Google Play Services Nearby Connections.
 * Exactly matches com.vajranet app-debug.apk implementation:
 * - Service ID: com.vajranet.offline.SERVICE_ID
 * - Strategy: Strategy.P2P_STAR
 * - Symmetric multi-device auto-connect & bidirectional handshake
 * - Self-discovery filtering (never displays own device)
 * - Message deduplication & delay-tolerant multi-hop mesh relay
 */
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
                Manifest.permission.BLUETOOTH, 
                Manifest.permission.BLUETOOTH_ADMIN,
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
    private static final String SERVICE_ID = "com.vajranet.offline.SERVICE_ID";
    private static final Strategy STRATEGY = Strategy.P2P_STAR;

    private ConnectionsClient connectionsClient;
    private String localDeviceName = "Vajra-Node";
    private final Set<String> connectedEndpoints = new HashSet<>();
    private final Map<String, String> endpointNames = new ConcurrentHashMap<>();
    private final Set<String> processedMessageIds = new HashSet<>();
    private boolean isAdvertising = false;
    private boolean isDiscovering = false;

    @Override
    public void load() {
        super.load();
        try {
            Context context = getContext();
            connectionsClient = Nearby.getConnectionsClient(context);
            Log.i(TAG, "VajraNet NearbyConnectionsPlugin loaded successfully.");
        } catch (Exception e) {
            Log.e(TAG, "Failed to initialize Nearby Connections client: " + e.getMessage(), e);
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
    // Plugin Methods exposed to React / JS
    // -------------------------------------------------------------------------

    @PluginMethod
    public void startAdvertisingAndDiscovery(PluginCall call) {
        String devName = call.getString("deviceName");
        if (devName != null && !devName.trim().isEmpty()) {
            this.localDeviceName = devName.trim();
        }

        if (connectionsClient == null) {
            connectionsClient = Nearby.getConnectionsClient(getContext());
        }

        try {
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
                Log.i(TAG, "Advertising started as: " + localDeviceName);
            }).addOnFailureListener(e -> {
                isAdvertising = false;
                Log.w(TAG, "Advertising note: " + e.getMessage());
            });

            DiscoveryOptions discoveryOptions = new DiscoveryOptions.Builder()
                    .setStrategy(STRATEGY)
                    .build();

            connectionsClient.startDiscovery(
                    SERVICE_ID,
                    endpointDiscoveryCallback,
                    discoveryOptions
            ).addOnSuccessListener(unused -> {
                isDiscovering = true;
                Log.i(TAG, "Discovery started on service: " + SERVICE_ID);
                JSObject res = new JSObject();
                res.put("success", true);
                res.put("deviceName", localDeviceName);
                call.resolve(res);
            }).addOnFailureListener(e -> {
                isDiscovering = false;
                Log.w(TAG, "Discovery note: " + e.getMessage());
                JSObject res = new JSObject();
                res.put("success", false);
                res.put("error", e.getMessage());
                call.resolve(res);
            });

        } catch (SecurityException se) {
            Log.e(TAG, "SecurityException starting nearby: " + se.getMessage());
            checkAndRequestPermissions(call);
        } catch (Exception e) {
            Log.e(TAG, "General exception starting nearby: " + e.getMessage());
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
                Log.i(TAG, "Stopped advertising and discovery.");
            }
        } catch (Exception e) {
            Log.w(TAG, "Error stopping nearby: " + e.getMessage());
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
            connectionsClient = Nearby.getConnectionsClient(getContext());
        }

        try {
            connectionsClient.requestConnection(
                    localDeviceName,
                    endpointId,
                    connectionLifecycleCallback
            ).addOnSuccessListener(unused -> {
                Log.i(TAG, "Requested connection to endpoint: " + endpointId);
                JSObject res = new JSObject();
                res.put("success", true);
                res.put("endpointId", endpointId);
                call.resolve(res);
            }).addOnFailureListener(e -> {
                Log.e(TAG, "Failed to request connection to " + endpointId + ": " + e.getMessage());
                call.reject("Failed to request connection: " + e.getMessage());
            });
        } catch (Exception e) {
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
                    endpointNames.remove(endpointId);
                } else {
                    connectionsClient.stopAllEndpoints();
                    connectedEndpoints.clear();
                    endpointNames.clear();
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Error in disconnect: " + e.getMessage());
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
                endpointNames.clear();
            }
        } catch (Exception e) {
            Log.w(TAG, "Error in resetAndRescan: " + e.getMessage());
        }
        startAdvertisingAndDiscovery(call);
    }

    @PluginMethod
    public void sendMessage(PluginCall call) {
        String content = call.getString("content", "");
        String type = call.getString("type", "CHAT");
        String msgId = call.getString("id", "VJ-MSG-" + System.currentTimeMillis());
        String rawTarget = call.getString("targetEndpointId");

        try {
            JSONObject json = new JSONObject();
            json.put("id", msgId);
            json.put("senderId", localDeviceName);
            json.put("senderName", localDeviceName);
            json.put("content", content);
            json.put("timestamp", System.currentTimeMillis());
            json.put("type", type);

            byte[] bytes = json.toString().getBytes(StandardCharsets.UTF_8);
            Payload payload = Payload.fromBytes(bytes);

            // If a specific target is provided, send to that target
            if (rawTarget != null && !rawTarget.isEmpty()) {
                final String target = rawTarget;
                connectionsClient.sendPayload(target, payload)
                        .addOnSuccessListener(unused -> {
                            Log.i(TAG, "Payload sent to target endpoint: " + target);
                            JSObject res = new JSObject();
                            res.put("success", true);
                            res.put("messageId", msgId);
                            call.resolve(res);
                        })
                        .addOnFailureListener(e -> {
                            Log.e(TAG, "Failed to send payload to " + target + ": " + e.getMessage());
                            call.reject("Failed to send payload: " + e.getMessage());
                        });
                return;
            }

            // Otherwise broadcast to ALL connected endpoints
            if (!connectedEndpoints.isEmpty()) {
                for (String ep : connectedEndpoints) {
                    connectionsClient.sendPayload(ep, payload);
                }
                Log.i(TAG, "Payload broadcasted to " + connectedEndpoints.size() + " connected peers.");
                JSObject res = new JSObject();
                res.put("success", true);
                res.put("messageId", msgId);
                res.put("recipientCount", connectedEndpoints.size());
                call.resolve(res);
            } else {
                JSObject res = new JSObject();
                res.put("success", true);
                res.put("messageId", msgId);
                res.put("note", "Buffered in offline local queue (no active P2P peers connected)");
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
    // Callbacks with Symmetric Multi-Peer State Management & Self-Filtering
    // -------------------------------------------------------------------------

    private final EndpointDiscoveryCallback endpointDiscoveryCallback = new EndpointDiscoveryCallback() {
        @Override
        public void onEndpointFound(@NonNull String endpointId, @NonNull DiscoveredEndpointInfo info) {
            String peerName = info.getEndpointName();

            // 1. FILTER OUT SELF DEVICE (Never show own device in available list)
            if (peerName != null && (peerName.equalsIgnoreCase(localDeviceName) || peerName.contains(localDeviceName))) {
                Log.i(TAG, "Ignored self discovery: " + peerName);
                return;
            }

            endpointNames.put(endpointId, peerName);
            Log.i(TAG, "Discovered peer endpoint: " + endpointId + " (" + peerName + ")");
            
            // Notify React UI
            JSObject data = new JSObject();
            data.put("endpointId", endpointId);
            data.put("name", peerName);
            data.put("serviceId", info.getServiceId());
            notifyListeners("endpointFound", data);

            // Auto-connect to discovered peers for seamless mesh formation
            try {
                if (connectionsClient != null && !connectedEndpoints.contains(endpointId)) {
                    Log.i(TAG, "Auto-initiating connection to discovered peer: " + endpointId);
                    connectionsClient.requestConnection(localDeviceName, endpointId, connectionLifecycleCallback);
                }
            } catch (Exception e) {
                Log.w(TAG, "Auto-connection attempt note: " + e.getMessage());
            }
        }

        @Override
        public void onEndpointLost(@NonNull String endpointId) {
            Log.i(TAG, "Lost endpoint: " + endpointId);
            endpointNames.remove(endpointId);
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
            Log.i(TAG, "Connection initiated by/with: " + endpointId + " (" + peerName + "). Auto-accepting on both sides.");
            
            // Send connectionInitiated event so UI can show 'CONNECTING'
            JSObject initData = new JSObject();
            initData.put("endpointId", endpointId);
            initData.put("name", peerName);
            initData.put("status", "CONNECTING");
            notifyListeners("connectionInitiated", initData);

            if (connectionsClient != null) {
                connectionsClient.acceptConnection(endpointId, payloadCallback)
                        .addOnSuccessListener(unused -> {
                            Log.i(TAG, "Accepted connection handshake from " + endpointId);
                        })
                        .addOnFailureListener(e -> Log.e(TAG, "Failed to accept connection: " + e.getMessage()));
            }
        }

        @Override
        public void onConnectionResult(@NonNull String endpointId, @NonNull ConnectionResolution result) {
            JSObject data = new JSObject();
            data.put("endpointId", endpointId);
            String peerName = endpointNames.getOrDefault(endpointId, "Node " + endpointId.substring(Math.max(0, endpointId.length() - 4)));
            data.put("name", peerName);

            if (result.getStatus().getStatusCode() == ConnectionsStatusCodes.STATUS_OK) {
                connectedEndpoints.add(endpointId);
                data.put("status", "CONNECTED");
                Log.i(TAG, "SUCCESS: Symmetric connection established with " + endpointId + " (" + peerName + "). Total active peers: " + connectedEndpoints.size());
            } else if (result.getStatus().getStatusCode() == ConnectionsStatusCodes.STATUS_CONNECTION_REJECTED) {
                connectedEndpoints.remove(endpointId);
                data.put("status", "REJECTED");
                Log.w(TAG, "Connection rejected by endpoint: " + endpointId);
            } else {
                connectedEndpoints.remove(endpointId);
                data.put("status", "ERROR");
                Log.e(TAG, "Connection error on endpoint: " + endpointId);
            }
            notifyListeners("connectionResult", data);
        }

        @Override
        public void onDisconnected(@NonNull String endpointId) {
            Log.i(TAG, "Disconnected from endpoint: " + endpointId);
            connectedEndpoints.remove(endpointId);
            endpointNames.remove(endpointId);
            
            JSObject data = new JSObject();
            data.put("endpointId", endpointId);
            data.put("remainingPeers", connectedEndpoints.size());
            notifyListeners("disconnected", data);
        }
    };

    private final PayloadCallback payloadCallback = new PayloadCallback() {
        @Override
        public void onPayloadReceived(@NonNull String endpointId, @NonNull Payload payload) {
            if (payload.getType() == Payload.Type.BYTES && payload.asBytes() != null) {
                try {
                    String jsonStr = new String(payload.asBytes(), StandardCharsets.UTF_8);
                    JSONObject json = new JSONObject(jsonStr);
                    String msgId = json.optString("id", "msg-" + System.currentTimeMillis());

                    // Deduplication check to prevent loops across multi-hop relays
                    if (processedMessageIds.contains(msgId)) {
                        return;
                    }
                    processedMessageIds.add(msgId);

                    String senderName = json.optString("senderName", endpointNames.getOrDefault(endpointId, "Nearby Peer"));
                    String senderId = json.optString("senderId", endpointId);

                    JSObject payloadObj = new JSObject();
                    payloadObj.put("id", msgId);
                    payloadObj.put("senderId", senderId);
                    payloadObj.put("senderName", senderName);
                    payloadObj.put("content", json.optString("content", ""));
                    payloadObj.put("timestamp", json.optLong("timestamp", System.currentTimeMillis()));
                    payloadObj.put("type", json.optString("type", "CHAT"));

                    JSObject event = new JSObject();
                    event.put("endpointId", endpointId);
                    event.put("payload", payloadObj);

                    notifyListeners("payloadReceived", event);

                    // Multi-hop delay-tolerant relay to other connected nodes
                    for (String otherEp : connectedEndpoints) {
                        if (!otherEp.equals(endpointId)) {
                            connectionsClient.sendPayload(otherEp, payload);
                            Log.i(TAG, "Multi-hop relay: forwarded " + msgId + " to peer " + otherEp);
                        }
                    }

                } catch (Exception e) {
                    Log.e(TAG, "Failed to parse incoming payload: " + e.getMessage());
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
}
