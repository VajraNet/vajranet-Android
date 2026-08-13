package com.vajranet.sih

import android.Manifest
import android.content.Context
import android.content.Intent
import android.os.Build
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback
import org.json.JSONObject

@CapacitorPlugin(
    name = "NearbyConnectionsPlugin",
    permissions = [
        Permission(
            strings = [
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            ],
            alias = "location"
        ),
        Permission(
            strings = [
                Manifest.permission.BLUETOOTH_SCAN,
                Manifest.permission.BLUETOOTH_ADVERTISE,
                Manifest.permission.BLUETOOTH_CONNECT
            ],
            alias = "bluetooth"
        ),
        Permission(
            strings = [
                Manifest.permission.NEARBY_WIFI_DEVICES
            ],
            alias = "nearbyWifi"
        )
    ]
)
class NearbyConnectionsPlugin : Plugin(), VajraMeshEngine.MeshEventListener {

    override fun load() {
        super.load()
        val ctx = context?.applicationContext ?: return
        VajraMeshEngine.init(ctx)
        VajraMeshEngine.setEventListener(this)
    }

    // -------------------------------------------------------------------------
    // Background Service Controls
    // -------------------------------------------------------------------------

    @PluginMethod
    fun startBackgroundMeshService(call: PluginCall) {
        try {
            val ctx = context?.applicationContext ?: run {
                call.reject("Context is null")
                return
            }
            val intent = Intent(ctx, VajraMeshService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ctx.startForegroundService(intent)
            } else {
                ctx.startService(intent)
            }
            val res = JSObject().apply { put("success", true) }
            call.resolve(res)
        } catch (e: Exception) {
            call.reject("Failed to start background mesh service: ${e.message}")
        }
    }

    @PluginMethod
    fun stopBackgroundMeshService(call: PluginCall) {
        try {
            val ctx = context?.applicationContext ?: run {
                call.reject("Context is null")
                return
            }
            val intent = Intent(ctx, VajraMeshService::class.java)
            ctx.stopService(intent)
            val res = JSObject().apply { put("success", true) }
            call.resolve(res)
        } catch (e: Exception) {
            call.reject("Failed to stop service: ${e.message}")
        }
    }

    // -------------------------------------------------------------------------
    // Permission Handlers
    // -------------------------------------------------------------------------

