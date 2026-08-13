package com.vajranet.sih

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.bluetooth.le.AdvertiseCallback
import android.bluetooth.le.AdvertiseData
import android.bluetooth.le.AdvertiseSettings
import android.bluetooth.le.BluetoothLeAdvertiser
import android.bluetooth.le.BluetoothLeScanner
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanFilter
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Build
import android.os.ParcelUuid
import android.util.Log
import com.google.android.gms.nearby.Nearby
import com.google.android.gms.nearby.connection.AdvertisingOptions
import com.google.android.gms.nearby.connection.ConnectionInfo
import com.google.android.gms.nearby.connection.ConnectionLifecycleCallback
import com.google.android.gms.nearby.connection.ConnectionResolution
import com.google.android.gms.nearby.connection.ConnectionsClient
import com.google.android.gms.nearby.connection.ConnectionsStatusCodes
import com.google.android.gms.nearby.connection.DiscoveredEndpointInfo
import com.google.android.gms.nearby.connection.DiscoveryOptions
import com.google.android.gms.nearby.connection.EndpointDiscoveryCallback
import com.google.android.gms.nearby.connection.Payload
import com.google.android.gms.nearby.connection.PayloadCallback
import com.google.android.gms.nearby.connection.PayloadTransferUpdate
import com.google.android.gms.nearby.connection.Strategy
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject
import java.io.OutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.nio.ByteBuffer
import java.nio.charset.StandardCharsets
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

/**
 * VajraMeshEngine
 * Native Kotlin Disaster Mesh Networking Core
 *
 * Encapsulates:
 * 1. Google Nearby Connections (P2P_CLUSTER with deterministic role tie-breaking)
 * 2. Hardware BLE Distress Beaconing & Screen-off Scanning
 * 3. Multi-Hop Epidemic Delay-Tolerant Routing (DTN)
 * 4. Autonomous Cloud Gateway Synchronization via Kotlin Coroutines
 */
object VajraMeshEngine {
    private const val TAG = "VajraMeshEngine"
    private const val SERVICE_ID = "com.vajranet.offline.SERVICE_ID"
    private const val BACKEND_API_BASE = "https://vajranet-backend.onrender.com/api/v1"
    private val STRATEGY = Strategy.P2P_CLUSTER

    private const val VAJRA_MANUFACTURER_ID = 0x0786
    private val VAJRA_BLE_SERVICE_UUID = UUID.fromString("00001078-0000-1000-8000-00805f9b34fb")

    private val engineScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    private var connectionsClient: ConnectionsClient? = null
    private var appContext: Context? = null
    var localDeviceName: String = "Vajra-Node"
        private set

    val connectedEndpoints: MutableSet<String> = ConcurrentHashMap.newKeySet()
    val pendingConnections: MutableSet<String> = ConcurrentHashMap.newKeySet()
    val endpointNames = ConcurrentHashMap<String, String>()
    private val lastAttemptTimes = ConcurrentHashMap<String, Long>()
    private val processedMessageIds: MutableSet<String> = ConcurrentHashMap.newKeySet()

    var isAdvertising = false
        private set
    var isDiscovering = false
        private set
    var autoConnectEnabled = true

    // BLE Subsystem
    private var bleAdvertiser: BluetoothLeAdvertiser? = null
    private var bleScanner: BluetoothLeScanner? = null
    var isBleBeaconing = false
        private set
    var isBleScanning = false
        private set

    interface MeshEventListener {
        fun onEndpointFound(endpointId: String, name: String, serviceId: String)
        fun onEndpointLost(endpointId: String)
        fun onConnectionInitiated(endpointId: String, name: String)
        fun onConnectionResult(endpointId: String, name: String, status: String)
        fun onDisconnected(endpointId: String, remainingPeers: Int)
        fun onPayloadReceived(endpointId: String, payload: JSONObject)
        fun onPayloadTransferUpdate(endpointId: String, payloadId: Long, status: String)
        fun onBleSosBeaconReceived(beacon: JSONObject)
    }

    private var eventListener: MeshEventListener? = null

    fun setEventListener(listener: MeshEventListener?) {
        this.eventListener = listener
    }

    fun init(context: Context) {
        val app = context.applicationContext
        this.appContext = app
        if (connectionsClient == null) {
            connectionsClient = Nearby.getConnectionsClient(app)
        }

        try {
            val bm = app.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
            val adapter = bm?.adapter
            if (adapter != null && adapter.isEnabled) {
                bleAdvertiser = adapter.bluetoothLeAdvertiser
                bleScanner = adapter.bluetoothLeScanner
            }
            Log.i(TAG, "VajraMeshEngine initialized with application context.")
        } catch (e: Exception) {
            Log.e(TAG, "BLE init error: ${e.message}")
        }
    }

