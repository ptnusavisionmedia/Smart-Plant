#include "provisioning.h"
#include "../control/config_store.h"
#include "../../include/config.h"
#include <Preferences.h>
#include <esp_system.h>

namespace provisioning {

namespace {
String g_deviceUid;
String g_claimCode;

String randomClaimCode() {
    // Format "SP-XXXX-XXXX" matching the Tech Spec §3 claim example.
    const char alphabet[] = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I/O to avoid ambiguity
    String code = "SP-";
    for (int i = 0; i < 4; i++) code += alphabet[esp_random() % (sizeof(alphabet) - 1)];
    code += "-";
    for (int i = 0; i < 4; i++) code += alphabet[esp_random() % (sizeof(alphabet) - 1)];
    return code;
}
}

void begin() {
    Preferences prefs;
    prefs.begin("provision", false);

    g_deviceUid = prefs.getString("deviceUid", "");
    if (g_deviceUid.length() == 0) {
        uint64_t chipId = ESP.getEfuseMac();
        char hex[13];
        snprintf(hex, sizeof(hex), "%06x", static_cast<unsigned int>(chipId & 0xFFFFFF));
        g_deviceUid = String(DEVICE_UID_PREFIX) + hex;
        prefs.putString("deviceUid", g_deviceUid);
    }

    g_claimCode = prefs.getString("claimCode", "");
    if (g_claimCode.length() == 0) {
        g_claimCode = randomClaimCode();
        prefs.putString("claimCode", g_claimCode);
    }

    prefs.end();

    Serial.println("=====================================");
    Serial.print("Device UID:  ");
    Serial.println(g_deviceUid);
    Serial.print("Claim code:  ");
    Serial.println(g_claimCode);
    Serial.println("Enter this claim code in the Smart Plant app to pair this device.");
    Serial.println("=====================================");
}

String deviceUid() { return g_deviceUid; }
String claimCode() { return g_claimCode; }

bool isClaimed() { return config_store::isAccepted(); }

} // namespace provisioning