    @PluginMethod
    fun checkAndRequestPermissions(call: PluginCall) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            requestPermissionForAliases(arrayOf("location", "bluetooth", "nearbyWifi"), call, "meshPermissionCallback")
        } else {
            requestPermissionForAliases(arrayOf("location", "bluetooth"), call, "meshPermissionCallback")
        }
    }

    @PermissionCallback
    private fun meshPermissionCallback(call: PluginCall) {
        val res = JSObject().apply { put("granted", true) }
        call.resolve(res)
    }

    // -------------------------------------------------------------------------
    // Mesh Discovery & Operations
    // -------------------------------------------------------------------------

    @PluginMethod
    fun startAdvertisingAndDiscovery(call: PluginCall) {
        val devName = call.getString("deviceName")
        val autoConnect = call.getBoolean("autoConnect", true) ?: true
        val ctx = context?.applicationContext ?: run {
            call.reject("Context not available")
            return
        }

        VajraMeshEngine.startAdvertisingAndDiscovery(ctx, devName, autoConnect)

        val res = JSObject().apply {
            put("success", true)
            put("deviceName", VajraMeshEngine.localDeviceName)
            put("strategy", "P2P_CLUSTER")
        }
        call.resolve(res)
    }

    @PluginMethod
    fun stopAdvertisingAndDiscovery(call: PluginCall) {
        VajraMeshEngine.stopAdvertisingAndDiscovery()
        val res = JSObject().apply { put("success", true) }
        call.resolve(res)
    }

    @PluginMethod
    fun connectToDevice(call: PluginCall) {
        val endpointId = call.getString("endpointId")
        if (endpointId.isNullOrBlank()) {
            call.reject("Endpoint ID is required")
            return
        }

        VajraMeshEngine.connectToDevice(
            endpointId,
            onSuccess = {
                val res = JSObject().apply {
                    put("success", true)
                    put("endpointId", endpointId)
                }
                call.resolve(res)
            },
            onError = { err ->
                call.reject(err)
            }
        )
    }

    @PluginMethod
    fun disconnect(call: PluginCall) {
        val endpointId = call.getString("endpointId")
        VajraMeshEngine.disconnect(endpointId)
        val res = JSObject().apply { put("success", true) }
        call.resolve(res)
    }

    @PluginMethod
    fun resetAndRescan(call: PluginCall) {
        VajraMeshEngine.stopAdvertisingAndDiscovery()
        VajraMeshEngine.disconnect(null)
        val ctx = context?.applicationContext ?: run {
            call.reject("Context null")
            return
        }
        val devName = call.getString("deviceName")
        val autoConnect = call.getBoolean("autoConnect", true) ?: true
        VajraMeshEngine.startAdvertisingAndDiscovery(ctx, devName, autoConnect)
        val res = JSObject().apply { put("success", true) }
        call.resolve(res)
    }

    @PluginMethod
    fun sendMessage(call: PluginCall) {
        val content = call.getString("content", "") ?: ""
        val type = call.getString("type", "CHAT") ?: "CHAT"
        val msgId = call.getString("id", "VJ-MSG-${System.currentTimeMillis()}") ?: "VJ-MSG-${System.currentTimeMillis()}"
        val target = call.getString("targetEndpointId")
        val hops = call.getInt("hops", 0) ?: 0
        val maxHops = call.getInt("maxHops", 5) ?: 5
        val lat = call.getDouble("lat")
        val lon = call.getDouble("lon")

        val sent = VajraMeshEngine.sendMessage(content, type, msgId, target, hops, maxHops, lat, lon)

        val res = JSObject().apply {
            put("success", sent)
            put("messageId", msgId)
            put("recipientCount", VajraMeshEngine.connectedEndpoints.size)
        }
        call.resolve(res)
    }

    @PluginMethod
    fun getConnectedEndpoints(call: PluginCall) {
        val arr = JSArray()
        for (ep in VajraMeshEngine.connectedEndpoints) {
            val obj = JSObject().apply {
                put("endpointId", ep)
                put("name", VajraMeshEngine.endpointNames[ep] ?: "Node ${ep.takeLast(4)}")
            }
            arr.put(obj)
        }
        val res = JSObject().apply {
            put("endpoints", arr)
            put("count", VajraMeshEngine.connectedEndpoints.size)
        }
        call.resolve(res)
    }

    // -------------------------------------------------------------------------
    // BLE SOS Fast Beacon
    // -------------------------------------------------------------------------

    @PluginMethod
    fun broadcastBleSosBeacon(call: PluginCall) {
        val lat = call.getDouble("lat", 0.0) ?: 0.0
        val lon = call.getDouble("lon", 0.0) ?: 0.0
        val severity = call.getString("severity", "CRITICAL") ?: "CRITICAL"
        val vajraId = call.getString("vajraId", VajraMeshEngine.localDeviceName) ?: VajraMeshEngine.localDeviceName

        val success = VajraMeshEngine.broadcastBleSosBeacon(lat, lon, severity, vajraId)
        val res = JSObject().apply {
            put("success", success)
            put("mode", "BLE_FAST_BEACON")
        }
        call.resolve(res)
    }

    @PluginMethod
    fun stopBleSosBeacon(call: PluginCall) {
        VajraMeshEngine.stopBleSosBeacon()
        val res = JSObject().apply { put("success", true) }
        call.resolve(res)
    }

    // -------------------------------------------------------------------------
    // VajraMeshEngine.MeshEventListener Implementation -> Emits to React UI
    // -------------------------------------------------------------------------

    override fun onEndpointFound(endpointId: String, name: String, serviceId: String) {
        val data = JSObject().apply {
            put("endpointId", endpointId)
            put("name", name)
            put("serviceId", serviceId)
        }
        notifyListeners("endpointFound", data)
    }

    override fun onEndpointLost(endpointId: String) {
        val data = JSObject().apply {
            put("endpointId", endpointId)
        }
        notifyListeners("endpointLost", data)
    }

    override fun onConnectionInitiated(endpointId: String, name: String) {
        val data = JSObject().apply {
            put("endpointId", endpointId)
            put("name", name)
            put("status", "CONNECTING")
        }
        notifyListeners("connectionInitiated", data)
    }

    override fun onConnectionResult(endpointId: String, name: String, status: String) {
        val data = JSObject().apply {
            put("endpointId", endpointId)
            put("name", name)
            put("status", status)
        }
        notifyListeners("connectionResult", data)
    }

    override fun onDisconnected(endpointId: String, remainingPeers: Int) {
        val data = JSObject().apply {
            put("endpointId", endpointId)
            put("remainingPeers", remainingPeers)
        }
        notifyListeners("disconnected", data)
    }

    override fun onPayloadReceived(endpointId: String, payload: JSONObject) {
        val payloadObj = JSObject().apply {
            put("id", payload.optString("id"))
            put("senderId", payload.optString("senderId", endpointId))
            put("senderName", payload.optString("senderName", "Nearby Peer"))
            put("content", payload.optString("content", ""))
            put("timestamp", payload.optLong("timestamp", System.currentTimeMillis()))
            put("type", payload.optString("type", "CHAT"))
            put("hops", payload.optInt("hops", 0))
            if (payload.has("latitude")) put("latitude", payload.optDouble("latitude"))
            if (payload.has("longitude")) put("longitude", payload.optDouble("longitude"))
        }

        val event = JSObject().apply {
            put("endpointId", endpointId)
            put("payload", payloadObj)
        }
        notifyListeners("payloadReceived", event)
    }

    override fun onPayloadTransferUpdate(endpointId: String, payloadId: Long, status: String) {
        val data = JSObject().apply {
            put("endpointId", endpointId)
            put("payloadId", payloadId)
            put("status", status)
        }
        notifyListeners("payloadTransferUpdate", data)
    }

    override fun onBleSosBeaconReceived(beacon: JSONObject) {
        val event = JSObject().apply {
            put("id", beacon.optString("id"))
            put("latitude", beacon.optDouble("latitude"))
            put("longitude", beacon.optDouble("longitude"))
            put("severity", beacon.optString("severity"))
            put("timestamp", beacon.optLong("timestamp"))
            put("source", beacon.optString("source"))
            put("rssi", beacon.optInt("rssi", -50))
        }
        notifyListeners("bleSosBeaconReceived", event)
    }
}