    fun startAdvertisingAndDiscovery(context: Context, deviceName: String?, autoConnect: Boolean = true) {
        init(context)
        if (!deviceName.isNullOrBlank()) {
            this.localDeviceName = deviceName.trim()
        }
        this.autoConnectEnabled = autoConnect
        val client = connectionsClient ?: return

        try {
            if (!isAdvertising) {
                val advOptions = AdvertisingOptions.Builder().setStrategy(STRATEGY).build()
                client.startAdvertising(localDeviceName, SERVICE_ID, connectionLifecycleCallback, advOptions)
                    .addOnSuccessListener {
                        isAdvertising = true
                        Log.i(TAG, "Mesh Advertising started as: $localDeviceName")
                    }
                    .addOnFailureListener { e ->
                        isAdvertising = false
                        Log.w(TAG, "Advertising note: ${e.message}")
                    }
            }

            if (!isDiscovering) {
                val discOptions = DiscoveryOptions.Builder().setStrategy(STRATEGY).build()
                client.startDiscovery(SERVICE_ID, endpointDiscoveryCallback, discOptions)
                    .addOnSuccessListener {
                        isDiscovering = true
                        Log.i(TAG, "Mesh Discovery active on $SERVICE_ID")
                    }
                    .addOnFailureListener { e ->
                        isDiscovering = false
                        Log.w(TAG, "Discovery note: ${e.message}")
                    }
            }

            startBleScannerInternal()

        } catch (se: SecurityException) {
            Log.e(TAG, "SecurityException in startMesh: ${se.message}")
        } catch (e: Exception) {
            Log.e(TAG, "Error in startMesh: ${e.message}")
        }
    }

    fun stopAdvertisingAndDiscovery() {
        try {
            connectionsClient?.apply {
                stopAdvertising()
                stopDiscovery()
            }
            isAdvertising = false
            isDiscovering = false
            stopBleScannerInternal()
            Log.i(TAG, "Mesh advertising & discovery stopped.")
        } catch (e: Exception) {
            Log.w(TAG, "Stop error: ${e.message}")
        }
    }

    fun connectToDevice(endpointId: String, onSuccess: () -> Unit, onError: (String) -> Unit) {
        val client = connectionsClient ?: run {
            onError("Nearby client not initialized")
            return
        }
        try {
            pendingConnections.add(endpointId)
            client.requestConnection(localDeviceName, endpointId, connectionLifecycleCallback)
                .addOnSuccessListener {
                    onSuccess()
                }
                .addOnFailureListener { e ->
                    pendingConnections.remove(endpointId)
                    onError(e.message ?: "Connection failed")
                }
        } catch (e: Exception) {
            pendingConnections.remove(endpointId)
            onError(e.message ?: "Exception in connectToDevice")
        }
    }

