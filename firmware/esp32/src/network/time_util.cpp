#include "time_util.h"
#include <time.h>

namespace time_util {

void begin() {
    configTime(0, 0, "pool.ntp.org", "time.nist.gov");
}

bool isSynced() {
    time_t now = time(nullptr);
    return now > 1700000000; // sanity check: after ~2023-11-14 means NTP landed
}

static String formatIso8601(time_t t) {
    struct tm tmStruct;
    gmtime_r(&t, &tmStruct);
    char buf[25];
    strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", &tmStruct);
    return String(buf);
}

String nowIso8601() {
    return formatIso8601(time(nullptr));
}

unsigned long long nowEpochMs() {
    struct timeval tv;
    gettimeofday(&tv, nullptr);
    return static_cast<unsigned long long>(tv.tv_sec) * 1000ULL + tv.tv_usec / 1000ULL;
}

String iso8601FromEpochMs(unsigned long long ms) {
    return formatIso8601(static_cast<time_t>(ms / 1000ULL));
}

} // namespace time_util