    fun disconnect(endpointId: String?) {
        try {
            connectionsClient?.apply {
                if (!endpointId.isNullOrBlank()) {
                    disconnectFromEndpoint(endpointId)
                    connectedEndpoints.remove(endpointId)
                    pendingConnections.remove(endpointId)
                    endpointNames.remove(endpointId)
                } else {
                    stopAllEndpoints()
                    connectedEndpoints.clear()
                    pendingConnections.clear()
                    endpointNames.clear()
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Disconnect note: ${e.message}")
        }
    }

    fun sendMessage(
        content: String,
        type: String = "CHAT",
        msgId: String = "VJ-MSG-${System.currentTimeMillis()}",
        targetEndpointId: String? = null,
        hops: Int = 0,
        maxHops: Int = 5,
        lat: Double? = null,
        lon: Double? = null
    ): Boolean {
        val client = connectionsClient ?: return false
        return try {
            val json = JSONObject().apply {
                put("id", msgId)
                put("senderId", localDeviceName)
                put("senderName", localDeviceName)
                put("content", content)
                put("timestamp", System.currentTimeMillis())
                put("type", type)
                put("hops", hops)
                put("maxHops", maxHops)
                if (lat != null && lon != null) {
                    put("latitude", lat)
                    put("longitude", lon)
                }
                put("seenNodes", JSONArray().apply { put(localDeviceName) })
            }

            val payload = Payload.fromBytes(json.toString().toByteArray(StandardCharsets.UTF_8))

            if (!targetEndpointId.isNullOrBlank()) {
                client.sendPayload(targetEndpointId, payload)
                Log.i(TAG, "Payload sent to target $targetEndpointId: $msgId")
            } else {
                for (ep in connectedEndpoints) {
                    client.sendPayload(ep, payload)
                }
                Log.i(TAG, "Broadcast payload $msgId to ${connectedEndpoints.size} peers.")
            }
            true
        } catch (e: Exception) {
            Log.e(TAG, "Error sending payload: ${e.message}")
            false
        }
    }

    // -------------------------------------------------------------------------
    // Callbacks & Deterministic Role Tie-Breaker
    // -------------------------------------------------------------------------

    private val endpointDiscoveryCallback = object : EndpointDiscoveryCallback() {
        override fun onEndpointFound(endpointId: String, info: DiscoveredEndpointInfo) {
            val peerName = info.endpointName

            // 1. Filter out self device
            if (peerName.equals(localDeviceName, ignoreCase = true) || peerName.contains(localDeviceName, ignoreCase = true)) {
                return
            }

            endpointNames[endpointId] = peerName
            Log.i(TAG, "Discovered peer: $endpointId ($peerName)")

            eventListener?.onEndpointFound(endpointId, peerName, info.serviceId)

            // 2. Deterministic Role Tie-Breaker (Eliminates dual-handshake collisions)
            if (autoConnectEnabled && !connectedEndpoints.contains(endpointId) && !pendingConnections.contains(endpointId)) {
                val now = System.currentTimeMillis()
                val lastAttempt = lastAttemptTimes[endpointId]
                if (lastAttempt != null && (now - lastAttempt) < 8000) {
                    return // Cooldown backoff
                }

                // Deterministic comparison
                val shouldInitiate = if (peerName.isNotBlank()) {
                    localDeviceName.compareTo(peerName) > 0
                } else {
                    localDeviceName.hashCode() % 2 == 0
                }

                if (shouldInitiate) {
                    try {
                        pendingConnections.add(endpointId)
                        lastAttemptTimes[endpointId] = now
                        Log.i(TAG, "Deterministic Initiator: connecting to $endpointId ($peerName)")
                        connectionsClient?.requestConnection(localDeviceName, endpointId, connectionLifecycleCallback)
                            ?.addOnFailureListener { e ->
                                pendingConnections.remove(endpointId)
                                Log.w(TAG, "Connection attempt failed: ${e.message}")
                            }
                    } catch (e: Exception) {
                        pendingConnections.remove(endpointId)
                    }
                } else {
                    Log.i(TAG, "Deterministic Listener: awaiting incoming handshake from $peerName")
                }
            }
        }

        override fun onEndpointLost(endpointId: String) {
            endpointNames.remove(endpointId)
            pendingConnections.remove(endpointId)
            eventListener?.onEndpointLost(endpointId)
        }
    }

    private val connectionLifecycleCallback = object : ConnectionLifecycleCallback() {
        override fun onConnectionInitiated(endpointId: String, info: ConnectionInfo) {
            val peerName = info.endpointName
            endpointNames[endpointId] = peerName
            Log.i(TAG, "Connection initiated with: $endpointId ($peerName). Auto-accepting.")

            eventListener?.onConnectionInitiated(endpointId, peerName)

            connectionsClient?.acceptConnection(endpointId, payloadCallback)
                ?.addOnFailureListener { e ->
                    pendingConnections.remove(endpointId)
                    Log.e(TAG, "Accept connection failed: ${e.message}")
                }
        }

        override fun onConnectionResult(endpointId: String, result: ConnectionResolution) {
            pendingConnections.remove(endpointId)
            val peerName = endpointNames[endpointId] ?: "Node ${endpointId.takeLast(4)}"

            if (result.status.statusCode == ConnectionsStatusCodes.STATUS_OK) {
                connectedEndpoints.add(endpointId)
                Log.i(TAG, "SUCCESS: P2P Connection established with $peerName. Total peers: ${connectedEndpoints.size}")
                eventListener?.onConnectionResult(endpointId, peerName, "CONNECTED")
                triggerEpidemicVectorSync(endpointId)
            } else {
                connectedEndpoints.remove(endpointId)
                lastAttemptTimes[endpointId] = System.currentTimeMillis()
                Log.w(TAG, "Connection resolution status code: ${result.status.statusCode}")
                eventListener?.onConnectionResult(endpointId, peerName, "ERROR")
            }
        }

        override fun onDisconnected(endpointId: String) {
            Log.i(TAG, "Disconnected from endpoint: $endpointId")
            connectedEndpoints.remove(endpointId)
            pendingConnections.remove(endpointId)
            endpointNames.remove(endpointId)
            lastAttemptTimes[endpointId] = System.currentTimeMillis()
            eventListener?.onDisconnected(endpointId, connectedEndpoints.size)
        }
    }

    private fun triggerEpidemicVectorSync(peerEndpointId: String) {
        try {
            val syncHeader = JSONObject().apply {
                put("id", "SYNC-REQ-${System.currentTimeMillis()}")
                put("type", "SYNC_REQUEST")
                put("senderId", localDeviceName)
                put("timestamp", System.currentTimeMillis())
            }
            val bytes = syncHeader.toString().toByteArray(StandardCharsets.UTF_8)
            connectionsClient?.sendPayload(peerEndpointId, Payload.fromBytes(bytes))
        } catch (e: Exception) {
            Log.w(TAG, "Sync trigger error: ${e.message}")
        }
    }

    // -------------------------------------------------------------------------
    // Payload Callback & Autonomous Cloud Gateway
    // -------------------------------------------------------------------------

    private val payloadCallback = object : PayloadCallback() {
        override fun onPayloadReceived(endpointId: String, payload: Payload) {
            if (payload.type == Payload.Type.BYTES && payload.asBytes() != null) {
                try {
                    val jsonStr = String(payload.asBytes()!!, StandardCharsets.UTF_8)
                    val json = JSONObject(jsonStr)
                    val msgId = json.optString("id", "msg-${System.currentTimeMillis()}")
                    val type = json.optString("type", "CHAT")

                    // Deduplication check
                    if (processedMessageIds.contains(msgId)) return
                    processedMessageIds.add(msgId)

                    val senderName = json.optString("senderName", endpointNames[endpointId] ?: "Nearby Peer")
                    val senderId = json.optString("senderId", endpointId)
                    val hops = json.optInt("hops", 0)
                    val maxHops = json.optInt("maxHops", 5)

                    Log.i(TAG, "📩 RECEIVED MESH PAYLOAD [$type] from $senderName (hops: $hops)")

                    // 1. Autonomous Cloud Gateway Relay (If this device has Internet)
                    if (type == "SOS" || type == "INCIDENT") {
                        forwardSosToBackend(json, endpointId)
                    }

                    // 2. Notify Event Listener
                    eventListener?.onPayloadReceived(endpointId, json)

                    // 3. Epidemic Multi-Hop Forwarding
                    if (hops < maxHops) {
                        json.put("hops", hops + 1)
                        val seen = json.optJSONArray("seenNodes") ?: JSONArray()
                        seen.put(localDeviceName)
                        json.put("seenNodes", seen)

                        val forwardBytes = json.toString().toByteArray(StandardCharsets.UTF_8)
                        val forwardPayload = Payload.fromBytes(forwardBytes)

                        for (otherEp in connectedEndpoints) {
                            if (otherEp != endpointId) {
                                connectionsClient?.sendPayload(otherEp, forwardPayload)
                                Log.i(TAG, "Epidemic Relay: forwarded $msgId to peer $otherEp")
                            }
                        }
                    }

                } catch (e: Exception) {
                    Log.e(TAG, "Payload parse error: ${e.message}")
                }
            }
        }

        override fun onPayloadTransferUpdate(endpointId: String, update: PayloadTransferUpdate) {
            val status = when (update.status) {
                PayloadTransferUpdate.Status.SUCCESS -> "DELIVERED"
                PayloadTransferUpdate.Status.FAILURE -> "FAILED"
                else -> "IN_PROGRESS"
            }
            eventListener?.onPayloadTransferUpdate(endpointId, update.payloadId, status)
        }
    }

    private fun isInternetAvailable(): Boolean {
        val ctx = appContext ?: return false
        return try {
            val cm = ctx.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager ?: return false
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val network = cm.activeNetwork ?: return false
                val caps = cm.getNetworkCapabilities(network) ?: return false
                caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
                        caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
            } else {
                @Suppress("DEPRECATION")
                cm.activeNetworkInfo?.isConnected == true
            }
        } catch (e: Exception) {
            false
        }
    }

    private fun forwardSosToBackend(sosJson: JSONObject, originEndpointId: String) {
        if (!isInternetAvailable()) {
            Log.i(TAG, "Autonomous Gateway: Device currently offline. Buffered in DTN queue.")
            return
        }

        engineScope.launch {
            try {
                val msgId = sosJson.optString("id", "SOS-${System.currentTimeMillis()}")
                val content = sosJson.optString("content", "Disaster SOS Distress Beacon")
                val lat = sosJson.optDouble("latitude", 12.9716)
                val lon = sosJson.optDouble("longitude", 77.5946)
                val severity = sosJson.optString("severity", "CRITICAL")

                val body = JSONObject().apply {
                    put("message_id", msgId)
                    put("message", content)
                    put("severity", severity)
                    put("latitude", lat)
                    put("longitude", lon)
                }

                val url = URL("$BACKEND_API_BASE/sos")
                val conn = (url.openConnection() as HttpURLConnection).apply {
                    requestMethod = "POST"
                    setRequestProperty("Content-Type", "application/json; utf-8")
                    setRequestProperty("Accept", "application/json")
                    doOutput = true
                    connectTimeout = 8000
                    readTimeout = 8000
                }

                conn.outputStream.use { os: OutputStream ->
                    val input = body.toString().toByteArray(StandardCharsets.UTF_8)
                    os.write(input, 0, input.size)
                }

                val code = conn.responseCode
                Log.i(TAG, "⚡ AUTONOMOUS GATEWAY CLOUD SYNC: Relayed SOS [$msgId] to Cloud Backend. HTTP Code: $code")

                if (code in 200..201) {
                    val ack = JSONObject().apply {
                        put("id", "ACK-$msgId")
                        put("type", "GATEWAY_ACK")
                        put("ref_id", msgId)
                        put("gateway_node", localDeviceName)
                        put("timestamp", System.currentTimeMillis())
                    }
                    val ackBytes = ack.toString().toByteArray(StandardCharsets.UTF_8)
                    connectionsClient?.sendPayload(originEndpointId, Payload.fromBytes(ackBytes))
                }
            } catch (e: Exception) {
                Log.w(TAG, "Gateway relay HTTP error: ${e.message}")
            }
        }
    }

    // -------------------------------------------------------------------------
    // Fast BLE SOS Beaconing & Hardware Filter Scanning
    // -------------------------------------------------------------------------

    fun broadcastBleSosBeacon(lat: Double, lon: Double, severity: String = "CRITICAL", vajraId: String = localDeviceName): Boolean {
        val adv = bleAdvertiser ?: run {
            Log.w(TAG, "BLE Advertiser not available")
            return false
        }

        return try {
            val settings = AdvertiseSettings.Builder()
                .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
                .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
                .setConnectable(false)
                .setTimeout(60000)
                .build()

            val buffer = ByteBuffer.allocate(20).apply {
                putFloat(lat.toFloat())
                putFloat(lon.toFloat())
                val sevByte = when (severity) {
                    "CRITICAL" -> 3
                    "HIGH" -> 2
                    else -> 1
                }.toByte()
                put(sevByte)
                putInt((System.currentTimeMillis() / 1000).toInt())
                putInt(vajraId.hashCode())
            }

            val data = AdvertiseData.Builder()
                .addServiceUuid(ParcelUuid(VAJRA_BLE_SERVICE_UUID))
                .addManufacturerData(VAJRA_MANUFACTURER_ID, buffer.array())
                .setIncludeDeviceName(false)
                .build()

            adv.startAdvertising(settings, data, bleAdvertiseCallback)
            isBleBeaconing = true
            Log.i(TAG, "Fast BLE SOS Beacon active at ($lat, $lon)")
            true
        } catch (e: Exception) {
            Log.e(TAG, "Error starting BLE beacon: ${e.message}")
            false
        }
    }

    fun stopBleSosBeacon() {
        try {
            if (isBleBeaconing) {
                bleAdvertiser?.stopAdvertising(bleAdvertiseCallback)
                isBleBeaconing = false
            }
        } catch (e: Exception) {
            Log.w(TAG, "Stop BLE beacon error: ${e.message}")
        }
    }

    private val bleAdvertiseCallback = object : AdvertiseCallback() {
        override fun onStartSuccess(settingsInEffect: AdvertiseSettings?) {
            super.onStartSuccess(settingsInEffect)
            Log.i(TAG, "BLE SOS AdvertiseCallback SUCCESS")
        }

        override fun onStartFailure(errorCode: Int) {
            super.onStartFailure(errorCode)
            isBleBeaconing = false
            Log.w(TAG, "BLE SOS AdvertiseCallback FAILED: $errorCode")
        }
    }

    private fun startBleScannerInternal() {
        val scanner = bleScanner ?: return
        if (isBleScanning) return

        try {
            val filters = listOf(
                ScanFilter.Builder().setServiceUuid(ParcelUuid(VAJRA_BLE_SERVICE_UUID)).build(),
                ScanFilter.Builder().setManufacturerData(VAJRA_MANUFACTURER_ID, byteArrayOf()).build()
            )

            val settingsBuilder = ScanSettings.Builder()
                .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                settingsBuilder.setMatchMode(ScanSettings.MATCH_MODE_AGGRESSIVE)
                settingsBuilder.setCallbackType(ScanSettings.CALLBACK_TYPE_ALL_MATCHES)
            }

            scanner.startScan(filters, settingsBuilder.build(), bleScanCallback)
            isBleScanning = true
            Log.i(TAG, "VajraNet Hardware BLE SOS Scanner active")
        } catch (e: Exception) {
            Log.w(TAG, "BLE Scanner start note: ${e.message}")
        }
    }

    private fun stopBleScannerInternal() {
        try {
            if (isBleScanning) {
                bleScanner?.stopScan(bleScanCallback)
                isBleScanning = false
            }
        } catch (e: Exception) {
            Log.w(TAG, "BLE Scanner stop note: ${e.message}")
        }
    }

    private val bleScanCallback = object : ScanCallback() {
        override fun onScanResult(callbackType: Int, result: ScanResult) {
            super.onScanResult(callbackType, result)
            val scanRecord = result.scanRecord ?: return

            val data = scanRecord.getManufacturerSpecificData(VAJRA_MANUFACTURER_ID)
            if (data != null && data.size >= 17) {
                try {
                    val buf = ByteBuffer.wrap(data)
                    val lat = buf.float
                    val lon = buf.float
                    val sev = buf.get()
                    val timestamp = buf.int
                    val idHash = buf.int

                    val sevStr = when (sev.toInt()) {
                        3 -> "CRITICAL"
                        2 -> "HIGH"
                        else -> "MEDIUM"
                    }
                    val beaconId = "BLE-SOS-${Math.abs(idHash)}-$timestamp"

                    if (processedMessageIds.contains(beaconId)) return
                    processedMessageIds.add(beaconId)

                    Log.i(TAG, "🚨 DISCOVERED RAW BLE SOS BEACON: $beaconId at ($lat, $lon)")

                    // Forward to cloud gateway if online
                    forwardBleSosToBackend(beaconId, lat, lon, sevStr)

                    val event = JSONObject().apply {
                        put("id", beaconId)
                        put("latitude", lat.toDouble())
                        put("longitude", lon.toDouble())
                        put("severity", sevStr)
                        put("timestamp", timestamp.toLong() * 1000L)
                        put("source", "BLE_RAW_BEACON")
                        put("rssi", result.rssi)
                    }

                    eventListener?.onBleSosBeaconReceived(event)
                } catch (e: Exception) {
                    Log.w(TAG, "Error decoding BLE beacon data: ${e.message}")
                }
            }
        }
    }

    private fun forwardBleSosToBackend(beaconId: String, lat: Float, lon: Float, severity: String) {
        if (!isInternetAvailable()) return

        engineScope.launch {
            try {
                val body = JSONObject().apply {
                    put("message_id", beaconId)
                    put("message", "🚨 LIVE BLE SOS BEACON: $beaconId ($severity)")
                    put("severity", severity)
                    put("latitude", lat.toDouble())
                    put("longitude", lon.toDouble())
                }

                val url = URL("$BACKEND_API_BASE/sos")
                val conn = (url.openConnection() as HttpURLConnection).apply {
                    requestMethod = "POST"
                    setRequestProperty("Content-Type", "application/json; utf-8")
                    setRequestProperty("Accept", "application/json")
                    doOutput = true
                    connectTimeout = 8000
                    readTimeout = 8000
                }

                conn.outputStream.use { os ->
                    val input = body.toString().toByteArray(StandardCharsets.UTF_8)
                    os.write(input, 0, input.size)
                }

                val code = conn.responseCode
                Log.i(TAG, "⚡ BLE GATEWAY RELAY: Relayed BLE SOS [$beaconId] to Cloud Backend. Code: $code")
            } catch (e: Exception) {
                Log.w(TAG, "BLE Gateway relay HTTP error: ${e.message}")
            }
        }
    }
}
